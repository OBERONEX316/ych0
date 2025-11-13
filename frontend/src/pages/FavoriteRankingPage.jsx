import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Heart, 
  Star, 
  ShoppingCart, 
  Award,
  Filter,
  Loader,
  Crown,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { productAPI } from '../services/api';

const FavoriteRankingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all'); // all, week, month
  const [category, setCategory] = useState('all');
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchPopularProducts();
  }, [timeRange, category]);

  const fetchPopularProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productAPI.getPopularProducts({
        limit: 50,
        timeRange,
        category: category !== 'all' ? category : undefined
      });
      
      if (response.success) {
        setProducts(response.data);
      } else {
        throw new Error(response.error || '获取热门商品失败');
      }
    } catch (err) {
      setError(err.message || '获取热门商品失败');
      console.error('Fetch popular products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!isAuthenticated) {
      alert('请先登录');
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

  const getRankBadge = (index) => {
    if (index === 0) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100' };
    if (index === 1) return { icon: Award, color: 'text-gray-500', bg: 'bg-gray-100' };
    if (index === 2) return { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' };
    return { icon: TrendingUpIcon, color: 'text-blue-500', bg: 'bg-blue-100' };
  };

  const formatNumber = (number) => {
    if (number >= 10000) {
      return (number / 10000).toFixed(1) + '万';
    }
    return number.toString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载热门商品中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">收藏排行榜</h1>
            <p className="text-sm text-gray-600">发现最受欢迎的热门商品</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            共 {products.length} 件热门商品
          </span>
        </div>
      </div>

      {/* 筛选面板 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          筛选条件
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部时间</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部分类</option>
              <option value="electronics">电子产品</option>
              <option value="clothing">服装</option>
              <option value="books">图书</option>
              <option value="home">家居</option>
              <option value="sports">运动</option>
            </select>
          </div>
        </div>
      </div>

      {/* 排行榜 */}
      <div className="grid gap-6">
        {products.map((product, index) => {
          const { icon: BadgeIcon, color, bg } = getRankBadge(index);
          
          return (
            <div key={product._id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-6">
                {/* 排名徽章 */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                  <BadgeIcon className={`h-6 w-6 ${color}`} />
                  <span className="text-sm font-bold text-gray-900">{index + 1}</span>
                </div>

                {/* 商品图片 */}
                <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 商品信息 */}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${product._id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors truncate">
                      {product.name}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-gray-600">
                        {formatNumber(product.favoriteCount || 0)} 人收藏
                      </span>
                    </div>
                    
                    {product.rating > 0 && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    
                    {product.sales > 0 && (
                      <div className="text-sm text-gray-600">
                        已售 {formatNumber(product.sales || 0)} 件
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {product.description || '暂无商品描述'}
                  </p>
                </div>

                {/* 价格和操作 */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-primary-600 mb-2">
                    ¥{product.price}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link
                      to={`/product/${product._id}`}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                    >
                      查看详情
                    </Link>
                    
                    <button
                      onClick={() => handleAddToCart(product._id)}
                      className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors text-sm"
                    >
                      加入购物车
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无热门商品</h3>
          <p className="text-gray-500">当前筛选条件下没有找到热门商品</p>
        </div>
      )}
    </div>
  );
};

export default FavoriteRankingPage;