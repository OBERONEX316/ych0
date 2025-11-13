const express = require('express');
const {
  getUserNotifications,
  getNotification,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationSettings,
  updateNotificationSettings,
  createTestNotification
} = require('../controllers/notificationController');

const { protect, authorize } = require('../middleware/auth');
const { getOdooApprovalNotificationsAdmin, exportOdooApprovalNotificationsCSV } = require('../controllers/notificationController');

const router = express.Router();

// 所有路由都需要认�?router.use(protect);

// 通知管理路由
router.route('/')
  .get(getUserNotifications); // 获取通知列表

router.route('/:id')
  .get(getNotification)       // 获取通知详情
  .delete(deleteNotification); // 删除通知

router.route('/:id/read')
  .put(markAsRead);           // 标记单个通知为已�?
router.route('/read')
  .put(markMultipleAsRead);    // 批量标记通知为已�?
router.route('/read-all')
  .put(markAllAsRead);        // 标记所有通知为已�?
router.route('/unread-count')
  .get(getUnreadCount);       // 获取未读数量

// 通知设置路由
router.route('/settings')
  .get(getNotificationSettings)     // 获取通知设置
  .put(updateNotificationSettings); // 更新通知设置

// 测试路由
router.route('/test')
  .post(createTestNotification);    // 创建测试通知

module.exports = router;
router.get('/admin/odoo', protect, authorize('admin','moderator'), getOdooApprovalNotificationsAdmin);
router.get('/admin/odoo/export', protect, authorize('admin','moderator'), exportOdooApprovalNotificationsCSV);
router.get('/admin/odoo/export.xlsx', protect, authorize('admin','moderator'), exportOdooApprovalNotificationsXLSX);
router.put('/admin/:id/read', protect, authorize('admin','moderator'), markAsReadAdmin);
router.put('/admin/read', protect, authorize('admin','moderator'), markMultipleAsReadAdmin);
