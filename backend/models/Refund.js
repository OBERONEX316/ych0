const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 退款信息
  refundNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // 退款状态
  status: {
    type: String,
    required: true,
    enum: [
      'pending',      // 待处理
      'processing',   // 处理中
      'approved',     // 已批准
      'rejected',     // 已拒绝
      'completed',    // 已完成
      'cancelled'     // 已取消
    ],
    default: 'pending'
  },
  // 退款类型
  type: {
    type: String,
    required: true,
    enum: ['full', 'partial'],
    default: 'full'
  },
  // 退款商品信息
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // 处理信息
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  // 支付信息
  paymentMethod: {
    type: String,
    required: true
  },
  // 物流信息（如果是退货退款）
  returnShipping: {
    trackingNumber: String,
    carrier: String,
    status: {
      type: String,
      enum: ['pending', 'shipped', 'received', 'inspected']
    }
  },
  // 时间信息
  estimatedProcessingTime: {
    type: Number, // 预计处理时间（小时）
    default: 72
  },
  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }],
  // 沟通记录
  communications: [{
    type: {
      type: String,
      enum: ['user', 'admin', 'system']
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// 生成退款单号
refundSchema.pre('save', async function(next) {
  if (!this.refundNumber) {
    const count = await mongoose.model('Refund').countDocuments();
    this.refundNumber = `REF${Date.now()}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// 添加沟通记录的方法
refundSchema.methods.addCommunication = function(type, message) {
  this.communications.push({
    type,
    message,
    createdAt: new Date()
  });
};

// 静态方法：根据状态获取退款列表
refundSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('order user processedBy');
};

// 静态方法：获取用户的退款历史
refundSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).populate('order').sort({ createdAt: -1 });
};

// 静态方法：获取退款统计
refundSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// 静态方法：获取最近30天的退款趋势
refundSchema.statics.getTrend = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

module.exports = mongoose.model('Refund', refundSchema);