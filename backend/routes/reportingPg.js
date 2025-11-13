const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/reportingPgController');
const router = express.Router();
router.get('/daily-revenue', protect, authorize('admin'), c.dailyRevenue);
router.get('/category-sales', protect, authorize('admin'), c.categorySales);
module.exports = router;