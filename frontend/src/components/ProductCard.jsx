import React, { useState, useCallback, memo } from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useNavigate } from 'react-router-dom';

const ProductCard = memo(({ product }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const result = await addToCart(product._id, 1);
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
  }, [isAuthenticated, addToCart, product._id, navigate]);

  const handleToggleWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setWishlistLoading(true);
      const result = await toggleWishlist(product._id);
      if (result.success) {
        // 可以添加成功提示或toast通知
        console.log(result.message);
      } else {
        alert(result.error || '操作失败');
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      alert('操作失败，请稍后重试');
    } finally {
      setWishlistLoading(false);
    }
  }, [isAuthenticated, toggleWishlist, product._id, navigate]);

  return (
    <div className="card p-4 hover:shadow-lg transition-shadow duration-200">
      {/* Product Image */}
      <div className="relative mb-4">
        <Link to={`/product/${product._id}`}>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        </Link>
        <button 
          onClick={handleToggleWishlist}
          disabled={wishlistLoading}
          className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-colors ${
            isInWishlist(product._id) 
              ? 'bg-red-100 hover:bg-red-200' 
              : 'bg-white hover:bg-gray-100'
          }`}
        >
          <Heart 
            className={`h-5 w-5 ${
              isInWishlist(product._id) 
                ? 'text-red-600 fill-red-600' 
                : 'text-gray-600'
            }`} 
          />
        </button>
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <Link to={`/product/${product._id}`} className="block">
          <h3 className="font-semibold text-lg text-gray-900 truncate hover:text-primary-600 transition-colors cursor-pointer">{product.name}</h3>
        </Link>
        <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
        
        {/* Price and Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">¥{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">¥{product.originalPrice}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-yellow-500">★</span>
            <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
          </div>
        </div>

        {/* Sales and Stock */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>已售 {product.sales}</span>
          <span>库存 {product.stock}</span>
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={handleAddToCart}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>加入购物车</span>
        </button>
      </div>
    </div>
  );
});

// Default props for demonstration
ProductCard.defaultProps = {
  product: {
    _id: '1',
    name: '商品名称',
    description: '这是商品的详细描述，可以包含商品的特性和优势',
    price: '299.00',
    originalPrice: '399.00',
    image: 'https://via.placeholder.com/300x200?text=商品图片',
    rating: '4.8',
    sales: '1234',
    stock: '56'
  }
};

export default ProductCard;