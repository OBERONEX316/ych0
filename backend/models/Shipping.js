const mongoose = require('mongoose');

const shippingSchema = new mongoose.Schema({
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
  // 物流公司信息
  carrier: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true
    },
    contact: {
      phone: String,
      email: String
    }
  },
  // 运单信息
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  trackingUrl: {
    type: String,
    trim: true
  },
  // 配送状态
  status: {
    type: String,
    required: true,
    enum: [
      'pending',       // 待发货
      'picked_up',     // 已揽收
      'in_transit',    // 运输中
      'out_for_delivery', // 派送中
      'delivered',     // 已送达
      'exception',     // 异常
      'returned'       // 已退回
    ],
    default: 'pending'
  },
  // 时间信息
  estimatedDelivery: {
    type: Date,
    required: true
  },
  pickedUpAt: {
    type: Date
  },
  inTransitAt: {
    type: Date
  },
  outForDeliveryAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  exceptionAt: {
    type: Date
  },
  returnedAt: {
    type: Date
  },
  // 配送地址
  deliveryAddress: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    province: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  // 包裹信息
  package: {
    weight: {
      type: Number,
      required: true,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    itemsCount: {
      type: Number,
      required: true,
      min: 1
    }
  },
  // 费用信息
  shippingCost: {
    type: Number,
    required: true,
    min: 0
  },
  insuranceCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  // 异常信息
  exception: {
    reason: String,
    description: String,
    resolution: String
  },
  // 签收信息
  proofOfDelivery: {
    signedBy: String,
    signatureImage: String,
    receivedAt: Date,
    notes: String
  },
  // 物流跟踪历史
  trackingHistory: [{
    status: {
      type: String,
      required: true
    },
    location: {
      name: String,
      address: String,
      city: String,
      province: String
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 生成运单号
shippingSchema.pre('save', async function(next) {
  if (!this.trackingNumber) {
    const count = await mongoose.model('Shipping').countDocuments();
    this.trackingNumber = `TN${Date.now()}${(count + 1).toString().padStart(8, '0')}`;
  }
  next();
});

// 计算总费用
shippingSchema.pre('save', function(next) {
  this.totalCost = this.shippingCost + this.insuranceCost;
  next();
});

// 添加跟踪历史记录的方法
shippingSchema.methods.addTrackingEvent = function(status, description, location) {
  this.trackingHistory.push({
    status,
    description,
    location,
    timestamp: new Date()
  });
  
  // 根据状态更新时间戳
  switch (status) {
    case 'picked_up':
      this.pickedUpAt = new Date();
      break;
    case 'in_transit':
      this.inTransitAt = new Date();
      break;
    case 'out_for_delivery':
      this.outForDeliveryAt = new Date();
      break;
    case 'delivered':
      this.deliveredAt = new Date();
      break;
    case 'exception':
      this.exceptionAt = new Date();
      break;
    case 'returned':
      this.returnedAt = new Date();
      break;
  }
  
  this.status = status;
};

// 静态方法：根据状态获取配送列表
shippingSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('order user');
};

// 静态方法：获取用户的配送历史
shippingSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).populate('order').sort({ createdAt: -1 });
};

// 静态方法：获取承运商的配送统计
shippingSchema.statics.getCarrierStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$carrier.code',
        carrierName: { $first: '$carrier.name' },
        totalShipments: { $sum: 1 },
        delivered: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        inTransit: {
          $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
        },
        exceptions: {
          $sum: { $cond: [{ $eq: ['$status', 'exception'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Shipping', shippingSchema);