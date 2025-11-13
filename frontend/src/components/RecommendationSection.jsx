import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Heart } from 'lucide-react';
import ProductCard from './ProductCard';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendation } from '../contexts/RecommendationContext';

const RecommendationSection = ({ title, type = 'popular', productId, limit = 4, sectionId }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const [pageIndex, setPageIndex] = useState(0);
  const { markProductsAsDisplayed, getFilteredProducts } = useRecommendation();

  useEffect(() => {
    fetchRecommendations();
  }, [type, productId, isAuthenticated]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      
      switch (type) {
        case 'personalized':
          if (isAuthenticated) {
            response = await productAPI.getPersonalizedRecommendations({ limit });
          } else {
            // 未登录时降级到热门推荐
            response = await productAPI.getRecommendedProducts({ limit });
          }
          break;
        case 'related':
          response = await productAPI.getRelatedProducts(productId, { limit });
          break;
        case 'popular':
        default:
          response = await productAPI.getRecommendedProducts({ limit });
          break;
      }

      if (response.success) {
        const products = response.data || [];
        setAllProducts(products);
        
        // 过滤掉其他section已经显示的商品
        const uniqueProducts = getFilteredProducts(sectionId || type, products);
        setFilteredProducts(uniqueProducts);
        
        // 记录当前section显示的商品
        if (uniqueProducts.length > 0) {
          markProductsAsDisplayed(sectionId || type, uniqueProducts.map(p => p._id));
        }
        
        setPageIndex(0);
      } else {
        throw new Error(response.error || '获取推荐商品失败');
      }
    } catch (err) {
      console.error('获取推荐商品失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'personalized':
        return <Sparkles className="h-6 w-6" />;
      case 'related':
        return <TrendingUp className="h-6 w-6" />;
      case 'popular':
      default:
        return <Heart className="h-6 w-6" />;
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'personalized':
        return isAuthenticated 
          ? '根据您的浏览和购买记录为您精心挑选' 
          : '登录后查看个性化推荐';
      case 'related':
        return '与当前商品相似的其他选择';
      case 'popular':
      default:
        return '当前最受欢迎的热门商品';
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-gray-300 rounded mx-auto mb-4"></div>
              <div className="h-4 w-48 bg-gray-300 rounded mx-auto mb-8"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4">
                    <div className="h-48 bg-gray-300 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="h-10 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || filteredProducts.length === 0) {
    return null; // 出错或没有推荐商品时不显示
  }

  const start = (pageIndex * limit) % filteredProducts.length;
  const end = start + limit;
  const visible = end <= filteredProducts.length 
    ? filteredProducts.slice(start, end) 
    : [...filteredProducts.slice(start), ...filteredProducts.slice(0, end - filteredProducts.length)];

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary-100 p-2 rounded-full mr-3">
              {getIcon()}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          </div>
          <div className="flex items-center justify-center gap-4">
            <p className="text-lg text-gray-600">{getDescription()}</p>
            {filteredProducts.length > limit && (
              <button
                onClick={() => setPageIndex((p) => p + 1)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                换一批
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visible.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendationSection;
