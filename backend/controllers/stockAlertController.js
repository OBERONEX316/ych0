const Product = require('../models/Product');

// 获取库存预警列表
const getStockAlerts = async (req, res) => {
  try {
    const { alertType = 'all', page = 1, limit = 20 } = req.query;
    
    // 构建查询条件
    let query = { 
      isActive: true, 
      stockAlertEnabled: true 
    };
    
    if (alertType === 'critical') {
      query.$expr = { $lte: ['$stock', '$criticalStockThreshold'] };
    } else if (alertType === 'low') {
      query.$expr = { 
        $and: [
          { $gt: ['$stock', '$criticalStockThreshold'] },
          { $lte: ['$stock', '$lowStockThreshold'] }
        ]
      };
    } else if (alertType === 'out-of-stock') {
      query.stock = 0;
    } else {
      query.$expr = {
        $or: [
          { $lte: ['$stock', '$criticalStockThreshold'] },
          { $lte: ['$stock', '$lowStockThreshold'] }
        ]
      };
    }
    
    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 执行查询
    const alerts = await Product.find(query)
      .sort({ stock: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('name stock lowStockThreshold criticalStockThreshold category image price');
    
    // 获取总数
    const total = await Product.countDocuments(query);
    
    // 添加库存状态信息
    const alertsWithStatus = alerts.map(product => ({
      ...product.toObject(),
      stockStatus: product.stockStatus,
      needsStockAlert: product.needsStockAlert
    }));
    
    res.json({
      success: true,
      data: alertsWithStatus,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取库存预警失败:', error);
    res.status(500).json({
      success: false,
      error: '获取库存预警失败',
      message: error.message
    });
  }
};

// 获取库存统计信息
const getStockStatistics = async (req, res) => {
  try {
    const statistics = await Product.getStockStatistics();
    
    // 计算库存健康度
    const healthyProducts = statistics.totalProducts - 
      (statistics.outOfStock + statistics.criticalStock + statistics.lowStock);
    
    const healthPercentage = statistics.totalProducts > 0 ? 
      Math.round((healthyProducts / statistics.totalProducts) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        ...statistics,
        healthyProducts,
        healthPercentage,
        stockHealth: healthPercentage >= 80 ? 'healthy' : 
                   healthPercentage >= 60 ? 'warning' : 'critical'
      }
    });
  } catch (error) {
    console.error('获取库存统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取库存统计失败',
      message: error.message
    });
  }
};

// 批量更新库存预警设置
const updateStockAlertSettings = async (req, res) => {
  try {
    const { productIds, stockAlertEnabled, lowStockThreshold, criticalStockThreshold } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        error: '请提供商品ID列表'
      });
    }
    
    const updateData = {};
    if (stockAlertEnabled !== undefined) updateData.stockAlertEnabled = stockAlertEnabled;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = lowStockThreshold;
    if (criticalStockThreshold !== undefined) updateData.criticalStockThreshold = criticalStockThreshold;
    
    const result = await Product.updateMany(
      { _id: { $in: productIds }, isActive: true },
      updateData,
      { runValidators: true }
    );
    
    res.json({
      success: true,
      data: result,
      message: `成功更新 ${result.modifiedCount} 个商品的库存预警设置`
    });
  } catch (error) {
    console.error('更新库存预警设置失败:', error);
    res.status(400).json({
      success: false,
      error: '更新库存预警设置失败',
      message: error.message
    });
  }
};

// 获取单个商品的库存预警信息
const getProductStockAlert = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }
    
    const stockAlertInfo = {
      ...product.toObject(),
      stockStatus: product.stockStatus,
      needsStockAlert: product.needsStockAlert
    };
    
    res.json({
      success: true,
      data: stockAlertInfo
    });
  } catch (error) {
    console.error('获取商品库存预警信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品库存预警信息失败',
      message: error.message
    });
  }
};

// 导出库存预警报告
const exportStockAlertReport = async (req, res) => {
  try {
    const { alertType = 'all' } = req.query;
    
    const alerts = await Product.getStockAlerts(alertType);
    
    // 生成CSV格式的报告
    const csvData = [
      ['商品名称', '当前库存', '预警阈值', '紧急阈值', '分类', '状态'],
      ...alerts.map(product => [
        product.name,
        product.stock,
        product.lowStockThreshold,
        product.criticalStockThreshold,
        product.category,
        product.stockStatus === 'critical' ? '紧急缺货' : 
        product.stockStatus === 'low' ? '库存不足' : '缺货'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="stock-alert-report-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('导出库存预警报告失败:', error);
    res.status(500).json({
      success: false,
      error: '导出库存预警报告失败',
      message: error.message
    });
  }
};

module.exports = {
  getStockAlerts,
  getStockStatistics,
  updateStockAlertSettings,
  getProductStockAlert,
  exportStockAlertReport
};