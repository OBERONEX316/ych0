const Shipping = require('../models/Shipping');
const Order = require('../models/Order');

// 创建配送订单
const createShipping = async (req, res) => {
  try {
    const { orderId, carrier, packageInfo } = req.body;
    
    // 验证订单
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (!order.isPaid) {
      return res.status(400).json({
        success: false,
        message: '订单未支付，无法发货'
      });
    }

    if (order.isDelivered) {
      return res.status(400).json({
        success: false,
        message: '订单已发货'
      });
    }

    // 创建配送记录
    const shipping = new Shipping({
      order: orderId,
      user: order.user._id,
      carrier: {
        name: carrier.name,
        code: carrier.code,
        contact: carrier.contact || {}
      },
      deliveryAddress: order.shippingAddress,
      package: {
        weight: packageInfo.weight,
        dimensions: packageInfo.dimensions,
        itemsCount: order.items.length
      },
      shippingCost: order.shippingPrice,
      insuranceCost: packageInfo.insuranceCost || 0,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 默认3天后
    });

    await shipping.save();

    // 更新订单状态
    order.status = 'processing';
    await order.save();

    // 添加初始跟踪记录
    shipping.addTrackingEvent('pending', '配送订单已创建，等待揽收', {
      name: '仓库',
      address: '上海市浦东新区张江高科技园区',
      city: '上海',
      province: '上海市'
    });
    await shipping.save();

    res.status(201).json({
      success: true,
      data: {
        shipping,
        order: {
          id: order._id,
          status: order.status
        }
      }
    });

  } catch (error) {
    console.error('创建配送订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建配送订单失败',
      error: error.message
    });
  }
};

// 获取配送详情
const getShippingDetail = async (req, res) => {
  try {
    const { shippingId } = req.params;
    
    const shipping = await Shipping.findById(shippingId)
      .populate('order user');
    
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: '配送记录不存在'
      });
    }

    res.json({
      success: true,
      data: shipping
    });

  } catch (error) {
    console.error('获取配送详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配送详情失败',
      error: error.message
    });
  }
};

// 根据订单ID获取配送信息
const getShippingByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const shipping = await Shipping.findOne({ order: orderId })
      .populate('order user');
    
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: '该订单暂无配送信息'
      });
    }

    res.json({
      success: true,
      data: shipping
    });

  } catch (error) {
    console.error('获取订单配送信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单配送信息失败',
      error: error.message
    });
  }
};

// 获取用户的配送历史
const getUserShippingHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: userId };
    if (status) {
      query.status = status;
    }
    
    const shippings = await Shipping.find(query)
      .populate('order')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Shipping.countDocuments(query);

    res.json({
      success: true,
      data: {
        shippings,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('获取用户配送历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户配送历史失败',
      error: error.message
    });
  }
};

// 更新配送状态
const updateShippingStatus = async (req, res) => {
  try {
    const { shippingId } = req.params;
    const { status, description, location } = req.body;
    
    const shipping = await Shipping.findById(shippingId);
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: '配送记录不存在'
      });
    }

    // 添加跟踪事件
    shipping.addTrackingEvent(status, description, location);
    await shipping.save();

    // 如果状态是已送达，更新订单状态
    if (status === 'delivered') {
      await Order.findByIdAndUpdate(shipping.order, {
        isDelivered: true,
        deliveredAt: new Date(),
        status: 'delivered'
      });
    }

    res.json({
      success: true,
      data: shipping,
      message: '配送状态更新成功'
    });

  } catch (error) {
    console.error('更新配送状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配送状态失败',
      error: error.message
    });
  }
};

// 获取配送统计
const getShippingStats = async (req, res) => {
  try {
    const stats = await Shipping.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Shipping.countDocuments();
    const delivered = await Shipping.countDocuments({ status: 'delivered' });
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        stats,
        total,
        delivered,
        deliveryRate: deliveryRate.toFixed(2)
      }
    });

  } catch (error) {
    console.error('获取配送统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配送统计失败',
      error: error.message
    });
  }
};

// 获取承运商统计
const getCarrierStats = async (req, res) => {
  try {
    const stats = await Shipping.getCarrierStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取承运商统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取承运商统计失败',
      error: error.message
    });
  }
};

// 搜索配送记录
const searchShippings = async (req, res) => {
  try {
    const { trackingNumber, orderNumber, status, carrier } = req.query;
    const { page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (trackingNumber) {
      query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    }
    
    if (orderNumber) {
      const orders = await Order.find({ orderNumber: { $regex: orderNumber, $options: 'i' } });
      query.order = { $in: orders.map(o => o._id) };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (carrier) {
      query['carrier.code'] = carrier;
    }
    
    const shippings = await Shipping.find(query)
      .populate('order user')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Shipping.countDocuments(query);

    res.json({
      success: true,
      data: {
        shippings,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('搜索配送记录失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索配送记录失败',
      error: error.message
    });
  }
};

module.exports = {
  createShipping,
  getShippingDetail,
  getShippingByOrder,
  getUserShippingHistory,
  updateShippingStatus,
  getShippingStats,
  getCarrierStats,
  searchShippings
};