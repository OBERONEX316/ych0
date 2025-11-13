const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const NotificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const User = require('../models/User');

function verifySignature(payload, signature, secret) {
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature || ''));
}

async function resolveRecipients({ userIds = [], usernames = [], roles = [] }) {
  const set = new Set();
  if (userIds && userIds.length) {
    const users = await User.find({ _id: { $in: userIds } }).select('_id');
    users.forEach(u => set.add(String(u._id)));
  }
  if (usernames && usernames.length) {
    const users = await User.find({ username: { $in: usernames } }).select('_id');
    users.forEach(u => set.add(String(u._id)));
  }
  if (roles && roles.length) {
    const users = await User.find({ role: { $in: roles } }).select('_id');
    users.forEach(u => set.add(String(u._id)));
  }
  if (set.size === 0) {
    const admins = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('_id');
    admins.forEach(u => set.add(String(u._id)));
  }
  return Array.from(set);
}

const handleApprovalEvent = asyncHandler(async (req, res) => {
  const secret = process.env.ODOO_WEBHOOK_SECRET;
  const signature = req.get('X-Odoo-Signature');
  const isValid = verifySignature(req.body, signature, secret);
  if (!isValid) {
    return res.status(403).json({ success: false, message: 'Invalid signature' });
  }

  const {
    event = 'sale_order_update',
    orderName,
    orderId,
    approvalState,
    state,
    amountTotal,
    expectedMargin,
    customer,
    url,
    recipients = {}
  } = req.body || {};

  const userIds = await resolveRecipients(recipients);
  const io = req.app.get('io');

  const titleMap = {
    submitted: '销售订单待审批',
    approved: '销售订单已审批',
    rejected: '销售订单被拒绝',
    confirmed: '销售订单已确认'
  };
  const title = titleMap[approvalState] || '销售订单更新';

  const created = [];
  for (const uid of userIds) {
      const notification = await NotificationService.createAndSendNotification({
        user: uid,
        type: 'system_announcement',
        title,
        message: `${orderName || ''} 状态: ${state || ''} 审批: ${approvalState || ''}`.trim(),
        data: {
          url: url,
          priority: 10,
          amount: amountTotal,
          productName: customer,
          customerName: customer,
          campaignId: 'odoo-approval',
          templateId: event,
          approvalState,
          event
        },
        channels: ['in_app', 'email', 'web_push'],
        priority: 'high',
        metadata: { source: 'odoo', category: 'system' }
      });
    created.push(notification);
    if (io) {
      io.to(`user-${uid}`).emit('odoo-approval-event', {
        event,
        orderName,
        orderId,
        approvalState,
        state,
        amountTotal,
        expectedMargin,
        customer,
        url
      });
    }
  }

  res.status(201).json({ success: true, count: created.length });
});

module.exports = { handleApprovalEvent };
