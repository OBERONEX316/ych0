import React, { createContext, useContext, useState, useCallback } from 'react';

const RecommendationContext = createContext();

export const useRecommendation = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendation must be used within a RecommendationProvider');
  }
  return context;
};

export const RecommendationProvider = ({ children }) => {
  const [displayedProducts, setDisplayedProducts] = useState(new Set());
  const [sectionProducts, setSectionProducts] = useState({});

  const markProductsAsDisplayed = useCallback((sectionId, productIds) => {
    setDisplayedProducts(prev => new Set([...prev, ...productIds]));
    setSectionProducts(prev => ({
      ...prev,
      [sectionId]: productIds
    }));
  }, []);

  const getFilteredProducts = useCallback((sectionId, products) => {
    // 获取其他section已经显示的商品ID
    const otherSectionProducts = new Set();
    Object.entries(sectionProducts).forEach(([id, productIds]) => {
      if (id !== sectionId) {
        productIds.forEach(pid => otherSectionProducts.add(pid));
      }
    });

    // 过滤掉其他section已经显示的商品
    return products.filter(product => !otherSectionProducts.has(product._id));
  }, [sectionProducts]);

  const resetDisplayedProducts = useCallback(() => {
    setDisplayedProducts(new Set());
    setSectionProducts({});
  }, []);

  const value = {
    displayedProducts,
    sectionProducts,
    markProductsAsDisplayed,
    getFilteredProducts,
    resetDisplayedProducts
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};