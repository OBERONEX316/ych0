const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 接收用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户不能为空'],
    index: true
  },
  
  // 通知类型
  type: {
    type: String,
    required: [true, '通知类型不能为空'],
    enum: [
      'order_created',      // 订单创建
      'order_shipped',     // 订单发货
      'order_delivered',   // 订单送达
      'payment_success',   // 支付成功
      'payment_failed',    // 支付失败
      'refund_requested',  // 退款申请
      'refund_approved',   // 退款批准
      'refund_rejected',   // 退款拒绝
      'refund_completed',  // 退款完成
      'stock_alert',       // 库存预警
      'price_drop',        // 价格下降
      'promotion_available', // 促销可用
      'coupon_received',   // 收到优惠券
      'points_earned',     // 获得积分
      'level_up',          // 等级提升
      'wishlist_restock',  // 心愿单商品补货
      'wishlist_price_drop', // 心愿单商品降价
      'social_follow',     // 被关注
      'social_like',       // 被点赞
      'social_comment',    // 被评论
      'social_share',      // 被分享
      'chat_message',     // 聊天消息
      'system_announcement', // 系统公告
      'security_alert'     // 安全警报
    ]
  },
  
  // 通知标题
  title: {
    type: String,
    required: [true, '通知标题不能为空'],
    maxlength: [200, '标题不能超过200个字符']
  },
  
  // 通知内容
  message: {
    type: String,
    required: [true, '通知内容不能为空'],
    maxlength: [500, '内容不能超过500个字符']
  },
  
  // 相关数据
  data: {
    // 订单相关
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderNumber: String,
    
    // 商品相关
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    
    // 支付相关
    paymentId: String,
    amount: Number,
    
    // 退款相关
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Refund'
    },
    refundAmount: Number,
    
    // 优惠券相关
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    couponCode: String,
    
    // 积分相关
    points: Number,
    totalPoints: Number,
    
    // 社交相关
    socialUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    socialUsername: String,
    
    // 聊天相关
    chatSessionId: String,
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    },
    
    // 通用数据
    url: String,        // 跳转链接
    image: String,      // 图片链接
    priority: Number    // 优先级
  },
  
  // 通知状态
  status: {
    type: String,
    enum: ['unread', 'read', 'archived', 'deleted'],
    default: 'unread'
  },
  
  // 发送渠道
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'push', 'web_push'],
    default: ['in_app']
  }],
  
  // 发送状态
  deliveryStatus: {
    in_app: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      read: { type: Boolean, default: false }
    },
    email: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      read: { type: Boolean, default: false }
    },
    sms: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false }
    },
    push: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      clicked: { type: Boolean, default: false }
    },
    web_push: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      clicked: { type: Boolean, default: false }
    }
  },
  
  // 过期时间
  expiresAt: {
    type: Date,
    expires: 0
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 是否静默
  isSilent: {
    type: Boolean,
    default: false
  },
  
  // 分类标签
  tags: [{
    type: String,
    enum: ['transaction', 'promotion', 'social', 'security', 'system']
  }],
  
  // 元数据
  metadata: {
    campaignId: String,      // 营销活动ID
    templateId: String,      // 模板ID
    source: String,          // 来源
    category: String         // 分类
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：是否已过期
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// 虚拟字段：格式化时间
notificationSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleString('zh-CN');
});

// 索引优化
notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ 'data.orderId': 1 });
notificationSchema.index({ 'data.productId': 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
 

// 静态方法：获取用户通知
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    status,
    type,
    unreadOnly = false
  } = options;
  
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (unreadOnly) {
    query.status = 'unread';
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar')
    .populate('data.orderId', 'orderNumber')
    .populate('data.productId', 'name images')
    .populate('data.socialUserId', 'username avatar');
};

// 静态方法：标记为已读
notificationSchema.statics.markAsRead = function(notificationIds, userId) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      user: userId,
      status: 'unread'
    },
    { status: 'read' }
  );
};

// 静态方法：获取未读数量
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    user: userId,
    status: 'unread'
  });
};

// 静态方法：创建通知
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  
  // 设置默认过期时间（30天后）
  if (!notification.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    notification.expiresAt = expiresAt;
  }
  
  return notification.save();
};

// 中间件：保存前设置默认值
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    this.expiresAt = expiresAt;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
