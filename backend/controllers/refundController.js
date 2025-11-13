const Refund = require('../models/Refund');
const Order = require('../models/Order');
const User = require('../models/User');

// 创建退款申请
const createRefund = async (req, res) => {
  try {
    const { orderId, reason, description, type, items, amount } = req.body;
    const { userId } = req.user;

    // 验证订单
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此订单'
      });
    }

    if (!order.isPaid) {
      return res.status(400).json({
        success: false,
        message: '订单未支付，无法申请退款'
      });
    }

    // 检查是否已存在退款申请
    const existingRefund = await Refund.findOne({ order: orderId, status: { $in: ['pending', 'processing', 'approved'] } });
    if (existingRefund) {
      return res.status(400).json({
        success: false,
        message: '该订单已有正在处理的退款申请'
      });
    }

    // 验证退款金额
    const refundAmount = type === 'full' ? order.finalPrice : amount;
    if (refundAmount > order.finalPrice) {
      return res.status(400).json({
        success: false,
        message: '退款金额不能超过订单金额'
      });
    }

    // 创建退款申请
    const refund = new Refund({
      order: orderId,
      user: userId,
      reason,
      description,
      type,
      items: items || order.items.map(item => ({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      amount: refundAmount,
      paymentMethod: order.paymentMethod
    });

    // 添加系统沟通记录
    refund.addCommunication('system', '退款申请已提交，等待审核');

    await refund.save();

    // 更新订单状态
    order.status = 'refund_requested';
    await order.save();

    res.status(201).json({
      success: true,
      data: refund,
      message: '退款申请提交成功'
    });

  } catch (error) {
    console.error('创建退款申请失败:', error);
    res.status(500).json({
      success: false,
      message: '创建退款申请失败',
      error: error.message
    });
  }
};

// 获取退款详情
const getRefundDetail = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { userId } = req.user;
    
    const refund = await Refund.findById(refundId)
      .populate('order user processedBy');
    
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: '退款记录不存在'
      });
    }

    // 检查权限（用户只能查看自己的退款，管理员可以查看所有）
    if (refund.user._id.toString() !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '无权查看此退款记录'
      });
    }

    res.json({
      success: true,
      data: refund
    });

  } catch (error) {
    console.error('获取退款详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取退款详情失败',
      error: error.message
    });
  }
};

// 获取用户的退款历史
const getUserRefunds = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: userId };
    if (status) {
      query.status = status;
    }
    
    const refunds = await Refund.find(query)
      .populate('order')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Refund.countDocuments(query);

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('获取用户退款历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户退款历史失败',
      error: error.message
    });
  }
};

// 获取所有退款申请（管理员）
const getAllRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const refunds = await Refund.find(query)
      .populate('order user')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Refund.countDocuments(query);

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('获取退款列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取退款列表失败',
      error: error.message
    });
  }
};

// 处理退款申请（管理员）
const processRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { action, rejectionReason } = req.body;
    const { userId } = req.user;

    const refund = await Refund.findById(refundId).populate('order');
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: '退款记录不存在'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作类型'
      });
    }

    if (action === 'approve') {
      refund.status = 'approved';
      refund.addCommunication('admin', '退款申请已批准，等待处理');
      
      // 更新订单状态
      refund.order.status = 'refund_approved';
      await refund.order.save();
      
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: '拒绝原因不能为空'
        });
      }
      
      refund.status = 'rejected';
      refund.rejectionReason = rejectionReason;
      refund.addCommunication('admin', `退款申请已拒绝，原因: ${rejectionReason}`);
      
      // 更新订单状态
      refund.order.status = 'refund_rejected';
      await refund.order.save();
    }

    refund.processedBy = userId;
    refund.processedAt = new Date();
    
    await refund.save();

    res.json({
      success: true,
      data: refund,
      message: `退款申请已${action === 'approve' ? '批准' : '拒绝'}`
    });

  } catch (error) {
    console.error('处理退款申请失败:', error);
    res.status(500).json({
      success: false,
      message: '处理退款申请失败',
      error: error.message
    });
  }
};

// 完成退款处理（管理员）
const completeRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { userId } = req.user;

    const refund = await Refund.findById(refundId).populate('order user');
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: '退款记录不存在'
      });
    }

    if (refund.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: '只有已批准的退款申请才能完成处理'
      });
    }

    // 更新退款状态
    refund.status = 'completed';
    refund.processedBy = userId;
    refund.processedAt = new Date();
    refund.addCommunication('admin', '退款处理已完成，金额已退回');

    // 更新订单状态
    refund.order.status = 'refund_completed';
    refund.order.isPaid = false;
    await refund.order.save();

    await refund.save();

    // 这里可以添加实际退款逻辑，比如调用支付接口进行退款
    // await processPaymentRefund(refund);

    res.json({
      success: true,
      data: refund,
      message: '退款处理完成'
    });

  } catch (error) {
    console.error('完成退款处理失败:', error);
    res.status(500).json({
      success: false,
      message: '完成退款处理失败',
      error: error.message
    });
  }
};

// 获取退款统计（管理员）
const getRefundStats = async (req, res) => {
  try {
    const stats = await Refund.getStats();
    const trend = await Refund.getTrend();

    const totalRefunds = await Refund.countDocuments();
    const totalAmount = await Refund.aggregate([
      { $match: { status: { $in: ['completed', 'approved'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        stats,
        trend,
        totalRefunds,
        totalAmount: totalAmount[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('获取退款统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取退款统计失败',
      error: error.message
    });
  }
};

// 添加沟通记录
const addCommunication = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { message } = req.body;
    const { userId } = req.user;

    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: '退款记录不存在'
      });
    }

    // 检查权限
    if (refund.user.toString() !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '无权添加沟通记录'
      });
    }

    const type = req.user.roles.includes('admin') ? 'admin' : 'user';
    refund.addCommunication(type, message);
    await refund.save();

    res.json({
      success: true,
      data: refund,
      message: '沟通记录添加成功'
    });

  } catch (error) {
    console.error('添加沟通记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加沟通记录失败',
      error: error.message
    });
  }
};

module.exports = {
  createRefund,
  getRefundDetail,
  getUserRefunds,
  getAllRefunds,
  processRefund,
  completeRefund,
  getRefundStats,
  addCommunication
};