import { useState, useRef } from 'react';

export const useHeaderState = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCommunityDropdownOpen, setIsCommunityDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);
  const communityDropdownRef = useRef(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleCommunityDropdown = () => setIsCommunityDropdownOpen(!isCommunityDropdownOpen);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    isSearchOpen,
    setIsSearchOpen,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    isCommunityDropdownOpen,
    setIsCommunityDropdownOpen,
    showNotifications,
    setShowNotifications,
    showMobileNotifications,
    setShowMobileNotifications,
    showAuthModal,
    setShowAuthModal,
    authModalTab,
    setAuthModalTab,
    dropdownRef,
    notificationRef,
    mobileNotificationRef,
    communityDropdownRef,
    toggleSidebar,
    toggleProfileMenu,
    toggleSearch,
    toggleDropdown,
    toggleCommunityDropdown
  };
};

export default useHeaderState;
