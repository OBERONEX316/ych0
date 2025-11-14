const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [20, '用户名不能超过20个字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 默认不返回密码字段
  },
  
  // 个人信息
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, '名字不能超过50个字符']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, '姓氏不能超过50个字符']
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  phone: {
    type: String,
    trim: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
  },
  
  // 地址信息
  addresses: [{
    recipient: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
    },
    province: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    detail: {
      type: String,
      required: true,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    postalCode: {
      type: String,
      trim: true,
      match: [/^[1-9]\d{5}$/, '请输入有效的邮政编码']
    }
  }],
  
  // 账户状态
  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin', 'moderator'],
    default: 'buyer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  
  // 购物相关信息
  cart: {
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalItems: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      default: 0
    }
  },

  // 积分系统
  points: {
    available: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    levelName: {
      type: String,
      default: '新手'
    },
    nextLevelPoints: {
      type: Number,
      default: 100
    }
  },

  // 心愿单/收藏夹
  wishlist: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 偏好设置
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    inAppNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'zh-CN'
    },
    // 通知类型偏好
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      refundUpdates: { type: Boolean, default: true },
      stockAlerts: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      socialInteractions: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true }
    }
  },

  // 客服相关字段（仅对客服和管理员有效）
  supportSettings: {
    isAvailable: {
      type: Boolean,
      default: false
    },
    maxConcurrentSessions: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    currentSessions: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    satisfactionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    specialties: [{
      type: String,
      enum: ['technical', 'billing', 'product', 'shipping', 'refund', 'general']
    }],
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    autoAcceptSessions: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：全名
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username;
});

// 虚拟字段：粉丝数量
userSchema.virtual('followerCount').get(function() {
  if (this._followerCount !== undefined) {
    return this._followerCount;
  }
  return 0;
});

userSchema.virtual('followerCount').set(function(value) {
  this._followerCount = value;
});

// 虚拟字段：关注数量
userSchema.virtual('followingCount').get(function() {
  if (this._followingCount !== undefined) {
    return this._followingCount;
  }
  return 0;
});

userSchema.virtual('followingCount').set(function(value) {
  this._followingCount = value;
});

// 虚拟字段：互相关注数量
userSchema.virtual('mutualFriendCount').get(function() {
  if (this._mutualFriendCount !== undefined) {
    return this._mutualFriendCount;
  }
  return 0;
});

userSchema.virtual('mutualFriendCount').set(function(value) {
  this._mutualFriendCount = value;
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：更新最后登录时间
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// 静态方法：通过邮箱或用户名查找用户
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// 实例方法：计算购物车总计
userSchema.methods.calculateCartTotals = async function() {
  try {
    // 填充商品信息以获取价格
    await this.populate('cart.items.product', 'price');
    
    let totalItems = 0;
    let totalPrice = 0;

    // 计算总数量和总价格
    for (const item of this.cart.items) {
      if (item.product && item.product.price) {
        totalItems += item.quantity;
        totalPrice += item.quantity * item.product.price;
      }
    }

    this.cart.totalItems = totalItems;
    this.cart.totalPrice = totalPrice;
    
    return this;
  } catch (error) {
    console.error('计算购物车总计失败:', error);
    throw error;
  }
};

// 索引优化
userSchema.index({ createdAt: -1 });
userSchema.index({ 'addresses.isDefault': 1 });

module.exports = mongoose.model('User', userSchema);
