const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Refund = require('../models/Refund');

// 连接到数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB 连接成功');
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 创建演示用户
const createDemoUsers = async () => {
  console.log('👥 创建演示用户...');
  
  // 普通用户
  const regularUser = new User({
    username: 'demo_user',
    email: 'demo@example.com',
    password: '$2b$10$qqfJXTy6MTSoAqh5c3vrXOeX4NdpgPkNkxb0D74HhgVbf4ELjT5Ry', // password
    firstName: '演示',
    lastName: '用户',
    phone: '13800138000',
    addresses: [{
      recipient: '演示用户',
      phone: '13800138000',
      province: '北京',
      city: '北京',
      district: '朝阳区',
      detail: '演示街道123号',
      isDefault: true,
      postalCode: '100000'
    }],
    roles: ['user']
  });

  // 管理员用户
  const adminUser = new User({
    username: 'demo_admin',
    email: 'demo_admin@example.com',
    password: '$2b$10$qqfJXTy6MTSoAqh5c3vrXOeX4NdpgPkNkxb0D74HhgVbf4ELjT5Ry', // password
    firstName: '演示',
    lastName: '管理员',
    phone: '13900139000',
    addresses: [{
      recipient: '演示管理员',
      phone: '13900139000',
      province: '北京',
      city: '北京',
      district: '海淀区',
      detail: '管理街道456号',
      isDefault: true,
      postalCode: '100000'
    }],
    roles: ['admin']
  });

  try {
    await regularUser.save();
    await adminUser.save();
    console.log('✅ 演示用户创建成功');
    return { regularUser, adminUser };
  } catch (error) {
    console.log('⚠️  演示用户可能已存在');
    let existingRegular = await User.findOne({ username: 'demo_user' });
    let existingAdmin = await User.findOne({ email: 'demo_admin@example.com' });
    
    // 如果管理员用户不存在，创建它
    if (!existingAdmin) {
      const newAdminUser = new User({
        username: 'demo_admin',
        email: 'demo_admin@example.com',
        password: '$2b$10$qqfJXTy6MTSoAqh5c3vrXOeX4NdpgPkNkxb0D74HhgVbf4ELjT5Ry', // password
        firstName: '演示',
        lastName: '管理员',
        phone: '13900139000',
        addresses: [{
          recipient: '演示管理员',
          phone: '13900139000',
          province: '北京',
          city: '北京',
          district: '海淀区',
          detail: '管理街道456号',
          isDefault: true,
          postalCode: '100000'
        }],
        roles: ['admin']
      });
      await newAdminUser.save();
      existingAdmin = newAdminUser;
      console.log('✅ 创建缺失的管理员用户');
    }
    
    return { 
      regularUser: existingRegular, 
      adminUser: existingAdmin 
    };
  }
};

// 创建演示商品
const createDemoProducts = async () => {
  console.log('📦 创建演示商品...');
  
  const products = [
    {
      name: 'iPhone 15 Pro',
      description: '苹果最新款智能手机，配备A17 Pro芯片',
      price: 8999,
      category: 'electronics',
      brand: 'Apple',
      stock: 50,
      images: ['https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=iPhone+15+Pro'],
      specifications: {
        '屏幕尺寸': '6.1英寸',
        '处理器': 'A17 Pro',
        '内存': '256GB',
        '颜色': '深空黑色'
      }
    },
    {
      name: 'MacBook Air M3',
      description: '轻薄便携的笔记本电脑，搭载M3芯片',
      price: 12999,
      category: 'electronics',
      brand: 'Apple',
      stock: 30,
      images: ['https://via.placeholder.com/400x400/10B981/FFFFFF?text=MacBook+Air+M3'],
      specifications: {
        '屏幕尺寸': '13.6英寸',
        '处理器': 'M3',
        '内存': '16GB',
        '存储': '512GB SSD'
      }
    },
    {
      name: 'AirPods Pro 3',
      description: '主动降噪无线耳机，音质出色',
      price: 1999,
      category: 'electronics',
      brand: 'Apple',
      stock: 100,
      images: ['https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=AirPods+Pro+3'],
      specifications: {
        '降噪功能': '主动降噪',
        '续航时间': '6小时',
        '充电盒': '支持无线充电',
        '防水等级': 'IPX4'
      }
    }
  ];

  const createdProducts = [];
  for (const productData of products) {
    try {
      // 先检查是否已存在
      const existing = await Product.findOne({ name: productData.name });
      if (existing) {
        console.log(`⚠️  商品 "${productData.name}" 已存在`);
        createdProducts.push(existing);
      } else {
        const product = new Product(productData);
        await product.save();
        createdProducts.push(product);
        console.log(`✅ 创建商品: ${productData.name}`);
      }
    } catch (error) {
      console.error(`创建商品 "${productData.name}" 失败:`, error);
    }
  }
  
  console.log('✅ 演示商品创建成功');
  return createdProducts;
};

// 创建演示订单
const createDemoOrders = async (user, products) => {
  console.log('📋 创建演示订单...');
  
  if (!products || products.length < 3) {
    throw new Error('需要至少3个商品来创建演示订单');
  }
  
  const orders = [
    {
      user: user._id,
      orderNumber: `DEMO${Date.now()}001`,
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          image: products[0].image,
          quantity: 1,
          price: products[0].price,
          total: products[0].price
        }
      ],
      itemsPrice: products[0].price,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: products[0].price,
      finalPrice: products[0].price,
      status: 'delivered',
      isPaid: true,
      paymentMethod: 'alipay',
      shippingAddress: {
        fullName: `${user.firstName}${user.lastName}`,
        phone: user.phone || '13800138000',
        address: user.addresses && user.addresses[0] ? user.addresses[0].detail : '北京市朝阳区示例街道123号',
        city: '北京',
        province: '北京',
        postalCode: '100000'
      },
      shippingInfo: {
        carrier: '顺丰快递',
        trackingNumber: 'SF1234567890',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    },
    {
      user: user._id,
      orderNumber: `DEMO${Date.now()}002`,
      items: [
        {
          product: products[1]._id,
          name: products[1].name,
          image: products[1].image,
          quantity: 1,
          price: products[1].price,
          total: products[1].price
        },
        {
          product: products[2]._id,
          name: products[2].name,
          image: products[2].image,
          quantity: 1,
          price: products[2].price,
          total: products[2].price
        }
      ],
      itemsPrice: products[1].price + products[2].price,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: products[1].price + products[2].price,
      finalPrice: products[1].price + products[2].price,
      status: 'confirmed',
      isPaid: true,
      paymentMethod: 'wechat',
      shippingAddress: {
        fullName: `${user.firstName}${user.lastName}`,
        phone: user.phone || '13800138000',
        address: user.addresses && user.addresses[0] ? user.addresses[0].detail : '北京市朝阳区示例街道123号',
        city: '北京',
        province: '北京',
        postalCode: '100000'
      }
    }
  ];

  const createdOrders = [];
  for (const orderData of orders) {
    try {
      const order = new Order(orderData);
      await order.save();
      createdOrders.push(order);
      console.log(`✅ 创建订单: ${order.orderNumber}`);
    } catch (error) {
      console.error('创建订单失败:', error);
    }
  }
  
  if (createdOrders.length === 0) {
    throw new Error('没有成功创建任何订单');
  }
  
  console.log('✅ 演示订单创建成功');
  return createdOrders;
};

// 创建演示退款申请
const createDemoRefunds = async (user, orders, adminUser) => {
  console.log('💰 创建演示退款申请...');
  
  const refunds = [
    {
      order: orders[0]._id,
      user: user._id,
      amount: orders[0].finalPrice,
      reason: '商品质量问题',
      description: '收到的iPhone 15 Pro屏幕有划痕，影响使用体验，希望能够退款。',
      type: 'full',
      items: orders[0].items.map(item => ({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      paymentMethod: orders[0].paymentMethod,
      status: 'pending'
    },
    {
      order: orders[1]._id,
      user: user._id,
      amount: orders[1].items[1].price, // 只退AirPods
      reason: '尺寸不合适',
      description: 'AirPods Pro戴着不太舒服，想要退掉耳机，保留MacBook。',
      type: 'partial',
      items: [{
        product: orders[1].items[1].product,
        name: orders[1].items[1].name,
        quantity: 1,
        price: orders[1].items[1].price,
        total: orders[1].items[1].price
      }],
      paymentMethod: orders[1].paymentMethod,
      status: 'approved',
      processedBy: adminUser._id,
      processedAt: new Date(),
      communications: [
        {
          type: 'system',
          message: '退款申请已提交，等待审核',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'admin',
          message: '您的部分退款申请已批准，AirPods Pro可以退货退款。',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]
    }
  ];

  const createdRefunds = [];
  for (const refundData of refunds) {
    try {
      const refund = new Refund(refundData);
      await refund.save();
      createdRefunds.push(refund);
    } catch (error) {
      console.error('创建退款申请失败:', error);
    }
  }
  
  console.log('✅ 演示退款申请创建成功');
  return createdRefunds;
};

// 主函数
const main = async () => {
  console.log('🚀 开始创建演示数据...\n');
  
  try {
    await connectDB();
    
    // 创建用户
    const { regularUser, adminUser } = await createDemoUsers();
    
    // 创建商品
    const products = await createDemoProducts();
    
    // 创建订单
    const orders = await createDemoOrders(regularUser, products);
    
    // 创建退款申请
    const refunds = await createDemoRefunds(regularUser, orders, adminUser);
    
    console.log('\n🎉 演示数据创建完成！');
    console.log('\n📋 演示账户信息：');
    console.log('普通用户 - 用户名: demo_user, 密码: password');
    console.log('管理员 - 用户名: demo_admin, 密码: password');
    console.log('\n🔗 访问地址：');
    console.log('用户端售后管理: http://localhost:3000/after-sales');
    console.log('管理员售后管理: http://localhost:3000/admin/after-sales');
    console.log('用户订单页面: http://localhost:3000/orders');
    
  } catch (error) {
    console.error('❌ 演示数据创建失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
  }
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  createDemoUsers,
  createDemoProducts,
  createDemoOrders,
  createDemoRefunds
};