const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehavior');
const User = require('../models/User');
const Product = require('../models/Product');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');

// 生成用户行为数据
const generateUserBehaviorData = async () => {
  try {
    console.log('🔄 开始生成用户行为数据...');
    
    // 获取所有用户
    const users = await User.find({}).limit(10);
    console.log(`📊 找到 ${users.length} 个用户`);
    
    // 获取所有产品
    const products = await Product.find({}).limit(20);
    console.log(`📦 找到 ${products.length} 个产品`);
    
    const behaviors = [];
    const now = new Date();
    
    // 为每个用户生成行为数据
    for (let user of users) {
      // 为每个用户生成50-100条行为记录
      const behaviorCount = Math.floor(Math.random() * 50) + 50;
      
      for (let i = 0; i < behaviorCount; i++) {
        const randomTime = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // 最近30天内
        
        // 生成基础行为数据
        const behavior = {
          userId: user._id,
          sessionId: `session_${user._id}_${Date.now()}_${i}`,
          action: 'page_view',
          timestamp: randomTime,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          pageType: 'home',
          duration: Math.floor(Math.random() * 300) + 10,
          scrollDepth: Math.floor(Math.random() * 100),
          clickCount: Math.floor(Math.random() * 20),
          targetData: {
            deviceInfo: {
              browser: 'Chrome',
              os: 'Windows',
              deviceType: 'desktop',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            location: {
              ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
              country: 'CN',
              region: 'Beijing',
              city: 'Beijing'
            },
            referrer: 'https://google.com',
            pageUrl: '/home',
            pageTitle: '首页'
          }
        };
        
        // 随机选择行为类型
        const actions = [
          'page_view', 'product_view', 'product_click', 'add_to_cart', 'remove_from_cart',
          'search', 'category_browse', 'wishlist_add', 'wishlist_remove', 'review_view',
          'login', 'logout', 'checkout_start', 'checkout_complete'
        ];
        behavior.action = actions[Math.floor(Math.random() * actions.length)];
        
        // 根据行为类型设置目标数据
        if (['product_view', 'product_click', 'add_to_cart', 'remove_from_cart', 'wishlist_add', 'wishlist_remove', 'review_view', 'review_submit'].includes(behavior.action) && products.length > 0) {
          const product = products[Math.floor(Math.random() * products.length)];
          behavior.targetType = 'product';
          behavior.targetId = product._id;
          behavior.targetData.productId = product._id;
          behavior.targetData.category = product.category;
          behavior.targetData.price = product.price;
          behavior.pageType = 'product';
        } else if (behavior.action === 'search') {
          behavior.targetType = 'search';
          const searchKeywords = ['手机', '电脑', '耳机', '衣服', '鞋子', '书籍', '化妆品', '运动', '家居', '美食'];
          behavior.targetData.searchQuery = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
          behavior.targetData.searchResults = Math.floor(Math.random() * 100) + 1;
          behavior.pageType = 'search';
        } else if (behavior.action === 'category_browse') {
          behavior.targetType = 'category';
          const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty'];
          behavior.targetData.category = categories[Math.floor(Math.random() * categories.length)];
          behavior.targetId = new mongoose.Types.ObjectId();
          behavior.pageType = 'category';
        } else if (['checkout_start', 'checkout_complete'].includes(behavior.action)) {
          behavior.targetType = 'order';
          behavior.targetId = new mongoose.Types.ObjectId();
          behavior.targetData.orderTotal = Math.floor(Math.random() * 2000) + 100;
          behavior.pageType = 'checkout';
        }
        
        // 随机添加购物车数据
        if (behavior.action === 'add_to_cart' && products.length > 0) {
          behavior.targetData.quantity = Math.floor(Math.random() * 5) + 1;
        }
        
        behaviors.push(behavior);
      }
    }
    
    console.log(`📝 生成 ${behaviors.length} 条用户行为记录`);
    
    // 批量插入数据
    await UserBehavior.insertMany(behaviors);
    
    console.log('✅ 用户行为数据生成成功！');
    
  } catch (error) {
    console.error('❌ 生成用户行为数据失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 运行脚本
if (require.main === module) {
  generateUserBehaviorData();
}

module.exports = { generateUserBehaviorData };