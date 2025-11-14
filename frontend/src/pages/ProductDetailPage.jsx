import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Truck, 
  Shield, 
  ArrowLeft,
  Plus,
  Minus,
  Package,
  MessageSquare,
  Edit3,
  ThumbsUp
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useReviews } from '../contexts/ReviewContext';
import { useWishlist } from '../contexts/WishlistContext';
import { productAPI, reviewAPI } from '../services/api';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import RecommendationSection from '../components/RecommendationSection';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { reviews, totalCount, getProductReviews, loading: reviewsLoading } = useReviews();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // 当商品加载完成时，检查是否已在心愿单中
  useEffect(() => {
    if (product && isAuthenticated) {
      setIsFavorite(isInWishlist(product._id));
    }
  }, [product, isAuthenticated, isInWishlist]);

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  useEffect(() => {
    if (product && showReviews) {
      getProductReviews(product._id);
      checkUserReview();
    }
  }, [product, showReviews]);

  const checkUserReview = async () => {
    if (isAuthenticated && user && product) {
      try {
        const response = await reviewAPI.getUserReviews(product._id);
        if (response.success) {
          setUserHasReviewed(response.data.length > 0);
        }
      } catch (error) {
        console.error('检查用户评价失败:', error);
      }
    }
  };

  const fetchProductDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productAPI.getProduct(id);
      if (response.success) {
        setProduct(response.data);
      } else {
        throw new Error(response.error || '商品不存在');
      }
    } catch (err) {
      setError(err.message || '获取商品详情失败');
      console.error('Product detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const result = await addToCart(product._id, quantity);
      if (result.success) {
        // 添加成功提示
        alert('商品已成功添加到购物车！');
      } else {
        alert(result.error || '添加到购物车失败');
      }
    } catch (err) {
      console.error('Add to cart error:', err);
      alert('添加到购物车失败，请稍后重试');
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 10)) {
      setQuantity(newQuantity);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const result = await toggleWishlist(product._id);
      if (result.success) {
        setIsFavorite(!isFavorite);
        // 可以添加成功提示或toast通知
      } else {
        alert(result.error || '操作失败');
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      alert('操作失败，请稍后重试');
    }
  };

  const handleReviewSubmit = () => {
    setShowReviewForm(false);
    setShowReviews(true);
    // 重新加载评价
    if (product) {
      getProductReviews(product._id);
      checkUserReview();
    }
  };

  const handleReviewCancel = () => {
    setShowReviewForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载商品详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">商品加载失败</h2>
          <p className="text-gray-600 mb-4">{error || '商品不存在'}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航返回 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* 商品图片 */}
            <div className="space-y-4">
              <div className="aspect-w-16 aspect-h-12 bg-gray-100 rounded-lg overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              {product.images && product.images.length > 0 && (
                <div className="flex space-x-2">
                  {product.images.map((img, i) => (
                    <img key={i} src={img} alt="thumb" onClick={() => setSelectedImage(i)} className="w-16 h-16 object-cover rounded border cursor-pointer" />
                  ))}
                </div>
              )}
              
              {/* 商品保障 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Truck className="h-4 w-4 text-green-600 mr-2" />
                  全场包邮
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-blue-600 mr-2" />
                  正品保障
                </div>
              </div>
            </div>

            {/* 商品信息 */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                
                {product.rating > 0 && (
                  <div className="flex items-center mb-4 space-x-4">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(product.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        {product.rating} 分
                      </span>
                    </div>
                    
                    {product.reviewCount > 0 && (
                      <button
                        onClick={() => setShowReviews(!showReviews)}
                        className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {product.reviewCount} 条评价
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-primary-600">
                    ¥{product.price}
                  </div>
                  
                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Heart 
                      className={`h-5 w-5 ${
                        isFavorite ? 'fill-current' : ''
                      }`} 
                    />
                  </button>
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-6">
                <h3 className="text-lg font-semibold mb-4">商品描述</h3>
                {product.descriptionHtml ? (
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
                ) : (
                  <p className="text-gray-600 leading-relaxed">{product.description || '暂无详细描述'}</p>
                )}
              </div>

              {/* 库存信息 */}
              <div className="text-sm text-gray-600">
                库存: {product.stock || 10} 件
              </div>

              {/* 购买操作 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">数量:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="p-2 text-gray-600 hover:text-primary-600 disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 text-lg font-medium w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="p-2 text-gray-600 hover:text-primary-600 disabled:opacity-50"
                      disabled={quantity >= (product.stock || 10)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    加入购物车
                  </button>
                  
                  <button className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors">
                    立即购买
                  </button>
                </div>
              </div>

              {/* 商品详情 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">商品详情</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• 品牌: {product.brand || '未知品牌'}</p>
                  <p>• 分类: {product.category || '未分类'}</p>
                  <p>• 商品ID: {product._id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 评价操作按钮 */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              商品评价
              {product.reviewCount > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({product.reviewCount} 条)
                </span>
              )}
            </h3>
            
            {isAuthenticated && !userHasReviewed && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                写评价
              </button>
            )}
          </div>

          {/* 评价表单 */}
          {showReviewForm && (
            <div className="mb-6">
              <ReviewForm
                productId={product._id}
                onSubmit={handleReviewSubmit}
                onCancel={handleReviewCancel}
              />
            </div>
          )}

          {/* 评价列表 */}
          {showReviews && product.reviewCount > 0 ? (
            <ReviewList productId={product._id} />
          ) : product.reviewCount === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">暂无评价</h4>
              <p className="text-gray-600 mb-4">成为第一个评价此商品的用户</p>
              {isAuthenticated && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  写评价
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowReviews(true)}
              className="w-full py-4 text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              查看全部评价
            </button>
          )}
        </div>

        {/* 相关商品推荐 */}
        {product && (
          <RecommendationSection 
            title="相关推荐"
            type="related"
            productId={product._id}
            limit={4}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
