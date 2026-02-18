import React from 'react';

export const StatsBar = ({ stats }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-[#5f8b8b] text-white p-2 flex justify-center items-center gap-4 z-[1001] text-sm">
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.observasi || 0}</span>
        <span>OBSERVASI</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.taksa || 0}</span>
        <span>TAKSA</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold">{stats.media || 0}</span>
        <span>MEDIA</span>
      </div>
    </div>
  );
}; 