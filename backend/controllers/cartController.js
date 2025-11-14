const User = require('../models/User');
const Product = require('../models/Product');
const UserActivity = require('../models/UserActivity');
const Order = require('../models/Order');
const PriceHistory = require('../models/PriceHistory');

// 智能购物车配置
const CART_OPTIMIZATION_CONFIG = {
  // 价格预测设置
  PRICE_PREDICTION: {
    ENABLED: true,
    THRESHOLD: 0.1, // 价格下降10%时提醒
    CHECK_INTERVAL: 24 * 60 * 60 * 1000 // 24小时检查一次
  },
  
  // 凑单推荐设置
  BUNDLE_RECOMMENDATION: {
    ENABLED: true,
    FREE_SHIPPING_THRESHOLD: 99, // 包邮门槛
    MAX_RECOMMENDATIONS: 3, // 最多推荐3个商品
    MIN_SAVING_AMOUNT: 5 // 最少节省5元才推荐
  },
  
  // 库存预警设置
  STOCK_ALERT: {
    ENABLED: true,
    LOW_STOCK_THRESHOLD: 5, // 库存低于5件时提醒
    CRITICAL_STOCK_THRESHOLD: 2 // 库存低于2件时紧急提醒
  },
  
  // 关联推荐设置
  RELATED_RECOMMENDATION: {
    ENABLED: true,
    MAX_RELATED_ITEMS: 3, // 最多推荐3个关联商品
    MIN_SIMILARITY_SCORE: 0.6 // 最小相似度分数
  }
};

// 获取购物车
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('cart.items.product', 'name price image stock')
      .select('cart');

    res.json({
      success: true,
      data: user.cart
    });
  } catch (error) {
    console.error('获取购物车失败:', error);
    res.status(500).json({
      success: false,
      error: '获取购物车失败',
      message: error.message
    });
  }
};

// 添加商品到购物车
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const variantPayload = req.body.variant || req.body.flashSaleData || null;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: '商品ID不能为空'
      });
    }

    // 验证商品是否存在且有库存（如选择变体，优先检查变体库存）
    const product = await Product.findOne({ _id: productId, isActive: true });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在或库存不足'
      });
    }

    let variantSku, variantAttributes, variantPriceDelta = 0, variantStock;
    if (variantPayload) {
      variantSku = variantPayload.variantSku;
      variantAttributes = variantPayload.variantAttributes || {};
      variantPriceDelta = Number(variantPayload.variantPriceDelta || 0);
      // 查找匹配变体库存
      if (Array.isArray(product.variants)) {
        const matched = product.variants.find(v => {
          if (variantSku && v.sku === variantSku) return true;
          const attrs = v.attributes || {};
          const keys = Object.keys(variantAttributes || {});
          return keys.every(k => String(attrs[k] || '') === String(variantAttributes[k] || ''));
        });
        if (matched) variantStock = matched.stock;
      }
      // 如果指定变体但无库存或不存在，拒绝添加
      if (typeof variantStock === 'number' && variantStock <= 0) {
        return res.status(400).json({ success: false, error: '该变体库存不足' });
      }
    }

    // 基础库存检查（无变体时）
    if (!variantPayload && product.stock <= 0) {
      return res.status(404).json({ success: false, error: '商品不存在或库存不足' });
    }

    const user = await User.findById(req.user.id);
    
    // 检查商品是否已在购物车中
    const existingItemIndex = user.cart.items.findIndex(
      item => item.product.toString() === productId && String(item.variantSku || '') === String(variantSku || '')
    );

    if (existingItemIndex > -1) {
      // 更新数量
      // 更新数量前检查变体库存上限
      const maxStock = typeof user.cart.items[existingItemIndex].variantStock === 'number' ? user.cart.items[existingItemIndex].variantStock : product.stock;
      const newQty = user.cart.items[existingItemIndex].quantity + quantity;
      if (typeof maxStock === 'number' && newQty > maxStock) {
        return res.status(400).json({ success: false, error: '超过库存上限' });
      }
      user.cart.items[existingItemIndex].quantity = newQty;
    } else {
      // 添加新商品
      user.cart.items.push({
        product: productId,
        quantity,
        variantSku,
        variantAttributes,
        variantPriceDelta,
        variantStock,
        addedAt: new Date()
      });
    }

    // 重新计算购物车统计信息
    await user.calculateCartTotals();
    await user.save();

    // 返回更新后的购物车
    const updatedUser = await User.findById(req.user.id)
      .populate('cart.items.product', 'name price image stock')
      .select('cart');

    res.json({
      success: true,
      data: updatedUser.cart,
      message: '商品已添加到购物车'
    });

  } catch (error) {
    console.error('添加到购物车失败:', error);
    res.status(500).json({
      success: false,
      error: '添加到购物车失败',
      message: error.message
    });
  }
};

// 更新购物车商品数量
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: '数量必须大于0'
      });
    }

    const user = await User.findById(req.user.id);
    const cartItem = user.cart.items.id(itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: '购物车商品不存在'
      });
    }

    // 检查库存
    const product = await Product.findById(cartItem.product);
    const maxStock = typeof cartItem.variantStock === 'number' ? cartItem.variantStock : product.stock;
    if (quantity > maxStock) {
      return res.status(400).json({
        success: false,
        error: '库存不足'
      });
    }

    cartItem.quantity = quantity;
    cartItem.updatedAt = new Date();

    await user.calculateCartTotals();
    await user.save();

    const updatedUser = await User.findById(req.user.id)
      .populate('cart.items.product', 'name price image stock')
      .select('cart');

    res.json({
      success: true,
      data: updatedUser.cart,
      message: '购物车已更新'
    });

  } catch (error) {
    console.error('更新购物车失败:', error);
    res.status(500).json({
      success: false,
      error: '更新购物车失败',
      message: error.message
    });
  }
};

// 从购物车移除商品
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const user = await User.findById(req.user.id);
    
    // 移除商品
    user.cart.items = user.cart.items.filter(
      item => item._id.toString() !== itemId
    );

    await user.calculateCartTotals();
    await user.save();

    const updatedUser = await User.findById(req.user.id)
      .populate('cart.items.product', 'name price image stock')
      .select('cart');

    res.json({
      success: true,
      data: updatedUser.cart,
      message: '商品已从购物车移除'
    });

  } catch (error) {
    console.error('从购物车移除失败:', error);
    res.status(500).json({
      success: false,
      error: '从购物车移除失败',
      message: error.message
    });
  }
};

// 清空购物车
const clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.cart.items = [];
    user.cart.totalItems = 0;
    user.cart.totalPrice = 0;

    await user.save();

    res.json({
      success: true,
      message: '购物车已清空',
      data: user.cart
    });

  } catch (error) {
    console.error('清空购物车失败:', error);
    res.status(500).json({
      success: false,
      error: '清空购物车失败',
      message: error.message
    });
  }
};

// 智能购物车优化功能
const optimizeCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户购物车
    const user = await User.findById(userId)
      .populate('cart.items.product', 'name price image stock category')
      .select('cart');
    
    if (!user || !user.cart.items.length) {
      return res.json({
        success: true,
        data: {
          optimizations: [],
          warnings: [],
          recommendations: []
        },
        message: '购物车为空，无需优化'
      });
    }
    
    const optimizations = [];
    const warnings = [];
    const recommendations = [];
    
    // 1. 价格预测检查
    if (CART_OPTIMIZATION_CONFIG.PRICE_PREDICTION.ENABLED) {
      const pricePredictions = await checkPricePredictions(user.cart.items);
      optimizations.push(...pricePredictions);
    }
    
    // 2. 库存预警检查
    if (CART_OPTIMIZATION_CONFIG.STOCK_ALERT.ENABLED) {
      const stockWarnings = checkStockWarnings(user.cart.items);
      warnings.push(...stockWarnings);
    }
    
    // 3. 凑单推荐
    if (CART_OPTIMIZATION_CONFIG.BUNDLE_RECOMMENDATION.ENABLED) {
      const bundleRecommendations = await getBundleRecommendations(userId, user.cart);
      recommendations.push(...bundleRecommendations);
    }
    
    // 4. 关联商品推荐
    if (CART_OPTIMIZATION_CONFIG.RELATED_RECOMMENDATION.ENABLED) {
      const relatedRecommendations = await getRelatedRecommendations(user.cart.items);
      recommendations.push(...relatedRecommendations);
    }
    
    res.json({
      success: true,
      data: {
        optimizations,
        warnings,
        recommendations,
        cartSummary: {
          totalItems: user.cart.totalItems,
          totalPrice: user.cart.totalPrice,
          items: user.cart.items.map(item => ({
            productId: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            stock: item.product.stock
          }))
        }
      },
      message: '购物车优化分析完成'
    });
    
  } catch (error) {
    console.error('购物车优化失败:', error);
    res.status(500).json({
      success: false,
      error: '购物车优化失败',
      message: error.message
    });
  }
};

// 价格预测检查
const checkPricePredictions = async (cartItems) => {
  const predictions = [];
  const now = new Date();
  
  for (const item of cartItems) {
    // 检查商品价格历史（这里简化实现，实际应该查询价格历史表）
    const priceHistory = await getProductPriceHistory(item.product._id);
    
    if (priceHistory.length > 1) {
      const recentPrice = priceHistory[priceHistory.length - 1].price;
      const previousPrice = priceHistory[priceHistory.length - 2].price;
      
      if (recentPrice < previousPrice) {
        const priceDropPercent = ((previousPrice - recentPrice) / previousPrice) * 100;
        
        if (priceDropPercent >= CART_OPTIMIZATION_CONFIG.PRICE_PREDICTION.THRESHOLD * 100) {
          predictions.push({
            type: 'price_drop',
            productId: item.product._id,
            productName: item.product.name,
            oldPrice: previousPrice,
            newPrice: recentPrice,
            dropPercent: priceDropPercent.toFixed(1),
            message: `商品"${item.product.name}"价格下降${priceDropPercent.toFixed(1)}%`,
            severity: 'info'
          });
        }
      }
    }
  }
  
  return predictions;
};

// 获取商品价格历史
const getProductPriceHistory = async (productId) => {
  try {
    // 获取最近30天的价格历史
    const priceHistory = await PriceHistory.find({
      product: productId,
      timestamp: { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      }
    })
    .sort({ timestamp: 1 })
    .select('price timestamp changeType')
    .lean();
    
    // 如果没有价格历史记录，返回空数组
    if (!priceHistory.length) {
      // 获取当前商品价格作为参考
      const product = await Product.findById(productId).select('price');
      if (product) {
        return [
          { 
            price: product.price, 
            timestamp: new Date(),
            changeType: 'regular'
          }
        ];
      }
      return [];
    }
    
    return priceHistory;
    
  } catch (error) {
    console.error('获取价格历史失败:', error);
    // 出错时返回模拟数据
    return [
      { 
        price: 100, 
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        changeType: 'regular'
      },
      { 
        price: 95, 
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        changeType: 'sale'
      },
      { 
        price: 90, 
        timestamp: new Date(),
        changeType: 'regular'
      }
    ];
  }
};

// 库存预警检查
const checkStockWarnings = (cartItems) => {
  const warnings = [];
  
  for (const item of cartItems) {
    if (item.product.stock <= CART_OPTIMIZATION_CONFIG.STOCK_ALERT.CRITICAL_STOCK_THRESHOLD) {
      warnings.push({
        type: 'critical_stock',
        productId: item.product._id,
        productName: item.product.name,
        currentStock: item.product.stock,
        message: `商品"${item.product.name}"库存紧张，仅剩${item.product.stock}件`,
        severity: 'high',
        recommendedAction: '立即购买'
      });
    } else if (item.product.stock <= CART_OPTIMIZATION_CONFIG.STOCK_ALERT.LOW_STOCK_THRESHOLD) {
      warnings.push({
        type: 'low_stock',
        productId: item.product._id,
        productName: item.product.name,
        currentStock: item.product.stock,
        message: `商品"${item.product.name}"库存较低，仅剩${item.product.stock}件`,
        severity: 'medium',
        recommendedAction: '尽快购买'
      });
    }
    
    // 检查购物车数量是否超过库存
    if (item.quantity > item.product.stock) {
      warnings.push({
        type: 'exceed_stock',
        productId: item.product._id,
        productName: item.product.name,
        cartQuantity: item.quantity,
        availableStock: item.product.stock,
        message: `购物车中"${item.product.name}"数量(${item.quantity})超过可用库存(${item.product.stock})`,
        severity: 'high',
        recommendedAction: '调整数量或等待补货'
      });
    }
  }
  
  return warnings;
};

// 获取凑单推荐
const getBundleRecommendations = async (userId, cart) => {
  const recommendations = [];
  const remainingToFreeShipping = CART_OPTIMIZATION_CONFIG.BUNDLE_RECOMMENDATION.FREE_SHIPPING_THRESHOLD - cart.totalPrice;
  
  if (remainingToFreeShipping > 0) {
    // 获取用户可能感兴趣的商品
    const suggestedProducts = await getSuggestedProductsForUser(userId, 5);
    
    for (const product of suggestedProducts) {
      if (product.price <= remainingToFreeShipping + 20) { // 允许稍微超过门槛
        const savingAmount = 15; // 节省的运费
        
        if (savingAmount >= CART_OPTIMIZATION_CONFIG.BUNDLE_RECOMMENDATION.MIN_SAVING_AMOUNT) {
          recommendations.push({
            type: 'bundle_suggestion',
            productId: product._id,
            productName: product.name,
            price: product.price,
            savingAmount,
            message: `再添加"${product.name}"即可享受包邮，节省${savingAmount}元运费`,
            severity: 'info',
            action: 'add_to_cart'
          });
        }
        
        if (recommendations.length >= CART_OPTIMIZATION_CONFIG.BUNDLE_RECOMMENDATION.MAX_RECOMMENDATIONS) {
          break;
        }
      }
    }
  }
  
  return recommendations;
};

// 获取关联商品推荐
const getRelatedRecommendations = async (cartItems) => {
  const recommendations = [];
  const seenProducts = new Set(cartItems.map(item => item.product._id.toString()));
  
  for (const item of cartItems) {
    // 获取相似商品
    const similarProducts = await getSimilarProducts(item.product._id, 3);
    
    for (const product of similarProducts) {
      if (!seenProducts.has(product._id.toString())) {
        recommendations.push({
          type: 'related_product',
          productId: product._id,
          productName: product.name,
          price: product.price,
          similarityReason: `与"${item.product.name}"相似`,
          message: `您可能也喜欢：${product.name}`,
          severity: 'low',
          action: 'view_product'
        });
        
        seenProducts.add(product._id.toString());
        
        if (recommendations.length >= CART_OPTIMIZATION_CONFIG.RELATED_RECOMMENDATION.MAX_RELATED_ITEMS) {
          break;
        }
      }
    }
    
    if (recommendations.length >= CART_OPTIMIZATION_CONFIG.RELATED_RECOMMENDATION.MAX_RELATED_ITEMS) {
      break;
    }
  }
  
  return recommendations;
};

// 获取用户可能感兴趣的商品（简化实现）
const getSuggestedProductsForUser = async (userId, limit = 5) => {
  try {
    // 基于用户行为数据推荐
    const userActivities = await UserActivity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('product', 'name price category');
    
    const viewedCategories = new Set();
    const viewedProducts = new Set();
    
    userActivities.forEach(activity => {
      if (activity.product && activity.product.category) {
        viewedCategories.add(activity.product.category);
        viewedProducts.add(activity.product._id.toString());
      }
    });
    
    // 获取同类别商品
    if (viewedCategories.size > 0) {
      const suggestedProducts = await Product.find({
        category: { $in: Array.from(viewedCategories) },
        _id: { $nin: Array.from(viewedProducts) },
        isActive: true,
        stock: { $gt: 0 }
      })
      .select('name price image stock category')
      .limit(limit)
      .sort({ rating: -1, sales: -1 });
      
      return suggestedProducts;
    }
    
    // 如果没有浏览历史，返回热门商品
    return await Product.find({ 
      isActive: true, 
      stock: { $gt: 0 } 
    })
    .select('name price image stock category')
    .sort({ sales: -1, rating: -1 })
    .limit(limit);
    
  } catch (error) {
    console.error('获取推荐商品失败:', error);
    return [];
  }
};

// 获取相似商品（简化实现）
const getSimilarProducts = async (productId, limit = 3) => {
  try {
    const product = await Product.findById(productId);
    if (!product) return [];
    
    return await Product.find({
      category: product.category,
      _id: { $ne: productId },
      isActive: true,
      stock: { $gt: 0 }
    })
    .select('name price image stock')
    .limit(limit)
    .sort({ rating: -1, sales: -1 });
    
  } catch (error) {
    console.error('获取相似商品失败:', error);
    return [];
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  optimizeCart
};
