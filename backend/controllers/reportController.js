const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Shipping = require('../models/Shipping');
const Refund = require('../models/Refund');

// 生成销售报表
const generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 获取销售数据
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('user', 'username email');

    const completedOrders = orders.filter(order => order.status === 'completed');
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const cancelledOrders = orders.filter(order => order.status === 'cancelled');

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // 按日期分组统计
    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // 按商品分类统计
    const categoryStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const reportData = {
      period: { start: startDate, end: endDate },
      summary: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalRevenue: totalRevenue,
        averageOrderValue: averageOrderValue,
        conversionRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0
      },
      dailyStats: dailyStats.map(stat => ({
        date: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}-${stat._id.day.toString().padStart(2, '0')}`,
        orderCount: stat.orderCount,
        totalRevenue: stat.totalRevenue,
        completedOrders: stat.completedOrders
      })),
      categoryStats: categoryStats.map(stat => ({
        category: stat._id,
        totalSales: stat.totalSales,
        totalRevenue: stat.totalRevenue
      }))
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('销售摘要');
      const dailySheet = workbook.addWorksheet('每日统计');
      const categorySheet = workbook.addWorksheet('分类统计');

      // 销售摘要
      summarySheet.columns = [
        { header: '指标', key: 'metric', width: 20 },
        { header: '数值', key: 'value', width: 15 }
      ];
      
      summarySheet.addRow({ metric: '总订单数', value: reportData.summary.totalOrders });
      summarySheet.addRow({ metric: '已完成订单', value: reportData.summary.completedOrders });
      summarySheet.addRow({ metric: '待处理订单', value: reportData.summary.pendingOrders });
      summarySheet.addRow({ metric: '已取消订单', value: reportData.summary.cancelledOrders });
      summarySheet.addRow({ metric: '总销售额', value: `¥${reportData.summary.totalRevenue.toFixed(2)}` });
      summarySheet.addRow({ metric: '平均订单价值', value: `¥${reportData.summary.averageOrderValue.toFixed(2)}` });
      summarySheet.addRow({ metric: '转化率', value: `${reportData.summary.conversionRate.toFixed(2)}%` });

      // 每日统计
      dailySheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '订单数', key: 'orderCount', width: 12 },
        { header: '销售额', key: 'totalRevenue', width: 15 },
        { header: '完成订单', key: 'completedOrders', width: 12 }
      ];
      
      reportData.dailyStats.forEach(stat => {
        dailySheet.addRow({
          date: stat.date,
          orderCount: stat.orderCount,
          totalRevenue: stat.totalRevenue,
          completedOrders: stat.completedOrders
        });
      });

      // 分类统计
      categorySheet.columns = [
        { header: '商品分类', key: 'category', width: 20 },
        { header: '销售数量', key: 'totalSales', width: 12 },
        { header: '销售额', key: 'totalRevenue', width: 15 }
      ];
      
      reportData.categoryStats.forEach(stat => {
        categorySheet.addRow({
          category: stat.category,
          totalSales: stat.totalSales,
          totalRevenue: stat.totalRevenue
        });
      });

      // 设置表头样式
      [summarySheet, dailySheet, categorySheet].forEach(sheet => {
        sheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales_report_${startDate}_to_${endDate}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales_report_${startDate}_to_${endDate}.pdf"`);

      doc.pipe(res);

      // 添加标题
      doc.fontSize(20).text('销售报表', 100, 100);
      doc.fontSize(12).text(`时间段: ${startDate} 至 ${endDate}`, 100, 130);
      doc.text(`生成时间: ${new Date().toLocaleString()}`, 100, 150);

      // 添加摘要
      doc.fontSize(16).text('销售摘要', 100, 180);
      doc.fontSize(12);
      doc.text(`总订单数: ${reportData.summary.totalOrders}`, 100, 210);
      doc.text(`已完成订单: ${reportData.summary.completedOrders}`, 100, 230);
      doc.text(`总销售额: ¥${reportData.summary.totalRevenue.toFixed(2)}`, 100, 250);
      doc.text(`平均订单价值: ¥${reportData.summary.averageOrderValue.toFixed(2)}`, 100, 270);
      doc.text(`转化率: ${reportData.summary.conversionRate.toFixed(2)}%`, 100, 290);

      // 添加每日统计
      doc.fontSize(16).text('每日统计', 100, 330);
      let yPosition = 360;
      
      reportData.dailyStats.slice(0, 10).forEach(stat => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }
        
        doc.text(`${stat.date}: ${stat.orderCount} 订单, ¥${stat.totalRevenue.toFixed(2)}`, 100, yPosition);
        yPosition += 20;
      });

      doc.end();

    } else {
      // 返回JSON格式
      res.status(200).json({
        success: true,
        data: reportData
      });
    }

  } catch (error) {
    console.error('生成销售报表失败:', error);
    res.status(500).json({
      success: false,
      error: '生成销售报表失败',
      message: error.message
    });
  }
};

// 生成用户分析报表
const generateUserReport = async (req, res) => {
  try {
    const { format = 'json' } = req.body;

    // 获取用户统计数据
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const customerUsers = await User.countDocuments({ role: 'user' });

    // 获取用户注册趋势
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // 获取用户活动统计
    const userActivity = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          email: '$user.email',
          orderCount: 1,
          totalSpent: 1,
          averageOrderValue: {
            $cond: [
              { $eq: ['$orderCount', 0] },
              0,
              { $divide: ['$totalSpent', '$orderCount'] }
            ]
          }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    const reportData = {
      summary: {
        totalUsers,
        activeUsers,
        adminUsers,
        customerUsers,
        inactiveUsers: totalUsers - activeUsers
      },
      registrationTrend: registrationTrend.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        count: item.count
      })),
      topUsers: userActivity
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('用户摘要');
      const trendSheet = workbook.addWorksheet('注册趋势');
      const topUsersSheet = workbook.addWorksheet('活跃用户');

      // 用户摘要
      summarySheet.columns = [
        { header: '指标', key: 'metric', width: 20 },
        { header: '数值', key: 'value', width: 15 }
      ];
      
      summarySheet.addRow({ metric: '总用户数', value: reportData.summary.totalUsers });
      summarySheet.addRow({ metric: '活跃用户', value: reportData.summary.activeUsers });
      summarySheet.addRow({ metric: '管理员用户', value: reportData.summary.adminUsers });
      summarySheet.addRow({ metric: '客户用户', value: reportData.summary.customerUsers });
      summarySheet.addRow({ metric: '非活跃用户', value: reportData.summary.inactiveUsers });

      // 注册趋势
      trendSheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '注册人数', key: 'count', width: 12 }
      ];
      
      reportData.registrationTrend.forEach(trend => {
        trendSheet.addRow({
          date: trend.date,
          count: trend.count
        });
      });

      // 活跃用户
      topUsersSheet.columns = [
        { header: '用户名', key: 'username', width: 20 },
        { header: '邮箱', key: 'email', width: 25 },
        { header: '订单数', key: 'orderCount', width: 12 },
        { header: '总消费', key: 'totalSpent', width: 15 },
        { header: '平均订单价值', key: 'averageOrderValue', width: 15 }
      ];
      
      reportData.topUsers.forEach(user => {
        topUsersSheet.addRow({
          username: user.username,
          email: user.email,
          orderCount: user.orderCount,
          totalSpent: user.totalSpent,
          averageOrderValue: user.averageOrderValue
        });
      });

      // 设置表头样式
      [summarySheet, trendSheet, topUsersSheet].forEach(sheet => {
        sheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="user_report.xlsx"');

      await workbook.xlsx.write(res);
      res.end();

    } else {
      res.status(200).json({
        success: true,
        data: reportData
      });
    }

  } catch (error) {
    console.error('生成用户报表失败:', error);
    res.status(500).json({
      success: false,
      error: '生成用户报表失败',
      message: error.message
    });
  }
};

// 生成商品分析报表
const generateProductReport = async (req, res) => {
  try {
    const { format = 'json' } = req.body;

    // 获取商品统计数据
    const totalProducts = await Product.countDocuments({ isActive: true });
    const outOfStockProducts = await Product.countDocuments({ 
      isActive: true, 
      stock: 0 
    });
    const lowStockProducts = await Product.countDocuments({ 
      isActive: true, 
      stock: { $gt: 0, $lte: 10 } 
    });

    // 获取热销商品
    const topSellingProducts = await Product.find({ isActive: true })
      .sort({ sales: -1 })
      .limit(20)
      .select('name price stock sales rating favoriteCount');

    // 获取商品分类统计
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalSales: { $sum: '$sales' },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    const reportData = {
      summary: {
        totalProducts,
        outOfStockProducts,
        lowStockProducts,
        inStockProducts: totalProducts - outOfStockProducts
      },
      topSellingProducts,
      categoryStats
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('商品摘要');
      const topProductsSheet = workbook.addWorksheet('热销商品');
      const categorySheet = workbook.addWorksheet('分类统计');

      // 商品摘要
      summarySheet.columns = [
        { header: '指标', key: 'metric', width: 20 },
        { header: '数值', key: 'value', width: 15 }
      ];
      
      summarySheet.addRow({ metric: '总商品数', value: reportData.summary.totalProducts });
      summarySheet.addRow({ metric: '缺货商品', value: reportData.summary.outOfStockProducts });
      summarySheet.addRow({ metric: '低库存商品', value: reportData.summary.lowStockProducts });
      summarySheet.addRow({ metric: '有库存商品', value: reportData.summary.inStockProducts });

      // 热销商品
      topProductsSheet.columns = [
        { header: '商品名称', key: 'name', width: 30 },
        { header: '价格', key: 'price', width: 15 },
        { header: '库存', key: 'stock', width: 10 },
        { header: '销量', key: 'sales', width: 10 },
        { header: '评分', key: 'rating', width: 10 },
        { header: '收藏数', key: 'favoriteCount', width: 10 }
      ];
      
      reportData.topSellingProducts.forEach(product => {
        topProductsSheet.addRow({
          name: product.name,
          price: product.price,
          stock: product.stock,
          sales: product.sales,
          rating: product.rating || 0,
          favoriteCount: product.favoriteCount || 0
        });
      });

      // 分类统计
      categorySheet.columns = [
        { header: '商品分类', key: 'category', width: 20 },
        { header: '商品数量', key: 'productCount', width: 12 },
        { header: '总销量', key: 'totalSales', width: 12 },
        { header: '平均价格', key: 'averagePrice', width: 15 },
        { header: '平均评分', key: 'averageRating', width: 12 }
      ];
      
      reportData.categoryStats.forEach(stat => {
        categorySheet.addRow({
          category: stat._id,
          productCount: stat.productCount,
          totalSales: stat.totalSales,
          averagePrice: stat.averagePrice.toFixed(2),
          averageRating: stat.averageRating ? stat.averageRating.toFixed(1) : 0
        });
      });

      // 设置表头样式
      [summarySheet, topProductsSheet, categorySheet].forEach(sheet => {
        sheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="product_report.xlsx"');

      await workbook.xlsx.write(res);
      res.end();

    } else {
      res.status(200).json({
        success: true,
        data: reportData
      });
    }

  } catch (error) {
    console.error('生成商品报表失败:', error);
    res.status(500).json({
      success: false,
      error: '生成商品报表失败',
      message: error.message
    });
  }
};

// 获取报表模板列表
const getReportTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'sales_report',
        name: '销售报表',
        description: '生成销售统计报表，包含订单数据、收入统计和趋势分析',
        formats: ['json', 'excel', 'pdf'],
        parameters: ['startDate', 'endDate']
      },
      {
        id: 'user_report',
        name: '用户分析报表',
        description: '生成用户统计分析报表，包含用户增长、活跃度和消费行为',
        formats: ['json', 'excel']
      },
      {
        id: 'product_report',
        name: '商品分析报表',
        description: '生成商品统计分析报表，包含库存状态、销售排名和分类统计',
        formats: ['json', 'excel']
      }
    ];

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('获取报表模板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取报表模板失败',
      message: error.message
    });
  }
};

module.exports = {
  generateSalesReport,
  generateUserReport,
  generateProductReport,
  getReportTemplates
};