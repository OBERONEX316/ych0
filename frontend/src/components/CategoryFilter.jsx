import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';

const CategoryFilter = ({ selectedCategory, onCategoryChange, onFilterChange, filters = {} }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice || '');
  
  // 使用父组件传递的筛选状态，如果没有则使用默认值
  const currentFilters = {
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    inStock: filters.inStock || false,
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc'
  };

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await productAPI.getCategories();
        if (response.success) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('获取分类列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...currentFilters, [key]: value };
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    onFilterChange(defaultFilters);
    onCategoryChange('');
  };

  // 同步父组件的筛选状态到本地状态
  useEffect(() => {
    setLocalMinPrice(filters.minPrice || '');
    setLocalMaxPrice(filters.maxPrice || '');
  }, [filters.minPrice, filters.maxPrice]);

  // 处理价格变化
  const handlePriceChange = (key, value) => {
    if (key === 'minPrice') {
      setLocalMinPrice(value);
    } else if (key === 'maxPrice') {
      setLocalMaxPrice(value);
    }
  };

  // 应用价格筛选
  const applyPriceFilter = (e) => {
    // 阻止默认行为和事件冒泡，避免页面滚动到顶部
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newFilters = { 
      ...currentFilters, 
      minPrice: localMinPrice, 
      maxPrice: localMaxPrice 
    };
    onFilterChange(newFilters);
  };

  const getCategoryName = (category) => {
    const categoryNames = {
      'electronics': '电子产品',
      'clothing': '服装服饰',
      'books': '图书文具',
      'home': '家居生活',
      'sports': '运动户外',
      'beauty': '美妆个护'
    };
    return categoryNames[category] || category;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">商品筛选</h3>
        <button
          onClick={handleClearFilters}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 font-medium cursor-pointer transition-colors"
        >
          清除筛选
        </button>
      </div>

      {/* 分类筛选 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">商品分类</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="category"
              value=""
              checked={selectedCategory === ''}
              onChange={() => onCategoryChange('')}
              className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">全部商品</span>
          </label>
          
          {loading ? (
            <div className="text-sm text-gray-500">加载中...</div>
          ) : (
            categories.map(category => (
              <label key={category} className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={selectedCategory === category}
                  onChange={() => onCategoryChange(category)}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {getCategoryName(category)}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* 价格筛选 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">价格范围</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">最低价</label>
            <input
              type="number"
              placeholder="0"
              value={localMinPrice}
              onChange={(e) => handlePriceChange('minPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">最高价</label>
            <input
              type="number"
              placeholder="9999"
              value={localMaxPrice}
              onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <button
          onClick={applyPriceFilter}
          className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
        >
          应用价格筛选
        </button>
      </div>

      {/* 库存筛选 */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={currentFilters.inStock}
            onChange={(e) => handleFilterChange('inStock', e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">仅显示有库存</span>
        </label>
      </div>

      {/* 排序选项 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">排序方式</h4>
        <select
          value={`${currentFilters.sortBy}-${currentFilters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            // 同时更新 sortBy 和 sortOrder
            const newFilters = { ...currentFilters, sortBy, sortOrder };
            onFilterChange(newFilters);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="createdAt-desc">最新上架</option>
          <option value="price-asc">价格从低到高</option>
          <option value="price-desc">价格从高到低</option>
          <option value="rating-desc">评分最高</option>
          <option value="sales-desc">销量最高</option>
        </select>
      </div>

      {/* 筛选结果统计 */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          当前筛选: {selectedCategory ? getCategoryName(selectedCategory) : '全部商品'}
          {currentFilters.minPrice && `, 最低¥${currentFilters.minPrice}`}
          {currentFilters.maxPrice && `, 最高¥${currentFilters.maxPrice}`}
          {currentFilters.inStock && ', 仅库存'}
        </p>
      </div>
    </div>
  );
};

export default CategoryFilter;