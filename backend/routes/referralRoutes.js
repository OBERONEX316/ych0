const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Public routes
router.get('/programs/active', referralController.getActivePrograms);

// Protected user routes
router.get('/user/stats', protect, referralController.getUserReferralStats);
router.post('/create', protect, [
  body('programId').isMongoId().withMessage('Invalid program ID'),
  body('referredEmail').isEmail().withMessage('Invalid email format'),
  body('trackingData').optional().isObject().withMessage('Tracking data must be an object')
], referralController.createReferral);

// Process referral completion (can be called by system or admin)
router.post('/complete', [
  body('referralCode').notEmpty().withMessage('Referral code is required'),
  body('completionData').optional().isObject().withMessage('Completion data must be an object')
], referralController.processReferralCompletion);

// Admin routes
router.post('/admin/programs', protect, authorize('admin'), [
  body('name').notEmpty().withMessage('Program name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('startDate').isISO8601().withMessage('Invalid start date format'),
  body('endDate').isISO8601().withMessage('Invalid end date format'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('conditions.requiredOrderAmount').optional().isNumeric().withMessage('Required order amount must be a number'),
  body('conditions.requiredOrderCount').optional().isNumeric().withMessage('Required order count must be a number'),
  body('conditions.requiredRegistrationDays').optional().isNumeric().withMessage('Required registration days must be a number'),
  body('referrerReward.type').isIn(['points', 'coupon', 'cash']).withMessage('Invalid referrer reward type'),
  body('referrerReward.amount').optional().isNumeric().withMessage('Referrer reward amount must be a number'),
  body('referredReward.type').isIn(['points', 'coupon', 'cash']).withMessage('Invalid referred reward type'),
  body('referredReward.amount').optional().isNumeric().withMessage('Referred reward amount must be a number'),
  body('referralCodeSettings.codeType').isIn(['auto', 'custom']).withMessage('Invalid code type'),
  body('referralCodeSettings.prefix').optional().isString().withMessage('Code prefix must be a string'),
  body('referralCodeSettings.length').optional().isInt({ min: 4, max: 20 }).withMessage('Code length must be between 4 and 20'),
  body('sharingSettings.enabled').optional().isBoolean().withMessage('Sharing enabled must be a boolean'),
  body('sharingSettings.platforms').optional().isArray().withMessage('Sharing platforms must be an array'),
  body('sharingSettings.customMessage').optional().isString().withMessage('Custom message must be a string'),
  body('eligibility.minPurchaseAmount').optional().isNumeric().withMessage('Minimum purchase amount must be a number'),
  body('eligibility.minRegistrationDays').optional().isNumeric().withMessage('Minimum registration days must be a number'),
  body('eligibility.requiredMembershipLevel').optional().isString().withMessage('Required membership level must be a string'),
  body('eligibility.maxReferralsPerUser').optional().isInt({ min: 1 }).withMessage('Max referrals per user must be at least 1')
], referralController.createReferralProgram);

router.put('/admin/programs/:id', protect, authorize('admin'), [
  body('name').optional().notEmpty().withMessage('Program name cannot be empty'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('conditions.requiredOrderAmount').optional().isNumeric().withMessage('Required order amount must be a number'),
  body('conditions.requiredOrderCount').optional().isNumeric().withMessage('Required order count must be a number'),
  body('conditions.requiredRegistrationDays').optional().isNumeric().withMessage('Required registration days must be a number'),
  body('referrerReward.type').optional().isIn(['points', 'coupon', 'cash']).withMessage('Invalid referrer reward type'),
  body('referrerReward.amount').optional().isNumeric().withMessage('Referrer reward amount must be a number'),
  body('referredReward.type').optional().isIn(['points', 'coupon', 'cash']).withMessage('Invalid referred reward type'),
  body('referredReward.amount').optional().isNumeric().withMessage('Referred reward amount must be a number'),
  body('referralCodeSettings.codeType').optional().isIn(['auto', 'custom']).withMessage('Invalid code type'),
  body('referralCodeSettings.prefix').optional().isString().withMessage('Code prefix must be a string'),
  body('referralCodeSettings.length').optional().isInt({ min: 4, max: 20 }).withMessage('Code length must be between 4 and 20'),
  body('sharingSettings.enabled').optional().isBoolean().withMessage('Sharing enabled must be a boolean'),
  body('sharingSettings.platforms').optional().isArray().withMessage('Sharing platforms must be an array'),
  body('sharingSettings.customMessage').optional().isString().withMessage('Custom message must be a string'),
  body('eligibility.minPurchaseAmount').optional().isNumeric().withMessage('Minimum purchase amount must be a number'),
  body('eligibility.minRegistrationDays').optional().isNumeric().withMessage('Minimum registration days must be a number'),
  body('eligibility.requiredMembershipLevel').optional().isString().withMessage('Required membership level must be a string'),
  body('eligibility.maxReferralsPerUser').optional().isInt({ min: 1 }).withMessage('Max referrals per user must be at least 1')
], referralController.updateReferralProgram);

router.get('/admin/programs', protect, authorize('admin'), referralController.getAllReferralPrograms);
router.get('/admin/programs/:id', protect, authorize('admin'), referralController.getReferralProgramById);
router.delete('/admin/programs/:id', protect, authorize('admin'), referralController.deleteReferralProgram);
router.get('/admin/statistics', protect, authorize('admin'), referralController.getReferralStatistics);

module.exports = router;
