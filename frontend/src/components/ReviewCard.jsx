import React, { useState } from 'react';
import { Star, ThumbsUp, User, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { reviewAPI } from '../services/api';

const ReviewCard = ({ review, onUpdate }) => {
  const { user } = useAuth();
  const [helpfulLoading, setHelpfulLoading] = useState(false);

  // 渲染评分星星
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  // 处理标记有帮助
  const handleMarkHelpful = async () => {
    if (!user) return;
    
    setHelpfulLoading(true);
    try {
      if (review.helpful.users.includes(user.id)) {
        await reviewAPI.unmarkHelpful(review._id);
      } else {
        await reviewAPI.markHelpful(review._id);
      }
      onUpdate?.();
    } catch (error) {
      console.error('标记评价失败:', error);
    } finally {
      setHelpfulLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* 评价头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            {review.user?.avatar ? (
              <img
                src={review.user.avatar}
                alt={review.user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User size={20} className="text-gray-400" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {review.user?.firstName && review.user?.lastName
                ? `${review.user.firstName} ${review.user.lastName}`
                : review.user?.username || '匿名用户'
              }
            </h4>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar size={14} />
              <span>{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>
        
        {/* 验证购买标识 */}
        {review.isVerifiedPurchase && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle size={16} className="mr-1" />
            已验证购买
          </div>
        )}
      </div>

      {/* 评分和标题 */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex">{renderStars(review.rating)}</div>
          <span className="text-lg font-semibold text-gray-900">{review.rating}.0</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{review.title}</h3>
      </div>

      {/* 评价内容 */}
      <p className="text-gray-600 mb-4 leading-relaxed">{review.comment}</p>

      {/* 评价图片 */}
      {review.images && review.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt="评价图片"
              className="w-full h-32 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {/* 有帮助按钮 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={handleMarkHelpful}
          disabled={helpfulLoading || !user}
          className={`flex items-center space-x-1 text-sm ${
            review.helpful.users.includes(user?.id)
              ? 'text-blue-600 hover:text-blue-700'
              : 'text-gray-500 hover:text-gray-700'
          } ${helpfulLoading ? 'opacity-50' : ''}`}
        >
          <ThumbsUp size={16} />
          <span>有帮助 ({review.helpful.count})</span>
        </button>
      </div>
    </div>
  );
};

export default ReviewCard;