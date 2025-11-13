const SalesPrediction = require('../models/SalesPrediction');
const Order = require('../models/Order');
const Product = require('../models/Product');
const UserBehavior = require('../models/UserBehavior');

class SalesPredictionService {
  
  // Main prediction method
  async generatePrediction(productId, period = 'monthly', customFactors = {}) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(productId, period);
      
      // Calculate factors
      const factors = await this.calculateFactors(productId, customFactors);
      
      // Generate prediction using multiple algorithms
      const predictions = await this.runPredictionAlgorithms(historicalData, factors);
      
      // Select best prediction based on confidence
      const bestPrediction = this.selectBestPrediction(predictions);
      
      // Create prediction record
      const prediction = await this.createPredictionRecord({
        productId,
        period,
        historicalData,
        factors,
        prediction: bestPrediction
      });

      return prediction;
    } catch (error) {
      console.error('Error generating sales prediction:', error);
      throw error;
    }
  }

  // Get historical sales data
  async getHistoricalData(productId, period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000); // 52 weeks
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000); // 24 months
        break;
      case 'quarterly':
        startDate = new Date(now.getTime() - 12 * 90 * 24 * 60 * 60 * 1000); // 12 quarters
        break;
      case 'yearly':
        startDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000);
    }

    const orders = await Order.find({
      'orderItems.product': productId,
      createdAt: { $gte: startDate },
      status: { $in: ['completed', 'shipped', 'delivered'] }
    }).select('createdAt orderItems');

    const historicalData = [];
    const aggregatedData = {};

    orders.forEach(order => {
      const key = this.getPeriodKey(order.createdAt, period);
      if (!aggregatedData[key]) {
        aggregatedData[key] = { quantity: 0, revenue: 0, date: order.createdAt };
      }
      
      const orderItem = order.orderItems.find(item => item.product.toString() === productId.toString());
      if (orderItem) {
        aggregatedData[key].quantity += orderItem.quantity;
        aggregatedData[key].revenue += orderItem.price * orderItem.quantity;
      }
    });

    Object.keys(aggregatedData).sort().forEach(key => {
      const data = aggregatedData[key];
      historicalData.push({
        date: data.date,
        quantity: data.quantity,
        revenue: data.revenue,
        price: data.revenue / data.quantity || 0
      });
    });

    return historicalData;
  }

  // Calculate various factors affecting sales
  async calculateFactors(productId, customFactors = {}) {
    const factors = {
      seasonality: 1.0,
      trend: 0,
      promotionalImpact: 1.0,
      competitorImpact: 1.0,
      marketTrend: 1.0
    };

    // Seasonality calculation
    factors.seasonality = await this.calculateSeasonality(productId);
    
    // Trend calculation
    factors.trend = await this.calculateTrend(productId);
    
    // Promotional impact
    factors.promotionalImpact = await this.calculatePromotionalImpact(productId);
    
    // Market trend
    factors.marketTrend = await this.calculateMarketTrend(productId);
    
    // Merge with custom factors
    return { ...factors, ...customFactors };
  }

  // Calculate seasonality factor
  async calculateSeasonality(productId) {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Get historical data for the same month in previous years
    const historicalData = await this.getHistoricalData(productId, 'monthly');
    
    if (historicalData.length < 12) return 1.0;
    
    // Calculate average sales for each month
    const monthlyAverages = {};
    historicalData.forEach(data => {
      const month = data.date.getMonth();
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = { total: 0, count: 0 };
      }
      monthlyAverages[month].total += data.quantity;
      monthlyAverages[month].count += 1;
    });
    
    // Calculate overall average
    let overallAverage = 0;
    Object.keys(monthlyAverages).forEach(month => {
      overallAverage += monthlyAverages[month].total / monthlyAverages[month].count;
    });
    overallAverage /= Object.keys(monthlyAverages).length;
    
    // Return seasonality factor for current month
    const currentMonthAverage = monthlyAverages[currentMonth] ? 
      monthlyAverages[currentMonth].total / monthlyAverages[currentMonth].count : overallAverage;
    
    return currentMonthAverage / overallAverage;
  }

  // Calculate trend factor
  async calculateTrend(productId) {
    const historicalData = await this.getHistoricalData(productId, 'monthly');
    
    if (historicalData.length < 6) return 0;
    
    // Simple linear regression for trend
    const n = historicalData.length;
    const sumX = historicalData.reduce((sum, _, index) => sum + index, 0);
    const sumY = historicalData.reduce((sum, data) => sum + data.quantity, 0);
    const sumXY = historicalData.reduce((sum, data, index) => sum + index * data.quantity, 0);
    const sumXX = historicalData.reduce((sum, _, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope;
  }

  // Calculate promotional impact
  async calculatePromotionalImpact(productId) {
    // Check for active promotions
    const now = new Date();
    const FlashSale = require('../models/FlashSale');
    const GroupBuying = require('../models/GroupBuying');
    
    const activeFlashSale = await FlashSale.findOne({
      'products.productId': productId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: 'active'
    });
    
    const activeGroupBuying = await GroupBuying.findOne({
      'products.productId': productId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: 'active'
    });
    
    let impact = 1.0;
    
    if (activeFlashSale) {
      const productInSale = activeFlashSale.products.find(p => p.productId.toString() === productId.toString());
      if (productInSale) {
        impact *= 1.5; // 50% increase for flash sales
      }
    }
    
    if (activeGroupBuying) {
      impact *= 1.3; // 30% increase for group buying
    }
    
    return impact;
  }

  // Calculate market trend
  async calculateMarketTrend(productId) {
    const product = await Product.findById(productId);
    if (!product) return 1.0;
    
    // Get user behavior data for the product category
    const behaviors = await UserBehavior.find({
      targetType: 'product',
      targetId: productId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    if (behaviors.length === 0) return 1.0;
    
    // Calculate engagement trend
    const recentBehaviors = behaviors.filter(b => 
      b.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const olderBehaviors = behaviors.filter(b => 
      b.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentBehaviors.length === 0 || olderBehaviors.length === 0) return 1.0;
    
    const recentEngagement = recentBehaviors.length / 7; // per day
    const olderEngagement = olderBehaviors.length / 23; // per day
    
    return recentEngagement / olderEngagement;
  }

  // Run multiple prediction algorithms
  async runPredictionAlgorithms(historicalData, factors) {
    const predictions = [];
    
    // Linear Regression
    predictions.push(this.linearRegressionPrediction(historicalData, factors));
    
    // Time Series
    predictions.push(this.timeSeriesPrediction(historicalData, factors));
    
    // Seasonal Decomposition
    predictions.push(this.seasonalDecompositionPrediction(historicalData, factors));
    
    // Machine Learning (simple)
    predictions.push(this.machineLearningPrediction(historicalData, factors));
    
    return predictions;
  }

  // Linear regression prediction
  linearRegressionPrediction(historicalData, factors) {
    if (historicalData.length < 3) {
      return {
        algorithm: 'linear_regression',
        predictedQuantity: 0,
        predictedRevenue: 0,
        confidenceLevel: 0.1
      };
    }
    
    const n = historicalData.length;
    const sumX = historicalData.reduce((sum, _, index) => sum + index, 0);
    const sumY = historicalData.reduce((sum, data) => sum + data.quantity, 0);
    const sumXY = historicalData.reduce((sum, data, index) => sum + index * data.quantity, 0);
    const sumXX = historicalData.reduce((sum, _, index) => sum + index * index, 0);
    const sumYY = historicalData.reduce((sum, data) => sum + data.quantity * data.quantity, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextIndex = n;
    let predictedQuantity = intercept + slope * nextIndex;
    
    // Apply factors
    predictedQuantity *= factors.seasonality * factors.promotionalImpact * factors.marketTrend;
    
    // Calculate average price
    const avgPrice = historicalData.reduce((sum, data) => sum + data.price, 0) / n;
    const predictedRevenue = predictedQuantity * avgPrice;
    
    // Calculate R-squared for confidence
    const rSquared = Math.pow((n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)), 2);
    
    return {
      algorithm: 'linear_regression',
      predictedQuantity: Math.max(0, Math.round(predictedQuantity)),
      predictedRevenue: Math.max(0, Math.round(predictedRevenue)),
      confidenceLevel: Math.max(0.1, Math.min(0.9, rSquared || 0.5))
    };
  }

  // Time series prediction (simple moving average with trend)
  timeSeriesPrediction(historicalData, factors) {
    if (historicalData.length < 3) {
      return {
        algorithm: 'time_series',
        predictedQuantity: 0,
        predictedRevenue: 0,
        confidenceLevel: 0.1
      };
    }
    
    const windowSize = Math.min(6, historicalData.length);
    const recentData = historicalData.slice(-windowSize);
    
    // Calculate moving average
    const avgQuantity = recentData.reduce((sum, data) => sum + data.quantity, 0) / windowSize;
    const avgRevenue = recentData.reduce((sum, data) => sum + data.revenue, 0) / windowSize;
    
    // Calculate trend
    const trend = historicalData.length > 6 ? 
      (historicalData[historicalData.length - 1].quantity - historicalData[historicalData.length - 7].quantity) / 6 : 0;
    
    let predictedQuantity = avgQuantity + trend;
    let predictedRevenue = avgRevenue + (trend * avgRevenue / avgQuantity);
    
    // Apply factors
    predictedQuantity *= factors.seasonality * factors.promotionalImpact * factors.marketTrend;
    predictedRevenue *= factors.seasonality * factors.promotionalImpact * factors.marketTrend;
    
    // Confidence based on data stability
    const quantityVariance = this.calculateVariance(recentData.map(d => d.quantity));
    const meanQuantity = recentData.reduce((sum, d) => sum + d.quantity, 0) / windowSize;
    const coefficientOfVariation = Math.sqrt(quantityVariance) / meanQuantity;
    
    return {
      algorithm: 'time_series',
      predictedQuantity: Math.max(0, Math.round(predictedQuantity)),
      predictedRevenue: Math.max(0, Math.round(predictedRevenue)),
      confidenceLevel: Math.max(0.1, Math.min(0.9, 1 - coefficientOfVariation))
    };
  }

  // Seasonal decomposition prediction
  seasonalDecompositionPrediction(historicalData, factors) {
    if (historicalData.length < 12) {
      return this.timeSeriesPrediction(historicalData, factors);
    }
    
    // Calculate seasonal indices
    const seasonalIndices = this.calculateSeasonalIndices(historicalData);
    
    // Deseasonalize data
    const deseasonalizedData = historicalData.map((data, index) => ({
      ...data,
      deseasonalizedQuantity: data.quantity / seasonalIndices[index % 12]
    }));
    
    // Apply trend to deseasonalized data
    const trendPrediction = this.linearRegressionPrediction(deseasonalizedData, { ...factors, seasonality: 1.0 });
    
    // Apply seasonal factor
    const nextSeasonIndex = historicalData.length % 12;
    const seasonalFactor = seasonalIndices[nextSeasonIndex] || 1.0;
    
    return {
      algorithm: 'seasonal_decomposition',
      predictedQuantity: Math.max(0, Math.round(trendPrediction.predictedQuantity * seasonalFactor)),
      predictedRevenue: Math.max(0, Math.round(trendPrediction.predictedRevenue * seasonalFactor)),
      confidenceLevel: trendPrediction.confidenceLevel * 0.95
    };
  }

  // Machine learning prediction (simplified)
  machineLearningPrediction(historicalData, factors) {
    if (historicalData.length < 6) {
      return this.timeSeriesPrediction(historicalData, factors);
    }
    
    // Simple ensemble of other methods
    const linearPred = this.linearRegressionPrediction(historicalData, factors);
    const timeSeriesPred = this.timeSeriesPrediction(historicalData, factors);
    const seasonalPred = historicalData.length >= 12 ? 
      this.seasonalDecompositionPrediction(historicalData, factors) : timeSeriesPred;
    
    const ensembleQuantity = (linearPred.predictedQuantity + timeSeriesPred.predictedQuantity + seasonalPred.predictedQuantity) / 3;
    const ensembleRevenue = (linearPred.predictedRevenue + timeSeriesPred.predictedRevenue + seasonalPred.predictedRevenue) / 3;
    const ensembleConfidence = (linearPred.confidenceLevel + timeSeriesPred.confidenceLevel + seasonalPred.confidenceLevel) / 3;
    
    return {
      algorithm: 'machine_learning',
      predictedQuantity: Math.max(0, Math.round(ensembleQuantity)),
      predictedRevenue: Math.max(0, Math.round(ensembleRevenue)),
      confidenceLevel: Math.max(0.1, Math.min(0.95, ensembleConfidence))
    };
  }

  // Helper methods
  getPeriodKey(date, period) {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        return d.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
      case 'yearly':
        return String(d.getFullYear());
      default:
        return d.toISOString().split('T')[0];
    }
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  calculateSeasonalIndices(historicalData) {
    const indices = new Array(12).fill(0);
    const counts = new Array(12).fill(0);
    
    historicalData.forEach((data, index) => {
      const month = data.date.getMonth();
      indices[month] += data.quantity;
      counts[month] += 1;
    });
    
    // Calculate overall average
    const overallAverage = indices.reduce((sum, val, i) => sum + (counts[i] > 0 ? val / counts[i] : 0), 0) / 12;
    
    // Normalize indices
    return indices.map((val, i) => counts[i] > 0 ? val / counts[i] / overallAverage : 1.0);
  }

  selectBestPrediction(predictions) {
    // Select prediction with highest confidence
    return predictions.reduce((best, current) => 
      current.confidenceLevel > best.confidenceLevel ? current : best
    );
  }

  async createPredictionRecord({ productId, period, historicalData, factors, prediction }) {
    const now = new Date();
    let periodStart, periodEnd;
    
    switch (period) {
      case 'daily':
        periodStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        periodStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1);
        periodEnd = new Date(now.getFullYear(), (currentQuarter + 2) * 3, 1);
        break;
      case 'yearly':
        periodStart = new Date(now.getFullYear() + 1, 0, 1);
        periodEnd = new Date(now.getFullYear() + 2, 0, 1);
        break;
      default:
        periodStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    return await SalesPrediction.create({
      productId,
      predictionPeriod: period,
      periodStart,
      periodEnd,
      predictedQuantity: prediction.predictedQuantity,
      predictedRevenue: prediction.predictedRevenue,
      confidenceLevel: prediction.confidenceLevel,
      algorithmUsed: prediction.algorithm,
      historicalData: historicalData.slice(-24), // Keep last 24 data points
      factors,
      status: 'active'
    });
  }

  // Update predictions with actual results
  async updatePredictionAccuracy() {
    try {
      const activePredictions = await SalesPrediction.find({ status: 'active' });
      
      for (const prediction of activePredictions) {
        if (new Date() > prediction.periodEnd) {
          // Get actual results
          const actualResults = await this.getActualResults(prediction);
          
          if (actualResults.quantity > 0) {
            await prediction.updateActualResults(actualResults.quantity, actualResults.revenue);
          }
        }
      }
    } catch (error) {
      console.error('Error updating prediction accuracy:', error);
    }
  }

  async getActualResults(prediction) {
    const orders = await Order.find({
      'orderItems.product': prediction.productId,
      createdAt: {
        $gte: prediction.periodStart,
        $lte: prediction.periodEnd
      },
      status: { $in: ['completed', 'shipped', 'delivered'] }
    });

    let totalQuantity = 0;
    let totalRevenue = 0;

    orders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.product.toString() === prediction.productId.toString()) {
          totalQuantity += item.quantity;
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    return { quantity: totalQuantity, revenue: totalRevenue };
  }
}

module.exports = new SalesPredictionService();
