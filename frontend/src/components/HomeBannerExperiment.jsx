import React from 'react';
import useExperiment from '../hooks/useExperiment';

const HomeBannerExperiment = () => {
  const { variant, track } = useExperiment('home_banner');
  return (
    <div className="p-6 rounded-lg border bg-white">
      {variant === 'A' ? (
        <div className="text-center">
          <h2 className="text-xl font-bold">限时优惠 A</h2>
          <p className="text-gray-600">立即选购，享受专属折扣</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={()=>track('click')}>立即购买</button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-bold">新品首发 B</h2>
          <p className="text-gray-600">体验最新科技产品</p>
          <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded" onClick={()=>track('click')}>马上体验</button>
        </div>
      )}
    </div>
  );
};

export default HomeBannerExperiment;