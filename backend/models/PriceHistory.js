const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changeType: {
    type: String,
    enum: ['regular', 'sale', 'discount', 'promotion'],
    default: 'regular'
  },
  salePrice: {
    type: Number,
    min: 0
  },
  saleEndDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
priceHistorySchema.index({ product: 1, timestamp: -1 });
priceHistorySchema.index({ timestamp: -1 });
priceHistorySchema.index({ changeType: 1 });

// 虚拟字段：价格变化百分比
priceHistorySchema.virtual('priceChangePercent').get(function() {
  // 这个字段需要在查询时通过聚合计算
  return null;
});

// 静态方法：获取商品的最新价格历史
priceHistorySchema.statics.getLatestPrice = async function(productId, limit = 10) {
  return this.find({ product: productId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// 静态方法：获取商品的价格趋势
priceHistorySchema.statics.getPriceTrend = async function(productId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        recordCount: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// 静态方法：检测价格异常
priceHistorySchema.statics.detectPriceAnomalies = async function(productId, threshold = 0.3) {
  const prices = await this.find({ product: productId })
    .sort({ timestamp: -1 })
    .limit(50)
    .select('price timestamp')
    .lean();
  
  if (prices.length < 2) return [];
  
  const anomalies = [];
  
  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i].price;
    const previousPrice = prices[i - 1].price;
    const priceChange = Math.abs((currentPrice - previousPrice) / previousPrice);
    
    if (priceChange > threshold) {
      anomalies.push({
        timestamp: prices[i].timestamp,
        price: currentPrice,
        previousPrice: previousPrice,
        changePercent: priceChange * 100,
        isAnomaly: true
      });
    }
  }
  
  return anomalies;
};

// 中间件：保存价格历史时验证数据
priceHistorySchema.pre('save', function(next) {
  // 如果是促销价格，需要验证促销结束日期
  if (this.changeType === 'sale' || this.changeType === 'promotion') {
    if (!this.saleEndDate) {
      return next(new Error('促销价格必须设置结束日期'));
    }
    if (this.saleEndDate <= new Date()) {
      return next(new Error('促销结束日期必须晚于当前时间'));
    }
  }
  
  next();
});

module.exports = mongoose.model('PriceHistory', priceHistorySchema);