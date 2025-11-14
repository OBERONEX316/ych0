const express = require('express');
const router = express.Router();

// 导入认证中间件
const { protect, authorize } = require('../middleware/auth');

// 导入商品控制器
const {
  getProducts,
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getTopSellingProducts,
  getNewProducts,
  getPopularSearches,
  getRecommendedProducts,
  getRelatedProducts,
  getUserPreferenceRecommendations,
  getPopularProducts
} = require('../controllers/productController');

// 获取所有商品
router.get('/', getProducts);

// 获取单个商品
 

// 获取商品分类
router.get('/categories/list', getCategories);

// 创建商品（管理员或卖家）
router.post('/', protect, authorize('admin','seller'), createProduct);

// 更新商品（管理员或卖家）
router.put('/:id', protect, authorize('admin','seller'), updateProduct);

// 删除商品（管理员或卖家）
router.delete('/:id', protect, authorize('admin','seller'), deleteProduct);

// 获取热销商品
router.get('/featured/top-selling', getTopSellingProducts);

// 获取新品商品
router.get('/featured/new', getNewProducts);

// 获取热门搜索
router.get('/search/popular', getPopularSearches);

// 获取推荐商品
router.get('/recommendations', getRecommendedProducts);

// 获取相关商品
router.get('/:productId/related', getRelatedProducts);

// 获取用户偏好推荐（需要认证）
router.get('/recommendations/personalized', protect, getUserPreferenceRecommendations);

// 获取热门收藏商品
router.get('/featured/popular', getPopularProducts);

// 放在最后，避免与其它静态路径冲突
router.get('/:id', getProduct);

module.exports = router;
