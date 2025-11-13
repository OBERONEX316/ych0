import React, { useState, useEffect } from 'react';
import { Star, Heart, TrendingUp } from 'lucide-react';
import { userAPI } from '../services/api';

const PopularFavoritesPage = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPopularFavorites();
  }, []);

  const fetchPopularFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await userAPI.getPopularFavorites({ limit: 20 });
      
      if (response.success) {
        setPopularProducts(response.data);
      } else {
        throw new Error(response.error || '获取热门收藏失败');
      }
    } catch (err) {
      console.error('获取热门收藏失败:', err);
      setError(err.message || '获取热门收藏失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">加载失败</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchPopularFavorites}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-pink-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">热门收藏排行</h1>
        </div>
        <p className="text-gray-600 text-lg">
          发现最受用户喜爱的热门商品
        </p>
      </div>

      {/* 排行榜 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 表头 */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
            <div className="col-span-1">排名</div>
            <div className="col-span-5">商品信息</div>
            <div className="col-span-2 text-center">价格</div>
            <div className="col-span-2 text-center">评分</div>
            <div className="col-span-2 text-center">收藏数</div>
          </div>
        </div>

        {/* 商品列表 */}
        <div className="divide-y divide-gray-200">
          {popularProducts.map((product, index) => (
            <div key={product._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* 排名 */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {getRankBadge(index)}
                  </span>
                </div>

                {/* 商品信息 */}
                <div className="col-span-5">
                  <div className="flex items-center space-x-3">
                    <img
                      src={product.image || '/api/placeholder/60/60'}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        销量: {product.sales || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 价格 */}
                <div className="col-span-2 text-center">
                  <span className="text-lg font-bold text-green-600">
                    ¥{product.price}
                  </span>
                </div>

                {/* 评分 */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700">
                      {product.rating || '暂无评分'}
                    </span>
                  </div>
                </div>

                {/* 收藏数 */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Heart className="h-4 w-4 text-pink-500 fill-current" />
                    <span className="text-sm font-medium text-gray-700">
                      {product.favoriteCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {popularProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无收藏数据</h3>
              <p className="text-gray-600">还没有用户收藏商品，快去收藏你喜欢的商品吧！</p>
            </div>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {popularProducts.length}
          </div>
          <div className="text-blue-800 font-medium">上榜商品</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {popularProducts.reduce((sum, product) => sum + (product.favoriteCount || 0), 0)}
          </div>
          <div className="text-green-800 font-medium">总收藏数</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {popularProducts.length > 0 ? Math.max(...popularProducts.map(p => p.favoriteCount || 0)) : 0}
          </div>
          <div className="text-purple-800 font-medium">最高收藏</div>
        </div>
      </div>
    </div>
  );
};

export default PopularFavoritesPage;