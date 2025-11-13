import React, { useState } from 'react';
import { Star, X, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { reviewAPI } from '../services/api';

const ReviewForm = ({ product, onSubmit, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    images: []
  });

  const [hoverRating, setHoverRating] = useState(0);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理图片上传
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    // 这里简化处理，实际项目中应该上传到服务器
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));
  };

  // 移除图片
  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // 提交评价
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('请先登录后再评价');
      return;
    }

    if (formData.rating === 0) {
      setError('请选择评分');
      return;
    }

    if (!formData.title.trim() || !formData.comment.trim()) {
      setError('请填写评价标题和内容');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await reviewAPI.createReview({
        productId: product._id,
        rating: formData.rating,
        title: formData.title.trim(),
        comment: formData.comment.trim(),
        images: formData.images
      });

      onSubmit?.();
      
      // 重置表单
      setFormData({
        rating: 0,
        title: '',
        comment: '',
        images: []
      });
    } catch (error) {
      console.error('提交评价失败:', error);
      setError(error.response?.data?.error || '提交评价失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染评分星星
  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const ratingValue = index + 1;
      return (
        <label key={index}>
          <input
            type="radio"
            name="rating"
            value={ratingValue}
            onClick={() => setFormData(prev => ({ ...prev, rating: ratingValue }))}
            className="hidden"
          />
          <Star
            size={28}
            className={`cursor-pointer transition-colors ${
              ratingValue <= (hoverRating || formData.rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
            onMouseEnter={() => setHoverRating(ratingValue)}
            onMouseLeave={() => setHoverRating(0)}
          />
        </label>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        评价 {product.name}
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-center">
            <AlertCircle size={16} className="text-red-400 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 评分 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            评分 *
          </label>
          <div className="flex items-center space-x-1">
            {renderStars()}
            <span className="ml-2 text-gray-600">
              {formData.rating > 0 ? `${formData.rating}.0 星` : '请选择评分'}
            </span>
          </div>
        </div>

        {/* 评价标题 */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            评价标题 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="请输入评价标题"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={100}
          />
        </div>

        {/* 评价内容 */}
        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            评价内容 *
          </label>
          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleInputChange}
            rows={4}
            placeholder="请分享您的使用体验..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            maxLength={1000}
          />
          <div className="text-xs text-gray-500 text-right mt-1">
            {formData.comment.length}/1000
          </div>
        </div>

        {/* 图片上传 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上传图片（可选）
          </label>
          <div className="flex items-center space-x-2">
            <label className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
              <Upload size={16} className="mr-2" />
              选择图片
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-500">最多5张图片</span>
          </div>

          {/* 预览图片 */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt="预览"
                    className="w-full h-20 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 按钮组 */}
        <div className="flex items-center justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={loading || formData.rating === 0 || !formData.title.trim() || !formData.comment.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '提交中...' : '提交评价'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;