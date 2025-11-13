const mongoose = require('mongoose');

const referralRecordSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralProgram',
    required: true,
    index: true
  },
  referralCode: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'invalid'],
    default: 'pending',
    index: true
  },
  referralDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  completionDate: {
    type: Date,
    index: true
  },
  rewardStatus: {
    type: String,
    enum: ['pending', 'awarded', 'failed'],
    default: 'pending'
  },
  referrerReward: {
    type: {
      type: String,
      enum: ['points', 'coupon', 'cash']
    },
    amount: Number,
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    awardedAt: Date
  },
  referredReward: {
    type: {
      type: String,
      enum: ['points', 'coupon', 'cash']
    },
    amount: Number,
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    awardedAt: Date
  },
  completionConditions: {
    requiredOrderAmount: Number,
    requiredOrderCount: Number,
    requiredRegistrationDays: Number,
    customConditions: mongoose.Schema.Types.Mixed
  },
  actualCompletion: {
    orderAmount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    registrationDays: { type: Number, default: 0 },
    customData: mongoose.Schema.Types.Mixed
  },
  trackingData: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  },
  notes: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for efficient querying
referralRecordSchema.index({ referrerId: 1, status: 1 });
referralRecordSchema.index({ referredId: 1, status: 1 });
referralRecordSchema.index({ programId: 1, status: 1 });
referralRecordSchema.index({ referralCode: 1, status: 1 });
referralRecordSchema.index({ referralDate: -1 });
referralRecordSchema.index({ completionDate: -1 });

// Static methods
referralRecordSchema.statics.getReferralStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { referrerId: userId } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        completedReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        totalRewards: {
          $sum: {
            $add: [
              { $ifNull: ['$referrerReward.amount', 0] },
              { $ifNull: ['$referredReward.amount', 0] }
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalRewards: 0
  };
};

referralRecordSchema.statics.getActiveReferrals = async function(userId) {
  return await this.find({
    referrerId: userId,
    status: { $in: ['pending', 'completed'] }
  }).populate('referredId', 'firstName lastName email avatar')
    .populate('programId', 'name rewardType')
    .sort({ referralDate: -1 });
};

referralRecordSchema.statics.checkDuplicateReferral = async function(referrerId, referredId, programId) {
  const existing = await this.findOne({
    referrerId,
    referredId,
    programId,
    status: { $in: ['pending', 'completed'] }
  });
  return !!existing;
};

// Instance methods
referralRecordSchema.methods.checkCompletion = async function() {
  if (this.status !== 'pending') return false;
  
  const conditions = this.completionConditions;
  const actual = this.actualCompletion;
  
  // Check if all conditions are met
  const orderAmountMet = !conditions.requiredOrderAmount || 
    actual.orderAmount >= conditions.requiredOrderAmount;
  const orderCountMet = !conditions.requiredOrderCount || 
    actual.orderCount >= conditions.requiredOrderCount;
  const registrationDaysMet = !conditions.requiredRegistrationDays || 
    actual.registrationDays >= conditions.requiredRegistrationDays;
  
  return orderAmountMet && orderCountMet && registrationDaysMet;
};

referralRecordSchema.methods.completeReferral = async function() {
  if (await this.checkCompletion()) {
    this.status = 'completed';
    this.completionDate = new Date();
    await this.save();
    return true;
  }
  return false;
};

referralRecordSchema.methods.awardRewards = async function() {
  if (this.status !== 'completed' || this.rewardStatus === 'awarded') {
    return false;
  }
  
  try {
    // Award referrer reward
    if (this.referrerReward && this.referrerReward.type === 'points' && this.referrerReward.amount) {
      // Add points to referrer
      const UserMembership = mongoose.model('UserMembership');
      await UserMembership.findOneAndUpdate(
        { userId: this.referrerId },
        { $inc: { totalPoints: this.referrerReward.amount } }
      );
      this.referrerReward.awardedAt = new Date();
    }
    
    // Award referred reward
    if (this.referredReward && this.referredReward.type === 'points' && this.referredReward.amount) {
      // Add points to referred user
      const UserMembership = mongoose.model('UserMembership');
      await UserMembership.findOneAndUpdate(
        { userId: this.referredId },
        { $inc: { totalPoints: this.referredReward.amount } }
      );
      this.referredReward.awardedAt = new Date();
    }
    
    this.rewardStatus = 'awarded';
    await this.save();
    return true;
  } catch (error) {
    this.rewardStatus = 'failed';
    await this.save();
    throw error;
  }
};

referralRecordSchema.methods.updateCompletionData = async function(data) {
  if (this.status !== 'pending') return false;
  
  if (data.orderAmount !== undefined) {
    this.actualCompletion.orderAmount = data.orderAmount;
  }
  if (data.orderCount !== undefined) {
    this.actualCompletion.orderCount = data.orderCount;
  }
  if (data.registrationDays !== undefined) {
    this.actualCompletion.registrationDays = data.registrationDays;
  }
  if (data.customData) {
    this.actualCompletion.customData = { 
      ...this.actualCompletion.customData, 
      ...data.customData 
    };
  }
  
  await this.save();
  
  // Auto-complete if conditions are met
  if (await this.checkCompletion()) {
    await this.completeReferral();
    await this.awardRewards();
  }
  
  return true;
};

module.exports = mongoose.model('ReferralRecord', referralRecordSchema);