const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Shipping = require('../models/Shipping');
const Refund = require('../models/Refund');

// 导出用户数据到Excel
const exportUsersToExcel = async (req, res) => {
  try {
    const { format = 'excel', filters = {} } = req.body;
    
    // 构建查询条件
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.createdAtStart && filters.createdAtEnd) {
      query.createdAt = {
        $gte: new Date(filters.createdAtStart),
        $lte: new Date(filters.createdAtEnd)
      };
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('用户数据');

      // 设置表头
      worksheet.columns = [
        { header: '用户ID', key: '_id', width: 25 },
        { header: '用户名', key: 'username', width: 20 },
        { header: '邮箱', key: 'email', width: 25 },
        { header: '姓名', key: 'fullName', width: 20 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '角色', key: 'role', width: 10 },
        { header: '状态', key: 'status', width: 10 },
        { header: '创建时间', key: 'createdAt', width: 20 },
        { header: '最后登录', key: 'lastLogin', width: 20 }
      ];

      // 添加数据
      users.forEach(user => {
        worksheet.addRow({
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || '',
          role: user.role,
          status: user.isActive ? '活跃' : '禁用',
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.lastLogin ? user.lastLogin.toISOString() : '从未登录'
        });
      });

      // 设置表头样式
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      });

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');

      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'csv') {
      // CSV格式导出
      let csvContent = '用户ID,用户名,邮箱,姓名,电话,角色,状态,创建时间,最后登录\n';
      
      users.forEach(user => {
        csvContent += `"${user._id}","${user.username}","${user.email}","${user.firstName || ''} ${user.lastName || ''}","${user.phone || ''}","${user.role}","${user.isActive ? '活跃' : '禁用'}","${user.createdAt.toISOString()}","${user.lastLogin ? user.lastLogin.toISOString() : '从未登录'}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
      res.send(csvContent);
    }

  } catch (error) {
    console.error('导出用户数据失败:', error);
    res.status(500).json({
      success: false,
      error: '导出用户数据失败',
      message: error.message
    });
  }
};

// 导出订单数据到Excel
const exportOrdersToExcel = async (req, res) => {
  try {
    const { format = 'excel', filters = {} } = req.body;
    
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.createdAtStart && filters.createdAtEnd) {
      query.createdAt = {
        $gte: new Date(filters.createdAtStart),
        $lte: new Date(filters.createdAtEnd)
      };
    }
    if (filters.minAmount) query.totalAmount = { $gte: parseFloat(filters.minAmount) };
    if (filters.maxAmount) query.totalAmount = { ...query.totalAmount, $lte: parseFloat(filters.maxAmount) };

    const orders = await Order.find(query)
      .populate('user', 'username email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('订单数据');

      worksheet.columns = [
        { header: '订单ID', key: '_id', width: 25 },
        { header: '用户', key: 'user', width: 20 },
        { header: '订单状态', key: 'status', width: 15 },
        { header: '总金额', key: 'totalAmount', width: 15 },
        { header: '商品数量', key: 'itemCount', width: 12 },
        { header: '支付状态', key: 'paymentStatus', width: 15 },
        { header: '配送状态', key: 'shippingStatus', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 },
        { header: '更新时间', key: 'updatedAt', width: 20 }
      ];

      orders.forEach(order => {
        worksheet.addRow({
          _id: order._id.toString(),
          user: order.user ? `${order.user.username} (${order.user.email})` : '未知用户',
          status: order.status,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          paymentStatus: order.paymentStatus || '未支付',
          shippingStatus: order.shippingStatus || '未发货',
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString()
        });
      });

      // 设置表头样式
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="orders_export.xlsx"');

      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'csv') {
      let csvContent = '订单ID,用户,订单状态,总金额,商品数量,支付状态,配送状态,创建时间,更新时间\n';
      
      orders.forEach(order => {
        csvContent += `"${order._id}","${order.user ? `${order.user.username} (${order.user.email})` : '未知用户'}","${order.status}","${order.totalAmount}","${order.items.length}","${order.paymentStatus || '未支付'}","${order.shippingStatus || '未发货'}","${order.createdAt.toISOString()}","${order.updatedAt.toISOString()}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
      res.send(csvContent);
    }

  } catch (error) {
    console.error('导出订单数据失败:', error);
    res.status(500).json({
      success: false,
      error: '导出订单数据失败',
      message: error.message
    });
  }
};

// 导出商品数据到Excel
const exportProductsToExcel = async (req, res) => {
  try {
    const { format = 'excel', filters = {} } = req.body;
    
    const query = { isActive: true };
    if (filters.category) query.category = filters.category;
    if (filters.minPrice) query.price = { $gte: parseFloat(filters.minPrice) };
    if (filters.maxPrice) query.price = { ...query.price, $lte: parseFloat(filters.maxPrice) };
    if (filters.inStock !== undefined) {
      if (filters.inStock) query.stock = { $gt: 0 };
      else query.stock = 0;
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('商品数据');

      worksheet.columns = [
        { header: '商品ID', key: '_id', width: 25 },
        { header: '商品名称', key: 'name', width: 30 },
        { header: '分类', key: 'category', width: 20 },
        { header: '价格', key: 'price', width: 15 },
        { header: '库存', key: 'stock', width: 10 },
        { header: '销量', key: 'sales', width: 10 },
        { header: '评分', key: 'rating', width: 10 },
        { header: '收藏数', key: 'favoriteCount', width: 10 },
        { header: '状态', key: 'status', width: 10 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];

      products.forEach(product => {
        worksheet.addRow({
          _id: product._id.toString(),
          name: product.name,
          category: product.category ? product.category.name : '未分类',
          price: product.price,
          stock: product.stock,
          sales: product.sales || 0,
          rating: product.rating || 0,
          favoriteCount: product.favoriteCount || 0,
          status: product.isActive ? '上架' : '下架',
          createdAt: product.createdAt.toISOString()
        });
      });

      // 设置表头样式
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="products_export.xlsx"');

      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'csv') {
      let csvContent = '商品ID,商品名称,分类,价格,库存,销量,评分,收藏数,状态,创建时间\n';
      
      products.forEach(product => {
        csvContent += `"${product._id}","${product.name}","${product.category ? product.category.name : '未分类'}","${product.price}","${product.stock}","${product.sales || 0}","${product.rating || 0}","${product.favoriteCount || 0}","${product.isActive ? '上架' : '下架'}","${product.createdAt.toISOString()}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
      res.send(csvContent);
    }

  } catch (error) {
    console.error('导出商品数据失败:', error);
    res.status(500).json({
      success: false,
      error: '导出商品数据失败',
      message: error.message
    });
  }
};

// 生成销售报表PDF
const generateSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 获取销售数据
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('user', 'username');

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 创建PDF文档
    const doc = new PDFDocument();
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales_report_${startDate}_to_${endDate}.pdf"`);

    doc.pipe(res);

    // 添加标题
    doc.fontSize(20).text('销售报表', 100, 100);
    doc.fontSize(12).text(`时间段: ${startDate} 至 ${endDate}`, 100, 130);
    doc.text(`生成时间: ${new Date().toLocaleString()}`, 100, 150);

    // 添加统计数据
    doc.fontSize(16).text('销售统计', 100, 180);
    doc.fontSize(12);
    doc.text(`总订单数: ${totalOrders}`, 100, 210);
    doc.text(`总销售额: ¥${totalRevenue.toFixed(2)}`, 100, 230);
    doc.text(`平均订单价值: ¥${averageOrderValue.toFixed(2)}`, 100, 250);

    // 添加订单列表
    if (orders.length > 0) {
      doc.fontSize(16).text('订单详情', 100, 290);
      let yPosition = 320;
      
      orders.slice(0, 20).forEach((order, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }
        
        doc.text(`${index + 1}. 订单 ${order._id.toString().substring(0, 8)}`, 100, yPosition);
        doc.text(`   用户: ${order.user ? order.user.username : '未知用户'}`, 120, yPosition + 20);
        doc.text(`   金额: ¥${order.totalAmount.toFixed(2)}`, 120, yPosition + 40);
        doc.text(`   时间: ${order.createdAt.toLocaleString()}`, 120, yPosition + 60);
        
        yPosition += 90;
      });

      if (orders.length > 20) {
        doc.text(`... 还有 ${orders.length - 20} 个订单未显示`, 100, yPosition);
      }
    }

    doc.end();

  } catch (error) {
    console.error('生成销售报表失败:', error);
    res.status(500).json({
      success: false,
      error: '生成销售报表失败',
      message: error.message
    });
  }
};

// 批量导出多种数据
const exportMultipleData = async (req, res) => {
  try {
    const { dataTypes, format = 'zip', filters = {} } = req.body;
    
    if (format !== 'zip') {
      return res.status(400).json({
        success: false,
        error: '批量导出只支持ZIP格式'
      });
    }

    // 创建临时目录
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = new Date().getTime();
    const zipPath = path.join(tempDir, `export_${timestamp}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="data_export_${timestamp}.zip"`);
      
      const readStream = fs.createReadStream(zipPath);
      readStream.pipe(res);
      
      readStream.on('end', () => {
        // 清理临时文件
        fs.unlinkSync(zipPath);
      });
    });

    archive.pipe(output);

    // 根据请求的数据类型导出数据
    if (dataTypes.includes('users')) {
      const users = await User.find({}).select('-password -refreshToken');
      let csvContent = '用户ID,用户名,邮箱,姓名,电话,角色,状态,创建时间\n';
      users.forEach(user => {
        csvContent += `"${user._id}","${user.username}","${user.email}","${user.firstName || ''} ${user.lastName || ''}","${user.phone || ''}","${user.role}","${user.isActive ? '活跃' : '禁用'}","${user.createdAt.toISOString()}"\n`;
      });
      archive.append(csvContent, { name: 'users.csv' });
    }

    if (dataTypes.includes('orders')) {
      const orders = await Order.find({}).populate('user', 'username email');
      let csvContent = '订单ID,用户,订单状态,总金额,商品数量,支付状态,配送状态,创建时间\n';
      orders.forEach(order => {
        csvContent += `"${order._id}","${order.user ? `${order.user.username} (${order.user.email})` : '未知用户'}","${order.status}","${order.totalAmount}","${order.items.length}","${order.paymentStatus || '未支付'}","${order.shippingStatus || '未发货'}","${order.createdAt.toISOString()}"\n`;
      });
      archive.append(csvContent, { name: 'orders.csv' });
    }

    if (dataTypes.includes('products')) {
      const products = await Product.find({ isActive: true }).populate('category', 'name');
      let csvContent = '商品ID,商品名称,分类,价格,库存,销量,评分,收藏数,状态,创建时间\n';
      products.forEach(product => {
        csvContent += `"${product._id}","${product.name}","${product.category ? product.category.name : '未分类'}","${product.price}","${product.stock}","${product.sales || 0}","${product.rating || 0}","${product.favoriteCount || 0}","${product.isActive ? '上架' : '下架'}","${product.createdAt.toISOString()}"\n`;
      });
      archive.append(csvContent, { name: 'products.csv' });
    }

    archive.finalize();

  } catch (error) {
    console.error('批量导出数据失败:', error);
    res.status(500).json({
      success: false,
      error: '批量导出数据失败',
      message: error.message
    });
  }
};

// 获取可用的导出模板
const getExportTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'user_export',
        name: '用户数据导出',
        description: '导出所有用户数据',
        formats: ['excel', 'csv'],
        fields: ['_id', 'username', 'email', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'createdAt']
      },
      {
        id: 'order_export',
        name: '订单数据导出',
        description: '导出所有订单数据',
        formats: ['excel', 'csv'],
        fields: ['_id', 'user', 'status', 'totalAmount', 'items', 'paymentStatus', 'shippingStatus', 'createdAt']
      },
      {
        id: 'product_export',
        name: '商品数据导出',
        description: '导出所有商品数据',
        formats: ['excel', 'csv'],
        fields: ['_id', 'name', 'category', 'price', 'stock', 'sales', 'rating', 'favoriteCount', 'isActive', 'createdAt']
      },
      {
        id: 'sales_report',
        name: '销售报表',
        description: '生成销售统计报表',
        formats: ['pdf'],
        fields: ['period', 'totalRevenue', 'totalOrders', 'averageOrderValue']
      },
      {
        id: 'bulk_export',
        name: '批量数据导出',
        description: '一次性导出多种数据',
        formats: ['zip'],
        fields: ['users', 'orders', 'products']
      }
    ];

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('获取导出模板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取导出模板失败',
      message: error.message
    });
  }
};

module.exports = {
  exportUsersToExcel,
  exportOrdersToExcel,
  exportProductsToExcel,
  generateSalesReportPDF,
  exportMultipleData,
  getExportTemplates
};