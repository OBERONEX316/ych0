const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '商品名称不能为空'],
    trim: true,
    maxlength: [100, '商品名称不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '商品描述不能为空'],
    maxlength: [1000, '商品描述不能超过1000个字符']
  },
  price: {
    type: Number,
    required: [true, '商品价格不能为空'],
    min: [0, '商品价格不能为负数'],
    set: val => Math.round(val * 100) / 100 // 保留两位小数
  },
  originalPrice: {
    type: Number,
    min: [0, '原价不能为负数'],
    set: val => Math.round(val * 100) / 100
  },
  image: {
    type: String,
    default: '/images/default-product.jpg'
  },
  images: [{
    type: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, '评分不能为负数'],
    max: [5, '评分不能超过5分']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, '评价数量不能为负数']
  },
  sales: {
    type: Number,
    default: 0,
    min: [0, '销量不能为负数']
  },
  favoriteCount: {
    type: Number,
    default: 0,
    min: [0, '收藏数量不能为负数']
  },
  stock: {
    type: Number,
    required: [true, '库存不能为空'],
    min: [0, '库存不能为负数'],
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, '库存预警阈值不能为负数']
  },
  criticalStockThreshold: {
    type: Number,
    default: 5,
    min: [0, '库存紧急阈值不能为负数']
  },
  stockAlertEnabled: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    required: [true, '商品分类不能为空'],
    enum: {
      values: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty'],
      message: '分类 {VALUE} 不被支持'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  specifications: {
    type: Map,
    of: String
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：折扣百分比
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }
  return 0;
});

// 虚拟字段：是否有库存
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// 虚拟字段：库存状态
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) {
    return 'out-of-stock';
  } else if (this.stock <= this.criticalStockThreshold) {
    return 'critical';
  } else if (this.stock <= this.lowStockThreshold) {
    return 'low';
  } else {
    return 'normal';
  }
});

// 虚拟字段：是否需要库存预警
productSchema.virtual('needsStockAlert').get(function() {
  return this.stockAlertEnabled && (this.stockStatus === 'critical' || this.stockStatus === 'low');
});

// 虚拟字段：评价
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  match: { status: 'approved' }
});

// 虚拟字段：评价分布
productSchema.virtual('ratingDistribution').get(async function() {
  const Review = mongoose.model('Review');
  const distribution = await Review.aggregate([
    {
      $match: { 
        product: this._id,
        status: 'approved' 
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
  
  // 初始化所有评分的计数为0
  const result = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  distribution.forEach(item => {
    result[item._id] = item.count;
  });
  
  return result;
});

// 索引优化
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sales: -1 });
productSchema.index({ createdAt: -1 });

// 静态方法：根据分类获取商品
productSchema.statics.findByCategory = function(category, limit = 10) {
  return this.find({ category, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// 静态方法：获取热销商品
productSchema.statics.findTopSelling = function(limit = 10) {
  return this.find({ isActive: true })
    .limit(limit)
    .sort({ sales: -1, rating: -1 });
};

// 静态方法：搜索商品
productSchema.statics.searchProducts = function(keyword, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return this.find({
    isActive: true,
    $text: { $search: keyword }
  })
  .skip(skip)
  .limit(limit)
  .sort({ score: { $meta: 'textScore' } });
};

// 静态方法：获取推荐商品 - 基于用户行为
productSchema.statics.getRecommendedProducts = async function(userId, limit = 10) {
  try {
    const User = mongoose.model('User');
    const Order = mongoose.model('Order');
    
    // 获取用户信息
    const user = await User.findById(userId).populate('wishlist.product');
    if (!user) {
      return this.findTopSelling(limit); // 返回热销商品
    }
    
    // 策略1: 基于心愿单的推荐
    const wishlistProducts = user.wishlist.map(item => item.product);
    const wishlistCategories = [...new Set(wishlistProducts.map(p => p?.category).filter(Boolean))];
    
    // 策略2: 基于购买历史的推荐
    const userOrders = await Order.find({ user: userId, status: { $in: ['delivered', 'shipped'] } })
      .populate('items.product');
    
    const purchasedProducts = userOrders.flatMap(order => 
      order.items.map(item => item.product)
    );
    const purchasedCategories = [...new Set(purchasedProducts.map(p => p?.category).filter(Boolean))];
    
    // 策略3: 基于用户偏好的推荐
    const preferredCategories = [...new Set([...wishlistCategories, ...purchasedCategories])];
    
    let recommendedProducts = [];
    
    // 如果用户有偏好，推荐同类商品
    if (preferredCategories.length > 0) {
      recommendedProducts = await this.find({
        category: { $in: preferredCategories },
        isActive: true,
        _id: { $nin: [...wishlistProducts.map(p => p?._id), ...purchasedProducts.map(p => p?._id)].filter(Boolean) }
      })
      .limit(limit * 2) // 获取更多用于排序
      .sort({ rating: -1, sales: -1 });
    }
    
    // 如果推荐商品不足，补充热销商品
    if (recommendedProducts.length < limit) {
      const topSelling = await this.findTopSelling(limit - recommendedProducts.length);
      recommendedProducts = [...recommendedProducts, ...topSelling];
    }
    
    // 去重并限制数量
    const uniqueProducts = recommendedProducts.filter((product, index, self) =>
      index === self.findIndex(p => p._id.toString() === product._id.toString())
    );
    
    return uniqueProducts.slice(0, limit);
    
  } catch (error) {
    console.error('获取推荐商品失败:', error);
    return this.findTopSelling(limit); // 出错时返回热销商品
  }
};

// 静态方法：获取热门推荐（基于协同过滤）
productSchema.statics.getPopularRecommendations = async function(limit = 10) {
  // 基于销量、评分、收藏数的综合评分
  return this.find({ isActive: true })
    .limit(limit)
    .sort({ 
      sales: -1, 
      rating: -1, 
      favoriteCount: -1,
      reviewCount: -1 
    });
};

// 静态方法：获取相关商品（基于商品相似度）
productSchema.statics.getRelatedProducts = async function(productId, limit = 8) {
  const currentProduct = await this.findById(productId);
  if (!currentProduct) {
    return this.findTopSelling(limit);
  }
  
  return this.find({
    category: currentProduct.category,
    isActive: true,
    _id: { $ne: productId }
  })
  .limit(limit)
  .sort({ rating: -1, sales: -1 });
};

// 静态方法：获取需要库存预警的商品
productSchema.statics.getStockAlerts = async function(alertType = 'all') {
  const query = { 
    isActive: true, 
    stockAlertEnabled: true 
  };
  
  if (alertType === 'critical') {
    query.$expr = { $lte: ['$stock', '$criticalStockThreshold'] };
  } else if (alertType === 'low') {
    query.$expr = { 
      $and: [
        { $gt: ['$stock', '$criticalStockThreshold'] },
        { $lte: ['$stock', '$lowStockThreshold'] }
      ]
    };
  } else if (alertType === 'out-of-stock') {
    query.stock = 0;
  } else {
    query.$expr = {
      $or: [
        { $lte: ['$stock', '$criticalStockThreshold'] },
        { $lte: ['$stock', '$lowStockThreshold'] }
      ]
    };
  }
  
  return this.find(query)
    .sort({ stock: 1, name: 1 })
    .select('name stock lowStockThreshold criticalStockThreshold category');
};

// 静态方法：获取库存统计
productSchema.statics.getStockStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
        },
        criticalStock: {
          $sum: {
            $cond: [
              { $and: [
                { $gt: ['$stock', 0] },
                { $lte: ['$stock', '$criticalStockThreshold'] }
              ] },
              1, 0
            ]
          }
        },
        lowStock: {
          $sum: {
            $cond: [
              { $and: [
                { $gt: ['$stock', '$criticalStockThreshold'] },
                { $lte: ['$stock', '$lowStockThreshold'] }
              ] },
              1, 0
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalProducts: 0,
    totalStock: 0,
    outOfStock: 0,
    criticalStock: 0,
    lowStock: 0
  };
};

// 实例方法：减少库存
productSchema.methods.decreaseStock = function(quantity) {
  if (this.stock < quantity) {
    throw new Error('库存不足');
  }
  this.stock -= quantity;
  return this.save();
};

// 实例方法：增加销量
productSchema.methods.increaseSales = function(quantity) {
  this.sales += quantity;
  return this.save();
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;