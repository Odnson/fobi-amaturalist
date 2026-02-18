import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBars } from '@fortawesome/free-solid-svg-icons';

const MobileControls = ({
  setIsFilterModalOpen,
  toggleSidebar,
  hasActiveExternalFilters,
  hasActiveFilters,
  unreadCount,
  unreadMessageCount
}) => {
  return (
    <div className="flex items-center space-x-3 md:hidden">
      <button 
        onClick={() => setIsFilterModalOpen(true)} 
        className="p-2 text-gray-400 relative"
      >
        <FontAwesomeIcon icon={faSearch} className="text-xl" />
        {(hasActiveExternalFilters || hasActiveFilters()) && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#1e1e1e]"></span>
        )}
      </button>
      <button onClick={toggleSidebar} className="p-2 text-gray-400 relative">
        <FontAwesomeIcon icon={faBars} className="text-xl" />
        {(unreadCount > 0 || unreadMessageCount > 0) && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e1e1e]"></span>
        )}
      </button>
    </div>
  );
};

export default MobileControls;
