const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// 获取商品评价
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      rating, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // 检查商品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 构建查询条件
    const query = { 
      product: productId, 
      status: 'approved' 
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    // 排序选项
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    // 获取评价列表
    const reviews = await Review.find(query)
      .populate('user', 'username firstName lastName avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // 获取评价总数
    const totalReviews = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNext: page < Math.ceil(totalReviews / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('获取商品评价失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品评价失败',
      message: error.message
    });
  }
};

// 创建评价
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的评价信息'
      });
    }

    // 检查商品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 检查是否已经评价过
    const existingReview = await Review.findOne({ 
      product: productId, 
      user: userId 
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: '您已经评价过此商品'
      });
    }

    // 检查是否购买过此商品（验证购买状态）
    const hasPurchased = await Order.exists({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });

    // 创建评价
    const review = await Review.create({
      product: productId,
      user: userId,
      rating: parseInt(rating),
      title,
      comment,
      images: images || [],
      isVerifiedPurchase: !!hasPurchased,
      status: hasPurchased ? 'approved' : 'pending' // 购买用户评价自动审核
    });

    // 填充用户信息
    await review.populate('user', 'username firstName lastName avatar');

    res.status(201).json({
      success: true,
      data: {
        review,
        message: hasPurchased ? '评价提交成功' : '评价已提交，等待审核'
      }
    });
  } catch (error) {
    console.error('创建评价失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: '创建评价失败',
      message: error.message
    });
  }
};

// 更新评价
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user.id;

    // 查找评价
    const review = await Review.findOne({ 
      _id: reviewId, 
      user: userId 
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: '评价不存在或无权修改'
      });
    }

    // 更新评价
    if (rating !== undefined) review.rating = parseInt(rating);
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;
    
    // 重新验证购买状态
    const hasPurchased = await Order.exists({
      user: userId,
      'items.product': review.product,
      status: 'delivered'
    });
    
    review.isVerifiedPurchase = !!hasPurchased;
    review.status = hasPurchased ? 'approved' : 'pending';

    await review.save();
    await review.populate('user', 'username firstName lastName avatar');

    res.status(200).json({
      success: true,
      data: {
        review,
        message: '评价更新成功'
      }
    });
  } catch (error) {
    console.error('更新评价失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: '更新评价失败',
      message: error.message
    });
  }
};

// 删除评价
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOneAndDelete({ 
      _id: reviewId, 
      user: userId 
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: '评价不存在或无权删除'
      });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: '评价删除成功'
    });
  } catch (error) {
    console.error('删除评价失败:', error);
    res.status(500).json({
      success: false,
      error: '删除评价失败',
      message: error.message
    });
  }
};

// 标记评价为有帮助
const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        error: '评价不存在'
      });
    }

    await review.markHelpful(userId);

    res.status(200).json({
      success: true,
      data: {
        helpfulCount: review.helpful.count,
        message: '标记成功'
      }
    });
  } catch (error) {
    console.error('标记评价失败:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 取消标记评价为有帮助
const unmarkHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        error: '评价不存在'
      });
    }

    await review.unmarkHelpful(userId);

    res.status(200).json({
      success: true,
      data: {
        helpfulCount: review.helpful.count,
        message: '取消标记成功'
      }
    });
  } catch (error) {
    console.error('取消标记评价失败:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 获取用户的所有评价
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ user: userId })
      .populate('product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReviews = await Review.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNext: page < Math.ceil(totalReviews / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('获取用户评价失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户评价失败',
      message: error.message
    });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  unmarkHelpful,
  getUserReviews
};