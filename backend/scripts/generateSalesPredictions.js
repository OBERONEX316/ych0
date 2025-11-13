const mongoose = require('mongoose');
const SalesPrediction = require('../models/SalesPrediction');
const Product = require('../models/Product');
const Order = require('../models/Order');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');

// 生成历史销售数据
async function generateHistoricalData(productId, months = 24) {
  const historicalData = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const baseQuantity = Math.floor(Math.random() * 500) + 100;
    const seasonalityFactor = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.3 + 1;
    const trendFactor = 1 + (months - i) * 0.02; // 2% monthly growth
    
    const quantity = Math.floor(baseQuantity * seasonalityFactor * trendFactor);
    const price = Math.floor(Math.random() * 500) + 100;
    const revenue = quantity * price;
    
    historicalData.push({
      date,
      quantity,
      revenue,
      price
    });
  }
  
  return historicalData;
}

// 生成销售预测数据
async function generateSalesPredictions() {
  try {
    console.log('🚀 开始生成销售预测演示数据...');
    
    // 获取所有产品
    const products = await Product.find({}).limit(10);
    console.log(`📦 找到 ${products.length} 个产品`);
    
    if (products.length === 0) {
      console.log('❌ 没有找到产品，请先运行产品数据生成脚本');
      process.exit(1);
    }
    
    const predictions = [];
    const algorithms = ['linear_regression', 'time_series', 'seasonal_decomposition', 'machine_learning', 'ensemble'];
    const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    
    for (const product of products) {
      console.log(`📝 为产品 "${product.name}" 生成预测数据...`);
      
      // 生成历史数据
      const historicalData = await generateHistoricalData(product._id);
      
      // 为每个周期生成预测
      for (const period of periods) {
        // 生成多个预测
        for (let i = 0; i < 3; i++) {
          const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
          const confidenceLevel = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
          
          // 基于历史数据计算预测值
          const recentData = historicalData.slice(-6);
          const avgQuantity = recentData.reduce((sum, data) => sum + data.quantity, 0) / recentData.length;
          const avgRevenue = recentData.reduce((sum, data) => sum + data.revenue, 0) / recentData.length;
          
          // 添加一些随机变化
          const quantityVariation = (Math.random() - 0.5) * 0.3; // ±15%
          const revenueVariation = (Math.random() - 0.5) * 0.3;
          
          const predictedQuantity = Math.floor(avgQuantity * (1 + quantityVariation));
          const predictedRevenue = Math.floor(avgRevenue * (1 + revenueVariation));
          
          // 计算预测周期
          const now = new Date();
          let periodStart, periodEnd;
          
          switch (period) {
            case 'daily':
              periodStart = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
              periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
              break;
            case 'weekly':
              periodStart = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000);
              periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
              break;
            case 'monthly':
              periodStart = new Date(now.getFullYear(), now.getMonth() + (i + 1), 1);
              periodEnd = new Date(now.getFullYear(), now.getMonth() + (i + 2), 1);
              break;
            case 'quarterly':
              const currentQuarter = Math.floor(now.getMonth() / 3);
              periodStart = new Date(now.getFullYear(), (currentQuarter + (i + 1)) * 3, 1);
              periodEnd = new Date(now.getFullYear(), (currentQuarter + (i + 2)) * 3, 1);
              break;
            case 'yearly':
              periodStart = new Date(now.getFullYear() + (i + 1), 0, 1);
              periodEnd = new Date(now.getFullYear() + (i + 2), 0, 1);
              break;
          }
          
          // 生成影响因素
          const factors = {
            seasonality: Math.sin((periodStart.getMonth() / 12) * 2 * Math.PI) * 0.3 + 1,
            trend: Math.random() * 0.1 - 0.05, // -5% to +5%
            promotionalImpact: Math.random() * 0.5 + 0.8, // 0.8 to 1.3
            competitorImpact: Math.random() * 0.4 + 0.8, // 0.8 to 1.2
            marketTrend: Math.random() * 0.3 + 0.85 // 0.85 to 1.15
          };
          
          const prediction = new SalesPrediction({
            productId: product._id,
            predictionDate: new Date(),
            predictionPeriod: period,
            periodStart,
            periodEnd,
            predictedQuantity,
            predictedRevenue,
            confidenceLevel,
            algorithmUsed: algorithm,
            historicalData: historicalData.slice(-12), // 最近12个数据点
            factors,
            status: 'active',
            notes: `基于${algorithm}算法生成的${period}预测`
          });
          
          predictions.push(prediction);
        }
      }
    }
    
    // 批量插入预测数据
    if (predictions.length > 0) {
      await SalesPrediction.insertMany(predictions);
      console.log(`✅ 成功生成 ${predictions.length} 个销售预测记录`);
    }
    
    // 为一些预测添加实际结果（用于准确率分析）
    console.log('📊 为部分预测添加实际结果数据...');
    const completedPredictions = predictions.filter((_, index) => index % 3 === 0);
    
    for (const prediction of completedPredictions) {
      // 生成实际结果（与预测值有一定偏差）
      const errorRate = (Math.random() - 0.5) * 0.4; // ±20% error
      const actualQuantity = Math.floor(prediction.predictedQuantity * (1 + errorRate));
      const actualRevenue = Math.floor(prediction.predictedRevenue * (1 + errorRate));
      
      await prediction.updateActualResults(actualQuantity, actualRevenue);
    }
    
    console.log(`✅ 完成 ${completedPredictions.length} 个预测的实际结果更新`);
    
    // 显示统计信息
    const stats = await SalesPrediction.aggregate([
      {
        $group: {
          _id: '$predictionPeriod',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidenceLevel' },
          avgPredictedRevenue: { $avg: '$predictedRevenue' }
        }
      }
    ]);
    
    console.log('\n📈 销售预测数据统计:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} 个预测, 平均置信度: ${(stat.avgConfidence * 100).toFixed(1)}%, 平均预测收入: ¥${stat.avgPredictedRevenue.toFixed(0)}`);
    });
    
    console.log('\n🎉 销售预测演示数据生成完成！');
    
  } catch (error) {
    console.error('❌ 生成销售预测数据失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  generateSalesPredictions();
}

module.exports = { generateSalesPredictions };
