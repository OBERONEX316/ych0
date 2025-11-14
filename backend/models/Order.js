const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: '/images/default-product.jpg'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  variantSku: { type: String },
  variantAttributes: { type: Map, of: String },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const shippingAddressSchema = new mongoose.Schema({
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
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [orderItemSchema],
  itemsPrice: {
    type: Number,
    required: true,
    min: 0
  },
  shippingPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // 优惠券相关字段
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  couponCode: {
    type: String,
    trim: true
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  finalPrice: {
    type: Number,
    min: 0
  },
  shippingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    required: true,
    enum: ['alipay', 'wechat', 'bank'],
    default: 'alipay'
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refund_approved', 'refund_rejected', 'refund_completed'],
    default: 'pending'
  },
  // 物流信息
  shippingInfo: {
    carrier: {
      type: String,
      trim: true
    },
    trackingNumber: {
      type: String,
      trim: true
    },
    trackingUrl: {
      type: String,
      trim: true
    },
    estimatedDelivery: {
      type: Date
    },
    shippedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// 生成订单号
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// 计算总价
orderSchema.pre('save', function(next) {
  this.itemsPrice = this.items.reduce((total, item) => total + item.total, 0);
  this.totalPrice = this.itemsPrice + this.shippingPrice + this.taxPrice;
  
  // 计算最终价格（考虑优惠券折扣）
  this.finalPrice = Math.max(0, this.totalPrice - this.discountAmount);
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);
