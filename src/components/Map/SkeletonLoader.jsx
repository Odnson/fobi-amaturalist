import React from 'react';

export const SkeletonLoader = ({ count = 6 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div key={i} className="animate-pulse bg-[#2c2c2c] rounded-lg overflow-hidden">
      {/* Media preview skeleton */}
      <div className="w-full h-32 bg-[#333] relative">
        <div className="absolute top-1.5 left-1.5 w-14 h-4 bg-[#444] rounded"></div>
        <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#444] rounded-full"></div>
      </div>
      
      {/* Card info skeleton */}
      <div className="p-2">
        {/* Title */}
        <div className="h-3.5 bg-[#444] rounded w-4/5 mb-1.5"></div>
        {/* Subtitle */}
        <div className="h-2.5 bg-[#3a3a3a] rounded w-3/5 mb-2"></div>
        
        {/* Observer & date row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1 min-w-0">
            <div className="h-2.5 bg-[#3a3a3a] rounded w-2/3 mb-1"></div>
            <div className="h-2.5 bg-[#333] rounded w-1/2"></div>
          </div>
          {/* Navigation button */}
          <div className="ml-1 w-6 h-6 bg-[#444] rounded-full flex-shrink-0"></div>
        </div>
      </div>
    </div>
  ));
  
  return <div className="grid grid-cols-2 gap-2">{skeletons}</div>;
};

SkeletonLoader.displayName = 'SkeletonLoader';