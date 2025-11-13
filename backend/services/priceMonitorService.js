const PriceHistory = require('../models/PriceHistory');
const Product = require('../models/Product');

class PriceMonitorService {
  constructor() {
    this.priceCache = new Map();
    this.init();
  }

  // 初始化服务
  async init() {
    try {
      // 加载所有商品的最新价格
      const products = await Product.find({ isActive: true })
        .select('_id price')
        .lean();
      
      products.forEach(product => {
        this.priceCache.set(product._id.toString(), product.price);
      });
      
      console.log('价格监控服务初始化完成，监控商品数量:', products.length);
    } catch (error) {
      console.error('价格监控服务初始化失败:', error);
    }
  }

  // 检查价格变化并记录
  async checkAndRecordPriceChange(productId, newPrice, changeType = 'regular', notes = '') {
    try {
      const cachedPrice = this.priceCache.get(productId.toString());
      
      // 如果价格没有变化，不记录
      if (cachedPrice !== undefined && cachedPrice === newPrice) {
        return null;
      }

      // 记录价格变化
      const priceHistory = new PriceHistory({
        product: productId,
        price: newPrice,
        changeType,
        notes
      });

      await priceHistory.save();
      
      // 更新缓存
      this.priceCache.set(productId.toString(), newPrice);
      
      console.log(`价格变化记录: 商品 ${productId}, 价格 ${cachedPrice || '未知'} -> ${newPrice}`);
      
      return priceHistory;
      
    } catch (error) {
      console.error('记录价格变化失败:', error);
      throw error;
    }
  }

  // 批量检查价格变化
  async batchCheckPriceChanges(products) {
    const changes = [];
    
    for (const product of products) {
      try {
        const change = await this.checkAndRecordPriceChange(
          product._id,
          product.price,
          'regular',
          '批量价格检查'
        );
        
        if (change) {
          changes.push(change);
        }
      } catch (error) {
        console.error(`检查商品 ${product._id} 价格变化失败:`, error);
      }
    }
    
    return changes;
  }

  // 获取商品价格趋势
  async getPriceTrend(productId, days = 30) {
    try {
      return await PriceHistory.getPriceTrend(productId, days);
    } catch (error) {
      console.error('获取价格趋势失败:', error);
      throw error;
    }
  }

  // 预测价格变化
  async predictPriceChange(productId) {
    try {
      const priceHistory = await PriceHistory.find({ product: productId })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('price timestamp')
        .lean();
      
      if (priceHistory.length < 5) {
        return {
          prediction: 'insufficient_data',
          confidence: 0,
          message: '数据不足，无法预测'
        };
      }

      // 简单移动平均预测
      const recentPrices = priceHistory.slice(0, 5).map(p => p.price);
      const movingAverage = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      
      const currentPrice = recentPrices[0];
      const trend = movingAverage > currentPrice ? 'down' : 
                   movingAverage < currentPrice ? 'up' : 'stable';
      
      // 计算置信度（基于数据量和价格波动）
      const priceStd = Math.sqrt(
        recentPrices.reduce((sum, price) => sum + Math.pow(price - movingAverage, 2), 0) / recentPrices.length
      );
      
      const confidence = Math.max(0, 1 - (priceStd / currentPrice));
      
      return {
        prediction: trend,
        confidence: Math.round(confidence * 100),
        movingAverage: Math.round(movingAverage * 100) / 100,
        currentPrice,
        message: trend === 'up' ? '价格可能上涨' : 
                trend === 'down' ? '价格可能下降' : '价格可能保持稳定'
      };
      
    } catch (error) {
      console.error('价格预测失败:', error);
      return {
        prediction: 'error',
        confidence: 0,
        message: '预测失败'
      };
    }
  }

  // 获取价格警报（大幅价格变化）
  async getPriceAlerts(threshold = 0.2) {
    try {
      const alerts = [];
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // 获取最近24小时内的价格变化
      const recentChanges = await PriceHistory.find({
        timestamp: { $gte: oneDayAgo }
      })
      .populate('product', 'name category')
      .sort({ timestamp: -1 })
      .lean();

      // 按商品分组，获取每个商品的最新价格变化
      const changesByProduct = new Map();
      
      for (const change of recentChanges) {
        if (!changesByProduct.has(change.product._id.toString())) {
          changesByProduct.set(change.product._id.toString(), change);
        }
      }

      // 检查大幅价格变化
      for (const [productId, change] of changesByProduct) {
        const previousChange = await PriceHistory.findOne({
          product: productId,
          timestamp: { $lt: change.timestamp }
        })
        .sort({ timestamp: -1 })
        .lean();

        if (previousChange) {
          const priceChange = Math.abs((change.price - previousChange.price) / previousChange.price);
          
          if (priceChange > threshold) {
            alerts.push({
              product: change.product,
              currentPrice: change.price,
              previousPrice: previousChange.price,
              changePercent: Math.round(priceChange * 100),
              changeType: change.changeType,
              timestamp: change.timestamp
            });
          }
        }
      }

      return alerts;
      
    } catch (error) {
      console.error('获取价格警报失败:', error);
      throw error;
    }
  }

  // 清理旧的价格历史记录
  async cleanupOldRecords(daysToKeep = 365) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await PriceHistory.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      console.log(`清理价格历史记录: 删除了 ${result.deletedCount} 条记录`);
      return result.deletedCount;
      
    } catch (error) {
      console.error('清理价格历史记录失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const priceMonitorService = new PriceMonitorService();

module.exports = priceMonitorService;