const Product = require('../models/Product');
const UserActivity = require('../models/UserActivity');
const Order = require('../models/Order');
const { createEmbedding, findSimilarItems } = require('./aiRecommendationService');

class RecommendationService {
  constructor() {
    this.userProfiles = new Map();
    this.itemSimilarities = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30分钟缓存
  }

  // 实时协同过滤推荐
  async getRealTimeCollaborativeFiltering(userId, limit = 12) {
    try {
      // 获取用户最近行为
      const recentActivities = await UserActivity.find({
        userId,
        isValid: true,
        timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 最近2小时
      }).sort({ timestamp: -1 });

      if (recentActivities.length === 0) {
        return [];
      }

      // 分析实时兴趣
      const realTimeInterests = this.analyzeRealTimeInterests(recentActivities);
      
      // 获取基于实时兴趣的推荐
      const recommendations = await this.getRecommendationsFromInterests(
        realTimeInterests,
        limit
      );

      return recommendations;
    } catch (error) {
      console.error('实时协同过滤错误:', error);
      return [];
    }
  }

  // 分析实时兴趣
  analyzeRealTimeInterests(activities) {
    const interests = {
      categories: new Map(),
      products: new Map(),
      brands: new Map()
    };

    activities.forEach(activity => {
      const { actionType, actionData, weight } = activity;
      const timeDecay = this.calculateTimeDecay(activity.timestamp);
      const finalWeight = weight * timeDecay;

      // 分类兴趣
      if (actionData?.productCategory) {
        const current = interests.categories.get(actionData.productCategory) || 0;
        interests.categories.set(actionData.productCategory, current + finalWeight);
      }

      // 商品兴趣
      if (actionData?.productId) {
        const current = interests.products.get(actionData.productId.toString()) || 0;
        interests.products.set(actionData.productId.toString(), current + finalWeight);
      }

      // 品牌兴趣
      if (actionData?.productBrand) {
        const current = interests.brands.get(actionData.productBrand) || 0;
        interests.brands.set(actionData.productBrand, current + finalWeight);
      }
    });

    return interests;
  }

  // 计算时间衰减因子
  calculateTimeDecay(timestamp) {
    const now = Date.now();
    const elapsed = now - timestamp.getTime();
    const halfLife = 60 * 60 * 1000; // 1小时半衰期
    return Math.exp(-elapsed / halfLife);
  }

  // 从兴趣获取推荐
  async getRecommendationsFromInterests(interests, limit) {
    const topCategories = Array.from(interests.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const topProducts = Array.from(interests.products.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId]) => productId);

    if (topCategories.length === 0 && topProducts.length === 0) {
      return [];
    }

    // 构建查询条件
    const queryConditions = [];
    
    if (topCategories.length > 0) {
      queryConditions.push({ category: { $in: topCategories } });
    }
    
    if (topProducts.length > 0) {
      queryConditions.push({ _id: { $in: topProducts } });
    }

    const recommendations = await Product.find({
      $or: queryConditions,
      isActive: true
    })
    .sort({ rating: -1, salesCount: -1 })
    .limit(limit);

    return recommendations;
  }

  // 混合推荐 - 结合多种算法
  async getHybridRecommendations(userId, context = {}) {
    try {
      const [
        collaborativeResults,
        contentBasedResults,
        popularResults
      ] = await Promise.all([
        this.getRealTimeCollaborativeFiltering(userId, 8),
        this.getContentBasedRecommendations(userId, 6),
        this.getPopularProducts(4)
      ]);

      // 合并和去重推荐结果
      const allRecommendations = [
        ...collaborativeResults,
        ...contentBasedResults,
        ...popularResults
      ];

      const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
      
      // 根据上下文和用户偏好重新排序
      const finalRecommendations = this.rerankRecommendations(
        uniqueRecommendations,
        userId,
        context
      );

      return finalRecommendations.slice(0, 12);
    } catch (error) {
      console.error('混合推荐错误:', error);
      return await this.getPopularProducts(12);
    }
  }

  // 基于内容的推荐
  async getContentBasedRecommendations(userId, limit = 6) {
    try {
      // 获取用户历史偏好
      const userPreferences = await this.getUserPreferences(userId);
      
      if (userPreferences.categories.length === 0) {
        return [];
      }

      return await Product.find({
        category: { $in: userPreferences.categories },
        isActive: true,
        _id: { $nin: userPreferences.viewedProducts }
      })
      .sort({ rating: -1, salesCount: -1 })
      .limit(limit);
    } catch (error) {
      console.error('基于内容推荐错误:', error);
      return [];
    }
  }

  // 获取用户偏好
  async getUserPreferences(userId) {
    const cacheKey = `preferences_${userId}`;
    
    if (this.userProfiles.has(cacheKey)) {
      const cached = this.userProfiles.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    // 获取用户行为数据
    const activities = await UserActivity.find({
      userId,
      isValid: true,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const preferences = {
      categories: [],
      brands: [],
      priceRange: { min: Infinity, max: 0 },
      viewedProducts: []
    };

    activities.forEach(activity => {
      if (activity.actionData?.productCategory) {
        preferences.categories.push(activity.actionData.productCategory);
      }
      if (activity.actionData?.productBrand) {
        preferences.brands.push(activity.actionData.productBrand);
      }
      if (activity.actionData?.productPrice) {
        preferences.priceRange.min = Math.min(
          preferences.priceRange.min,
          activity.actionData.productPrice
        );
        preferences.priceRange.max = Math.max(
          preferences.priceRange.max,
          activity.actionData.productPrice
        );
      }
      if (activity.actionData?.productId) {
        preferences.viewedProducts.push(activity.actionData.productId.toString());
      }
    });

    // 去重和排序
    preferences.categories = [...new Set(preferences.categories)];
    preferences.brands = [...new Set(preferences.brands)];
    preferences.viewedProducts = [...new Set(preferences.viewedProducts)];

    // 缓存结果
    this.userProfiles.set(cacheKey, {
      data: preferences,
      timestamp: Date.now()
    });

    return preferences;
  }

  // 获取热门商品
  async getPopularProducts(limit = 12) {
    return await Product.find({ isActive: true })
      .sort({ salesCount: -1, rating: -1 })
      .limit(limit);
  }

  // 推荐结果去重
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(item => {
      if (seen.has(item._id.toString())) {
        return false;
      }
      seen.add(item._id.toString());
      return true;
    });
  }

  // 重新排序推荐结果
  rerankRecommendations(recommendations, userId, context) {
    // 简单的重新排序逻辑，可以根据业务需求扩展
    return recommendations.sort((a, b) => {
      // 优先显示高评分商品
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.5) {
        return ratingDiff;
      }
      
      // 其次考虑销量
      const salesDiff = (b.salesCount || 0) - (a.salesCount || 0);
      if (salesDiff !== 0) {
        return salesDiff;
      }
      
      // 最后考虑上新时间
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  // 生成推荐解释
  generateExplanation(recommendation, reason) {
    const explanations = {
      similar: `根据您浏览过的类似商品「${reason}」推荐`,
      category: `基于您感兴趣的「${reason}」分类推荐`,
      popular: `「${reason}」是当前热销商品`,
      new: `新上架的「${reason}」可能符合您的喜好`,
      trending: `正在流行的「${reason}」`
    };

    return explanations[reason] || `为您推荐「${reason}」`;
  }

  // A/B测试不同的推荐算法
  async getABTestRecommendations(userId, variant) {
    const variants = {
      A: await this.getRealTimeCollaborativeFiltering(userId, 12),
      B: await this.getHybridRecommendations(userId),
      C: await this.getContentBasedRecommendations(userId, 12)
    };

    return variants[variant] || variants.B;
  }
}

module.exports = new RecommendationService();