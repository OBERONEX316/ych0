const mongoose = require('mongoose');

const socialRelationshipSchema = new mongoose.Schema({
  // 关注者（粉丝）
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 被关注者
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 关系状态
  status: {
    type: String,
    enum: ['active', 'blocked', 'muted'],
    default: 'active'
  },
  
  // 关注时间
  followedAt: {
    type: Date,
    default: Date.now
  },
  
  // 关系类型
  relationshipType: {
    type: String,
    enum: ['follow', 'friend', 'close_friend'],
    default: 'follow'
  },
  
  // 互相关注状态
  isMutual: {
    type: Boolean,
    default: false
  },
  
  // 通知设置
  notifications: {
    newPosts: { type: Boolean, default: true },
    newProducts: { type: Boolean, default: true },
    liveStreams: { type: Boolean, default: true },
    stories: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建复合索引，确保唯一关注关系
socialRelationshipSchema.index({ follower: 1, following: 1 }, { unique: true });

// 索引优化
socialRelationshipSchema.index({ follower: 1, status: 1 });
socialRelationshipSchema.index({ following: 1, status: 1 });
socialRelationshipSchema.index({ followedAt: -1 });
socialRelationshipSchema.index({ isMutual: 1 });

// 虚拟字段：格式化关注时间
socialRelationshipSchema.virtual('formattedFollowedAt').get(function() {
  return this.followedAt.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// 静态方法：检查关注关系
socialRelationshipSchema.statics.checkRelationship = async function(followerId, followingId) {
  return this.findOne({
    follower: followerId,
    following: followingId,
    status: 'active'
  });
};

// 静态方法：获取用户的粉丝数量
socialRelationshipSchema.statics.getFollowerCount = async function(userId) {
  return this.countDocuments({
    following: userId,
    status: 'active'
  });
};

// 静态方法：获取用户的关注数量
socialRelationshipSchema.statics.getFollowingCount = async function(userId) {
  return this.countDocuments({
    follower: userId,
    status: 'active'
  });
};

// 静态方法：获取互相关注的用户
socialRelationshipSchema.statics.getMutualFriends = async function(userId) {
  const mutualRelationships = await this.find({
    follower: userId,
    status: 'active',
    isMutual: true
  }).populate('following', 'username avatar firstName lastName');
  
  return mutualRelationships.map(rel => rel.following);
};

// 静态方法：批量检查关注状态
socialRelationshipSchema.statics.checkMultipleRelationships = async function(followerId, followingIds) {
  const relationships = await this.find({
    follower: followerId,
    following: { $in: followingIds },
    status: 'active'
  });
  
  const result = {};
  followingIds.forEach(id => {
    result[id] = relationships.some(rel => rel.following.toString() === id.toString());
  });
  
  return result;
};

// 实例方法：更新互相关注状态
socialRelationshipSchema.methods.updateMutualStatus = async function() {
  const reverseRelationship = await this.constructor.findOne({
    follower: this.following,
    following: this.follower,
    status: 'active'
  });
  
  this.isMutual = !!reverseRelationship;
  await this.save();
  
  // 同时更新反向关系的互相关注状态
  if (reverseRelationship) {
    reverseRelationship.isMutual = true;
    await reverseRelationship.save();
  }
  
  return this;
};

// 保存前中间件：更新互相关注状态
socialRelationshipSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'active') {
    const reverseRelationship = await this.constructor.findOne({
      follower: this.following,
      following: this.follower,
      status: 'active'
    });
    
    this.isMutual = !!reverseRelationship;
    
    // 如果存在反向关系，也更新它的互相关注状态
    if (reverseRelationship) {
      reverseRelationship.isMutual = true;
      await reverseRelationship.save();
    }
  }
  next();
});

module.exports = mongoose.model('SocialRelationship', socialRelationshipSchema);