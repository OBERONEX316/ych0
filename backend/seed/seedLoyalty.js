const mongoose = require('mongoose');
const LoyaltyPoint = require('../models/LoyaltyPoint');
const User = require('../models/User');
const PointTransaction = require('../models/PointTransaction');
require('dotenv').config();

// 连接数据库
const connectDB = require('../config/database');

// 示例用户数据
const sampleUsers = [
  { username: 'bronze_user', points: 500, level: 'bronze' },
  { username: 'silver_user', points: 2500, level: 'silver' },
  { username: 'gold_user', points: 8000, level: 'gold' },
  { username: 'platinum_user', points: 20000, level: 'platinum' },
  { username: 'diamond_user', points: 60000, level: 'diamond' },
  { username: 'vip_user', points: 120000, level: 'diamond' }
];

// 创建示例会员数据
const seedLoyaltyData = async () => {
  try {
    console.log('🌱 开始创建会员等级示例数据...');
    
    // 连接数据库
    await connectDB();
    
    // 清空现有数据
    await LoyaltyPoint.deleteMany({});
    console.log('🗑️  已清空现有会员数据');
    
    // 获取用户ID
    const users = await User.find({ 
      username: { $in: sampleUsers.map(u => u.username) } 
    });
    
    if (users.length === 0) {
      console.log('⚠️  未找到示例用户，请先运行用户种子数据');
      process.exit(1);
    }
    
    const loyaltyPoints = [];
    
    // 为每个用户创建会员数据
    for (const user of users) {
      const sampleData = sampleUsers.find(u => u.username === user.username);
      if (sampleData) {
        const loyaltyPoint = new LoyaltyPoint({
          user: user._id,
          points: sampleData.points,
          level: sampleData.level,
          totalEarned: sampleData.points * 1.2, // 假设总获得比当前多20%
          totalSpent: sampleData.points * 0.2   // 假设消费了20%
        });
        
        // 计算等级信息
        loyaltyPoint.calculateLevelInfo();
        loyaltyPoints.push(loyaltyPoint);
        
        console.log(`✅ 创建 ${sampleData.username} 的会员数据: ${sampleData.points} 积分, ${sampleData.level} 等级`);
      }
    }
    
    // 保存所有会员数据
    await LoyaltyPoint.insertMany(loyaltyPoints);
    
    // 创建积分交易记录
    const transactions = [];
    for (const loyaltyPoint of loyaltyPoints) {
      // 添加一些示例交易记录
      transactions.push(
        new PointTransaction({
          user: loyaltyPoint.user,
          type: 'earn',
          amount: 1000,
          balanceAfter: loyaltyPoint.points,
          reason: 'purchase',
          description: '购物消费获得积分',
          status: 'active'
        })
      );
      
      transactions.push(
        new PointTransaction({
          user: loyaltyPoint.user,
          type: 'earn',
          amount: 500,
          balanceAfter: loyaltyPoint.points + 500,
          reason: 'registration',
          description: '注册奖励',
          status: 'active'
        })
      );
    }
    
    await PointTransaction.insertMany(transactions);
    
    console.log('🎉 会员等级示例数据创建完成！');
    console.log(`📊 创建了 ${loyaltyPoints.length} 个会员记录`);
    console.log(`📈 创建了 ${transactions.length} 个积分交易记录`);
    
    // 显示统计信息
    const stats = await LoyaltyPoint.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          avgPoints: { $avg: '$points' }
        }
      }
    ]);
    
    console.log('\n📋 会员等级统计:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} 人, 平均积分: ${Math.round(stat.avgPoints)}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 创建会员数据时出错:', error.message);
    process.exit(1);
  }
};

// 如果是直接运行此脚本
if (require.main === module) {
  seedLoyaltyData();
}

module.exports = seedLoyaltyData;