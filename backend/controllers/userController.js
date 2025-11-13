const User = require('../models/User');
const Product = require('../models/Product');

// 获取用户心愿单
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('wishlist.product', 'name price images category inStock rating');

    res.status(200).json({
      success: true,
      data: {
        wishlist: user.wishlist || []
      }
    });
  } catch (error) {
    console.error('获取心愿单失败:', error);
    res.status(500).json({
      success: false,
      error: '获取心愿单失败',
      message: error.message
    });
  }
};

// 添加商品到心愿单
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: '请提供商品ID'
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

    const user = await User.findById(req.user.id);

    // 检查商品是否已经在心愿单中
    const existingItem = user.wishlist.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: '商品已在心愿单中'
      });
    }

    // 添加到心愿单
    user.wishlist.push({
      product: productId,
      addedAt: new Date()
    });

    await user.save();

    // 填充商品信息返回
    await user.populate('wishlist.product', 'name price images category inStock rating');

    res.status(200).json({
      success: true,
      data: {
        wishlist: user.wishlist,
        message: '商品已添加到心愿单'
      }
    });
  } catch (error) {
    console.error('添加到心愿单失败:', error);
    res.status(500).json({
      success: false,
      error: '添加到心愿单失败',
      message: error.message
    });
  }
};

// 从心愿单移除商品
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: '请提供商品ID'
      });
    }

    const user = await User.findById(req.user.id);

    // 检查商品是否在心愿单中
    const itemIndex = user.wishlist.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '商品不在心愿单中'
      });
    }

    // 从心愿单移除
    user.wishlist.splice(itemIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        wishlist: user.wishlist,
        message: '商品已从心愿单移除'
      }
    });
  } catch (error) {
    console.error('从心愿单移除失败:', error);
    res.status(500).json({
      success: false,
      error: '从心愿单移除失败',
      message: error.message
    });
  }
};

// 检查商品是否在心愿单中
const checkWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: '请提供商品ID'
      });
    }

    const user = await User.findById(req.user.id);
    const isInWishlist = user.wishlist.some(
      item => item.product.toString() === productId
    );

    res.status(200).json({
      success: true,
      data: {
        isInWishlist,
        productId
      }
    });
  } catch (error) {
    console.error('检查心愿单失败:', error);
    res.status(500).json({
      success: false,
      error: '检查心愿单失败',
      message: error.message
    });
  }
};

// 清空心愿单
const clearWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = [];
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: '心愿单已清空',
        wishlist: []
      }
    });
  } catch (error) {
    console.error('清空心愿单失败:', error);
    res.status(500).json({
      success: false,
      error: '清空心愿单失败',
      message: error.message
    });
  }
};

// 获取所有用户（管理员）
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role = '',
      isActive = '',
      search = ''
    } = req.query;

    // 构建查询条件
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // 执行查询
    const users = await User.find(query)
      .select('-password') // 排除密码字段
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // 获取总数用于分页
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
      message: error.message
    });
  }
};

// 获取单个用户详情（管理员）
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败',
      message: error.message
    });
  }
};

// 更新用户状态（管理员）
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的状态值'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: `用户已${isActive ? '启用' : '禁用'}`
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户状态失败',
      message: error.message
    });
  }
};

// 更新用户角色（管理员）
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的角色值'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: '用户角色更新成功'
    });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户角色失败',
      message: error.message
    });
  }
};

// 删除用户（管理员）
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败',
      message: error.message
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistItem,
  clearWishlist,
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  
  // 获取热门收藏商品
  getPopularFavorites: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      // 获取收藏数量最多的商品
      const popularProducts = await Product.find({ isActive: true })
        .sort({ favoriteCount: -1, sales: -1 })
        .limit(parseInt(limit))
        .select('name price image rating sales favoriteCount');
      
      res.status(200).json({
        success: true,
        data: popularProducts
      });
    } catch (error) {
      console.error('获取热门收藏失败:', error);
      res.status(500).json({
        success: false,
        error: '获取热门收藏失败',
        message: error.message
      });
    }
  },
  
  // 获取用户收藏统计
  getFavoriteStats: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      
      // 获取用户收藏的商品数量
      const favoriteCount = user.wishlist.length;
      
      // 获取用户最近收藏的商品
      const recentFavorites = await Product.find({
        _id: { $in: user.wishlist.slice(0, 5).map(item => item.product) }
      }).select('name image price');
      
      res.status(200).json({
        success: true,
        data: {
          totalFavorites: favoriteCount,
          recentFavorites
        }
      });
    } catch (error) {
      console.error('获取收藏统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取收藏统计失败',
        message: error.message
      });
    }
  }
};