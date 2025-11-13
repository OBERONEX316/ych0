const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const ExcelJS = require('exceljs');

// @desc    获取用户通知列表
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 20,
    status,
    type,
    unreadOnly = false
  } = req.query;
  
  const skip = (page - 1) * limit;
  
  const notifications = await Notification.getUserNotifications(userId, {
    limit: parseInt(limit),
    skip,
    status,
    type,
    unreadOnly: unreadOnly === 'true'
  });
  
  const total = await Notification.countDocuments({ user: userId });
  const unreadCount = await Notification.getUnreadCount(userId);
  
  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    },
    data: notifications
  });
});

// @desc    获取通知详情
// @route   GET /api/notifications/:id
// @access  Private
const getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user.id
  })
  .populate('user', 'username avatar')
  .populate('data.orderId', 'orderNumber')
  .populate('data.productId', 'name images')
  .populate('data.socialUserId', 'username avatar');
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: req.t('errors.not_found', { resource: '通知' })
    });
  }
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    标记通知为已读
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user.id,
      status: 'unread'
    },
    { status: 'read' },
    { new: true, runValidators: true }
  );
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: req.t('errors.not_found', { resource: '通知' })
    });
  }
  
  res.status(200).json({
    success: true,
    message: req.t('notifications.marked_as_read'),
    data: notification
  });
});

// @desc    批量标记通知为已读
// @route   PUT /api/notifications/read
// @access  Private
const markMultipleAsRead = asyncHandler(async (req, res, next) => {
  const { notificationIds } = req.body;
  
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: req.t('errors.invalid_data')
    });
  }
  
  const result = await Notification.markAsRead(notificationIds, req.user.id);
  
  res.status(200).json({
    success: true,
    message: req.t('notifications.marked_multiple_as_read', { count: result.modifiedCount }),
    data: { modifiedCount: result.modifiedCount }
  });
});

// @desc    标记所有通知为已读
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res, next) => {
  const result = await Notification.updateMany(
    {
      user: req.user.id,
      status: 'unread'
    },
    { status: 'read' }
  );
  
  res.status(200).json({
    success: true,
    message: req.t('notifications.marked_all_as_read', { count: result.modifiedCount }),
    data: { modifiedCount: result.modifiedCount }
  });
});

// @desc    删除通知
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user.id
    },
    { status: 'deleted' },
    { new: true }
  );
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: req.t('errors.not_found', { resource: '通知' })
    });
  }
  
  res.status(200).json({
    success: true,
    message: req.t('notifications.deleted'),
    data: {}
  });
});

// @desc    获取未读通知数量
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res, next) => {
  const unreadCount = await Notification.getUnreadCount(req.user.id);
  
  res.status(200).json({
    success: true,
    data: { unreadCount }
  });
});

// @desc    获取通知设置
// @route   GET /api/notifications/settings
// @access  Private
const getNotificationSettings = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('preferences');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: req.t('errors.not_found', { resource: '用户' })
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      emailNotifications: user.preferences.emailNotifications,
      smsNotifications: user.preferences.smsNotifications,
      pushNotifications: user.preferences.pushNotifications || true,
      inAppNotifications: user.preferences.inAppNotifications || true,
      notificationPreferences: user.preferences.notificationPreferences || {
        orderUpdates: true,
        paymentUpdates: true,
        refundUpdates: true,
        stockAlerts: true,
        promotions: true,
        socialInteractions: true,
        securityAlerts: true,
        systemAnnouncements: true
      }
    }
  });
});

// @desc    更新通知设置
// @route   PUT /api/notifications/settings
// @access  Private
const updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const { 
    emailNotifications, 
    smsNotifications, 
    pushNotifications, 
    inAppNotifications,
    notificationPreferences 
  } = req.body;
  
  const updateData = {};
  
  if (emailNotifications !== undefined) {
    updateData['preferences.emailNotifications'] = emailNotifications;
  }
  
  if (smsNotifications !== undefined) {
    updateData['preferences.smsNotifications'] = smsNotifications;
  }
  
  if (pushNotifications !== undefined) {
    updateData['preferences.pushNotifications'] = pushNotifications;
  }
  
  if (inAppNotifications !== undefined) {
    updateData['preferences.inAppNotifications'] = inAppNotifications;
  }
  
  if (notificationPreferences) {
    Object.keys(notificationPreferences).forEach(key => {
      if (notificationPreferences[key] !== undefined) {
        updateData[`preferences.notificationPreferences.${key}`] = notificationPreferences[key];
      }
    });
  }
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('preferences');
  
  res.status(200).json({
    success: true,
    message: req.t('notifications.settings_updated'),
    data: {
      emailNotifications: user.preferences.emailNotifications,
      smsNotifications: user.preferences.smsNotifications,
      pushNotifications: user.preferences.pushNotifications,
      inAppNotifications: user.preferences.inAppNotifications,
      notificationPreferences: user.preferences.notificationPreferences
    }
  });
});

// @desc    创建测试通知
// @route   POST /api/notifications/test
// @access  Private
const createTestNotification = asyncHandler(async (req, res, next) => {
  const { type = 'system_announcement', title, message } = req.body;
  
  const notification = await Notification.createNotification({
    user: req.user.id,
    type,
    title: title || req.t('notifications.test_title'),
    message: message || req.t('notifications.test_message'),
    channels: ['in_app'],
    priority: 'normal'
  });
  
  res.status(201).json({
    success: true,
    message: req.t('notifications.test_created'),
    data: notification
  });
});

module.exports = {
  getUserNotifications,
  getNotification,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationSettings,
  updateNotificationSettings,
  createTestNotification,
  getOdooApprovalNotificationsAdmin,
  exportOdooApprovalNotificationsCSV,
  exportOdooApprovalNotificationsXLSX,
  markAsReadAdmin,
  markMultipleAsReadAdmin
};
const getOdooApprovalNotificationsAdmin = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    approvalState,
    status,
    startDate,
    endDate
  } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = {
    $or: [
      { 'metadata.source': 'odoo' },
      { 'data.campaignId': 'odoo-approval' }
    ]
  };
  if (approvalState) query['data.approvalState'] = approvalState;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const total = await Notification.countDocuments(query);
  const list = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  res.status(200).json({
    success: true,
    count: list.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    },
    data: list
  });
});

const exportOdooApprovalNotificationsCSV = asyncHandler(async (req, res) => {
  const { approvalState, status, startDate, endDate } = req.query;
  const query = {
    $or: [
      { 'metadata.source': 'odoo' },
      { 'data.campaignId': 'odoo-approval' }
    ]
  };
  if (approvalState) query['data.approvalState'] = approvalState;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const list = await Notification.find(query).sort({ createdAt: -1 });
  const header = ['time','title','approvalState','status','amount','orderName','customer','event','url','user'];
  const rows = list.map(n => [
    new Date(n.createdAt).toISOString(),
    (n.title || '').replace(/\n/g,' '),
    n.data?.approvalState || '',
    n.status || '',
    n.data?.amount ?? '',
    n.data?.orderName || '',
    n.data?.customerName || n.data?.productName || '',
    n.data?.event || '',
    n.data?.url || '',
    String(n.user || '')
  ]);
  const csv = [header.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="odoo_approval_notifications.csv"');
  res.status(200).send(csv);
});

const exportOdooApprovalNotificationsXLSX = asyncHandler(async (req, res) => {
  const { approvalState, status, startDate, endDate } = req.query;
  const query = {
    $or: [
      { 'metadata.source': 'odoo' },
      { 'data.campaignId': 'odoo-approval' }
    ]
  };
  if (approvalState) query['data.approvalState'] = approvalState;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const list = await Notification.find(query).sort({ createdAt: -1 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('odoo_approval');
  ws.columns = [
    { header: 'time', key: 'time', width: 24 },
    { header: 'title', key: 'title', width: 40 },
    { header: 'approvalState', key: 'approvalState', width: 16 },
    { header: 'status', key: 'status', width: 12 },
    { header: 'amount', key: 'amount', width: 12 },
    { header: 'orderName', key: 'orderName', width: 20 },
    { header: 'customer', key: 'customer', width: 24 },
    { header: 'event', key: 'event', width: 20 },
    { header: 'url', key: 'url', width: 40 },
    { header: 'user', key: 'user', width: 24 }
  ];
  list.forEach(n => {
    ws.addRow({
      time: new Date(n.createdAt).toISOString(),
      title: n.title || '',
      approvalState: n.data?.approvalState || '',
      status: n.status || '',
      amount: n.data?.amount ?? '',
      orderName: n.data?.orderName || '',
      customer: n.data?.customerName || n.data?.productName || '',
      event: n.data?.event || '',
      url: n.data?.url || '',
      user: String(n.user || '')
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="odoo_approval_notifications.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

const markAsReadAdmin = asyncHandler(async (req, res) => {
  const n = await Notification.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
  if (!n) return res.status(404).json({ success: false, message: 'not found' });
  res.status(200).json({ success: true, data: n });
});

const markMultipleAsReadAdmin = asyncHandler(async (req, res) => {
  const ids = req.body.notificationIds || [];
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'invalid' });
  const result = await Notification.updateMany({ _id: { $in: ids } }, { status: 'read' });
  res.status(200).json({ success: true, data: { modifiedCount: result.modifiedCount } });
});
