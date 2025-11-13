const mongoose = require('mongoose');
const SocialRelationship = require('../models/SocialRelationship');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');

// 数据库连接配置
const connectDB = require('../config/database');

// 创建社交关系数据
const seedSocial = async () => {
  try {
    // 连接数据库
    await connectDB();
    console.log('✅ MongoDB连接成功');

    // 获取所有用户
    const users = await User.find({ role: 'user' }).select('_id username');
    
    if (users.length < 3) {
      console.log('❌ 需要至少3个用户才能创建社交关系');
      process.exit(1);
    }

    console.log(`👥 找到 ${users.length} 个用户`);

    // 清空现有社交关系数据
    await SocialRelationship.deleteMany({});
    console.log('🗑️ 已清空社交关系数据');

    // 清空现有的分享活动数据
    await UserActivity.deleteMany({ activityType: 'share_product' });
    console.log('🗑️ 已清空分享活动数据');

    const relationships = [];
    const activities = [];

    // 创建关注关系
    // 用户1关注用户2和用户3
    relationships.push({
      followerId: users[0]._id,
      followingId: users[1]._id,
      status: 'active',
      relationshipType: 'follow',
      followedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
    });

    relationships.push({
      followerId: users[0]._id,
      followingId: users[2]._id,
      status: 'active',
      relationshipType: 'follow',
      followedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3天前
    });

    // 用户2关注用户1（互相关注）
    relationships.push({
      followerId: users[1]._id,
      followingId: users[0]._id,
      status: 'active',
      relationshipType: 'follow',
      followedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5天前
    });

    // 用户3关注用户1（互相关注）
    relationships.push({
      followerId: users[2]._id,
      followingId: users[0]._id,
      status: 'active',
      relationshipType: 'follow',
      followedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2天前
    });

    // 用户2关注用户3
    relationships.push({
      followerId: users[1]._id,
      followingId: users[2]._id,
      status: 'active',
      relationshipType: 'follow',
      followedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1天前
    });

    // 创建社交关系
    const createdRelationships = await SocialRelationship.insertMany(relationships);
    console.log(`✅ 成功创建 ${createdRelationships.length} 个社交关系`);

    // 更新互相关注状态
    for (const relationship of createdRelationships) {
      await relationship.updateMutualStatus();
    }
    console.log('🔄 已更新互相关注状态');

    // 创建分享活动数据
    // 用户1分享商品
    activities.push({
      userId: users[0]._id,
      activityType: 'share_product',
      productId: new mongoose.Types.ObjectId('661234567890123456789012'), // 模拟商品ID
      metadata: {
        platform: 'facebook',
        productName: '优质智能手机',
        productPrice: 2999
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });

    activities.push({
      userId: users[0]._id,
      activityType: 'share_product',
      productId: new mongoose.Types.ObjectId('661234567890123456789013'),
      metadata: {
        platform: 'twitter',
        productName: '无线耳机',
        productPrice: 399
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    // 用户2分享商品
    activities.push({
      userId: users[1]._id,
      activityType: 'share_product',
      productId: new mongoose.Types.ObjectId('661234567890123456789012'),
      metadata: {
        platform: 'copy',
        productName: '优质智能手机',
        productPrice: 2999
      },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });

    activities.push({
      userId: users[1]._id,
      activityType: 'share_product',
      productId: new mongoose.Types.ObjectId('661234567890123456789014'),
      metadata: {
        platform: 'email',
        productName: '智能手表',
        productPrice: 899
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    // 用户3分享商品
    activities.push({
      userId: users[2]._id,
      activityType: 'share_product',
      productId: new mongoose.Types.ObjectId('661234567890123456789012'),
      metadata: {
        platform: 'facebook',
        productName: '优质智能手机',
        productPrice: 2999
      },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    });

    // 创建分享活动
    const createdActivities = await UserActivity.insertMany(activities);
    console.log(`✅ 成功创建 ${createdActivities.length} 个分享活动`);

    // 输出社交关系统计
    console.log('\n📊 社交关系统计:');
    for (const user of users) {
      const followerCount = await SocialRelationship.countDocuments({ 
        followingId: user._id, 
        status: 'active' 
      });
      
      const followingCount = await SocialRelationship.countDocuments({ 
        followerId: user._id, 
        status: 'active' 
      });

      const mutualCount = await SocialRelationship.countDocuments({ 
        $or: [
          { followerId: user._id, status: 'active', isMutual: true },
          { followingId: user._id, status: 'active', isMutual: true }
        ]
      });

      console.log(`👤 ${user.username}: ${followerCount} 粉丝, ${followingCount} 关注, ${mutualCount} 互相关注`);
    }

    // 输出分享活动统计
    const shareStats = await UserActivity.aggregate([
      {
        $match: { activityType: 'share_product' }
      },
      {
        $group: {
          _id: '$userId',
          shareCount: { $sum: 1 }
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
      {
        $unwind: '$user'
      }
    ]);

    console.log('\n📤 分享活动统计:');
    shareStats.forEach(stat => {
      console.log(`👤 ${stat.user.username}: ${stat.shareCount} 次分享`);
    });

    console.log('\n🎯 社交数据种子完成！');
    console.log('📋 可用API端点:');
    console.log('GET  /api/social/followers - 获取粉丝列表');
    console.log('GET  /api/social/following - 获取关注列表');
    console.log('POST /api/social/follow/:userId - 关注用户');
    console.log('POST /api/social/unfollow/:userId - 取消关注');
    console.log('GET  /api/social/share/popular - 获取热门分享商品');
    console.log('GET  /api/social/share/friends - 获取好友分享');
    console.log('GET  /api/social/share/recommendations - 获取社交推荐');

  } catch (error) {
    console.error('❌ 社交数据种子创建失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 如果是直接运行此脚本
if (require.main === module) {
  seedSocial();
}

module.exports = seedSocial;