const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// 模拟支付网关（实际项目中应集成真实支付API）
const mockPaymentGateway = {
  // 模拟支付宝支付
  alipay: async (orderData) => {
    return {
      success: true,
      paymentId: `ALIPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      updateTime: new Date().toISOString(),
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIj7kuJPkuLrmlrDpl7vlg488L3RleHQ+PC9zdmc+`
    };
  },
  
  // 模拟微信支付
  wechat: async (orderData) => {
    return {
      success: true,
      paymentId: `WECHAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      updateTime: new Date().toISOString(),
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIj7kuJPkuLrmlrDpl7vlg488L3RleHQ+PC9zdmc+`
    };
  },
  
  // 模拟银行转账
  bank: async (orderData) => {
    return {
      success: true,
      paymentId: `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending', // 银行转账需要人工确认
      updateTime: new Date().toISOString(),
      bankInfo: {
        accountName: '示例科技有限公司',
        accountNumber: '6222 8888 6666 9999',
        bankName: '中国工商银行',
        branch: '北京分行'
      }
    };
  }
};

// 创建订单
const createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod,
      items,
      couponCode
    } = req.body;

    // 验证用户购物车
    const user = await User.findById(req.user.id).populate('cart.items.product');
    
    if (!user.cart.items || user.cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '购物车为空，无法创建订单'
      });
    }

    // 验证商品库存
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `商品不存在: ${item.product}`
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `商品库存不足: ${product.name}`
        });
      }
    }

    // 创建订单项
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          product: item.product,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: item.quantity,
          total: product.price * item.quantity
        };
      })
    );

    // 计算运费（简单逻辑：满99免运费）
    const itemsPrice = orderItems.reduce((total, item) => total + item.total, 0);
    const shippingPrice = itemsPrice >= 99 ? 0 : 15;
    const taxPrice = itemsPrice * 0.1; // 10% 税费
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    // 优惠券处理
    let discountAmount = 0;
    let couponId = null;
    let coupon = null;
    
    if (couponCode) {
      try {
        // 验证优惠券
        const Coupon = require('../models/Coupon');
        const UserCoupon = require('../models/UserCoupon');
        
        // 查找优惠券
        coupon = await Coupon.findOne({ 
          code: couponCode.toUpperCase(),
          isActive: true
        });
        
        if (!coupon) {
          return res.status(400).json({
            success: false,
            error: '优惠券不存在或已失效'
          });
        }
        
        if (!coupon.isValid) {
          return res.status(400).json({
            success: false,
            error: '优惠券已过期'
          });
        }
        
        // 检查用户是否拥有该优惠券
        const userCoupon = await UserCoupon.findOne({
          user: req.user.id,
          coupon: coupon._id,
          status: 'available'
        });
        
        if (!userCoupon) {
          return res.status(400).json({
            success: false,
            error: '您没有该优惠券'
          });
        }
        
        if (!userCoupon.isValid) {
          return res.status(400).json({
            success: false,
            error: '优惠券已过期'
          });
        }
        
        // 验证优惠券是否适用于订单
        const validationResult = await coupon.validateForOrder(
          totalPrice,
          items,
          req.user.id
        );
        
        if (!validationResult.isValid) {
          return res.status(400).json({
            success: false,
            error: validationResult.message
          });
        }
        
        discountAmount = validationResult.discountAmount;
        couponId = coupon._id;
        
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    // 创建订单
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountAmount,
      coupon: couponId,
      couponCode: couponCode,
      shippingAddress,
      paymentMethod
    });

    const savedOrder = await order.save();
    try {
      const { sendOrderNotification } = require('../utils/notificationUtils');
      await sendOrderNotification(req.user.id, savedOrder, 'created');
    } catch (e) { console.warn('订单创建通知失败:', e.message); }

    // 减少商品库存
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    // 处理优惠券使用（如果使用了优惠券）
    if (couponCode && coupon) {
      try {
        const UserCoupon = require('../models/UserCoupon');
        
        // 标记优惠券为已使用
        const userCoupon = await UserCoupon.findOne({
          user: req.user.id,
          coupon: coupon._id,
          status: 'available'
        });
        
        if (userCoupon) {
          await userCoupon.useCoupon(savedOrder._id, discountAmount);
        }
        
        // 更新优惠券使用统计
        await Coupon.findByIdAndUpdate(
          coupon._id,
          {
            $inc: {
              totalUsageCount: 1,
              totalDiscountAmount: discountAmount
            }
          }
        );
        
      } catch (error) {
        console.error('处理优惠券使用失败:', error);
        // 这里不抛出错误，因为订单已经创建成功
      }
    }

    // 清空用户购物车
    user.cart.items = [];
    user.cart.totalItems = 0;
    user.cart.totalPrice = 0;
    await user.save();

    res.status(201).json({
      success: true,
      data: savedOrder,
      message: '订单创建成功'
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: '创建订单失败',
      message: error.message
    });
  }
};

// 获取用户订单列表
const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.product', 'name image');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单列表失败',
      message: error.message
    });
  }
};

// 获取单个订单详情
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name image');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否属于当前用户
    if (order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问此订单'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单详情失败',
      message: error.message
    });
  }
};

// 更新订单状态（管理员功能）
const updateOrderStatus = async (req, res) => {
  try {
    const { status, shippingInfo } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 更新状态
    order.status = status;
    
    // 如果是已发货状态，设置发货时间和物流信息
    if (status === 'shipped') {
      order.shippingInfo = {
        ...order.shippingInfo,
        ...shippingInfo,
        shippedAt: new Date()
      };
    }
    
    // 如果是已送达状态，设置送达时间
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.isDelivered = true;
    }

    const updatedOrder = await order.save();
    try {
      const { sendOrderNotification } = require('../utils/notificationUtils');
      if (status === 'shipped') {
        await sendOrderNotification(order.user, updatedOrder, 'shipped', { trackingNumber: shippingInfo?.trackingNumber });
      }
      if (status === 'delivered') {
        await sendOrderNotification(order.user, updatedOrder, 'delivered');
      }
    } catch (e) { console.warn('订单状态通知失败:', e.message); }

    res.json({
      success: true,
      data: updatedOrder,
      message: '订单状态更新成功'
    });

  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新订单状态失败',
      message: error.message
    });
  }
};

// 取消订单
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否属于当前用户
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权取消此订单'
      });
    }

    // 只能取消待处理或已确认的订单
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: '当前订单状态无法取消'
      });
    }

    // 恢复商品库存
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    // 更新订单状态
    order.status = 'cancelled';
    const updatedOrder = await order.save();

    res.json({
      success: true,
      data: updatedOrder,
      message: '订单取消成功'
    });

  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      error: '取消订单失败',
      message: error.message
    });
  }
};

// 获取所有订单（管理员功能）
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    if (userId) {
      query.user = userId;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('获取所有订单失败:', error);
    res.status(500).json({
      success: false,
      error: '获取所有订单失败',
      message: error.message
    });
  }
};

// 发起支付
const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否属于当前用户
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权操作此订单'
      });
    }

    // 检查订单是否已支付
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        error: '订单已支付'
      });
    }

    // 根据支付方式调用相应的支付网关
    const paymentResult = await mockPaymentGateway[order.paymentMethod](order);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: '支付发起失败'
      });
    }

    // 更新订单支付信息
    order.paymentResult = {
      id: paymentResult.paymentId,
      status: paymentResult.status,
      update_time: paymentResult.updateTime
    };

    // 如果是即时支付方式（支付宝、微信），直接标记为已支付
    if (['alipay', 'wechat'].includes(order.paymentMethod) && paymentResult.status === 'completed') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = 'confirmed'; // 支付成功后确认订单
    }

    await order.save();

    res.json({
      success: true,
      data: {
        order,
        paymentInfo: paymentResult
      },
      message: '支付发起成功'
    });

  } catch (error) {
    console.error('发起支付失败:', error);
    res.status(500).json({
      success: false,
      error: '发起支付失败',
      message: error.message
    });
  }
};

// 支付回调处理（模拟真实支付回调）
const handlePaymentCallback = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentId, status, updateTime } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 更新支付结果
    order.paymentResult = {
      id: paymentId,
      status: status,
      update_time: updateTime || new Date().toISOString()
    };

    // 如果支付成功
    if (status === 'completed') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = 'confirmed'; // 支付成功后确认订单
    }

    await order.save();

    res.json({
      success: true,
      data: order,
      message: '支付回调处理成功'
    });

  } catch (error) {
    console.error('支付回调处理失败:', error);
    res.status(500).json({
      success: false,
      error: '支付回调处理失败',
      message: error.message
    });
  }
};

// 检查支付状态
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否属于当前用户
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权查看此订单'
      });
    }

    res.json({
      success: true,
      data: {
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        paymentResult: order.paymentResult,
        status: order.status
      }
    });

  } catch (error) {
    console.error('检查支付状态失败:', error);
    res.status(500).json({
      success: false,
      error: '检查支付状态失败',
      message: error.message
    });
  }
};

// 导出订单数据
const exportOrders = async (req, res) => {
  try {
    const {
      status,
      userId,
      startDate,
      endDate,
      search,
      format = 'csv'
    } = req.query;

    // 构建查询条件
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // 获取订单数据，包含用户信息
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到符合条件的订单'
      });
    }

    // 根据格式生成导出数据
    if (format === 'csv') {
      // CSV格式导出
      const csvData = orders.map(order => ({
        '订单号': order.orderNumber,
        '用户姓名': order.user?.name || '用户已删除',
        '用户邮箱': order.user?.email || '用户已删除',
        '订单状态': getStatusText(order.status),
        '总金额': order.totalPrice,
        '商品数量': order.items.length,
        '创建时间': order.createdAt.toLocaleString('zh-CN'),
        '支付方式': order.paymentMethod,
        '是否支付': order.isPaid ? '是' : '否',
        '支付时间': order.paidAt ? order.paidAt.toLocaleString('zh-CN') : '',
        '收货人': order.shippingAddress?.fullName || '',
        '联系电话': order.shippingAddress?.phone || '',
        '收货地址': order.shippingAddress?.address || ''
      }));

      // 设置响应头
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().getTime()}.csv"`);

      // 创建CSV内容
      const csvHeaders = Object.keys(csvData[0]).join(',');
      const csvRows = csvData.map(row => 
        Object.values(row).map(value => 
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      );

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.send(csvContent);

    } else if (format === 'json') {
      // JSON格式导出
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().getTime()}.json"`);
      
      res.json({
        success: true,
        data: orders,
        total: orders.length,
        exportedAt: new Date().toISOString()
      });

    } else {
      return res.status(400).json({
        success: false,
        error: '不支持的导出格式'
      });
    }

  } catch (error) {
    console.error('导出订单失败:', error);
    res.status(500).json({
      success: false,
      error: '导出订单失败',
      message: error.message
    });
  }
};

// 获取物流跟踪信息
const getTrackingInfo = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否属于当前用户或管理员
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权查看此订单的物流信息'
      });
    }

    // 检查订单是否已发货
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: '订单尚未发货，无法查询物流信息'
      });
    }

    // 模拟物流跟踪信息（实际项目中应集成第三方物流API）
    const trackingInfo = {
      orderNumber: order.orderNumber,
      carrier: order.shippingInfo?.carrier || '顺丰速运',
      trackingNumber: order.shippingInfo?.trackingNumber || '',
      status: order.status,
      estimatedDelivery: order.shippingInfo?.estimatedDelivery,
      shippedAt: order.shippingInfo?.shippedAt,
      deliveredAt: order.deliveredAt,
      // 模拟物流轨迹
      trackingEvents: [
        {
          time: order.shippingInfo?.shippedAt || new Date(),
          location: '发货地仓库',
          description: '快件已揽收',
          status: 'collected'
        },
        {
          time: new Date(Date.now() - 3600000),
          location: '转运中心',
          description: '快件已到达转运中心',
          status: 'in_transit'
        },
        {
          time: new Date(Date.now() - 1800000),
          location: '目的地城市',
          description: '快件已到达目的地城市',
          status: 'arrived'
        }
      ]
    };

    // 如果是已送达状态，添加送达事件
    if (order.status === 'delivered') {
      trackingInfo.trackingEvents.push({
        time: order.deliveredAt,
        location: '收货地址',
        description: '快件已签收',
        status: 'delivered'
      });
    }

    res.json({
      success: true,
      data: trackingInfo,
      message: '物流信息获取成功'
    });

  } catch (error) {
    console.error('获取物流信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取物流信息失败',
      message: error.message
    });
  }
};

// 订单状态文本映射
function getStatusText(status) {
  const statusMap = {
    pending: '待处理',
    confirmed: '已确认',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

// 获取订单统计数据
const getAnalytics = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      period = 'month' 
    } = req.query;

    // 构建查询条件
    let query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // 获取总销售额和订单数
    const totalRevenueResult = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const totalOrdersResult = await Order.aggregate([
      { $match: query },
      { $count: 'total' }
    ]);
    
    const totalCustomersResult = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$user' } },
      { $count: 'total' }
    ]);

    // 获取订单状态分布
    const statusDistribution = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 获取销售趋势数据
    let groupByField;
    switch (period) {
      case 'day':
        groupByField = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        groupByField = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
        break;
      case 'month':
        groupByField = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'year':
        groupByField = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      default:
        groupByField = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const revenueTrend = await Order.aggregate([
      { $match: query },
      { $group: { 
        _id: groupByField, 
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 }
      } },
      { $sort: { _id: 1 } }
    ]);

    // 获取热门商品
    const topProducts = await Order.aggregate([
      { $match: query },
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.product', 
        name: { $first: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      } },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);

    // 计算平均订单价值
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const totalOrders = totalOrdersResult[0]?.total || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 计算增长率（简单模拟）
    const revenueGrowth = Math.round(Math.random() * 20);
    const orderGrowth = Math.round(Math.random() * 15);
    const aovGrowth = Math.round(Math.random() * 10);
    const customerGrowth = Math.round(Math.random() * 18);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalCustomers: totalCustomersResult[0]?.total || 0,
        averageOrderValue,
        revenueGrowth,
        orderGrowth,
        aovGrowth,
        customerGrowth,
        statusDistribution: statusDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        revenueTrend: revenueTrend.map(item => ({
          period: item._id,
          revenue: item.revenue,
          orders: item.orders
        })),
        topProducts: topProducts.map(item => ({
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        }))
      }
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
      message: error.message
    });
  }
};

// 导出统计数据
const exportAnalytics = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      period = 'month' 
    } = req.query;

    // 这里简单返回CSV格式的统计数据
    const analyticsData = {
      totalRevenue: 100000,
      totalOrders: 500,
      totalCustomers: 300,
      averageOrderValue: 200
    };

    const csvData = [
      ['指标', '数值'],
      ['总销售额', analyticsData.totalRevenue],
      ['总订单数', analyticsData.totalOrders],
      ['总客户数', analyticsData.totalCustomers],
      ['平均订单价值', analyticsData.averageOrderValue],
      ['统计时间', new Date().toLocaleString('zh-CN')]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().getTime()}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('导出统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '导出统计数据失败',
      message: error.message
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  initiatePayment,
  handlePaymentCallback,
  checkPaymentStatus,
  exportOrders,
  getTrackingInfo,
  getAnalytics,
  exportAnalytics
};