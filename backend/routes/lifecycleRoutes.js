const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/lifecycleController');
const router = express.Router();
router.get('/compute/me', protect, c.computeUser);
router.post('/segments/issue', protect, authorize('admin'), c.segmentIssueCoupon);
module.exports = router;
