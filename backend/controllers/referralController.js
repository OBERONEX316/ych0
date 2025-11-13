const ReferralProgram = require('../models/ReferralProgram');
const ReferralRecord = require('../models/ReferralRecord');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Generate unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Get all active referral programs
exports.getActivePrograms = async (req, res) => {
  try {
    const programs = await ReferralProgram.getActivePrograms();
    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('Get active programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral programs',
      error: error.message
    });
  }
};

// Get user's referral stats
exports.getUserReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await ReferralRecord.getReferralStats(userId);
    const activeReferrals = await ReferralRecord.getActiveReferrals(userId);
    
    res.json({
      success: true,
      data: {
        stats,
        referrals: activeReferrals
      }
    });
  } catch (error) {
    console.error('Get user referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral stats',
      error: error.message
    });
  }
};

// Create referral (user refers someone)
exports.createReferral = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { programId, referredEmail, trackingData } = req.body;
    const referrerId = req.user.id;

    // Check if program exists and is active
    const program = await ReferralProgram.findById(programId);
    if (!program || !program.isActive || program.endDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Referral program is not active'
      });
    }

    // Check if user is eligible to participate
    if (!program.checkUserEligibility(referrerId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for this referral program'
      });
    }

    // Check if referred user exists
    const referredUser = await User.findOne({ email: referredEmail });
    if (!referredUser) {
      return res.status(404).json({
        success: false,
        message: 'Referred user not found'
      });
    }

    // Check for duplicate referral
    const isDuplicate = await ReferralRecord.checkDuplicateReferral(
      referrerId, referredUser._id, programId
    );
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'You have already referred this user'
      });
    }

    // Generate referral code
    const referralCode = generateReferralCode();

    // Create referral record
    const referralRecord = new ReferralRecord({
      referrerId,
      referredId: referredUser._id,
      programId,
      referralCode,
      completionConditions: {
        requiredOrderAmount: program.conditions.requiredOrderAmount,
        requiredOrderCount: program.conditions.requiredOrderCount,
        requiredRegistrationDays: program.conditions.requiredRegistrationDays
      },
      referrerReward: {
        type: program.referrerReward.type,
        amount: program.referrerReward.amount
      },
      referredReward: {
        type: program.referredReward.type,
        amount: program.referredReward.amount
      },
      trackingData: trackingData || {}
    });

    await referralRecord.save();

    // Update program statistics
    await program.updateStatistics('increment', 'totalReferrals');

    res.json({
      success: true,
      message: 'Referral created successfully',
      data: {
        referralCode,
        referralId: referralRecord._id,
        programName: program.name
      }
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create referral',
      error: error.message
    });
  }
};

// Process referral completion (called when referred user meets conditions)
exports.processReferralCompletion = async (req, res) => {
  try {
    const { referralCode, completionData } = req.body;

    const referralRecord = await ReferralRecord.findOne({ referralCode })
      .populate('programId');

    if (!referralRecord) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Update completion data
    await referralRecord.updateCompletionData(completionData);

    // Check if referral is now completed
    if (await referralRecord.checkCompletion()) {
      // Complete referral and award rewards
      await referralRecord.completeReferral();
      await referralRecord.awardRewards();

      // Update program statistics
      await referralRecord.programId.updateStatistics('increment', 'completedReferrals');
    }

    res.json({
      success: true,
      message: 'Referral processed successfully',
      data: {
        status: referralRecord.status,
        rewardStatus: referralRecord.rewardStatus
      }
    });
  } catch (error) {
    console.error('Process referral completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process referral completion',
      error: error.message
    });
  }
};

// Admin: Create referral program
exports.createReferralProgram = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const programData = req.body;
    const program = new ReferralProgram(programData);
    await program.save();

    res.json({
      success: true,
      message: 'Referral program created successfully',
      data: program
    });
  } catch (error) {
    console.error('Create referral program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create referral program',
      error: error.message
    });
  }
};

// Admin: Update referral program
exports.updateReferralProgram = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const program = await ReferralProgram.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found'
      });
    }

    res.json({
      success: true,
      message: 'Referral program updated successfully',
      data: program
    });
  } catch (error) {
    console.error('Update referral program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update referral program',
      error: error.message
    });
  }
};

// Admin: Get all referral programs
exports.getAllReferralPrograms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const programs = await ReferralProgram.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReferralProgram.countDocuments();

    res.json({
      success: true,
      data: {
        programs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all referral programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral programs',
      error: error.message
    });
  }
};

// Admin: Get referral program by ID
exports.getReferralProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    const program = await ReferralProgram.findById(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found'
      });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Get referral program by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral program',
      error: error.message
    });
  }
};

// Admin: Delete referral program
exports.deleteReferralProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const program = await ReferralProgram.findByIdAndDelete(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found'
      });
    }

    res.json({
      success: true,
      message: 'Referral program deleted successfully'
    });
  } catch (error) {
    console.error('Delete referral program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete referral program',
      error: error.message
    });
  }
};

// Admin: Get referral statistics
exports.getReferralStatistics = async (req, res) => {
  try {
    const { programId, startDate, endDate } = req.query;
    
    const matchStage = {};
    if (programId) matchStage.programId = mongoose.Types.ObjectId(programId);
    if (startDate || endDate) {
      matchStage.referralDate = {};
      if (startDate) matchStage.referralDate.$gte = new Date(startDate);
      if (endDate) matchStage.referralDate.$lte = new Date(endDate);
    }

    const stats = await ReferralRecord.aggregate([
      { $match: matchStage },
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
          expiredReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
          },
          totalRewardsAwarded: {
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

    const programStats = await ReferralRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$programId',
          programName: { $first: '$programId' },
          totalReferrals: { $sum: 1 },
          completedReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'referralprograms',
          localField: '_id',
          foreignField: '_id',
          as: 'program'
        }
      },
      {
        $project: {
          programName: { $arrayElemAt: ['$program.name', 0] },
          totalReferrals: 1,
          completedReferrals: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalReferrals', 0] },
              { $multiply: [{ $divide: ['$completedReferrals', '$totalReferrals'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overallStats: stats[0] || {
          totalReferrals: 0,
          completedReferrals: 0,
          pendingReferrals: 0,
          expiredReferrals: 0,
          totalRewardsAwarded: 0
        },
        programStats
      }
    });
  } catch (error) {
    console.error('Get referral statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral statistics',
      error: error.message
    });
  }
};
