import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faUser, 
  faList, 
  faStar, 
  faMicroscope, 
  faComments, 
  faSignOutAlt,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';
import { getInitials, getAvatarColor } from '../utils';

const UserMenu = ({ 
  user, 
  userProfilePicture, 
  isDropdownOpen, 
  toggleDropdown, 
  dropdownRef, 
  handleLogout,
  setShowAuthModal,
  setAuthModalTab,
  setIsDropdownOpen
}) => {
  if (user) {
    return (
      <div className="relative mr-4" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex items-center space-x-2 cursor-pointer"
        >
          {userProfilePicture ? (
            <img
              src={userProfilePicture}
              alt="User Avatar"
              className="w-7 h-7 rounded-full object-cover border border-[#444]"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs border border-[#444]"
            style={{ 
              backgroundColor: getAvatarColor(user?.uname),
              display: userProfilePicture ? 'none' : 'flex'
            }}
          >
            {getInitials(user?.uname)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-300">{user.uname}</span>
            <span className="text-xs text-gray-400">{user.totalObservations} Observasi</span>
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-[#2c2c2c] rounded-lg shadow-lg py-2 z-50">
            <Link
              to={`/profile/${user.id}/dashboard`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faTachometerAlt} className="mr-3 w-4" />
              Dashboard
            </Link>
            <Link
              to={`/profile/${user.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faUser} className="mr-3 w-4" />
              Profil Saya
            </Link>
            <Link
              to={`/profile/${user.id}/observasi`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faList} className="mr-3 w-4" />
              Observasi Saya
            </Link>
            <Link
              to={`/profile/${user.id}/taksa`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faStar} className="mr-3 w-4" />
              Taksa Favorit
            </Link>
            <Link
              to={`/profile/${user.id}/spesies`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faMicroscope} className="mr-3 w-4" />
              Spesies
            </Link>
            <Link
              to={`/profile/${user.id}/identifikasi`}
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
            >
              <FontAwesomeIcon icon={faComments} className="mr-3 w-4" />
              Identifikasi
            </Link>
            <div className="border-t border-[#444] my-2"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] flex items-center"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-[#1a73e8]"
      >
        <FontAwesomeIcon icon={faUserCircle} className="text-xl" />
        <span className="text-[12px]">Masuk/Daftar</span>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#2c2c2c] rounded-lg shadow-lg py-2 z-50">
          <button
            onClick={() => {
              setAuthModalTab('login');
              setShowAuthModal(true);
              setIsDropdownOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
          >
            Login
          </button>
          <button
            onClick={() => {
              setAuthModalTab('register');
              setShowAuthModal(true);
              setIsDropdownOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
          >
            Daftar
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
