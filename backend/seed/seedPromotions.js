const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

// 示例优惠券数据
const sampleCoupons = [
  {
    code: 'WELCOME10',
    name: '新用户专享优惠券',
    description: '新用户注册即可使用的10元优惠券',
    discountType: 'fixed',
    discountValue: 10,
    minPurchaseAmount: 50,
    usageLimit: 1000,
    usageLimitPerUser: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后
    isActive: true,
    isPublic: true
  },
  {
    code: 'LOYAL15',
    name: '忠实客户优惠券',
    description: '忠实客户专属15元优惠券',
    discountType: 'fixed',
    discountValue: 15,
    minPurchaseAmount: 100,
    usageLimit: 500,
    usageLimitPerUser: 2,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180天后
    isActive: true,
    isPublic: true
  },
  {
    code: 'BIRTHDAY20',
    name: '生日专属优惠券',
    description: '生日专属20元优惠券',
    discountType: 'fixed',
    discountValue: 20,
    minPurchaseAmount: 0,
    usageLimit: 1000,
    usageLimitPerUser: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    isPublic: true
  }
];

// 示例促销数据
const samplePromotions = [
  // 新用户促销
  {
    name: '新用户欢迎礼',
    description: '欢迎新用户加入，享受专属优惠',
    promotionType: 'new_user',
    rewardType: 'coupon',
    rewardValue: 'WELCOME10',
    targetConditions: {
      minOrderCount: 0,
      maxOrderCount: 0,
      minTotalSpent: 0,
      registrationDaysRange: { min: 0, max: 7 }
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    priority: 10,
    isActive: true,
    isAutomatic: true
  },
  
  // 忠实客户促销
  {
    name: '忠实客户回馈',
    description: '感谢忠实客户的支持，享受专属优惠',
    promotionType: 'loyal_customer',
    rewardType: 'coupon',
    rewardValue: 'LOYAL15',
    targetConditions: {
      minOrderCount: 5,
      minTotalSpent: 1000,
      minActivityScore: 50
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    priority: 8,
    isActive: true,
    isAutomatic: true
  },
  
  // 生日促销
  {
    name: '生日特惠',
    description: '生日快乐！享受专属生日优惠',
    promotionType: 'birthday',
    rewardType: 'coupon',
    rewardValue: 'BIRTHDAY20',
    targetConditions: {
      minActivityScore: 20
    },
    triggerConditions: {
      birthdayDaysBefore: 7
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    priority: 7,
    isActive: true,
    isAutomatic: true
  },
  
  // 购物车挽回促销
  {
    name: '购物车挽回优惠',
    description: '您的购物车商品还在等待您',
    promotionType: 'cart_abandonment',
    rewardType: 'points',
    rewardValue: 50,
    targetConditions: {
      minOrderCount: 1,
      minActivityScore: 30
    },
    triggerConditions: {
      cartAbandonmentTime: 24,
      cartValueThreshold: 50
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    priority: 9,
    isActive: true,
    isAutomatic: true
  },
  
  // 低活跃度用户促销
  {
    name: '唤醒沉睡用户',
    description: '好久不见，我们想您了',
    promotionType: 'low_activity',
    rewardType: 'coupon',
    rewardValue: 'WELCOME10',
    targetConditions: {
      minOrderCount: 1,
      maxOrderCount: 0, // 最近没有订单
      minActivityScore: 10
    },
    triggerConditions: {
      inactivityDays: 60
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    priority: 5,
    isActive: true,
    isAutomatic: true
  }
];

const seedPromotions = async () => {
  try {
    console.log('🌱 开始创建促销数据...');
    
    // 获取管理员用户
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ 找不到管理员用户，请先创建用户数据');
      return;
    }
    
    // 创建优惠券
    console.log('📝 创建优惠券...');
    const createdCoupons = {};
    for (const couponData of sampleCoupons) {
      const coupon = new Coupon({
        ...couponData,
        createdBy: adminUser._id
      });
      await coupon.save();
      createdCoupons[couponData.code] = coupon._id;
      console.log(`✅ 创建优惠券: ${couponData.code}`);
    }
    
    // 创建促销
    console.log('🎯 创建促销活动...');
    for (const promotionData of samplePromotions) {
      const promotion = new Promotion({
        ...promotionData,
        createdBy: adminUser._id
      });
      
      // 设置关联的优惠券
      if (promotionData.rewardType === 'coupon' && promotionData.rewardValue) {
        promotion.coupon = createdCoupons[promotionData.rewardValue];
      }
      
      await promotion.save();
      console.log(`✅ 创建促销: ${promotionData.name}`);
    }
    
    console.log('🎉 促销数据创建完成！');
    console.log(`📊 创建了 ${sampleCoupons.length} 个优惠券`);
    console.log(`🎯 创建了 ${samplePromotions.length} 个促销活动`);
    
  } catch (error) {
    console.error('❌ 创建促销数据失败:', error);
  }
};

// 如果直接运行此文件
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/database');
  
  const runSeed = async () => {
    try {
      await connectDB();
      await seedPromotions();
      process.exit(0);
    } catch (error) {
      console.error('❌ 种子脚本运行失败:', error);
      process.exit(1);
    }
  };
  
  runSeed();
}

module.exports = seedPromotions;