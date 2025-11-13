const express = require('express');
const { body } = require('express-validator');
const flashSaleController = require('../controllers/flashSaleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 公开路由 - 获取秒杀活动信息
router.get('/active', flashSaleController.getActiveFlashSales);
router.get('/upcoming', flashSaleController.getUpcomingFlashSales);
router.get('/:id', flashSaleController.getFlashSaleDetails);

// 需要认证的路由 - 参与秒杀活动
router.post('/participate', protect, flashSaleController.participateInFlashSale);
router.post('/:flashSaleId/reminder', protect, flashSaleController.setPreheatNotification);

// 管理员路由 - 管理秒杀活动
const createFlashSaleValidation = [
  body('title').notEmpty().withMessage('活动标题不能为空'),
  body('description').notEmpty().withMessage('活动描述不能为空'),
  body('startTime').isISO8601().withMessage('开始时间格式错误'),
  body('endTime').isISO8601().withMessage('结束时间格式错误'),
  body('products').isArray({ min: 1 }).withMessage('至少需要添加一个商品'),
  body('products.*.product').notEmpty().withMessage('商品ID不能为空'),
  body('products.*.flashPrice').isNumeric().withMessage('秒杀价格必须是数字'),
  body('products.*.originalPrice').isNumeric().withMessage('原价必须是数字'),
  body('products.*.stock').isInt({ min: 1 }).withMessage('库存必须是正整数')
];

router.post('/', protect, authorize('admin'), createFlashSaleValidation, flashSaleController.createFlashSale);
router.put('/:id', protect, authorize('admin'), flashSaleController.updateFlashSale);
router.delete('/:id', protect, authorize('admin'), flashSaleController.deleteFlashSale);
router.get('/:id/statistics', protect, authorize('admin'), flashSaleController.getFlashSaleStatistics);

// 管理员获取所有秒杀活动
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    const flashSales = await FlashSale.find(query)
      .populate('products.product', 'name images price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await FlashSale.countDocuments(query);
    
    res.json({
      success: true,
      data: flashSales,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取秒杀活动列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取秒杀活动列表失败'
    });
  }
});

module.exports = router;
