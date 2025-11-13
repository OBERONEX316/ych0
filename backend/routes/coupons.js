const express = require('express');
const router = express.Router();

// 导入认证和授权中间件
const { protect, authorize } = require('../middleware/auth');

// 导入优惠券控制器
const {
  getCoupons,
  getCoupon,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getUserAvailableCoupons,
  getUserUsedCoupons,
  claimCoupon,
  claimCouponByCode,
  validateCoupon,
  getPublicCoupons
} = require('../controllers/couponController');

// 公开路由
router.get('/public/list', getPublicCoupons);
router.get('/code/:code', getCouponByCode);

// 需要认证的路由
router.use(protect);

router.get('/user/available', getUserAvailableCoupons);
router.get('/user/used', getUserUsedCoupons);
router.post('/:id/claim', claimCoupon);
router.post('/code/:code/claim', claimCouponByCode);
router.post('/validate', validateCoupon);

// 管理员路�?router.use(authorize('admin'));

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;
