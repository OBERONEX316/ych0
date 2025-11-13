const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/database');

// 测试商品数据
const products = [
  {
    name: '高端智能手机',
    description: '最新款智能手机，6.7英寸OLED屏幕，8GB内存，256GB存储，支持5G网络',
    price: 3999.00,
    originalPrice: 4999.00,
    images: ['/images/phone1.jpg', '/images/phone2.jpg'],
    rating: 4.9,
    sales: 2345,
    stock: 89,
    category: 'electronics',
    tags: ['新品', '热卖', '智能手机', '5G'],
    specifications: {
      screen: '6.7英寸 OLED',
      memory: '8GB RAM',
      storage: '256GB',
      camera: '4800万像素三摄',
      battery: '4500mAh'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: '无线蓝牙耳机',
    description: '主动降噪，长续航30小时，高品质音质，舒适佩戴，IPX5防水',
    price: 799.00,
    originalPrice: 999.00,
    images: ['/images/earphones1.jpg', '/images/earphones2.jpg'],
    rating: 4.8,
    sales: 1567,
    stock: 45,
    category: 'electronics',
    tags: ['蓝牙', '降噪', '耳机', '防水'],
    specifications: {
      batteryLife: '30小时',
      noiseCancellation: '主动降噪',
      waterproof: 'IPX5',
      connectivity: '蓝牙5.2'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: '智能手表',
    description: '健康监测，运动追踪，来电提醒，长续航7天，GPS定位',
    price: 1299.00,
    originalPrice: 1599.00,
    images: ['/images/watch1.jpg', '/images/watch2.jpg'],
    rating: 4.7,
    sales: 987,
    stock: 23,
    category: 'electronics',
    tags: ['智能穿戴', '健康', '运动', 'GPS'],
    specifications: {
      screen: '1.4英寸 AMOLED',
      battery: '7天续航',
      healthMonitoring: '心率、血氧、睡眠',
      sportsModes: '100+运动模式',
      gps: '内置GPS'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: '笔记本电脑',
    description: '轻薄便携仅1.3kg，高性能处理器，14英寸2K屏幕，快速充电',
    price: 5999.00,
    originalPrice: 6999.00,
    images: ['/images/laptop1.jpg', '/images/laptop2.jpg'],
    rating: 4.6,
    sales: 654,
    stock: 12,
    category: 'electronics',
    tags: ['笔记本', '便携', '高性能', '轻薄'],
    specifications: {
      processor: 'Intel Core i5',
      memory: '16GB RAM',
      storage: '512GB SSD',
      screen: '14英寸 2K',
      weight: '1.3kg',
      os: 'Windows 11'
    },
    isActive: true,
    isFeatured: false
  },
  {
    name: '4K智能电视',
    description: '55英寸4K超高清，HDR10+，智能语音控制，MEMC运动补偿',
    price: 2999.00,
    originalPrice: 3999.00,
    images: ['/images/tv1.jpg', '/images/tv2.jpg'],
    rating: 4.5,
    sales: 432,
    stock: 34,
    category: 'electronics',
    tags: ['电视', '4K', '智能', 'HDR'],
    specifications: {
      size: '55英寸',
      resolution: '4K UHD',
      hdr: 'HDR10+',
      smartSystem: 'Android TV',
      voiceControl: '支持'
    },
    isActive: true,
    isFeatured: false
  },
  {
    name: '游戏主机',
    description: '次世代游戏体验，8K分辨率支持，光线追踪，快速加载',
    price: 3499.00,
    originalPrice: 4299.00,
    images: ['/images/gameconsole1.jpg', '/images/gameconsole2.jpg'],
    rating: 4.8,
    sales: 789,
    stock: 56,
    category: 'electronics',
    tags: ['游戏', '主机', '8K', '光追'],
    specifications: {
      processor: '定制8核CPU',
      gpu: '定制GPU',
      storage: '1TB SSD',
      resolution: '支持8K',
      rayTracing: '硬件加速光线追踪'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: '智能音箱',
    description: '360°环绕音效，智能语音助手，多房间音频同步',
    price: 499.00,
    originalPrice: 699.00,
    images: ['/images/speaker1.jpg', '/images/speaker2.jpg'],
    rating: 4.4,
    sales: 321,
    stock: 78,
    category: 'electronics',
    tags: ['音箱', '智能', '语音助手', '多房间'],
    specifications: {
      audio: '360°环绕声',
      voiceAssistant: '内置',
      connectivity: 'WiFi、蓝牙',
      multiRoom: '支持多房间同步'
    },
    isActive: true,
    isFeatured: false
  },
  {
    name: '无人机',
    description: '4K相机，30分钟续航，GPS定位，智能跟随，避障功能',
    price: 1999.00,
    originalPrice: 2599.00,
    images: ['/images/drone1.jpg', '/images/drone2.jpg'],
    rating: 4.7,
    sales: 234,
    stock: 45,
    category: 'electronics',
    tags: ['无人机', '4K', 'GPS', '避障'],
    specifications: {
      camera: '4K 60fps',
      flightTime: '30分钟',
      range: '8公里',
      gps: '内置',
      obstacleAvoidance: '前后下三向避障'
    },
    isActive: true,
    isFeatured: true
  }
];

async function seedDatabase() {
  try {
    // 连接数据库
    await connectDB();
    
    console.log('开始插入测试商品数据...');
    
    // 清空现有数据
    await Product.deleteMany({});
    console.log('已清空现有商品数据');
    
    // 插入测试数据
    const createdProducts = await Product.insertMany(products);
    console.log(`成功插入 ${createdProducts.length} 个商品`);
    
    // 显示插入的商品信息
    createdProducts.forEach(product => {
      console.log(`- ${product.name} (${product.category}) - 库存: ${product.stock}`);
    });
    
    console.log('测试数据插入完成！');
    
  } catch (error) {
    console.error('插入测试数据时出错:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

// 如果是直接运行此文件，则执行种子函数
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;