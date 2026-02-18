import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faStar, faComments } from '@fortawesome/free-solid-svg-icons';

const DesktopNav = ({ 
  communityDropdownRef, 
  isCommunityDropdownOpen, 
  toggleCommunityDropdown,
  setIsCommunityDropdownOpen 
}) => {
  return (
    <nav className="hidden md:flex h-full">
      <ul className="flex space-x-6 h-full">
        <li className="flex items-center">
          <Link to="/" className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm">
            Jelajahi
          </Link>
        </li>
        <li className="flex items-center">
          <Link to="/bantu-ident" className="text-gray-300 hover:text-[#1a73e8] transition-colors text-sm">
            Bantu Ident
          </Link>
        </li>
        <li className="flex items-center relative" ref={communityDropdownRef}>
          <button 
            onClick={toggleCommunityDropdown}
            className="flex items-center gap-1 text-gray-300 hover:text-[#1a73e8] transition-colors text-sm"
          >
            Komunitas
            <FontAwesomeIcon icon={isCommunityDropdownOpen ? faChevronUp : faChevronDown} className="text-xs" />
          </button>
          {isCommunityDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-lg py-2 z-50">
              <Link 
                to="/leaderboard" 
                className="block px-4 py-2 text-gray-300 hover:text-[#1a73e8] hover:bg-[#2a2a2a] transition-colors text-sm"
                onClick={() => setIsCommunityDropdownOpen(false)}
              >
                <FontAwesomeIcon icon={faStar} className="mr-2" />
                Leaderboard
              </Link>
              <Link 
                to="/forum" 
                className="block px-4 py-2 text-gray-300 hover:text-[#1a73e8] hover:bg-[#2a2a2a] transition-colors text-sm"
                onClick={() => setIsCommunityDropdownOpen(false)}
              >
                <FontAwesomeIcon icon={faComments} className="mr-2" />
                Forum
              </Link>
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default DesktopNav;
