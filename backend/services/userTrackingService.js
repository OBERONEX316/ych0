const UserActivity = require('../models/UserActivity');

class UserTrackingService {
  constructor() {
    this.batchSize = 50;
    this.batchQueue = [];
    this.isProcessing = false;
    this.processInterval = null;
    
    // 启动批处理
    this.startBatchProcessing();
  }

  // 跟踪用户行为
  async trackUserActivity(userId, activityData) {
    try {
      const activity = {
        userId,
        actionType: activityData.actionType,
        actionData: activityData.actionData || {},
        weight: activityData.weight || 1.0,
        decayFactor: activityData.decayFactor || 0.95,
        timestamp: activityData.timestamp || new Date(),
        isValid: true,
        metadata: activityData.metadata || {}
      };

      // 添加到批处理队列
      this.batchQueue.push(activity);
      
      // 如果队列达到批处理大小，立即处理
      if (this.batchQueue.length >= this.batchSize && !this.isProcessing) {
        await this.processBatch();
      }

      return true;
    } catch (error) {
      console.error('用户行为跟踪错误:', error);
      return false;
    }
  }

  // 开始批处理
  startBatchProcessing() {
    this.processInterval = setInterval(() => {
      if (this.batchQueue.length > 0 && !this.isProcessing) {
        this.processBatch().catch(console.error);
      }
    }, 5000); // 每5秒检查一次
  }

  // 处理批处理队列
  async processBatch() {
    if (this.isProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const batchToProcess = [...this.batchQueue];
      this.batchQueue = [];

      // 批量插入数据库
      if (batchToProcess.length > 0) {
        await UserActivity.insertMany(batchToProcess, { ordered: false });
        console.log(`✅ 批量记录 ${batchToProcess.length} 个用户行为`);
      }
    } catch (error) {
      console.error('批处理用户行为错误:', error);
      
      // 如果批量插入失败，尝试逐条插入
      for (const activity of batchToProcess) {
        try {
          const userActivity = new UserActivity(activity);
          await userActivity.save();
        } catch (singleError) {
          console.error('单个用户行为记录错误:', singleError);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // 获取用户行为统计
  async getUserActivityStats(userId, timeframe = '7d') {
    try {
      const timeFilter = this.getTimeFilter(timeframe);
      
      const stats = await UserActivity.aggregate([
        {
          $match: {
            userId: userId,
            isValid: true,
            timestamp: timeFilter
          }
        },
        {
          $group: {
            _id: '$actionType',
            count: { $sum: 1 },
            totalWeight: { $sum: '$weight' },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('获取用户行为统计错误:', error);
      return [];
    }
  }

  // 获取时间过滤器
  getTimeFilter(timeframe) {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { $gte: startDate };
  }

  // 记录商品浏览行为
  async trackProductView(userId, product, context = {}) {
    return this.trackUserActivity(userId, {
      actionType: 'product_view',
      actionData: {
        productId: product._id,
        productName: product.name,
        productCategory: product.category,
        productPrice: product.price,
        productBrand: product.brand
      },
      weight: 1.5, // 浏览行为权重较高
      decayFactor: 0.9,
      metadata: {
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        referrer: context.referrer,
        sessionId: context.sessionId
      }
    });
  }

  // 记录商品点击行为
  async trackProductClick(userId, product, context = {}) {
    return this.trackUserActivity(userId, {
      actionType: 'product_click',
      actionData: {
        productId: product._id,
        productName: product.name,
        productCategory: product.category
      },
      weight: 2.0, // 点击行为权重更高
      decayFactor: 0.85,
      metadata: context
    });
  }

  // 记录搜索行为
  async trackSearch(userId, query, resultsCount, context = {}) {
    return this.trackUserActivity(userId, {
      actionType: 'search',
      actionData: {
        searchQuery: query,
        resultsCount: resultsCount
      },
      weight: 1.2,
      decayFactor: 0.8,
      metadata: context
    });
  }

  // 记录购买行为
  async trackPurchase(userId, order, context = {}) {
    return this.trackUserActivity(userId, {
      actionType: 'purchase',
      actionData: {
        orderId: order._id,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
        productCategories: [...new Set(order.items.map(item => item.product?.category))].filter(Boolean)
      },
      weight: 3.0, // 购买行为权重最高
      decayFactor: 0.7,
      metadata: context
    });
  }

  // 记录添加到购物车
  async trackAddToCart(userId, product, quantity, context = {}) {
    return this.trackUserActivity(userId, {
      actionType: 'add_to_cart',
      actionData: {
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price
      },
      weight: 2.5,
      decayFactor: 0.75,
      metadata: context
    });
  }

  // 清理旧数据
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await UserActivity.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`🗑️ 清理了 ${result.deletedCount} 条旧用户行为数据`);
      return result.deletedCount;
    } catch (error) {
      console.error('清理用户行为数据错误:', error);
      return 0;
    }
  }

  // 停止服务
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    // 处理剩余队列
    if (this.batchQueue.length > 0) {
      this.processBatch().catch(console.error);
    }
  }
}

// 创建单例实例
const userTrackingService = new UserTrackingService();

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('🛑 正在关闭用户行为跟踪服务...');
  userTrackingService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 正在关闭用户行为跟踪服务...');
  userTrackingService.stop();
  process.exit(0);
});

module.exports = userTrackingService;