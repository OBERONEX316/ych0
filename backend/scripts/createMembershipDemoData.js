const mongoose = require('mongoose');
const MembershipLevel = require('../models/MembershipLevel');
const UserMembership = require('../models/UserMembership');
const MembershipTask = require('../models/MembershipTask');
const User = require('../models/User');

const createMembershipDemoData = async () => {
  try {
    console.log('🎯 开始创建会员系统演示数据...');

    // 1. 创建会员等级
    console.log('📊 创建会员等级...');
    const membershipLevels = [
      {
        name: '普通会员',
        level: 1,
        description: '基础会员等级，享受基本权益',
        icon: '🥉',
        color: '#8B5CF6',
        upgradeConditions: {
          minPoints: 0,
          minTotalSpent: 0,
          minOrders: 0,
          minReferrals: 0
        },
        benefits: {
          discountRate: 5,
          pointsMultiplier: 1.0,
          freeShippingThreshold: 99,
          hasPrioritySupport: false,
          hasExclusiveEvents: false,
          birthdayBenefits: '生日优惠券',
          otherBenefits: ['享受基础折扣5%', '积分累积1倍', '满99元免运费', '生日优惠券']
        }
      },
      {
        name: '银卡会员',
        level: 2,
        description: '银卡会员，享受更多优惠和服务',
        icon: '🥈',
        color: '#C0C0C0',
        upgradeConditions: {
          minPoints: 1000,
          minTotalSpent: 2000,
          minOrders: 5,
          minReferrals: 1
        },
        benefits: {
          discountRate: 10,
          pointsMultiplier: 1.2,
          freeShippingThreshold: 59,
          hasPrioritySupport: true,
          hasExclusiveEvents: false,
          birthdayBenefits: '生日专享礼包',
          otherBenefits: ['享受银卡折扣10%', '积分累积1.2倍', '满59元免运费', '专属客服', '生日专享礼包']
        }
      },
      {
        name: '金卡会员',
        level: 3,
        description: '金卡会员，享受高级权益和专属服务',
        icon: '🥇',
        color: '#FFD700',
        upgradeConditions: {
          minPoints: 5000,
          minTotalSpent: 10000,
          minOrders: 20,
          minReferrals: 3
        },
        benefits: {
          discountRate: 15,
          pointsMultiplier: 1.5,
          freeShippingThreshold: 0,
          hasPrioritySupport: true,
          hasExclusiveEvents: true,
          birthdayBenefits: '生日豪华礼包',
          otherBenefits: ['享受金卡折扣15%', '积分累积1.5倍', '全场免运费', '专属客服', '生日豪华礼包', '优先客服支持', '新品抢先体验']
        }
      },
      {
        name: '钻石会员',
        level: 4,
        description: '钻石会员，享受顶级权益和至尊服务',
        icon: '💎',
        color: '#B9F2FF',
        upgradeConditions: {
          minPoints: 20000,
          minTotalSpent: 50000,
          minOrders: 50,
          minReferrals: 10
        },
        benefits: {
          discountRate: 20,
          pointsMultiplier: 2.0,
          freeShippingThreshold: 0,
          hasPrioritySupport: true,
          hasExclusiveEvents: true,
          birthdayBenefits: '生日至尊礼包',
          otherBenefits: ['享受钻石折扣20%', '积分累积2倍', '全场免运费', '专属钻石客服', '生日至尊礼包', '优先发货', '专属活动邀请', '免费退换货', '专属折扣日']
        }
      }
    ];

    // 清空现有数据
    await MembershipLevel.deleteMany({});
    console.log('🗑️ 已清空现有会员等级数据');

    // 插入新数据
    const createdLevels = await MembershipLevel.insertMany(membershipLevels);
    console.log(`✅ 成功创建 ${createdLevels.length} 个会员等级`);

    // 2. 创建会员任务
    console.log('📋 创建会员任务...');
    const membershipTasks = [
      {
        title: '每日签到',
        description: '每日登录签到可获得积分奖励',
        taskType: 'daily_login',
        target: 1,
        targetUnit: 'times',
        rewards: {
          points: 10,
          experience: 5
        },
        dailyReset: true,
        maxCompletions: 1,
        icon: '📅',
        sortOrder: 1,
        difficulty: 'easy'
      },
      {
        title: '首次购物',
        description: '完成首次购物可获得额外积分奖励',
        taskType: 'first_purchase',
        target: 1,
        targetUnit: 'times',
        rewards: {
          points: 100,
          experience: 50
        },
        maxCompletions: 1,
        icon: '🛍️',
        sortOrder: 2,
        difficulty: 'easy'
      },
      {
        title: '每日购物',
        description: '每日完成购物可获得积分奖励',
        taskType: 'total_spending',
        target: 50,
        targetUnit: 'amount',
        conditions: {
          minSpending: 50
        },
        rewards: {
          points: 50,
          experience: 20
        },
        dailyReset: true,
        maxCompletions: 1,
        icon: '🛒',
        sortOrder: 3,
        difficulty: 'medium'
      },
      {
        title: '商品评价',
        description: '对购买的商品进行评价可获得积分奖励',
        taskType: 'product_review',
        target: 1,
        targetUnit: 'times',
        rewards: {
          points: 20,
          experience: 10
        },
        icon: '⭐',
        sortOrder: 4,
        difficulty: 'easy'
      },
      {
        title: '分享商品',
        description: '分享商品到社交媒体可获得积分奖励',
        taskType: 'social_share',
        target: 1,
        targetUnit: 'times',
        rewards: {
          points: 30,
          experience: 15
        },
        dailyReset: true,
        maxCompletions: 3,
        icon: '📱',
        sortOrder: 5,
        difficulty: 'easy'
      },
      {
        title: '邀请好友',
        description: '成功邀请好友注册可获得积分奖励',
        taskType: 'referral',
        target: 1,
        targetUnit: 'times',
        conditions: {
          customConditions: { friendMustPurchase: true }
        },
        rewards: {
          points: 200,
          experience: 100
        },
        icon: '👥',
        sortOrder: 6,
        difficulty: 'hard'
      },
      {
        title: '周购物达人',
        description: '每周购物满500元可获得额外积分奖励',
        taskType: 'total_spending',
        target: 500,
        targetUnit: 'amount',
        conditions: {
          minSpending: 500
        },
        rewards: {
          points: 200,
          experience: 100
        },
        weeklyReset: true,
        maxCompletions: 1,
        icon: '🏆',
        sortOrder: 7,
        difficulty: 'hard'
      },
      {
        title: '月消费之星',
        description: '每月消费满2000元可获得额外积分奖励',
        taskType: 'total_spending',
        target: 2000,
        targetUnit: 'amount',
        conditions: {
          minSpending: 2000
        },
        rewards: {
          points: 500,
          experience: 250
        },
        monthlyReset: true,
        maxCompletions: 1,
        icon: '⭐',
        sortOrder: 8,
        difficulty: 'expert'
      }
    ];

    // 清空现有任务数据
    await MembershipTask.deleteMany({});
    console.log('🗑️ 已清空现有会员任务数据');

    // 插入新任务数据
    const createdTasks = await MembershipTask.insertMany(membershipTasks);
    console.log(`✅ 成功创建 ${createdTasks.length} 个会员任务`);

    // 3. 为用户创建会员信息
    console.log('👤 为用户创建会员信息...');
    const users = await User.find({ role: 'user' }).limit(10);
    
    if (users.length > 0) {
      // 清空现有用户会员数据
      await UserMembership.deleteMany({});
      console.log('🗑️ 已清空现有用户会员数据');

      const userMemberships = [];
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const randomLevel = createdLevels[Math.floor(Math.random() * createdLevels.length)];
        const randomPoints = Math.floor(Math.random() * (randomLevel.upgradeConditions.minPoints + 5000));
        
        userMemberships.push({
          userId: user._id,
          currentLevel: randomLevel._id,
          stats: {
            totalPoints: randomPoints,
            totalSpent: Math.floor(Math.random() * 10000) + 100,
            totalOrders: Math.floor(Math.random() * 50) + 1,
            totalReferrals: Math.floor(Math.random() * 5),
            recentStats: {
              periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90天前
              points: Math.floor(randomPoints * 0.3),
              spent: Math.floor(Math.random() * 5000) + 500,
              orders: Math.floor(Math.random() * 20) + 1
            }
          },
          status: 'active',
          membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 一年后过期
          upgradeHistory: [],
          exclusiveCoupons: [],
          benefitUsage: [],
          pointsHistory: []
        });
      }

      // 插入用户会员数据
      const createdUserMemberships = await UserMembership.insertMany(userMemberships);
      console.log(`✅ 成功创建 ${createdUserMemberships.length} 个用户会员信息`);
    }

    console.log('🎉 会员系统演示数据创建完成！');
    console.log('📊 数据概览:');
    console.log(`   - 会员等级: ${createdLevels.length} 个`);
    console.log(`   - 会员任务: ${createdTasks.length} 个`);
    console.log(`   - 用户会员: ${users.length} 个`);

  } catch (error) {
    console.error('❌ 创建会员系统演示数据失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  const connectDB = require('../config/database');
  
  connectDB()
    .then(() => {
      console.log('🔗 数据库连接成功');
      return createMembershipDemoData();
    })
    .then(() => {
      console.log('✅ 演示数据创建完成，正在退出...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 创建演示数据失败:', error);
      process.exit(1);
    });
}

module.exports = createMembershipDemoData;