const SalesPrediction = require('../models/SalesPrediction');
const salesPredictionService = require('../services/salesPredictionService');
const { validationResult } = require('express-validator');

// Generate new sales prediction
exports.generatePrediction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId, period, customFactors } = req.body;

    const prediction = await salesPredictionService.generatePrediction(
      productId,
      period,
      customFactors
    );

    res.json({
      success: true,
      message: '销售预测生成成功',
      data: prediction
    });
  } catch (error) {
    console.error('Generate prediction error:', error);
    res.status(500).json({
      success: false,
      message: '生成销售预测失败',
      error: error.message
    });
  }
};

// Get predictions for a specific product
exports.getProductPredictions = async (req, res) => {
  try {
    const { productId } = req.params;
    const { period = 'monthly', limit = 12 } = req.query;

    const predictions = await SalesPrediction.getPredictionsByProduct(productId, period)
      .populate('productId', 'name category price images')
      .limit(parseInt(limit));

    res.json({
      success: true,
      message: '获取产品预测成功',
      data: predictions
    });
  } catch (error) {
    console.error('Get product predictions error:', error);
    res.status(500).json({
      success: false,
      message: '获取产品预测失败',
      error: error.message
    });
  }
};

// Get predictions by time period
exports.getPredictionsByPeriod = async (req, res) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '开始日期和结束日期是必需的'
      });
    }

    const predictions = await SalesPrediction.getPredictionsByPeriod(
      new Date(startDate),
      new Date(endDate),
      period
    );

    res.json({
      success: true,
      message: '获取时间段预测成功',
      data: predictions
    });
  } catch (error) {
    console.error('Get predictions by period error:', error);
    res.status(500).json({
      success: false,
      message: '获取时间段预测失败',
      error: error.message
    });
  }
};

// Get prediction accuracy report
exports.getAccuracyReport = async (req, res) => {
  try {
    const { productId } = req.params;
    const period = req.params.period || req.query.period || 'monthly';

    const predictions = await SalesPrediction.getAccuracyReport(productId, period);

    // Calculate overall accuracy metrics
    const totalPredictions = predictions.length;
    const completedPredictions = predictions.filter(p => p.actualResults && p.actualResults.quantity > 0);
    
    let totalMAPE = 0;
    let totalMAE = 0;
    let totalRMSE = 0;
    let totalR2 = 0;
    
    completedPredictions.forEach(prediction => {
      totalMAPE += prediction.accuracyMetrics.mape || 0;
      totalMAE += prediction.accuracyMetrics.mae || 0;
      totalRMSE += prediction.accuracyMetrics.rmse || 0;
      totalR2 += prediction.accuracyMetrics.r2 || 0;
    });

    const accuracyReport = {
      totalPredictions,
      completedPredictions: completedPredictions.length,
      overallAccuracy: completedPredictions.length > 0 ? {
        mape: totalMAPE / completedPredictions.length,
        mae: totalMAE / completedPredictions.length,
        rmse: totalRMSE / completedPredictions.length,
        r2: totalR2 / completedPredictions.length
      } : null,
      predictions
    };

    res.json({
      success: true,
      message: '获取预测准确率报告成功',
      data: accuracyReport
    });
  } catch (error) {
    console.error('Get accuracy report error:', error);
    res.status(500).json({
      success: false,
      message: '获取预测准确率报告失败',
      error: error.message
    });
  }
};

// Get dashboard analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    // Get recent predictions
    const recentPredictions = await SalesPrediction.find({
      predictionPeriod: period,
      status: 'active'
    })
    .populate('productId', 'name category price')
    .sort({ predictionDate: -1 })
    .limit(20);

    // Get completed predictions for accuracy analysis
    const completedPredictions = await SalesPrediction.find({
      predictionPeriod: period,
      status: 'completed',
      'actualResults.quantity': { $exists: true }
    })
    .sort({ predictionDate: -1 })
    .limit(50);

    // Calculate summary statistics
    const totalPredictions = recentPredictions.length;
    const totalPredictedRevenue = recentPredictions.reduce((sum, p) => sum + p.predictedRevenue, 0);
    const averageConfidence = recentPredictions.length > 0 ? 
      recentPredictions.reduce((sum, p) => sum + p.confidenceLevel, 0) / totalPredictions : 0;

    // Calculate accuracy statistics
    const accuracyStats = completedPredictions.length > 0 ? {
      totalCompleted: completedPredictions.length,
      averageMAPE: completedPredictions.reduce((sum, p) => sum + (p.accuracyMetrics.mape || 0), 0) / completedPredictions.length,
      averageR2: completedPredictions.reduce((sum, p) => sum + (p.accuracyMetrics.r2 || 0), 0) / completedPredictions.length,
      highAccuracyCount: completedPredictions.filter(p => p.accuracyMetrics.mape < 10).length
    } : null;

    // Get top predictions by revenue
    const topRevenuePredictions = recentPredictions
      .sort((a, b) => b.predictedRevenue - a.predictedRevenue)
      .slice(0, 10);

    // Get predictions by algorithm
    const algorithmDistribution = recentPredictions.reduce((acc, p) => {
      acc[p.algorithmUsed] = (acc[p.algorithmUsed] || 0) + 1;
      return acc;
    }, {});

    const dashboardData = {
      summary: {
        totalPredictions,
        totalPredictedRevenue,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        activePredictions: recentPredictions.filter(p => p.status === 'active').length
      },
      accuracyStats,
      topRevenuePredictions,
      algorithmDistribution,
      recentPredictions: recentPredictions.slice(0, 10)
    };

    res.json({
      success: true,
      message: '获取预测仪表板数据成功',
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: '获取预测仪表板数据失败',
      error: error.message
    });
  }
};

// Update prediction with actual results
exports.updatePredictionResults = async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { actualQuantity, actualRevenue } = req.body;

    const prediction = await SalesPrediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: '预测记录不存在'
      });
    }

    await prediction.updateActualResults(actualQuantity, actualRevenue);

    res.json({
      success: true,
      message: '更新预测结果成功',
      data: prediction
    });
  } catch (error) {
    console.error('Update prediction results error:', error);
    res.status(500).json({
      success: false,
      message: '更新预测结果失败',
      error: error.message
    });
  }
};

// Bulk generate predictions
exports.bulkGeneratePredictions = async (req, res) => {
  try {
    const { productIds, period, customFactors } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '产品ID数组不能为空'
      });
    }

    const results = [];
    const errors = [];

    for (const productId of productIds) {
      try {
        const prediction = await salesPredictionService.generatePrediction(
          productId,
          period,
          customFactors
        );
        results.push({ productId, success: true, prediction });
      } catch (error) {
        errors.push({ productId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `批量生成预测完成，成功 ${results.length} 个，失败 ${errors.length} 个`,
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Bulk generate predictions error:', error);
    res.status(500).json({
      success: false,
      message: '批量生成预测失败',
      error: error.message
    });
  }
};

// Get prediction trends
exports.getPredictionTrends = async (req, res) => {
  try {
    const { productId } = req.params;
    const period = req.params.period || req.query.period || 'monthly';
    const months = parseInt(req.query.months || req.params.months || 6);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const predictions = await SalesPrediction.find({
      productId,
      predictionPeriod: period,
      predictionDate: { $gte: startDate, $lte: endDate }
    })
    .populate('productId', 'name category price')
    .sort({ predictionDate: 1 });

    // Create trend data
    const trendData = predictions.map(prediction => ({
      date: prediction.predictionDate,
      predictedQuantity: prediction.predictedQuantity,
      predictedRevenue: prediction.predictedRevenue,
      confidenceLevel: prediction.confidenceLevel,
      actualQuantity: prediction.actualResults?.quantity || null,
      actualRevenue: prediction.actualResults?.revenue || null,
      accuracy: prediction.accuracyMetrics?.mape || null
    }));

    res.json({
      success: true,
      message: '获取预测趋势成功',
      data: {
        productId,
        period,
        trendData,
        totalPredictions: predictions.length
      }
    });
  } catch (error) {
    console.error('Get prediction trends error:', error);
    res.status(500).json({
      success: false,
      message: '获取预测趋势失败',
      error: error.message
    });
  }
};
