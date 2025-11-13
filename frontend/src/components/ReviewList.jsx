import React, { useState, useEffect } from 'react';
import { Star, Filter, SortAsc, SortDesc, Loader, AlertCircle } from 'lucide-react';
import ReviewCard from './ReviewCard';
import { reviewAPI } from '../services/api';

const ReviewList = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    rating: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 获取评价列表
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await reviewAPI.getProductReviews(productId, filters);
      
      if (filters.page === 1) {
        setReviews(response.data.reviews);
      } else {
        setReviews(prev => [...prev, ...response.data.reviews]);
      }
      
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('获取评价失败:', error);
      setError(error.response?.data?.error || '获取评价失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters.page, filters.rating, filters.sortBy, filters.sortOrder]);

  // 处理筛选变化
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // 重置页码
    }));
  };

  // 加载更多
  const handleLoadMore = () => {
    if (pagination.hasNext) {
      setFilters(prev => ({
        ...prev,
        page: prev.page + 1
      }));
    }
  };

  // 刷新评价列表
  const handleReviewUpdate = () => {
    fetchReviews();
  };

  // 渲染评分筛选器
  const renderRatingFilter = () => {
    const ratings = [5, 4, 3, 2, 1];
    
    return (
      <div className="flex items-center space-x-2">
        <Filter size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">评分:</span>
        <select
          value={filters.rating}
          onChange={(e) => handleFilterChange('rating', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部评分</option>
          {ratings.map(rating => (
            <option key={rating} value={rating}>
              {rating}星
            </option>
          ))}
        </select>
      </div>
    );
  };

  // 渲染排序选项
  const renderSortOptions = () => {
    const sortOptions = [
      { value: 'createdAt', label: '最新' },
      { value: 'rating', label: '评分' },
      { value: 'helpful.count', label: '有帮助' }
    ];

    return (
      <div className="flex items-center space-x-2">
        {filters.sortOrder === 'asc' ? (
          <SortAsc size={16} className="text-gray-500" />
        ) : (
          <SortDesc size={16} className="text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-700">排序:</span>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {filters.sortOrder === 'desc' ? <SortDesc size={16} /> : <SortAsc size={16} />}
        </button>
      </div>
    );
  };

  if (loading && filters.page === 1) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size={24} className="animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">加载评价中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <AlertCircle size={20} className="text-red-400 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选和排序 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {renderRatingFilter()}
        {renderSortOptions()}
        
        {/* 评价统计 */}
        {pagination.totalReviews > 0 && (
          <div className="text-sm text-gray-600 ml-auto">
            共 {pagination.totalReviews} 条评价
          </div>
        )}
      </div>

      {/* 评价列表 */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <Star size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无评价</h3>
          <p className="text-gray-500">成为第一个评价此商品的人</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard
              key={review._id}
              review={review}
              onUpdate={handleReviewUpdate}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {pagination.hasNext && (
        <div className="text-center pt-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 显示所有评价已加载 */}
      {!pagination.hasNext && reviews.length > 0 && (
        <div className="text-center text-gray-500 text-sm py-4">
          已显示所有评价
        </div>
      )}
    </div>
  );
};

export default ReviewList;