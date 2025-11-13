const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// 获取活跃的秒杀活动
exports.getActiveFlashSales = async (req, res) => {
  try {
    const flashSales = await FlashSale.getActiveSales();
    
    // 添加用户参与状态
    if (req.user) {
      for (const sale of flashSales) {
        sale._doc.canParticipate = sale.canUserParticipate(req.user);
      }
    }
    
    res.json({
      success: true,
      data: flashSales
    });
  } catch (error) {
    console.error('获取活跃秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '获取秒杀活动失败'
    });
  }
};

// 获取即将开始的秒杀活动
exports.getUpcomingFlashSales = async (req, res) => {
  try {
    const flashSales = await FlashSale.getUpcomingSales();
    
    res.json({
      success: true,
      data: flashSales
    });
  } catch (error) {
    console.error('获取即将开始的秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '获取秒杀活动失败'
    });
  }
};

// 获取秒杀活动详情
exports.getFlashSaleDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findById(id)
      .populate('products.product', 'name images price stock description category')
      .populate('participationConditions.requiredCoupon', 'code name discount');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    // 增加浏览量
    flashSale.statistics.totalViews += 1;
    await flashSale.save();
    
    // 添加用户参与状态
    if (req.user) {
      flashSale._doc.canParticipate = flashSale.canUserParticipate(req.user);
    }
    
    res.json({
      success: true,
      data: flashSale
    });
  } catch (error) {
    console.error('获取秒杀活动详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取活动详情失败'
    });
  }
};

// 参与秒杀活动
exports.participateInFlashSale = async (req, res) => {
  try {
    const { flashSaleId, productId, quantity = 1 } = req.body;
    const userId = req.user.id;
    
    // 查找秒杀活动
    const flashSale = await FlashSale.findById(flashSaleId)
      .populate('products.product');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    // 检查活动状态
    if (!flashSale.isActive) {
      return res.status(400).json({
        success: false,
        error: '秒杀活动未开始或已结束'
      });
    }
    
    // 检查用户参与资格
    if (!flashSale.canUserParticipate(req.user)) {
      return res.status(403).json({
        success: false,
        error: '您不符合参与条件'
      });
    }
    
    // 查找商品
    const productItem = flashSale.products.find(item => 
      item.product._id.toString() === productId
    );
    
    if (!productItem) {
      return res.status(404).json({
        success: false,
        error: '商品不在秒杀活动中'
      });
    }
    
    // 检查库存
    if (productItem.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: '库存不足'
      });
    }
    
    // 检查用户购买限制
    const userOrders = await Order.find({
      user: userId,
      'items.flashSaleId': flashSaleId,
      'items.product': productId,
      status: { $nin: ['cancelled', 'refunded'] }
    });
    
    const totalPurchased = userOrders.reduce((sum, order) => {
      return sum + order.items
        .filter(item => item.flashSaleId?.toString() === flashSaleId && 
                       item.product.toString() === productId)
        .reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    if (totalPurchased + quantity > productItem.limitPerUser) {
      return res.status(400).json({
        success: false,
        error: `每人限购${productItem.limitPerUser}件，您已购买${totalPurchased}件`
      });
    }
    
    // 检查是否需要优惠券
    if (flashSale.participationConditions.couponRequired) {
      // 这里需要检查用户是否有指定优惠券
      // 简化处理，实际应该检查用户优惠券
    }
    
    // 创建秒杀订单项
    const orderItem = {
      product: productId,
      quantity: quantity,
      price: productItem.flashPrice,
      flashSaleId: flashSaleId,
      flashPrice: productItem.flashPrice,
      originalPrice: productItem.originalPrice,
      discount: productItem.discount
    };
    
    // 更新统计数据
    flashSale.statistics.totalParticipants += 1;
    productItem.sold += quantity;
    productItem.stock -= quantity;
    
    await flashSale.save();
    
    // 返回秒杀订单项，实际订单创建在购物车或结账时完成
    res.json({
      success: true,
      data: {
        orderItem,
        message: '秒杀商品已添加到购物车',
        timeRemaining: flashSale.timeRemaining
      }
    });
    
  } catch (error) {
    console.error('参与秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '参与秒杀失败'
    });
  }
};

// 创建秒杀活动（管理员）
exports.createFlashSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const {
      title,
      description,
      image,
      startTime,
      endTime,
      products,
      participationConditions,
      preheat,
      tags,
      weight,
      seo
    } = req.body;
    
    // 验证时间设置
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        success: false,
        error: '开始时间必须早于结束时间'
      });
    }
    
    // 验证商品
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          error: `商品不存在: ${item.product}`
        });
      }
      
      if (item.flashPrice >= item.originalPrice) {
        return res.status(400).json({
          success: false,
          error: `秒杀价格必须低于原价: ${product.name}`
        });
      }
      
      if (item.stock > product.stock) {
        return res.status(400).json({
          success: false,
          error: `秒杀库存不能超过商品库存: ${product.name}`
        });
      }
      
      // 计算折扣
      item.discount = Math.round(((item.originalPrice - item.flashPrice) / item.originalPrice) * 100);
    }
    
    // 确定状态
    const now = new Date();
    let status = 'draft';
    if (new Date(startTime) <= now) {
      status = 'active';
    } else if (new Date(startTime) > now) {
      status = 'scheduled';
    }
    
    const flashSale = new FlashSale({
      title,
      description,
      image,
      startTime,
      endTime,
      status,
      products,
      participationConditions: participationConditions || {},
      preheat: preheat || {},
      tags: tags || [],
      weight: weight || 0,
      seo: seo || {},
      operationLog: [{
        action: 'created',
        operator: req.user.id,
        details: '创建秒杀活动'
      }]
    });
    
    await flashSale.save();
    
    // 预热通知
    if (preheat?.enabled && preheat?.notificationEnabled) {
      // 这里可以添加预热通知逻辑
      console.log(`🎯 秒杀活动预热通知: ${title}`);
    }
    
    res.json({
      success: true,
      data: flashSale,
      message: '秒杀活动创建成功'
    });
    
  } catch (error) {
    console.error('创建秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '创建秒杀活动失败'
    });
  }
};

// 更新秒杀活动（管理员）
exports.updateFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    // 如果活动已结束，不允许修改关键信息
    if (flashSale.status === 'ended' && 
        (updates.startTime || updates.endTime || updates.products)) {
      return res.status(400).json({
        success: false,
        error: '活动已结束，无法修改关键信息'
      });
    }
    
    // 验证商品更新
    if (updates.products) {
      for (const item of updates.products) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            error: `商品不存在: ${item.product}`
          });
        }
        
        if (item.flashPrice >= item.originalPrice) {
          return res.status(400).json({
            success: false,
            error: `秒杀价格必须低于原价: ${product.name}`
          });
        }
        
        // 计算折扣
        item.discount = Math.round(((item.originalPrice - item.flashPrice) / item.originalPrice) * 100);
      }
    }
    
    // 更新状态
    if (updates.startTime || updates.endTime) {
      const now = new Date();
      if (new Date(updates.startTime) <= now) {
        updates.status = 'active';
      } else if (new Date(updates.startTime) > now) {
        updates.status = 'scheduled';
      }
    }
    
    // 添加操作日志
    updates.$push = {
      operationLog: {
        action: 'updated',
        operator: req.user.id,
        details: '更新秒杀活动信息'
      }
    };
    
    const updatedFlashSale = await FlashSale.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedFlashSale,
      message: '秒杀活动更新成功'
    });
    
  } catch (error) {
    console.error('更新秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '更新秒杀活动失败'
    });
  }
};

// 删除秒杀活动（管理员）
exports.deleteFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    // 如果活动正在进行，不允许删除
    if (flashSale.status === 'active') {
      return res.status(400).json({
        success: false,
        error: '活动正在进行中，无法删除'
      });
    }
    
    await FlashSale.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: '秒杀活动删除成功'
    });
    
  } catch (error) {
    console.error('删除秒杀活动失败:', error);
    res.status(500).json({
      success: false,
      error: '删除秒杀活动失败'
    });
  }
};

// 获取秒杀活动统计（管理员）
exports.getFlashSaleStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    // 获取详细订单统计
    const orderStats = await Order.aggregate([
      {
        $match: {
          'items.flashSaleId': mongoose.Types.ObjectId(id),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);
    
    // 获取商品销售统计
    const productStats = await Order.aggregate([
      {
        $match: {
          'items.flashSaleId': mongoose.Types.ObjectId(id),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.flashSaleId': mongoose.Types.ObjectId(id)
        }
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        basicStats: flashSale.statistics,
        orderStats: orderStats[0] || { totalOrders: 0, totalRevenue: 0, totalItems: 0 },
        productStats: productStats
      }
    });
    
  } catch (error) {
    console.error('获取秒杀活动统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败'
    });
  }
};

// 设置预热通知
exports.setPreheatNotification = async (req, res) => {
  try {
    const { flashSaleId } = req.params;
    const { enabled, reminderTime } = req.body;
    
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: '秒杀活动不存在'
      });
    }
    
    flashSale.preheat.enabled = enabled;
    if (reminderTime) {
      flashSale.preheat.reminderTime = reminderTime;
    }
    
    await flashSale.save();
    
    res.json({
      success: true,
      message: '预热通知设置成功'
    });
    
  } catch (error) {
    console.error('设置预热通知失败:', error);
    res.status(500).json({
      success: false,
      error: '设置预热通知失败'
    });
  }
};