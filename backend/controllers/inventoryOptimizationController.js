const { validationResult } = require('express-validator');
const inventoryOptimizationService = require('../services/inventoryOptimizationService');

exports.generateForProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { productId, period = 'monthly', options = {} } = req.body;
    const suggestion = await inventoryOptimizationService.generateForProduct(productId, period, options);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: '生成失败', error: error.message });
  }
};

exports.generateForAll = async (req, res) => {
  try {
    const { period = 'monthly', options = {} } = req.body || {};
    const results = await inventoryOptimizationService.generateForAll(period, options);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: '批量生成失败', error: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { period = 'monthly', limit = 50 } = req.query;
    const suggestions = await inventoryOptimizationService.getLatestSuggestions(period, parseInt(limit));
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取失败', error: error.message });
  }
};
