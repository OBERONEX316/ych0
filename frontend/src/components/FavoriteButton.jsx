import React, { useState, useContext } from 'react';
import { Heart } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import ShareButton from './ShareButton';
import { useNavigate } from 'react-router-dom';

const FavoriteButton = ({ productId, isFavorite: initialIsFavorite, onToggle }) => {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      // 这里可以调用收藏API
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      
      if (onToggle) {
        onToggle(productId, newFavoriteState);
      }
      
      // 可以添加成功提示
      console.log(`商品已${newFavoriteState ? '收藏' : '取消收藏'}`);
    } catch (error) {
      console.error('收藏操作失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: '分享商品',
          text: '看看这个很棒的商品！',
          url: `${window.location.origin}/product/${productId}`,
        });
      } else {
        // 如果不支持Web Share API，复制链接到剪贴板
        const url = `${window.location.origin}/product/${productId}`;
        await navigator.clipboard.writeText(url);
        alert('链接已复制到剪贴板！');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleToggleFavorite}
        disabled={loading}
        className={`p-2 rounded-full transition-colors ${
          isFavorite
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={isFavorite ? '取消收藏' : '收藏商品'}
      >
        <Heart 
          className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} 
        />
      </button>
      
      <ShareButton productId={productId} />
    </div>
  );
};

export default FavoriteButton;