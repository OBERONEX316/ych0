const express = require('express');
const { body } = require('express-validator');
const salesPredictionController = require('../controllers/salesPredictionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const generatePredictionValidation = [
  body('productId').isMongoId().withMessage('有效的产品ID是必需的'),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('无效的预测周期'),
  body('customFactors').optional().isObject().withMessage('自定义因子必须是对象')
];

const updateResultsValidation = [
  body('actualQuantity').isInt({ min: 0 }).withMessage('实际数量必须是非负整数'),
  body('actualRevenue').isFloat({ min: 0 }).withMessage('实际收入必须是非负数')
];

const bulkGenerateValidation = [
  body('productIds').isArray({ min: 1 }).withMessage('产品ID数组不能为空'),
  body('productIds.*').isMongoId().withMessage('有效的产品ID是必需的'),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('无效的预测周期'),
  body('customFactors').optional().isObject().withMessage('自定义因子必须是对象')
];

// Public routes
router.get('/product/:productId', salesPredictionController.getProductPredictions);
router.get('/period', salesPredictionController.getPredictionsByPeriod);
router.get('/dashboard', salesPredictionController.getDashboardAnalytics);
router.get('/trends/:productId', salesPredictionController.getPredictionTrends);

// Protected routes (require authentication)
router.post('/generate', protect, generatePredictionValidation, salesPredictionController.generatePrediction);
router.get('/accuracy/:productId', protect, salesPredictionController.getAccuracyReport);

// Admin routes
router.put('/results/:predictionId', protect, authorize('admin'), updateResultsValidation, salesPredictionController.updatePredictionResults);
router.post('/bulk-generate', protect, authorize('admin'), bulkGenerateValidation, salesPredictionController.bulkGeneratePredictions);

module.exports = router;
