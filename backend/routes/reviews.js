const express = require('express');
const router = express.Router();

// 导入评价控制器
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  unmarkHelpful,
  getUserReviews
} = require('../controllers/reviewController');

// 导入认证中间件
const { protect } = require('../middleware/auth');

// 公开路由
router.get('/product/:productId', getProductReviews);

// 需要认证的路由
router.use(protect);

// 用户评价相关
router.post('/', createReview);
router.get('/my-reviews', getUserReviews);
router.put('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

// 评价互动
router.post('/:reviewId/helpful', markHelpful);
router.delete('/:reviewId/helpful', unmarkHelpful);

module.exports = router;
