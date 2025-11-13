const UserActivity = require('../models/UserActivity');
const SocialRelationship = require('../models/SocialRelationship');
const Product = require('../models/Product');
const User = require('../models/User');

// 记录分享行为
const recordShare = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, platform, sharedWithUserId } = req.body;

    // 验证商品存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    // 记录用户活动
    const activity = new UserActivity({
      userId,
      activityType: 'share_product',
      productId,
      metadata: {
        platform,
        sharedWithUserId,
        productName: product.name,
        productPrice: product.price
      }
    });

    await activity.save();

    res.json({
      success: true,
      message: '分享记录成功',
      data: activity
    });

  } catch (error) {
    console.error('记录分享错误:', error);
    res.status(500).json({
      success: false,
      message: '记录分享失败',
      error: error.message
    });
  }
};

// 获取热门分享商品
const getPopularSharedProducts = async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const popularShares = await UserActivity.aggregate([
      {
        $match: {
          activityType: 'share_product',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$productId',
          shareCount: { $sum: 1 },
          lastShared: { $max: '$createdAt' }
        }
      },
      {
        $sort: { shareCount: -1, lastShared: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productId: '$_id',
          shareCount: 1,
          lastShared: 1,
          'product.name': 1,
          'product.price': 1,
          'product.images': 1,
          'product.category': 1
        }
      }
    ]);

    res.json({
      success: true,
      data: popularShares
    });

  } catch (error) {
    console.error('获取热门分享商品错误:', error);
    res.status(500).json({
      success: false,
      message: '获取热门分享商品失败',
      error: error.message
    });
  }
};

// 获取好友分享的商品
const getFriendSharedProducts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 10, days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // 获取用户的好友列表（互相关注的用户）
    const friends = await SocialRelationship.find({
      $or: [
        { followerId: userId, status: 'active', isMutual: true },
        { followingId: userId, status: 'active', isMutual: true }
      ]
    }).select('followerId followingId');

    const friendIds = friends.map(friend => 
      friend.followerId.toString() === userId ? friend.followingId : friend.followerId
    );

    if (friendIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '暂无好友分享内容'
      });
    }

    const friendShares = await UserActivity.aggregate([
      {
        $match: {
          userId: { $in: friendIds },
          activityType: 'share_product',
          createdAt: { $gte: startDate }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          activityId: '$_id',
          createdAt: 1,
          'product._id': 1,
          'product.name': 1,
          'product.price': 1,
          'product.images': 1,
          'product.category': 1,
          'user._id': 1,
          'user.username': 1,
          'user.avatar': 1
        }
      }
    ]);

    res.json({
      success: true,
      data: friendShares
    });

  } catch (error) {
    console.error('获取好友分享商品错误:', error);
    res.status(500).json({
      success: false,
      message: '获取好友分享商品失败',
      error: error.message
    });
  }
};

// 获取个性化推荐（基于社交关系和分享行为）
const getSocialRecommendations = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 10 } = req.query;

    // 获取用户的好友列表
    const friends = await SocialRelationship.find({
      $or: [
        { followerId: userId, status: 'active', isMutual: true },
        { followingId: userId, status: 'active', isMutual: true }
      ]
    }).select('followerId followingId');

    const friendIds = friends.map(friend => 
      friend.followerId.toString() === userId ? friend.followingId : friend.followerId
    );

    let recommendedProducts = [];

    if (friendIds.length > 0) {
      // 基于好友分享的商品推荐
      const friendProductShares = await UserActivity.aggregate([
        {
          $match: {
            userId: { $in: friendIds },
            activityType: 'share_product',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 最近30天
          }
        },
        {
          $group: {
            _id: '$productId',
            shareCount: { $sum: 1 },
            friendCount: { $addToSet: '$userId' }
          }
        },
        {
          $match: {
            shareCount: { $gte: 2 } // 至少被2个好友分享
          }
        },
        {
          $sort: { shareCount: -1 }
        },
        {
          $limit: parseInt(limit)
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $match: {
            'product.status': 'active',
            'product.stock': { $gt: 0 }
          }
        },
        {
          $project: {
            productId: '$_id',
            shareCount: 1,
            friendCount: { $size: '$friendCount' },
            'product.name': 1,
            'product.price': 1,
            'product.images': 1,
            'product.category': 1,
            'product.rating': 1,
            'product.reviewCount': 1
          }
        }
      ]);

      recommendedProducts = friendProductShares;
    }

    // 如果好友推荐不足，补充热门商品
    if (recommendedProducts.length < limit) {
      const remaining = parseInt(limit) - recommendedProducts.length;
      const popularProducts = await Product.find({
        status: 'active',
        stock: { $gt: 0 }
      })
      .sort({ 'rating': -1, 'reviewCount': -1 })
      .limit(remaining)
      .select('name price images category rating reviewCount');

      recommendedProducts = [
        ...recommendedProducts,
        ...popularProducts.map(product => ({
          productId: product._id,
          shareCount: 0,
          friendCount: 0,
          product: {
            name: product.name,
            price: product.price,
            images: product.images,
            category: product.category,
            rating: product.rating,
            reviewCount: product.reviewCount
          }
        }))
      ];
    }

    res.json({
      success: true,
      data: recommendedProducts
    });

  } catch (error) {
    console.error('获取社交推荐错误:', error);
    res.status(500).json({
      success: false,
      message: '获取社交推荐失败',
      error: error.message
    });
  }
};

// 获取分享统计
const getShareStatistics = async (req, res) => {
  try {
    const { userId } = req.user;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const statistics = await UserActivity.aggregate([
      {
        $match: {
          userId,
          activityType: 'share_product',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          dailyShares: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $group: {
          _id: null,
          totalShares: { $sum: '$dailyShares' },
          dailyBreakdown: { $push: { date: '$_id', count: '$dailyShares' } }
        }
      },
      {
        $project: {
          _id: 0,
          totalShares: 1,
          dailyBreakdown: 1
        }
      }
    ]);

    const result = statistics[0] || { totalShares: 0, dailyBreakdown: [] };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取分享统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取分享统计失败',
      error: error.message
    });
  }
};

module.exports = {
  recordShare,
  getPopularSharedProducts,
  getFriendSharedProducts,
  getSocialRecommendations,
  getShareStatistics
};