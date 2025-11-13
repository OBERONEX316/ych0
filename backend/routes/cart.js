const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  optimizeCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有购物车路由需要认证
router.use(protect);

// 获取购物车
router.get('/', getCart);

// 添加商品到购物车
router.post('/', addToCart);

// 更新购物车商品数量
router.put('/items/:itemId', updateCartItem);

// 从购物车移除商品
router.delete('/items/:itemId', removeFromCart);

// 清空购物车
router.delete('/', clearCart);

// 智能优化购物车
router.get('/optimize', optimizeCart);

module.exports = router;
