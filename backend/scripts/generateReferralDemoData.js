const mongoose = require('mongoose');
const ReferralProgram = require('../models/ReferralProgram');
const ReferralRecord = require('../models/ReferralRecord');
const User = require('../models/User');

const generateReferralDemoData = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
      // 移除已弃用的选项
    });

    console.log('🔄 开始生成推荐奖励演示数据...');

    // 获取用户数据
    const users = await User.find({}).limit(5);
    if (users.length === 0) {
      console.log('❌ 没有找到用户数据，请先运行用户数据生成脚本');
      return;
    }

    // 清除现有的推荐数据
    await ReferralProgram.deleteMany({});
    await ReferralRecord.deleteMany({});
    console.log('🗑️ 已清除现有推荐数据');

    // 创建推荐奖励活动
    const referralPrograms = [
      {
        name: '好友推荐奖励计划',
        description: '邀请好友注册并完成首次购买，双方均可获得奖励',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true,
        conditions: {
          requiredOrderAmount: 100,
          requiredOrderCount: 1,
          requiredRegistrationDays: 7
        },
        referrerReward: {
          type: 'points',
          amount: 500
        },
        referredReward: {
          type: 'points',
          amount: 300
        },
        referralCodeSettings: {
          codeType: 'auto',
          prefix: 'FRIEND',
          length: 8
        },
        sharingSettings: {
          enabled: true,
          platforms: ['twitter', 'facebook', 'linkedin', 'wechat'],
          customMessage: '加入我们的购物平台，享受优质商品和服务！'
        },
        eligibility: {
          minPurchaseAmount: 0,
          minRegistrationDays: 0,
          requiredMembershipLevel: '',
          maxReferralsPerUser: 10
        },
        statistics: {
          totalReferrals: 0,
          completedReferrals: 0,
          totalRewardsDistributed: 0
        }
      },
      {
        name: 'VIP推荐专享计划',
        description: 'VIP用户专属推荐计划，奖励更丰厚',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-11-30'),
        isActive: true,
        conditions: {
          requiredOrderAmount: 200,
          requiredOrderCount: 1,
          requiredRegistrationDays: 14
        },
        referrerReward: {
          type: 'coupon',
          amount: 50
        },
        referredReward: {
          type: 'coupon',
          amount: 30
        },
        referralCodeSettings: {
          codeType: 'auto',
          prefix: 'VIP',
          length: 10
        },
        sharingSettings: {
          enabled: true,
          platforms: ['twitter', 'facebook', 'linkedin'],
          customMessage: 'VIP专享推荐，享受更多优惠！'
        },
        eligibility: {
          minPurchaseAmount: 1000,
          minRegistrationDays: 30,
          requiredMembershipLevel: 'Gold',
          maxReferralsPerUser: 20
        },
        statistics: {
          totalReferrals: 0,
          completedReferrals: 0,
          totalRewardsDistributed: 0
        }
      },
      {
        name: '新用户推荐活动',
        description: '限时新用户推荐活动，简单参与即可获得奖励',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30'),
        isActive: true,
        conditions: {
          requiredOrderAmount: 50,
          requiredOrderCount: 1,
          requiredRegistrationDays: 3
        },
        referrerReward: {
          type: 'points',
          amount: 200
        },
        referredReward: {
          type: 'points',
          amount: 150
        },
        referralCodeSettings: {
          codeType: 'auto',
          prefix: 'NEW',
          length: 6
        },
        sharingSettings: {
          enabled: true,
          platforms: ['twitter', 'facebook'],
          customMessage: '新朋友专享优惠，快来加入我们！'
        },
        eligibility: {
          minPurchaseAmount: 0,
          minRegistrationDays: 0,
          requiredMembershipLevel: '',
          maxReferralsPerUser: 5
        },
        statistics: {
          totalReferrals: 0,
          completedReferrals: 0,
          totalRewardsDistributed: 0
        }
      }
    ];

    // 创建推荐活动
    const createdPrograms = [];
    for (const programData of referralPrograms) {
      const program = new ReferralProgram(programData);
      await program.save();
      createdPrograms.push(program);
      console.log(`✅ 创建推荐活动: ${program.name}`);
    }

    // 创建推荐记录
    const referralRecords = [];
    
    // 为第一个用户创建一些推荐记录
    const referrer1 = users[0];
    const referredUsers1 = users.slice(1, 4); // 用户2,3,4
    
    for (let i = 0; i < referredUsers1.length; i++) {
      const referredUser = referredUsers1[i];
      const program = createdPrograms[0]; // 使用第一个活动
      
      const record = new ReferralRecord({
        referrerId: referrer1._id,
        referredId: referredUser._id,
        programId: program._id,
        referralCode: `FRIEND00${i + 1}`,
        status: i === 0 ? 'completed' : 'pending',
        referralDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // 前几天
        completionDate: i === 0 ? new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000) : null,
        rewardStatus: i === 0 ? 'awarded' : 'pending',
        referrerReward: {
          type: 'points',
          amount: program.referrerReward.amount,
          awardedAt: i === 0 ? new Date() : null
        },
        referredReward: {
          type: 'points', 
          amount: program.referredReward.amount,
          awardedAt: i === 0 ? new Date() : null
        },
        completionConditions: program.conditions,
        actualCompletion: i === 0 ? {
          orderAmount: 150,
          orderCount: 1,
          registrationDays: 10,
          customData: {}
        } : {
          orderAmount: 0,
          orderCount: 0,
          registrationDays: 0,
          customData: {}
        },
        trackingData: {
          ipAddress: `192.168.1.${i + 10}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          referrer: 'direct',
          utmSource: 'social',
          utmMedium: 'share',
          utmCampaign: 'referral'
        }
      });
      
      await record.save();
      referralRecords.push(record);
      console.log(`✅ 创建推荐记录: ${referrer1.username} -> ${referredUser.username}`);
    }

    // 为第二个用户创建一些推荐记录
    const referrer2 = users[1];
    const referredUsers2 = [users[3], users[4]]; // 用户4,5
    
    for (let i = 0; i < referredUsers2.length; i++) {
      const referredUser = referredUsers2[i];
      const program = createdPrograms[1]; // 使用第二个活动
      
      const record = new ReferralRecord({
        referrerId: referrer2._id,
        referredId: referredUser._id,
        programId: program._id,
        referralCode: `VIP00${i + 1}`,
        status: 'pending',
        referralDate: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
        completionDate: null,
        rewardStatus: 'pending',
        referrerReward: {
          type: 'coupon',
          amount: program.referrerReward.amount,
          awardedAt: null
        },
        referredReward: {
          type: 'coupon',
          amount: program.referredReward.amount,
          awardedAt: null
        },
        completionConditions: program.conditions,
        actualCompletion: {
          orderAmount: 0,
          orderCount: 0,
          registrationDays: 0,
          customData: {}
        },
        trackingData: {
          ipAddress: `192.168.1.${i + 20}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          referrer: 'social',
          utmSource: 'facebook',
          utmMedium: 'referral',
          utmCampaign: 'vip-program'
        }
      });
      
      await record.save();
      referralRecords.push(record);
      console.log(`✅ 创建推荐记录: ${referrer2.username} -> ${referredUser.username}`);
    }

    // 更新推荐活动的统计信息
    for (const program of createdPrograms) {
      const programRecords = referralRecords.filter(record => 
        record.programId.toString() === program._id.toString()
      );
      
      const completedRecords = programRecords.filter(record => record.status === 'completed');
      const totalRewards = completedRecords.reduce((sum, record) => {
        return sum + (record.referrerReward?.amount || 0) + (record.referredReward?.amount || 0);
      }, 0);
      
      program.statistics = {
        totalReferrals: programRecords.length,
        completedReferrals: completedRecords.length,
        totalRewardsDistributed: totalRewards
      };
      
      await program.save();
      console.log(`📊 更新活动统计: ${program.name} - 总推荐: ${program.statistics.totalReferrals}, 完成: ${program.statistics.completedReferrals}`);
    }

    console.log('✅ 推荐奖励演示数据生成完成！');
    console.log(`📊 创建了 ${createdPrograms.length} 个推荐活动`);
    console.log(`📊 创建了 ${referralRecords.length} 条推荐记录`);

  } catch (error) {
    console.error('❌ 生成推荐奖励演示数据失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  generateReferralDemoData();
}

module.exports = generateReferralDemoData;