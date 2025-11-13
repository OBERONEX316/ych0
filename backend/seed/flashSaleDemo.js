const mongoose = require('mongoose');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');

const createFlashSaleDemoData = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('✅ MongoDB 连接成功');

    // 获取一些商品作为秒杀商品
    const products = await Product.find().limit(6);
    
    if (products.length === 0) {
      console.log('❌ 没有找到商品，请先运行商品数据脚本');
      return;
    }

    // 创建即将开始的秒杀活动
    const upcomingSale = new FlashSale({
      title: '双11预热秒杀',
      description: '双11狂欢节提前预热，精选商品限时秒杀，数量有限，先到先得！',
      image: '/images/flash-sale-1.jpg',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后开始
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4小时后结束
      status: 'scheduled',
      products: [
        {
          product: products[0]._id,
          flashPrice: 999,
          originalPrice: 1299,
          stock: 50,
          sold: 0,
          limitPerUser: 2,
          sortOrder: 1
        },
        {
          product: products[1]._id,
          flashPrice: 2999,
          originalPrice: 3999,
          stock: 30,
          sold: 0,
          limitPerUser: 1,
          sortOrder: 2
        },
        {
          product: products[2]._id,
          flashPrice: 199,
          originalPrice: 299,
          stock: 100,
          sold: 0,
          limitPerUser: 3,
          sortOrder: 3
        }
      ],
      participationConditions: {
        minLevel: 1,
        requireMembership: false,
        couponRequired: false
      },
      preheat: {
        enabled: true,
        preheatTime: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后开始预热
        notificationEnabled: true,
        reminderEnabled: true
      },
      tags: ['双11', '预热', '限时秒杀'],
      weight: 90,
      seo: {
        metaTitle: '双11预热秒杀 - 限时特惠',
        metaDescription: '双11狂欢节预热秒杀活动，精选商品限时特惠，数量有限先到先得！'
      }
    });

    // 创建进行中的秒杀活动
    const activeSale = new FlashSale({
      title: '周末狂欢秒杀',
      description: '周末特惠，精选商品限时秒杀，错过再等一周！',
      image: '/images/flash-sale-2.jpg',
      startTime: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前开始
      endTime: new Date(Date.now() + 90 * 60 * 1000), // 90分钟后结束
      status: 'active',
      products: [
        {
          product: products[3]._id,
          flashPrice: 599,
          originalPrice: 899,
          stock: 20,
          sold: 15,
          limitPerUser: 1,
          sortOrder: 1
        },
        {
          product: products[4]._id,
          flashPrice: 1299,
          originalPrice: 1899,
          stock: 25,
          sold: 8,
          limitPerUser: 1,
          sortOrder: 2
        },
        {
          product: products[5]._id,
          flashPrice: 399,
          originalPrice: 599,
          stock: 40,
          sold: 22,
          limitPerUser: 2,
          sortOrder: 3
        }
      ],
      participationConditions: {
        minLevel: 1,
        requireMembership: false,
        couponRequired: false
      },
      preheat: {
        enabled: true,
        notificationEnabled: true,
        reminderEnabled: true
      },
      tags: ['周末', '狂欢', '限时秒杀'],
      weight: 85,
      statistics: {
        totalViews: 1250,
        totalParticipants: 89,
        totalOrders: 45,
        totalRevenue: 45600,
        conversionRate: 7.2
      }
    });

    // 保存秒杀活动
    await upcomingSale.save();
    await activeSale.save();

    console.log('✅ 秒杀活动演示数据创建成功');
    console.log(`🎯 创建了 2 个秒杀活动：`);
    console.log(`   - ${upcomingSale.title} (即将开始)`);
    console.log(`   - ${activeSale.title} (进行中)`);

  } catch (error) {
    console.error('❌ 创建秒杀活动演示数据失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 数据库连接已关闭');
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  createFlashSaleDemoData();
}

module.exports = createFlashSaleDemoData;