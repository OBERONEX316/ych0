const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');

// @desc    获取所有优惠券（管理员）
// @route   GET /api/coupons
// @access  Private/Admin
const getCoupons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  
  // 搜索过滤
  if (req.query.search) {
    filter.$or = [
      { code: { $regex: req.query.search, $options: 'i' } },
      { name: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // 状态过滤
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // 类型过滤
  if (req.query.type) {
    filter.type = req.query.type;
  }

  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name email');

  const total = await Coupon.countDocuments(filter);

  res.json({
    coupons,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    获取单个优惠券
// @route   GET /api/coupons/:id
// @access  Public
const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  res.json(coupon);
});

// @desc    根据代码获取优惠券
// @route   GET /api/coupons/code/:code
// @access  Public
const getCouponByCode = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({ 
    code: req.params.code.toUpperCase(),
    isActive: true,
    isPublic: true
  });

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  if (!coupon.isValid) {
    res.status(400);
    throw new Error('优惠券已过期');
  }

  res.json(coupon);
});

// @desc    创建优惠券（管理员）
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    description,
    type,
    discountValue,
    minPurchaseAmount,
    maxDiscountAmount,
    usageLimitTotal,
    usageLimitPerUser,
    validFrom,
    validUntil,
    applicableCategories,
    excludedProducts,
    isActive,
    isPublic
  } = req.body;

  // 检查优惠券代码是否已存在
  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (existingCoupon) {
    res.status(400);
    throw new Error('优惠券代码已存在');
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    name,
    description,
    type,
    discountValue,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxDiscountAmount,
    usageLimitTotal,
    usageLimitPerUser,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    applicableCategories,
    excludedProducts,
    isActive: isActive !== undefined ? isActive : true,
    isPublic: isPublic !== undefined ? isPublic : true,
    createdBy: req.user._id
  });

  res.status(201).json(coupon);
});

// @desc    更新优惠券（管理员）
// @route   PUT /api/coupons/:id
// @access  Private/Admin
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  // 如果更新代码，检查是否重复
  if (req.body.code && req.body.code !== coupon.code) {
    const existingCoupon = await Coupon.findOne({ 
      code: req.body.code.toUpperCase(),
      _id: { $ne: req.params.id }
    });
    if (existingCoupon) {
      res.status(400);
      throw new Error('优惠券代码已存在');
    }
    req.body.code = req.body.code.toUpperCase();
  }

  // 更新日期字段
  if (req.body.validFrom) {
    req.body.validFrom = new Date(req.body.validFrom);
  }
  if (req.body.validUntil) {
    req.body.validUntil = new Date(req.body.validUntil);
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedCoupon);
});

// @desc    删除优惠券（管理员）
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  // 检查是否有用户已领取该优惠券
  const userCouponCount = await UserCoupon.countDocuments({ coupon: req.params.id });
  if (userCouponCount > 0) {
    res.status(400);
    throw new Error('无法删除，已有用户领取该优惠券');
  }

  await Coupon.findByIdAndDelete(req.params.id);

  res.json({ message: '优惠券已删除' });
});

// @desc    获取用户可用的优惠券
// @route   GET /api/coupons/user/available
// @access  Private
const getUserAvailableCoupons = asyncHandler(async (req, res) => {
  const userCoupons = await UserCoupon.findAvailableForUser(req.user._id);
  
  // 过滤出有效的优惠券
  const validCoupons = userCoupons.filter(uc => uc.isValid);
  
  res.json(validCoupons);
});

// @desc    获取用户已使用的优惠券
// @route   GET /api/coupons/user/used
// @access  Private
const getUserUsedCoupons = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const usedCoupons = await UserCoupon.findUsedForUser(req.user._id, limit);
  
  res.json(usedCoupons);
});

// @desc    用户领取优惠券
// @route   POST /api/coupons/:id/claim
// @access  Private
const claimCoupon = asyncHandler(async (req, res) => {
  const { source = 'manual', notes = '' } = req.body;
  
  try {
    const userCoupon = await UserCoupon.claimCoupon(
      req.user._id,
      req.params.id,
      source,
      notes
    );
    
    await userCoupon.populate('coupon');
    
    res.status(201).json(userCoupon);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    使用优惠券代码领取
// @route   POST /api/coupons/code/:code/claim
// @access  Private
const claimCouponByCode = asyncHandler(async (req, res) => {
  const { source = 'manual', notes = '' } = req.body;
  
  // 先根据代码查找优惠券
  const coupon = await Coupon.findOne({ 
    code: req.params.code.toUpperCase(),
    isActive: true,
    isPublic: true
  });

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  if (!coupon.isValid) {
    res.status(400);
    throw new Error('优惠券已过期');
  }

  try {
    const userCoupon = await UserCoupon.claimCoupon(
      req.user._id,
      coupon._id,
      source,
      notes
    );
    
    await userCoupon.populate('coupon');
    
    res.status(201).json(userCoupon);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    验证优惠券是否适用于订单
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { couponCode, products, totalAmount } = req.body;

  if (!couponCode) {
    res.status(400);
    throw new Error('优惠券代码不能为空');
  }

  // 查找优惠券
  const coupon = await Coupon.findOne({ 
    code: couponCode.toUpperCase(),
    isActive: true
  });

  if (!coupon) {
    res.status(404);
    throw new Error('优惠券不存在');
  }

  if (!coupon.isValid) {
    res.status(400);
    throw new Error('优惠券已过期');
  }

  // 检查用户是否拥有该优惠券
  const userCoupon = await UserCoupon.findOne({
    user: req.user._id,
    coupon: coupon._id,
    status: 'available'
  });

  if (!userCoupon) {
    res.status(400);
    throw new Error('您没有该优惠券');
  }

  if (!userCoupon.isValid) {
    res.status(400);
    throw new Error('优惠券已过期');
  }

  // 验证优惠券是否适用于订单
  const validationResult = await coupon.validateForOrder(
    totalAmount,
    products,
    req.user._id
  );

  if (!validationResult.isValid) {
    res.status(400);
    throw new Error(validationResult.message);
  }

  res.json({
    isValid: true,
    coupon: coupon,
    discountAmount: validationResult.discountAmount,
    finalAmount: totalAmount - validationResult.discountAmount
  });
});

// @desc    获取公开的优惠券列表
// @route   GET /api/coupons/public/list
// @access  Public
const getPublicCoupons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const coupons = await Coupon.find({
    isActive: true,
    isPublic: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);

  const total = await Coupon.countDocuments({
    isActive: true,
    isPublic: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }
  });

  res.json({
    coupons,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

module.exports = {
  getCoupons,
  getCoupon,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getUserAvailableCoupons,
  getUserUsedCoupons,
  claimCoupon,
  claimCouponByCode,
  validateCoupon,
  getPublicCoupons
};