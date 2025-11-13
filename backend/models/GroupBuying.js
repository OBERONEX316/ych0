const mongoose = require('mongoose');

const groupBuyingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  groupPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minParticipants: {
    type: Number,
    required: true,
    min: 2,
    default: 2
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    default: 10
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  maxGroups: {
    type: Number,
    default: 100
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'ended', 'cancelled'],
    default: 'draft'
  },
  groups: [{
    groupId: {
      type: String,
      required: true,
      unique: true
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      isLeader: {
        type: Boolean,
        default: false
      }
    }],
    currentParticipants: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['forming', 'successful', 'failed', 'expired'],
      default: 'forming'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  conditions: {
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxQuantityPerUser: {
      type: Number,
      default: 5
    },
    allowedMembershipLevels: [{
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum']
    }],
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    requirePhoneVerification: {
      type: Boolean,
      default: false
    }
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  seoSettings: {
    title: String,
    description: String,
    keywords: [String]
  },
  statistics: {
    totalGroups: {
      type: Number,
      default: 0
    },
    successfulGroups: {
      type: Number,
      default: 0
    },
    failedGroups: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalDiscount: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields for status and progress
groupBuyingSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startTime <= now && 
         this.endTime > now;
});

groupBuyingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.status === 'scheduled' && this.startTime > now;
});

groupBuyingSchema.virtual('isExpired').get(function() {
  const now = new Date();
  return this.status === 'ended' || this.endTime <= now;
});

groupBuyingSchema.virtual('timeLeft').get(function() {
  if (!this.isActive) return 0;
  return Math.max(0, this.endTime - new Date());
});

groupBuyingSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice <= 0) return 0;
  return Math.round(((this.originalPrice - this.groupPrice) / this.originalPrice) * 100);
});

groupBuyingSchema.virtual('availableSlots').get(function() {
  return this.maxGroups - this.groups.length;
});

// Methods to get group information
groupBuyingSchema.methods.getAvailableGroups = function() {
  return this.groups.filter(group => 
    group.status === 'forming' && 
    group.currentParticipants < this.maxParticipants
  );
};

groupBuyingSchema.methods.getUserGroup = function(userId) {
  return this.groups.find(group => 
    group.participants.some(p => p.user.toString() === userId.toString())
  );
};

groupBuyingSchema.methods.canUserJoin = function(userId) {
  const userGroup = this.getUserGroup(userId);
  if (userGroup) return { canJoin: false, reason: '已在团购中' };
  
  if (!this.isActive) {
    return { canJoin: false, reason: '团购活动未开始或已结束' };
  }
  
  const availableGroups = this.getAvailableGroups();
  if (availableGroups.length === 0) {
    return { canJoin: false, reason: '团购已满' };
  }
  
  return { canJoin: true, reason: '' };
};

groupBuyingSchema.methods.joinGroup = async function(userId, quantity = 1, groupId = null) {
  const canJoinResult = this.canUserJoin(userId);
  if (!canJoinResult.canJoin) {
    throw new Error(canJoinResult.reason);
  }
  
  // Find or create group
  let targetGroup;
  if (groupId) {
    targetGroup = this.groups.find(g => g.groupId === groupId && g.status === 'forming');
    if (!targetGroup) {
      throw new Error('团购小组不存在或已满');
    }
  } else {
    targetGroup = this.getAvailableGroups()[0];
  }
  
  // Check quantity limits
  if (quantity > this.conditions.maxQuantityPerUser) {
    throw new Error(`每人最多可购买 ${this.conditions.maxQuantityPerUser} 件`);
  }
  
  // Add participant
  targetGroup.participants.push({
    user: userId,
    quantity,
    isLeader: targetGroup.participants.length === 0
  });
  targetGroup.currentParticipants += 1;
  
  // Check if group is successful
  if (targetGroup.currentParticipants >= this.minParticipants) {
    targetGroup.status = 'successful';
    targetGroup.completedAt = new Date();
    this.statistics.successfulGroups += 1;
  }
  
  this.statistics.totalParticipants += 1;
  this.statistics.totalRevenue += this.groupPrice * quantity;
  this.statistics.totalDiscount += (this.originalPrice - this.groupPrice) * quantity;
  
  return targetGroup;
};

groupBuyingSchema.methods.leaveGroup = async function(userId) {
  const userGroup = this.getUserGroup(userId);
  if (!userGroup) {
    throw new Error('您未参与此团购');
  }
  
  if (userGroup.status !== 'forming') {
    throw new Error('团购小组状态不允许退出');
  }
  
  const participant = userGroup.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) {
    throw new Error('参与者信息异常');
  }
  
  // Remove participant
  userGroup.participants = userGroup.participants.filter(p => p.user.toString() !== userId.toString());
  userGroup.currentParticipants -= 1;
  
  // Update statistics
  this.statistics.totalParticipants -= 1;
  this.statistics.totalRevenue -= this.groupPrice * participant.quantity;
  this.statistics.totalDiscount -= (this.originalPrice - this.groupPrice) * participant.quantity;
  
  // If group becomes empty, remove it
  if (userGroup.participants.length === 0) {
    this.groups = this.groups.filter(g => g.groupId !== userGroup.groupId);
    this.statistics.totalGroups -= 1;
  } else {
    // Update leader if necessary
    const newLeader = userGroup.participants.find(p => !p.isLeader);
    if (newLeader) {
      newLeader.isLeader = true;
    }
  }
  
  return userGroup;
};

// Update status based on time
groupBuyingSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return;
  
  if (this.status === 'draft' && this.startTime <= now) {
    this.status = 'active';
  } else if (this.status === 'scheduled' && this.startTime <= now) {
    this.status = 'active';
  } else if (this.status === 'active' && this.endTime <= now) {
    this.status = 'ended';
    
    // Mark forming groups as expired
    this.groups.forEach(group => {
      if (group.status === 'forming') {
        group.status = 'expired';
        this.statistics.failedGroups += 1;
      }
    });
  }
};

// Generate unique group ID
groupBuyingSchema.methods.generateGroupId = function() {
  return `GB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

// Create new group
groupBuyingSchema.methods.createGroup = function() {
  if (this.groups.length >= this.maxGroups) {
    throw new Error('团购小组数量已达上限');
  }
  
  const groupId = this.generateGroupId();
  const newGroup = {
    groupId,
    participants: [],
    currentParticipants: 0,
    status: 'forming',
    createdAt: new Date()
  };
  
  this.groups.push(newGroup);
  this.statistics.totalGroups += 1;
  
  return newGroup;
};

// Pre-save middleware
groupBuyingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.updateStatus();
  next();
});

// Indexes for performance
groupBuyingSchema.index({ status: 1, startTime: 1, endTime: 1 });
groupBuyingSchema.index({ 'groups.participants.user': 1 });
groupBuyingSchema.index({ 'groups.groupId': 1 });
groupBuyingSchema.index({ product: 1 });

module.exports = mongoose.model('GroupBuying', groupBuyingSchema);