const Notification = require('../models/Notification');
const User = require('../models/User');
const axios = require('axios');
const crypto = require('crypto');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function getDefaultChannels() {
  const val = process.env.NOTIFY_DEFAULT_CHANNELS || 'in_app';
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

function buildTransportForEmail() {
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;
  const auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  const forceIPv6 = String(process.env.SMTP_FORCE_IPV6 || '').toLowerCase() === 'true';

  const base = { host, port, secure, auth, connectionTimeout: 20000 };
  if (forceIPv6) {
    return nodemailer.createTransport({ ...base, family: 6, tls: { servername: host } });
  }
  return nodemailer.createTransport(base);
}

class NotificationService {
  constructor() {
    this.channels = {
      in_app: this.sendInAppNotification.bind(this),
      email: this.sendEmailNotification.bind(this),
      sms: this.sendSmsNotification.bind(this),
      push: this.sendPushNotification.bind(this),
      web_push: this.sendWebPushNotification.bind(this)
    };
  }

  /**
   * 创建并发送通知
   * @param {Object} notificationData - 通知数据
   * @param {Array} channels - 发送渠道
   * @returns {Promise<Object>} - 创建的通知
   */
  async createAndSendNotification(notificationData, channels = getDefaultChannels()) {
    try {
      // 检查用户通知设置
      const user = await User.findById(notificationData.user).select('preferences');
      
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户是否允许此类通知
      if (!this.checkNotificationPreference(user, notificationData.type)) {
        console.log(`用户 ${notificationData.user} 禁用了 ${notificationData.type} 类型的通知`);
        return null;
      }

      // 过滤用户允许的渠道
      let allowedChannels = this.filterAllowedChannels(user, channels);

      // 按类型控制是否发送邮件
      const emailTypesEnv = (process.env.NOTIFY_EMAIL_TYPES || 'order_created,payment_success,refund_requested,refund_approved,refund_rejected,refund_completed')
        .split(',').map(s => s.trim()).filter(Boolean);
      if (!emailTypesEnv.includes(notificationData.type)) {
        allowedChannels = allowedChannels.filter(ch => ch !== 'email');
      }
      
      if (allowedChannels.length === 0) {
        console.log('用户禁用了所有通知渠道');
        return null;
      }

      // 创建通知记录
      const notification = await Notification.createNotification({
        ...notificationData,
        channels: allowedChannels
      });

      // 发送到各个渠道
      await this.sendToChannels(notification, allowedChannels);

      return notification;
    } catch (error) {
      console.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户通知偏好
   */
  checkNotificationPreference(user, notificationType) {
    const preferences = user.preferences.notificationPreferences || {};
    
    const typeMapping = {
      'order_created': 'orderUpdates',
      'order_shipped': 'orderUpdates',
      'order_delivered': 'orderUpdates',
      'payment_success': 'paymentUpdates',
      'payment_failed': 'paymentUpdates',
      'refund_requested': 'refundUpdates',
      'refund_approved': 'refundUpdates',
      'refund_rejected': 'refundUpdates',
      'refund_completed': 'refundUpdates',
      'stock_alert': 'stockAlerts',
      'price_drop': 'stockAlerts',
      'promotion_available': 'promotions',
      'coupon_received': 'promotions',
      'points_earned': 'promotions',
      'level_up': 'promotions',
      'wishlist_restock': 'stockAlerts',
      'wishlist_price_drop': 'stockAlerts',
      'social_follow': 'socialInteractions',
      'social_like': 'socialInteractions',
      'social_comment': 'socialInteractions',
      'social_share': 'socialInteractions',
      'chat_message': 'socialInteractions',
      'system_announcement': 'systemAnnouncements',
      'security_alert': 'securityAlerts'
    };

    const preferenceKey = typeMapping[notificationType];
    return preferenceKey ? (preferences[preferenceKey] !== false) : true;
  }

  /**
   * 过滤用户允许的渠道
   */
  filterAllowedChannels(user, channels) {
    return channels.filter(channel => {
      switch (channel) {
        case 'email':
          return user.preferences.emailNotifications !== false;
        case 'sms':
          return user.preferences.smsNotifications !== false;
        case 'push':
          return user.preferences.pushNotifications !== false;
        case 'in_app':
          return user.preferences.inAppNotifications !== false;
        case 'web_push':
          return user.preferences.pushNotifications !== false;
        default:
          return true;
      }
    });
  }

  /**
   * 发送到各个渠道
   */
  async sendToChannels(notification, channels) {
    const sendPromises = channels.map(channel => {
      return this.channels[channel](notification)
        .then(result => {
          // 更新发送状态
          return Notification.findByIdAndUpdate(
            notification._id,
            { 
              $set: { 
                [`deliveryStatus.${channel}.sent`]: true,
                [`deliveryStatus.${channel}.delivered`]: result.delivered || true
              } 
            }
          );
        })
        .catch(error => {
          console.error(`发送 ${channel} 通知失败:`, error);
          // 记录发送失败状态
          return Notification.findByIdAndUpdate(
            notification._id,
            { 
              $set: { 
                [`deliveryStatus.${channel}.sent`]: false,
                [`deliveryStatus.${channel}.error`]: error.message 
              } 
            }
          );
        });
    });

    await Promise.all(sendPromises);
  }

  /**
   * 发送应用内通知
   */
  async sendInAppNotification(notification) {
    // 应用内通知直接通过Socket.io发送
    // 这里返回成功状态，实际发送在Socket处理中
    return { delivered: true };
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(notification) {
    const user = process.env.SMTP_USER;
    const from = process.env.EMAIL_FROM || user || 'no-reply@example.com';
    const transporter = buildTransportForEmail();
    if (transporter) {
      const target = await User.findById(notification.user).select('email username');
      if (!target || !target.email) {
        return { delivered: false };
      }
      const info = await transporter.sendMail({
        from,
        to: target.email,
        subject: notification.title,
        text: notification.message,
        html: `<p>${notification.message}</p>`
      });
      return { delivered: !!info.messageId };
    }
    const url = process.env.EMAIL_WEBHOOK_URL;
    if (url) {
      const payload = {
        toUserId: String(notification.user),
        subject: notification.title,
        text: notification.message,
        data: notification.data || {},
        type: notification.type
      };
      const secret = process.env.EMAIL_WEBHOOK_SECRET || '';
      const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      const headers = { 'X-Notify-Signature': signature };
      const res = await axios.post(url, payload, { headers, timeout: 5000 });
      return { delivered: res.status >= 200 && res.status < 300 };
    }
    return { delivered: true };
  }

  /**
   * 发送短信通知
   */
  async sendSmsNotification(notification) {
    // 实现短信发送逻辑
    console.log(`发送短信通知: ${notification.title} - ${notification.message}`);
    // 这里可以集成短信服务如Twilio
    return { delivered: true };
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(notification) {
    const url = process.env.PUSH_WEBHOOK_URL;
    if (!url) {
      console.log(`发送推送通知(模拟): ${notification.title} - ${notification.message}`);
      return { delivered: true };
    }
    const payload = {
      toUserId: String(notification.user),
      title: notification.title,
      body: notification.message,
      data: notification.data || {},
      type: notification.type
    };
    const secret = process.env.PUSH_WEBHOOK_SECRET || '';
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const headers = { 'X-Notify-Signature': signature };
    const res = await axios.post(url, payload, { headers, timeout: 5000 });
    return { delivered: res.status >= 200 && res.status < 300 };
  }

  /**
   * 发送Web推送通知
   */
  async sendWebPushNotification(notification) {
    const url = process.env.WEB_PUSH_WEBHOOK_URL;
    if (!url) {
      console.log(`发送Web推送(模拟): ${notification.title} - ${notification.message}`);
      return { delivered: true };
    }
    const payload = {
      toUserId: String(notification.user),
      title: notification.title,
      body: notification.message,
      data: notification.data || {},
      type: notification.type
    };
    const secret = process.env.WEB_PUSH_WEBHOOK_SECRET || '';
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const headers = { 'X-Notify-Signature': signature };
    const res = await axios.post(url, payload, { headers, timeout: 5000 });
    return { delivered: res.status >= 200 && res.status < 300 };
  }

  /**
   * 批量发送通知
   */
  async sendBulkNotifications(users, notificationData, channels = ['in_app']) {
    const results = [];
    
    for (const user of users) {
      try {
        const notification = await this.createAndSendNotification({
          ...notificationData,
          user: user._id
        }, channels);
        
        results.push({
          userId: user._id,
          success: true,
          notificationId: notification ? notification._id : null
        });
      } catch (error) {
        results.push({
          userId: user._id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取用户通知统计
   */
  async getUserNotificationStats(userId) {
    const [
      totalCount,
      unreadCount,
      readCount,
      archivedCount
    ] = await Promise.all([
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, status: 'unread' }),
      Notification.countDocuments({ user: userId, status: 'read' }),
      Notification.countDocuments({ user: userId, status: 'archived' })
    ]);

    return {
      totalCount,
      unreadCount,
      readCount,
      archivedCount
    };
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications() {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log(`清理了 ${result.deletedCount} 条过期通知`);
    return result;
  }
}

module.exports = new NotificationService();
