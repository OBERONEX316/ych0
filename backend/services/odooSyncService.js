const axios = require('axios');
const NotificationService = require('./notificationService');
const SyncState = require('../models/SyncState');

class OdooSyncService {
  constructor() {
    this.timer = null;
    this.intervalMs = parseInt(process.env.ODOO_SYNC_INTERVAL_MS || '300000', 10); // 5min
    this.enabled = (process.env.ODOO_SYNC_ENABLED || 'false').toLowerCase() === 'true';
    this.seen = new Map();
  }

  start(app) {
    if (!this.enabled) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.syncApprovals(app).catch(() => {}), this.intervalMs);
    this.syncApprovals(app).catch(() => {});
  }

  async syncApprovals(app) {
    const url = process.env.ODOO_RPC_URL;
    const db = process.env.ODOO_RPC_DB;
    const login = process.env.ODOO_RPC_LOGIN;
    const password = process.env.ODOO_RPC_PASSWORD;
    if (!url || !db || !login || !password) return;

    const jsonrpc = async (endpoint, params) => {
      const res = await axios.post(`${url}${endpoint}`, { jsonrpc: '2.0', method: 'call', params, id: Date.now() }, { timeout: 8000 });
      if (res.data && res.data.result) return res.data.result;
      throw new Error(res.data && res.data.error ? res.data.error : 'RPC error');
    };

    const uid = await jsonrpc('/web/session/authenticate', { db, login, password });
    if (!uid || !uid.uid) return;

    const stateKey = 'odoo_approval_last_sync';
    const stateDoc = await SyncState.findOne({ key: stateKey });
    const lastSyncTs = stateDoc?.value ? new Date(stateDoc.value) : new Date(Date.now() - (parseInt(process.env.ODOO_SYNC_LOOKBACK_MIN || '60', 10) * 60000));
    const since = lastSyncTs;
    const domain = [["write_date", ">=", since.toISOString().slice(0, 19).replace('T', ' ')]];
    const fields = ["id", "name", "state", "amount_total", "partner_id", "approval_state"];
    const lastIdDoc = await SyncState.findOne({ key: 'odoo_approval_last_id' });
    const lastId = lastIdDoc?.value ? parseInt(lastIdDoc.value) : 0;
    const orders = await jsonrpc('/web/dataset/call_kw', {
      model: 'sale.order',
      method: 'search_read',
      args: [["|", ["write_date", ">=", since.toISOString().slice(0, 19).replace('T', ' ')], ["id", ">", lastId]], fields],
      kwargs: { limit: 50 },
      context: { uid: uid.uid }
    });

    const io = app.get('io');
    const now = Date.now();
    for (const o of orders) {
      const key = `${o.name}|${o.approval_state}|${o.state}|${o.amount_total}`;
      const last = this.seen.get(key) || 0;
      if (now - last < parseInt(process.env.ODOO_SYNC_DEDUP_MS || '600000', 10)) continue;
      const titleMap = { submitted: '销售订单待审批', approved: '销售订单已审批', rejected: '销售订单被拒绝', confirmed: '销售订单已确认' };
      const title = titleMap[o.approval_state] || '销售订单更新';
      // 这里简单地广播系统通知给管理员，不做重复去重
      await NotificationService.createAndSendNotification({
        user: process.env.ADMIN_USER_ID || null,
        type: 'system_announcement',
        title,
        message: `${o.name} 状态: ${o.state} 审批: ${o.approval_state}`,
        data: { approvalState: o.approval_state, amount: o.amount_total, orderName: o.name, campaignId: 'odoo-approval', templateId: 'sync', event: 'sale_order_sync' },
        channels: ['in_app'],
        priority: 'high',
        metadata: { source: 'odoo', category: 'system' }
      }).catch(() => {});
      if (io && process.env.ADMIN_USER_ID) {
        io.to(`user-${process.env.ADMIN_USER_ID}`).emit('odoo-approval-event', {
          event: 'sale_order_sync', orderName: o.name, approvalState: o.approval_state, state: o.state, amountTotal: o.amount_total
        });
      }
      this.seen.set(key, now);
    }
    const ttl = parseInt(process.env.ODOO_SYNC_DEDUP_TTL_MS || '3600000', 10);
    for (const [k, t] of Array.from(this.seen.entries())) {
      if (now - t > ttl) this.seen.delete(k);
    }
    const nowIso = new Date().toISOString();
    if (stateDoc) {
      stateDoc.value = nowIso;
      stateDoc.updatedAt = new Date();
      await stateDoc.save();
    } else {
      await SyncState.create({ key: stateKey, value: nowIso });
    }
    const maxId = orders.reduce((m, o) => Math.max(m, parseInt(o.id || 0)), lastId);
    if (lastIdDoc) {
      lastIdDoc.value = String(maxId);
      lastIdDoc.updatedAt = new Date();
      await lastIdDoc.save();
    } else {
      await SyncState.create({ key: 'odoo_approval_last_id', value: String(maxId) });
    }
  }
}

module.exports = new OdooSyncService();
