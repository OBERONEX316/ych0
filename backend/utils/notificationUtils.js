const NotificationService = require('../services/notificationService');

/**
 * 发送订单相关通知
 */
const sendOrderNotification = async (userId, order, type, additionalData = {}) => {
  const notificationTypes = {
    created: {
      title: '订单创建成功',
      message: `您的订单 #${order.orderNumber} 已创建成功，等待处理中`
    },
    shipped: {
      title: '订单已发货',
      message: `您的订单 #${order.orderNumber} 已发货，运单号: ${additionalData.trackingNumber || '待更新'}`
    },
    delivered: {
      title: '订单已送达',
      message: `您的订单 #${order.orderNumber} 已成功送达，请确认收货`
    }
  };

  const notificationData = notificationTypes[type];
  if (!notificationData) return null;

  return await NotificationService.createAndSendNotification({
    user: userId,
    type: `order_${type}`,
    title: notificationData.title,
    message: notificationData.message,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.finalPrice,
      url: `/orders/${order._id}`
    },
    channels: ['in_app', 'email'],
    priority: 'high'
  });
};

/**
 * 发送支付相关通知
 */
const sendPaymentNotification = async (userId, payment, type, additionalData = {}) => {
  const notificationTypes = {
    success: {
      title: '支付成功',
      message: `支付成功，金额: ¥${payment.amount}`
    },
    failed: {
      title: '支付失败',
      message: '支付失败，请重新尝试或联系客服'
    }
  };

  const notificationData = notificationTypes[type];
  if (!notificationData) return null;

  return await NotificationService.createAndSendNotification({
    user: userId,
    type: `payment_${type}`,
    title: notificationData.title,
    message: notificationData.message,
    data: {
      paymentId: payment._id,
      amount: payment.amount,
      url: '/orders'
    },
    channels: ['in_app'],
    priority: 'high'
  });
};

// 便捷别名：支付成功/失败
const sendPaymentSuccessNotification = async (userId, payment) => {
  return sendPaymentNotification(userId, payment, 'success');
};
const sendPaymentFailedNotification = async (userId, payment) => {
  return sendPaymentNotification(userId, payment, 'failed');
};

/**
 * 发送退款相关通知
 */
const sendRefundNotification = async (userId, refund, type, additionalData = {}) => {
  const notificationTypes = {
    requested: {
      title: '退款申请已提交',
      message: `您的退款申请 #${refund.refundNumber} 已提交，等待审核中`
    },
    approved: {
      title: '退款申请已批准',
      message: `您的退款申请 #${refund.refundNumber} 已批准，退款金额: ¥${refund.amount}`
    },
    rejected: {
      title: '退款申请被拒绝',
      message: `您的退款申请 #${refund.refundNumber} 被拒绝，原因: ${additionalData.reason || '请联系客服'}`
    },
    completed: {
      title: '退款已完成',
      message: `退款 #${refund.refundNumber} 已完成，金额已退回您的账户`
    }
  };

  const notificationData = notificationTypes[type];
  if (!notificationData) return null;

  return await NotificationService.createAndSendNotification({
    user: userId,
    type: `refund_${type}`,
    title: notificationData.title,
    message: notificationData.message,
    data: {
      refundId: refund._id,
      refundNumber: refund.refundNumber,
      amount: refund.amount,
      url: `/refunds/${refund._id}`
    },
    channels: ['in_app', 'email'],
    priority: 'high'
  });
};

/**
 * 发送库存预警通知
 */
const sendStockAlertNotification = async (userId, product, currentStock) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'stock_alert',
    title: '库存预警',
    message: `商品 "${product.name}" 库存不足，当前库存: ${currentStock}`,
    data: {
      productId: product._id,
      productName: product.name,
      currentStock,
      url: `/products/${product._id}`
    },
    channels: ['in_app'],
    priority: 'normal'
  });
};

/**
 * 发送促销通知
 */
const sendPromotionNotification = async (userId, promotion) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'promotion_available',
    title: '新促销活动',
    message: `新促销活动: ${promotion.title}，${promotion.description}`,
    data: {
      promotionId: promotion._id,
      title: promotion.title,
      discount: promotion.discount,
      url: '/promotions'
    },
    channels: ['in_app', 'email'],
    priority: 'normal'
  });
};

/**
 * 发送优惠券通知
 */
const sendCouponNotification = async (userId, coupon) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'coupon_received',
    title: '收到优惠券',
    message: `您收到一张优惠券: ${coupon.code}，折扣: ${coupon.discount}${coupon.discountType === 'percentage' ? '%' : '元'}`,
    data: {
      couponId: coupon._id,
      couponCode: coupon.code,
      discount: coupon.discount,
      discountType: coupon.discountType,
      url: '/coupons'
    },
    channels: ['in_app', 'email'],
    priority: 'normal'
  });
};

/**
 * 发送积分通知
 */
const sendPointsNotification = async (userId, points, totalPoints, reason) => {
  const action = points > 0 ? '获得' : '使用';
  
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'points_earned',
    title: '积分变动',
    message: `您${action}了 ${Math.abs(points)} 积分，${reason}。当前总积分: ${totalPoints}`,
    data: {
      points: points,
      totalPoints: totalPoints,
      reason: reason,
      url: '/profile/points'
    },
    channels: ['in_app'],
    priority: 'low'
  });
};

/**
 * 发送等级提升通知
 */
const sendLevelUpNotification = async (userId, newLevel, levelName) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'level_up',
    title: '等级提升',
    message: `恭喜！您的会员等级提升到 ${levelName} (${newLevel}级)`,
    data: {
      newLevel: newLevel,
      levelName: levelName,
      url: '/profile'
    },
    channels: ['in_app', 'email'],
    priority: 'normal'
  });
};

/**
 * 发送社交互动通知
 */
const sendSocialNotification = async (userId, interactionUser, type) => {
  const notificationTypes = {
    follow: {
      title: '新关注',
      message: `${interactionUser.username} 关注了您`
    },
    like: {
      title: '新点赞',
      message: `${interactionUser.username} 点赞了您的动态`
    },
    comment: {
      title: '新评论',
      message: `${interactionUser.username} 评论了您的动态`
    },
    share: {
      title: '新分享',
      message: `${interactionUser.username} 分享了您的动态`
    }
  };

  const notificationData = notificationTypes[type];
  if (!notificationData) return null;

  return await NotificationService.createAndSendNotification({
    user: userId,
    type: `social_${type}`,
    title: notificationData.title,
    message: notificationData.message,
    data: {
      socialUserId: interactionUser._id,
      socialUsername: interactionUser.username,
      url: `/social/profile/${interactionUser._id}`
    },
    channels: ['in_app'],
    priority: 'low'
  });
};

/**
 * 发送系统公告
 */
const sendSystemAnnouncement = async (userId, title, message, priority = 'normal') => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'system_announcement',
    title: title,
    message: message,
    data: {
      priority: priority,
      url: '/notifications'
    },
    channels: ['in_app', 'email'],
    priority: priority
  });
};

/**
 * 发送安全警报
 */
const sendSecurityAlert = async (userId, alertType, message) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'security_alert',
    title: '安全警报',
    message: message,
    data: {
      alertType: alertType,
      url: '/security'
    },
    channels: ['in_app', 'email', 'sms'],
    priority: 'urgent'
  });
};

/**
 * 欢迎邮件通知（注册成功）
 */
const sendWelcomeNotification = async (userId) => {
  return await NotificationService.createAndSendNotification({
    user: userId,
    type: 'welcome',
    title: '欢迎加入',
    message: '感谢注册，祝您购物愉快！',
    data: { url: '/' },
    channels: ['in_app','email'],
    priority: 'low'
  });
};

module.exports = {
  sendOrderNotification,
  sendPaymentNotification,
  sendPaymentSuccessNotification,
  sendPaymentFailedNotification,
  sendRefundNotification,
  sendStockAlertNotification,
  sendPromotionNotification,
  sendCouponNotification,
  sendPointsNotification,
  sendLevelUpNotification,
  sendSocialNotification,
  sendSystemAnnouncement,
  sendSecurityAlert,
  sendWelcomeNotification
};
