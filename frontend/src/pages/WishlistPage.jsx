import React from 'react';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const WishlistPage = ({ onClose }) => {
  const { wishlist, loading, error, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleRemoveFromWishlist = async (productId) => {
    const result = await removeFromWishlist(productId);
    if (result.success) {
      // 可以添加成功提示
      console.log('已从心愿单移除');
    }
  };

  const handleClearWishlist = async () => {
    if (window.confirm('确定要清空心愿单吗？此操作不可撤销。')) {
      const result = await clearWishlist();
      if (result.success) {
        // 可以添加成功提示
        console.log('心愿单已清空');
      }
    }
  };

  const handleAddToCart = async (productId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const result = await addToCart(productId, 1);
      if (result.success) {
        alert('商品已成功添加到购物车！');
      } else {
        alert(result.error || '添加到购物车失败');
      }
    } catch (err) {
      console.error('Add to cart error:', err);
      alert('添加到购物车失败，请稍后重试');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">请先登录</h2>
            <p className="text-gray-600 mb-8">登录后即可查看和管理您的心愿单</p>
            <Link
              to="/login"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">我的心愿单</h1>
                <p className="text-gray-600 text-sm">
                  {wishlist.length} 件商品
                </p>
              </div>
            </div>
            
            {wishlist.length > 0 && (
              <button
                onClick={handleClearWishlist}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>清空心愿单</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wishlist.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">心愿单为空</h2>
            <p className="text-gray-600 mb-8">将喜欢的商品添加到心愿单，方便以后查看</p>
            <Link
              to="/"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              去购物
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item) => (
              <div key={item.product._id} className="card p-4 group">
                {/* Product Image */}
                <div className="relative mb-4">
                  <Link to={`/product/${item.product._id}`}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </Link>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromWishlist(item.product._id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <Link to={`/product/${item.product._id}`} className="block">
                    <h3 className="font-semibold text-gray-900 truncate hover:text-primary-600 transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>
                  
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {item.product.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary-600">
                      ¥{item.product.price}
                    </span>
                    {item.product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ¥{item.product.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(item.product._id)}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>加入购物车</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;