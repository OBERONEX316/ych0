const express = require('express');
const { body, query } = require('express-validator');
const controller = require('../controllers/inventoryOptimizationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/suggestions', [
  query('period').optional().isIn(['daily', 'weekly', 'monthly'])
], controller.getSuggestions);

router.post('/generate', protect, authorize('admin'), [
  body('productId').isMongoId(),
  body('period').optional().isIn(['daily', 'weekly', 'monthly'])
], controller.generateForProduct);

router.post('/generate-all', protect, authorize('admin'), [
  body('period').optional().isIn(['daily', 'weekly', 'monthly'])
], controller.generateForAll);

module.exports = router;
