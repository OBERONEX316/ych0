import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Package, Star, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { productAPI } from '../services/api';
import AdvancedSearch from '../components/AdvancedSearch';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const query = searchParams.get('q') || '';
  
  const { addToCart } = useCart();

  useEffect(() => {
    if (query.trim()) {
      performSearch(query, filters);
    } else {
      setProducts([]);
    }
  }, [query, filters]);

  const performSearch = async (searchQuery, currentFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      // 构建搜索参数
      const searchParams = new URLSearchParams();
      if (searchQuery) searchParams.set('search', searchQuery);
      
      // 添加筛选条件
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, value);
        }
      });

      const results = await productAPI.searchProducts(searchParams.toString());
      setProducts(results);
    } catch (err) {
      setError('搜索失败，请稍后重试');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const searchQuery = formData.get('search').trim();
    setSearchParams({ q: searchQuery });
  };

  const handleAddToCart = async (product) => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">商品搜索</h1>
          
          <AdvancedSearch
            onSearch={(searchQuery) => setSearchParams({ q: searchQuery })}
            onFilterChange={handleFilterChange}
            filters={filters}
          />
          
          {query && (
            <p className="text-gray-600 mt-4">
              搜索关键词: <span className="font-semibold">"{query}"</span>
              {products.length > 0 && (
                <span className="ml-2">找到 {products.length} 个结果</span>
              )}
            </p>
          )}
        </div>

        {/* Search Results */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && query && products.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关商品</h3>
            <p className="text-gray-600">请尝试不同的搜索关键词</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={`/product/${product._id}`}>
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </Link>
                
                <div className="p-4">
                  <Link to={`/product/${product._id}`}>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-primary-600">
                      ¥{product.price}
                    </span>
                    {product.rating > 0 && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {product.rating}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    加入购物车
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

export default SearchPage;