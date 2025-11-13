import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, TrendingUp, Clock } from 'lucide-react';
import { productAPI } from '../services/api';

const AdvancedSearch = ({ onSearch, onFilterChange, filters }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    // 加载热门搜索
    const loadPopularSearches = async () => {
      try {
        const response = await productAPI.getPopularSearches();
        setPopularSearches(response.data || []);
      } catch (error) {
        console.error('Failed to load popular searches:', error);
      }
    };

    // 加载最近搜索
    const loadRecentSearches = () => {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setRecentSearches(recent);
    };

    loadPopularSearches();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 保存到最近搜索
      const updatedRecent = [
        searchQuery.trim(),
        ...recentSearches.filter(item => item !== searchQuery.trim())
      ].slice(0, 5);
      
      setRecentSearches(updatedRecent);
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
      
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      setShowSuggestions(true);
      // 这里可以添加实时搜索建议的逻辑
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
    
    // 保存到最近搜索
    const updatedRecent = [
      suggestion,
      ...recentSearches.filter(item => item !== suggestion)
    ].slice(0, 5);
    
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
  };

  const clearFilters = () => {
    onFilterChange({});
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchRef}
              type="text"
              placeholder="搜索商品名称、描述或标签..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {showSuggestions && (searchQuery.trim() || recentSearches.length > 0 || popularSearches.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchQuery.trim() && (
                  <div className="p-2 border-b border-gray-100">
                    <div className="text-sm text-gray-500 px-2 py-1">搜索 "{searchQuery}"</div>
                    <button
                      onClick={() => handleSuggestionClick(searchQuery)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-blue-600"
                    >
                      搜索: {searchQuery}
                    </button>
                  </div>
                )}
                
                {recentSearches.length > 0 && (
                  <div className="p-2 border-b border-gray-100">
                    <div className="flex items-center text-sm text-gray-500 px-2 py-1">
                      <Clock className="w-4 h-4 mr-2" />
                      最近搜索
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                )}
                
                {popularSearches.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center text-sm text-gray-500 px-2 py-1">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      热门搜索
                    </div>
                    {popularSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            高级筛选
          </button>
        </div>
      </form>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              价格范围
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最低价"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="最高价"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分
            </label>
            <select
              value={filters.minRating || ''}
              onChange={(e) => handleFilterChange('minRating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有评分</option>
              <option value="4">4星及以上</option>
              <option value="3">3星及以上</option>
              <option value="2">2星及以上</option>
              <option value="1">1星及以上</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              库存状态
            </label>
            <select
              value={filters.inStock || ''}
              onChange={(e) => handleFilterChange('inStock', e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有商品</option>
              <option value="true">仅显示有库存</option>
              <option value="false">仅显示无库存</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排序方式
            </label>
            <select
              value={filters.sortBy || ''}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">默认排序</option>
              <option value="price_asc">价格从低到高</option>
              <option value="price_desc">价格从高到低</option>
              <option value="rating_desc">评分最高</option>
              <option value="sales_desc">销量最高</option>
              <option value="createdAt_desc">最新上架</option>
            </select>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-800">
            当前筛选条件: {searchQuery && `搜索: "${searchQuery}"`}
            {filters.minPrice && ` 最低价: ¥${filters.minPrice}`}
            {filters.maxPrice && ` 最高价: ¥${filters.maxPrice}`}
            {filters.minRating && ` 评分: ${filters.minRating}星及以上`}
            {filters.inStock !== undefined && ` 库存: ${filters.inStock ? '有库存' : '无库存'}`}
            {filters.sortBy && ` 排序: ${{
              'price_asc': '价格从低到高',
              'price_desc': '价格从高到低',
              'rating_desc': '评分最高',
              'sales_desc': '销量最高',
              'createdAt_desc': '最新上架'
            }[filters.sortBy]}`}
          </span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <X className="w-4 h-4" />
            清除所有筛选
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;