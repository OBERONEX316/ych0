const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');

// 获取所有商品
const getProducts = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      inStock,
      minRating
    } = req.query;

    // 构建查询条件
    let query = { isActive: true };
    
    // 按分类过滤
    if (category) {
      query.category = category;
    }
    
    // 价格范围过滤
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // 评分过滤
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }
    
    // 库存过滤
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }
    
    // 搜索功能
    if (search) {
      query.$text = { $search: search };
    }

    // 排序
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 执行查询
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // 获取总数
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品列表失败',
      message: error.message
    });
  }
};

// 获取单个商品
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品详情失败',
      message: error.message
    });
  }
};

// 获取商品分类
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类列表失败',
      message: error.message
    });
  }
};

// 创建商品（管理员功能）
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      data: savedProduct,
      message: '商品创建成功'
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(400).json({
      success: false,
      error: '创建商品失败',
      message: error.message
    });
  }
};

// 更新商品（管理员功能）
const updateProduct = async (req, res) => {
  try {
    // 获取原始商品信息以比较价格变化
    const originalProduct = await Product.findById(req.params.id);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 检查价格是否发生变化，如果变化则记录价格历史
    if (originalProduct && req.body.price !== undefined && 
        req.body.price !== originalProduct.price) {
      try {
        const priceChange = {
          productId: product._id,
          price: req.body.price,
          changeType: req.body.price > originalProduct.price ? 'increase' : 'decrease',
          previousPrice: originalProduct.price,
          changeAmount: Math.abs(req.body.price - originalProduct.price),
          changePercentage: ((Math.abs(req.body.price - originalProduct.price) / originalProduct.price) * 100).toFixed(2)
        };

        // 如果有促销信息，也记录下来
        if (req.body.promotionalPrice !== undefined) {
          priceChange.promotionalPrice = req.body.promotionalPrice;
          priceChange.promotionalEndDate = req.body.promotionalEndDate;
        }

        await PriceHistory.create(priceChange);
        
        console.log(`价格历史记录已创建: 商品 ${product.name} 价格从 ${originalProduct.price} 变更为 ${req.body.price}`);
      } catch (priceError) {
        console.error('记录价格历史失败:', priceError);
        // 不中断主流程，仅记录错误
      }
    }

    res.json({
      success: true,
      data: product,
      message: '商品更新成功'
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(400).json({
      success: false,
      error: '更新商品失败',
      message: error.message
    });
  }
};

// 删除商品（管理员功能）
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({
      success: false,
      error: '删除商品失败',
      message: error.message
    });
  }
};

// 获取热销商品
const getTopSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await Product.find({ isActive: true })
      .sort({ sales: -1, rating: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取热销商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热销商品失败',
      message: error.message
    });
  }
};

// 获取新品商品
const getNewProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取新品商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取新品商品失败',
      message: error.message
    });
  }
};

// 获取热门搜索
const getPopularSearches = async (req, res) => {
  try {
    // 模拟热门搜索数据（实际项目中可以从数据库或缓存中获取）
    const popularSearches = [
      '智能手机',
      '笔记本电脑', 
      '耳机',
      '智能手表',
      '相机',
      '游戏机',
      '平板电脑',
      '蓝牙音箱',
      '键盘',
      '鼠标'
    ];

    res.json({
      success: true,
      data: popularSearches
    });
  } catch (error) {
    console.error('获取热门搜索失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门搜索失败',
      message: error.message
    });
  }
};

// 获取推荐商品
const getRecommendedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { userId } = req.query;
    
    let recommendedProducts;
    
    if (userId) {
      // 个性化推荐：基于用户行为
      recommendedProducts = await Product.getRecommendedProducts(userId, limit);
    } else {
      // 热门推荐：基于协同过滤
      recommendedProducts = await Product.getPopularRecommendations(limit);
    }
    
    res.json({
      success: true,
      data: recommendedProducts,
      recommendationType: userId ? 'personalized' : 'popular'
    });
  } catch (error) {
    console.error('获取推荐商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取推荐商品失败',
      message: error.message
    });
  }
};

// 获取相关商品
const getRelatedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const { productId } = req.params;
    
    const relatedProducts = await Product.getRelatedProducts(productId, limit);
    
    res.json({
      success: true,
      data: relatedProducts
    });
  } catch (error) {
    console.error('获取相关商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取相关商品失败',
      message: error.message
    });
  }
};

// 获取用户偏好推荐
const getUserPreferenceRecommendations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '需要登录才能获取个性化推荐'
      });
    }
    
    const recommendedProducts = await Product.getRecommendedProducts(userId, limit);
    
    res.json({
      success: true,
      data: recommendedProducts,
      recommendationType: 'personalized'
    });
  } catch (error) {
    console.error('获取用户偏好推荐失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户偏好推荐失败',
      message: error.message
    });
  }
};

// 获取热门收藏商品
const getPopularProducts = async (req, res) => {
  try {
    const { 
      limit = 50, 
      timeRange = 'all', 
      category,
      minFavorites = 1 
    } = req.query;
    
    // 构建查询条件
    let query = { 
      isActive: true, 
      favoriteCount: { $gte: parseInt(minFavorites) }
    };
    
    // 按分类过滤
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // 按时间范围过滤
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        };
        break;
      case 'month':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        };
        break;
      default:
        // 全部时间，不需要时间过滤
        break;
    }
    
    // 合并查询条件
    if (Object.keys(dateFilter).length > 0) {
      query = { ...query, ...dateFilter };
    }
    
    // 执行查询，按收藏数、评分、销量综合排序
    const products = await Product.find(query)
      .sort({ 
        favoriteCount: -1, 
        rating: -1, 
        sales: -1,
        reviewCount: -1
      })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      filters: {
        timeRange,
        category: category || 'all',
        minFavorites: parseInt(minFavorites)
      }
    });
  } catch (error) {
    console.error('获取热门收藏商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门收藏商品失败',
      message: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getTopSellingProducts,
  getNewProducts,
  getPopularSearches,
  getRecommendedProducts,
  getRelatedProducts,
  getUserPreferenceRecommendations,
  getPopularProducts
};