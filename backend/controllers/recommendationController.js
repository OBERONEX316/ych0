const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const recommendationService = require('../services/recommendationService');
const aiRecommendationService = require('../services/aiRecommendationService');

// 基于用户行为数据的智能推荐
const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variant, context } = req.query;
    
    // 使用增强的推荐服务
    let recommendedProducts = [];
    let recommendationType = 'hybrid';
    let explanation = '';
    
    // A/B测试支持
    if (variant && ['A', 'B', 'C'].includes(variant)) {
      recommendedProducts = await recommendationService.getABTestRecommendations(userId, variant);
      recommendationType = `ab_test_${variant}`;
      explanation = 'A/B测试推荐';
    } else {
      // 混合推荐算法
      recommendedProducts = await recommendationService.getHybridRecommendations(userId, {
        ...context,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });
      
      // 生成推荐解释
      if (recommendedProducts.length > 0) {
        explanation = recommendationService.generateExplanation(
          recommendedProducts[0], 
          'personalized'
        );
      }
    }

    // 如果没有推荐结果，使用热门商品兜底
    if (recommendedProducts.length === 0) {
      recommendedProducts = await recommendationService.getPopularProducts(12);
      recommendationType = 'popular';
      explanation = '热门商品推荐';
    }

    // 获取用户兴趣分析（用于前端展示）
    const userInterests = await analyzeUserInterests(userId, []);

    res.json({
      success: true,
      data: recommendedProducts,
      type: recommendationType,
      explanation,
      interests: userInterests.categories.slice(0, 5),
      metadata: {
        count: recommendedProducts.length,
        algorithm: recommendationType,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('推荐系统错误:', error);
    res.status(500).json({
      success: false,
      error: '获取推荐失败'
    });
  }
};

// 分析用户兴趣偏好
const analyzeUserInterests = async (userId, activities) => {
  const interests = {
    categories: [],
    products: [],
    brands: [],
    priceRange: { min: Infinity, max: 0 }
  };
  
  const categoryWeights = new Map();
  const productWeights = new Map();
  
  // 分析行为数据
  activities.forEach(activity => {
    const { actionType, actionData, weight, decayFactor } = activity;
    const decayedWeight = weight * Math.pow(decayFactor, 
      (Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60));
    
    if (actionData?.productCategory) {
      const currentWeight = categoryWeights.get(actionData.productCategory) || 0;
      categoryWeights.set(actionData.productCategory, currentWeight + decayedWeight);
    }
    
    if (actionData?.productId) {
      const currentWeight = productWeights.get(actionData.productId.toString()) || 0;
      productWeights.set(actionData.productId.toString(), currentWeight + decayedWeight);
    }
    
    // 更新价格范围
    if (actionData?.productPrice) {
      interests.priceRange.min = Math.min(interests.priceRange.min, actionData.productPrice);
      interests.priceRange.max = Math.max(interests.priceRange.max, actionData.productPrice);
    }
  });
  
  // 排序并格式化兴趣数据
  interests.categories = Array.from(categoryWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, weight]) => ({ category, weight }));
    
  interests.products = Array.from(productWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([productId, weight]) => ({ productId, weight }));
    
  return interests;
};

// 基于兴趣推荐商品
const getRecommendationsByInterests = async (userInterests) => {
  const topCategories = userInterests.categories.slice(0, 3).map(item => item.category);
  const topProductIds = userInterests.products.slice(0, 10).map(item => item.productId);
  
  // 获取用户可能感兴趣的商品
  const recommendedProducts = await Product.find({
    $or: [
      { category: { $in: topCategories } },
      { _id: { $in: topProductIds } }
    ],
    isActive: true
  })
  .sort({ 
    rating: -1, 
    salesCount: -1,
    createdAt: -1 
  })
  .limit(12);
  
  return recommendedProducts;
};

// 基于购买历史推荐
const getRecommendationsByPurchaseHistory = async (userOrders) => {
  const purchasedCategories = new Set();
  const purchasedProducts = new Set();
  
  userOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.product && item.product.category) {
        purchasedCategories.add(item.product.category);
        purchasedProducts.add(item.product._id.toString());
      }
    });
  });

  if (purchasedCategories.size > 0) {
    return await Product.find({
      category: { $in: Array.from(purchasedCategories) },
      _id: { $nin: Array.from(purchasedProducts) },
      isActive: true
    })
    .sort({ rating: -1, salesCount: -1 })
    .limit(8);
  }
  
  return [];
};

// 基于商品相似度的推荐
const getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { algorithm = 'ai', limit = 8, page = 1 } = req.query;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    let similarProducts = [];
    let recommendationAlgorithm = 'content_based';
    
    // 使用AI推荐或基于内容的推荐
    if (algorithm === 'ai' && aiRecommendationService.isModelLoaded) {
      similarProducts = await aiRecommendationService.findSimilarItems(productId, parseInt(limit) * 3);
      recommendationAlgorithm = 'ai_embedding';
    } else {
      // 基于内容的推荐（分类+属性相似度）
      similarProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isActive: true
      })
      .sort({ rating: -1, salesCount: -1 })
      .limit(parseInt(limit) * 3);
    }

    // 如果AI推荐结果不足，用基于内容的结果补充
    if (similarProducts.length < 4 && algorithm === 'ai') {
      const contentBasedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isActive: true,
        _id: { $nin: similarProducts.map(p => p._id) }
      })
      .sort({ rating: -1, salesCount: -1 })
      .limit(Math.max(0, parseInt(limit) * 3 - similarProducts.length));
      
      similarProducts = [...similarProducts, ...contentBasedProducts];
      recommendationAlgorithm = 'hybrid';
    }

    // 分页切片
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const paged = similarProducts.slice(start, end);

    // 解释性标签（整体）
    const explanations = [];
    explanations.push('同分类');
    const avgPrice = paged.reduce((acc, p) => acc + (p.price || 0), 0) / Math.max(paged.length, 1);
    const priceDiffRatio = product.price ? Math.abs(avgPrice - product.price) / product.price : 1;
    if (priceDiffRatio <= 0.15) explanations.push('价格接近');
    const avgRating = paged.reduce((acc, p) => acc + (p.rating || 0), 0) / Math.max(paged.length, 1);
    if (product.rating !== undefined && Math.abs(avgRating - product.rating) <= 0.5) explanations.push('评分相近');

    res.json({
      success: true,
      data: paged,
      metadata: {
        algorithm: recommendationAlgorithm,
        originalProduct: {
          id: product._id,
          name: product.name,
          category: product.category
        },
        generatedAt: new Date().toISOString(),
        pagination: {
          page: pageNum,
          limit: pageSize,
          totalItems: similarProducts.length,
          totalPages: Math.ceil(similarProducts.length / pageSize)
        },
        explanations
      }
    });

  } catch (error) {
    console.error('相似商品推荐错误:', error);
    res.status(500).json({
      success: false,
      error: '获取相似商品失败'
    });
  }
};

// 热门商品推荐
const getPopularProducts = async (req, res) => {
  try {
    const { limit = 12, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;
    const popularProducts = await Product.find({ isActive: true })
      .sort({ salesCount: -1, rating: -1 })
      .skip(skip)
      .limit(pageSize);
    const total = await Product.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: popularProducts,
      metadata: {
        pagination: {
          page: pageNum,
          limit: pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });

  } catch (error) {
    console.error('热门商品推荐错误:', error);
    res.status(500).json({
      success: false,
      error: '获取热门商品失败'
    });
  }
};

// 新上架商品推荐
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 8, page = 1 } = req.query;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;

    const newArrivals = await Product.find({
      isActive: true,
      createdAt: { $gte: oneWeekAgo }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
    const total = await Product.countDocuments({ isActive: true, createdAt: { $gte: oneWeekAgo } });

    res.json({
      success: true,
      data: newArrivals,
      metadata: {
        pagination: {
          page: pageNum,
          limit: pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });

  } catch (error) {
    console.error('新商品推荐错误:', error);
    res.status(500).json({
      success: false,
      error: '获取新商品失败'
    });
  }
};

// 实时推荐（基于最近用户行为）
const getRealTimeRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 8 } = req.query;
    
    const realTimeRecommendations = await recommendationService.getRealTimeCollaborativeFiltering(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: realTimeRecommendations,
      type: 'real_time',
      metadata: {
        count: realTimeRecommendations.length,
        generatedAt: new Date().toISOString(),
        algorithm: 'real_time_collaborative_filtering'
      }
    });

  } catch (error) {
    console.error('实时推荐错误:', error);
    res.status(500).json({
      success: false,
      error: '获取实时推荐失败'
    });
  }
};

// 获取推荐系统状态
const getRecommendationSystemStatus = async (req, res) => {
  try {
    const aiStatus = aiRecommendationService.getStatus();
    
    res.json({
      success: true,
      data: {
        ai_recommendation: {
          enabled: aiStatus.isModelLoaded,
          items_embedded: aiStatus.itemEmbeddingsCount,
          users_embedded: aiStatus.userEmbeddingsCount,
          last_updated: aiStatus.lastUpdated
        },
        traditional_recommendation: {
          enabled: true,
          algorithms: ['content_based', 'collaborative_filtering', 'hybrid']
        },
        overall_status: 'operational',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取推荐系统状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取系统状态失败'
    });
  }
};

// 深度学习推荐（实验性功能）
const getDeepLearningRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 12 } = req.query;
    
    const deepLearningRecommendations = await aiRecommendationService.getDeepLearningRecommendations(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: deepLearningRecommendations,
      type: 'deep_learning',
      metadata: {
        count: deepLearningRecommendations.length,
        generatedAt: new Date().toISOString(),
        algorithm: 'neural_network_embedding'
      }
    });

  } catch (error) {
    console.error('深度学习推荐错误:', error);
    res.status(500).json({
      success: false,
      error: '获取深度学习推荐失败'
    });
  }
};

module.exports = {
  getPersonalizedRecommendations,
  getSimilarProducts,
  getPopularProducts,
  getNewArrivals,
  getRealTimeRecommendations,
  getRecommendationSystemStatus,
  getDeepLearningRecommendations
};
