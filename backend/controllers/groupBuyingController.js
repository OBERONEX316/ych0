const GroupBuying = require('../models/GroupBuying');
const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all group buying activities with filters
exports.getAllGroupBuying = async (req, res) => {
  try {
    const { 
      status, 
      product, 
      page = 1, 
      limit = 10, 
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (product) filter.product = product;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const groupBuying = await GroupBuying.find(filter)
      .populate('product', 'name price images category')
      .populate('createdBy', 'firstName lastName email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await GroupBuying.countDocuments(filter);

    res.json({
      success: true,
      data: groupBuying,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get all group buying error:', error);
    res.status(500).json({
      success: false,
      message: '获取团购活动失败',
      error: error.message
    });
  }
};

// Get active group buying activities
exports.getActiveGroupBuying = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const now = new Date();

    const activeGroupBuying = await GroupBuying.find({
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    })
      .populate('product', 'name price images category description')
      .populate('createdBy', 'firstName lastName')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await GroupBuying.countDocuments({
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    });

    res.json({
      success: true,
      data: activeGroupBuying,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get active group buying error:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃团购活动失败',
      error: error.message
    });
  }
};

// Get single group buying activity by ID
exports.getGroupBuyingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const groupBuying = await GroupBuying.findById(id)
      .populate('product', 'name price images category description stock')
      .populate('createdBy', 'firstName lastName email')
      .populate('groups.participants.user', 'firstName lastName avatar')
      .lean();

    if (!groupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    // Add user-specific information
    if (userId) {
      const userGroup = groupBuying.getUserGroup(userId);
      groupBuying.userParticipation = {
        isParticipating: !!userGroup,
        groupId: userGroup?.groupId,
        isLeader: userGroup?.participants?.find(p => p.user._id.toString() === userId)?.isLeader || false
      };
    }

    res.json({
      success: true,
      data: groupBuying
    });
  } catch (error) {
    console.error('Get group buying by ID error:', error);
    res.status(500).json({
      success: false,
      message: '获取团购活动详情失败',
      error: error.message
    });
  }
};

// Create new group buying activity
exports.createGroupBuying = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '验证错误',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      product,
      originalPrice,
      groupPrice,
      minParticipants,
      maxParticipants,
      startTime,
      endTime,
      maxGroups = 100,
      conditions = {},
      images = [],
      seoSettings = {}
    } = req.body;

    // Validate product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    // Validate price logic
    if (groupPrice >= originalPrice) {
      return res.status(400).json({
        success: false,
        message: '团购价格必须低于原价'
      });
    }

    // Validate participant limits
    if (minParticipants > maxParticipants) {
      return res.status(400).json({
        success: false,
        message: '最小参与人数不能超过最大参与人数'
      });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: '开始时间必须早于结束时间'
      });
    }

    const groupBuying = new GroupBuying({
      name,
      description,
      product,
      originalPrice,
      groupPrice,
      minParticipants,
      maxParticipants,
      startTime: start,
      endTime: end,
      maxGroups,
      status: start <= new Date() ? 'active' : 'scheduled',
      conditions: {
        maxQuantityPerUser: 5,
        requireEmailVerification: true,
        ...conditions
      },
      images,
      seoSettings,
      createdBy: req.user.id
    });

    await groupBuying.save();

    const populatedGroupBuying = await GroupBuying.findById(groupBuying._id)
      .populate('product', 'name price images category')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    res.status(201).json({
      success: true,
      message: '团购活动创建成功',
      data: populatedGroupBuying
    });
  } catch (error) {
    console.error('Create group buying error:', error);
    res.status(500).json({
      success: false,
      message: '创建团购活动失败',
      error: error.message
    });
  }
};

// Update group buying activity
exports.updateGroupBuying = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '验证错误',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Validate if group buying exists
    const existingGroupBuying = await GroupBuying.findById(id);
    if (!existingGroupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    // Validate time logic if provided
    if (updateData.startTime && updateData.endTime) {
      const start = new Date(updateData.startTime);
      const end = new Date(updateData.endTime);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: '开始时间必须早于结束时间'
        });
      }
    }

    // Validate price logic if provided
    if (updateData.originalPrice && updateData.groupPrice) {
      if (updateData.groupPrice >= updateData.originalPrice) {
        return res.status(400).json({
          success: false,
          message: '团购价格必须低于原价'
        });
      }
    }

    // Validate participant limits if provided
    if (updateData.minParticipants && updateData.maxParticipants) {
      if (updateData.minParticipants > updateData.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: '最小参与人数不能超过最大参与人数'
        });
      }
    }

    // Update status based on time if time fields are updated
    if (updateData.startTime || updateData.endTime) {
      const start = new Date(updateData.startTime || existingGroupBuying.startTime);
      const end = new Date(updateData.endTime || existingGroupBuying.endTime);
      const now = new Date();
      
      if (existingGroupBuying.status !== 'cancelled') {
        if (start <= now && end > now) {
          updateData.status = 'active';
        } else if (start > now) {
          updateData.status = 'scheduled';
        } else if (end <= now) {
          updateData.status = 'ended';
        }
      }
    }

    const updatedGroupBuying = await GroupBuying.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('product', 'name price images category')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: '团购活动更新成功',
      data: updatedGroupBuying
    });
  } catch (error) {
    console.error('Update group buying error:', error);
    res.status(500).json({
      success: false,
      message: '更新团购活动失败',
      error: error.message
    });
  }
};

// Delete group buying activity
exports.deleteGroupBuying = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGroupBuying = await GroupBuying.findById(id);
    if (!existingGroupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    // Check if there are active participants
    const hasActiveGroups = existingGroupBuying.groups.some(group => 
      group.status === 'forming' || group.status === 'successful'
    );

    if (hasActiveGroups) {
      return res.status(400).json({
        success: false,
        message: '团购活动已有用户参与，无法删除'
      });
    }

    await GroupBuying.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '团购活动删除成功'
    });
  } catch (error) {
    console.error('Delete group buying error:', error);
    res.status(500).json({
      success: false,
      message: '删除团购活动失败',
      error: error.message
    });
  }
};

// Join group buying
exports.joinGroupBuying = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { quantity = 1, groupId = null } = req.body;

    const groupBuying = await GroupBuying.findById(id);
    if (!groupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    // Check if user can join
    const canJoinResult = groupBuying.canUserJoin(userId);
    if (!canJoinResult.canJoin) {
      return res.status(400).json({
        success: false,
        message: canJoinResult.reason
      });
    }

    // Create group if no available groups exist
    let availableGroups = groupBuying.getAvailableGroups();
    if (availableGroups.length === 0 && groupBuying.groups.length < groupBuying.maxGroups) {
      groupBuying.createGroup();
      availableGroups = groupBuying.getAvailableGroups();
    }

    // Join the group
    const joinedGroup = await groupBuying.joinGroup(userId, quantity, groupId);
    await groupBuying.save();

    res.json({
      success: true,
      message: '参与团购成功',
      data: {
        groupId: joinedGroup.groupId,
        currentParticipants: joinedGroup.currentParticipants,
        status: joinedGroup.status,
        isSuccessful: joinedGroup.status === 'successful'
      }
    });
  } catch (error) {
    console.error('Join group buying error:', error);
    res.status(500).json({
      success: false,
      message: '参与团购失败',
      error: error.message
    });
  }
};

// Leave group buying
exports.leaveGroupBuying = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const groupBuying = await GroupBuying.findById(id);
    if (!groupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    await groupBuying.leaveGroup(userId);
    await groupBuying.save();

    res.json({
      success: true,
      message: '退出团购成功'
    });
  } catch (error) {
    console.error('Leave group buying error:', error);
    res.status(500).json({
      success: false,
      message: '退出团购失败',
      error: error.message
    });
  }
};

// Get user participation status
exports.getUserParticipation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const participations = await GroupBuying.find({
      'groups.participants.user': userId
    })
      .populate('product', 'name price images category')
      .populate('groups.participants.user', 'firstName lastName avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await GroupBuying.countDocuments({
      'groups.participants.user': userId
    });

    // Filter to only include user's groups
    const userParticipations = participations.map(activity => {
      const userGroup = activity.groups.find(group => 
        group.participants.some(p => p.user._id.toString() === userId)
      );
      
      return {
        ...activity,
        userGroup: userGroup
      };
    });

    res.json({
      success: true,
      data: userParticipations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get user participation error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户参与记录失败',
      error: error.message
    });
  }
};

// Get group buying statistics
exports.getStatistics = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await GroupBuying.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          activeActivities: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalGroups: { $sum: '$statistics.totalGroups' },
          successfulGroups: { $sum: '$statistics.successfulGroups' },
          failedGroups: { $sum: '$statistics.failedGroups' },
          totalParticipants: { $sum: '$statistics.totalParticipants' },
          totalRevenue: { $sum: '$statistics.totalRevenue' },
          totalDiscount: { $sum: '$statistics.totalDiscount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalActivities: 1,
          activeActivities: 1,
          totalGroups: 1,
          successfulGroups: 1,
          failedGroups: 1,
          totalParticipants: 1,
          totalRevenue: 1,
          totalDiscount: 1,
          successRate: {
            $cond: [
              { $gt: ['$totalGroups', 0] },
              { $multiply: [{ $divide: ['$successfulGroups', '$totalGroups'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalActivities: 0,
      activeActivities: 0,
      totalGroups: 0,
      successfulGroups: 0,
      failedGroups: 0,
      totalParticipants: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      successRate: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: '获取团购统计失败',
      error: error.message
    });
  }
};

// Cancel group buying activity
exports.cancelGroupBuying = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    const groupBuying = await GroupBuying.findById(id);
    if (!groupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    if (groupBuying.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '团购活动已取消'
      });
    }

    if (groupBuying.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: '团购活动已结束，无法取消'
      });
    }

    // Mark all forming groups as failed
    groupBuying.groups.forEach(group => {
      if (group.status === 'forming') {
        group.status = 'failed';
        groupBuying.statistics.failedGroups += 1;
      }
    });

    groupBuying.status = 'cancelled';
    groupBuying.cancelReason = reason;
    await groupBuying.save();

    res.json({
      success: true,
      message: '团购活动已取消'
    });
  } catch (error) {
    console.error('Cancel group buying error:', error);
    res.status(500).json({
      success: false,
      message: '取消团购活动失败',
      error: error.message
    });
  }
};

// End group buying activity
exports.endGroupBuying = async (req, res) => {
  try {
    const { id } = req.params;

    const groupBuying = await GroupBuying.findById(id);
    if (!groupBuying) {
      return res.status(404).json({
        success: false,
        message: '团购活动不存在'
      });
    }

    if (groupBuying.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: '团购活动已结束'
      });
    }

    groupBuying.status = 'ended';
    await groupBuying.save();

    res.json({
      success: true,
      message: '团购活动已结束'
    });
  } catch (error) {
    console.error('End group buying error:', error);
    res.status(500).json({
      success: false,
      message: '结束团购活动失败',
      error: error.message
    });
  }
};
