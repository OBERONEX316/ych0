const express = require('express');
const router = express.Router();

// 导入用户控制器
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistItem,
  clearWishlist,
  getPopularFavorites,
  getFavoriteStats
} = require('../controllers/userController');

// 导入认证中间件
const { protect } = require('../middleware/auth');

// 所有路由都需要认证
router.use(protect);

// GET /api/users/wishlist - 获取用户心愿单
router.get('/wishlist', getWishlist);

// POST /api/users/wishlist - 添加商品到心愿单
router.post('/wishlist', addToWishlist);

// DELETE /api/users/wishlist/:productId - 从心愿单移除商品
router.delete('/wishlist/:productId', removeFromWishlist);

// GET /api/users/wishlist/check/:productId - 检查商品是否在心愿单中
router.get('/wishlist/check/:productId', checkWishlistItem);

// DELETE /api/users/wishlist - 清空心愿单
router.delete('/wishlist', clearWishlist);

// GET /api/users/favorites/popular - 获取热门收藏商品
router.get('/favorites/popular', getPopularFavorites);

// GET /api/users/favorites/stats - 获取用户收藏统计
router.get('/favorites/stats', getFavoriteStats);

module.exports = router;
