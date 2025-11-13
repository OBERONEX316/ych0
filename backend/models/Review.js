const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, '商品不能为空']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户不能为空']
  },
  rating: {
    type: Number,
    required: [true, '评分不能为空'],
    min: [1, '评分不能低于1分'],
    max: [5, '评分不能超过5分']
  },
  title: {
    type: String,
    required: [true, '评价标题不能为空'],
    trim: true,
    maxlength: [100, '评价标题不能超过100个字符']
  },
  comment: {
    type: String,
    required: [true, '评价内容不能为空'],
    trim: true,
    maxlength: [1000, '评价内容不能超过1000个字符']
  },
  images: [{
    type: String,
    trim: true
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引：确保每个用户对同一商品只能评价一次
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// 索引优化
reviewSchema.index({ product: 1, status: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ 'helpful.count': -1, createdAt: -1 });

// 静态方法：获取商品的平均评分
reviewSchema.statics.getAverageRating = async function(productId) {
  const result = await this.aggregate([
    {
      $match: { 
        product: productId,
        status: 'approved' 
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  try {
    if (result.length > 0) {
      await mongoose.model('Product').findByIdAndUpdate(productId, {
        rating: Math.round(result[0].averageRating * 10) / 10,
        reviewCount: result[0].reviewCount
      });
    } else {
      await mongoose.model('Product').findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.error('更新商品评分失败:', error);
  }
};

// 保存后更新商品评分
reviewSchema.post('save', function() {
  if (this.status === 'approved') {
    this.constructor.getAverageRating(this.product);
  }
});

// 删除后更新商品评分
reviewSchema.post('findOneAndDelete', function(doc) {
  if (doc && doc.status === 'approved') {
    doc.constructor.getAverageRating(doc.product);
  }
});

// 更新后更新商品评分
reviewSchema.post('findOneAndUpdate', function(doc) {
  if (doc && doc.status === 'approved') {
    doc.constructor.getAverageRating(doc.product);
  }
});

// 实例方法：标记为有帮助
reviewSchema.methods.markHelpful = async function(userId) {
  if (this.helpful.users.includes(userId)) {
    throw new Error('您已经标记过此评价');
  }
  
  this.helpful.users.push(userId);
  this.helpful.count += 1;
  
  return this.save();
};

// 实例方法：取消标记有帮助
reviewSchema.methods.unmarkHelpful = async function(userId) {
  const userIndex = this.helpful.users.indexOf(userId);
  if (userIndex === -1) {
    throw new Error('您尚未标记此评价');
  }
  
  this.helpful.users.splice(userIndex, 1);
  this.helpful.count = Math.max(0, this.helpful.count - 1);
  
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;