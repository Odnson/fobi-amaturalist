import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../../context/UserContext';
import { apiFetch } from '../../utils/api';
import PropTypes from 'prop-types';
import AuthModal from '../Auth/AuthModal';
import FilterModal from '../Modals/FilterModal';

import { getImageUrl, normalizeScientificName, TAXONOMY_RANKS } from './utils';
import { 
  getTaxonomicLevel, 
  groupSuggestionsHierarchically, 
  formatDisplayName 
} from './taxonomyUtils';
import { 
  useHeaderState, 
  useSearchParams, 
  useSpeciesSearch, 
  useLocationSearch, 
  useNotifications,
  useUserSearch 
} from './hooks';
import { 
  DesktopNav, 
  UserMenu, 
  NotificationButton, 
  MobileControls 
} from './components';

const Header = ({ onSearch, setStats, onMapReset, onFilterChange, hasActiveExternalFilters }) => {
  const { user, setUser, updateTotalObservations } = useUser();
  const navigate = useNavigate();

  const headerState = useHeaderState();
  const searchParamsState = useSearchParams();
  const speciesSearchState = useSpeciesSearch();
  const locationSearchState = useLocationSearch();
  const notificationsState = useNotifications(user);
  const userSearchState = useUserSearch();

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const {
    isSidebarOpen,
    isSearchOpen,
    setIsSearchOpen,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    isCommunityDropdownOpen,
    setIsCommunityDropdownOpen,
    showNotifications,
    setShowNotifications,
    showAuthModal,
    setShowAuthModal,
    authModalTab,
    setAuthModalTab,
    dropdownRef,
    notificationRef,
    communityDropdownRef,
    toggleSidebar,
    toggleDropdown,
    toggleCommunityDropdown
  } = headerState;

  const {
    searchParams,
    setSearchParams,
    filterParams,
    setFilterParams,
    filterTab,
    setFilterTab,
    filterTaxaSearch,
    setFilterTaxaSearch,
    filterTaxaSuggestions,
    setFilterTaxaSuggestions,
    isLoadingFilterTaxa,
    setIsLoadingFilterTaxa,
    filterTaxaAbortRef,
    filterTaxaRequestIdRef,
    filterTaxaSuggestionRef,
    hasActiveFilters,
    resetFilters,
    handleGradeChange
  } = searchParamsState;

  const {
    speciesSuggestions,
    setSpeciesSuggestions,
    isLoadingSpecies,
    setIsLoadingSpecies,
    handleSpeciesSearch
  } = speciesSearchState;

  const {
    locationSuggestions,
    setLocationSuggestions,
    isLoadingLocation,
    handleLocationSearch
  } = locationSearchState;

  const {
    notifications,
    isLoading: isLoadingNotifications,
    unreadCount,
    handleMarkAsRead,
    handleMarkAllAsRead
  } = notificationsState;

  const {
    usernameSearch,
    setUsernameSearch,
    usernameResults,
    setUsernameResults,
    isLoadingUsers,
    hierarchySelections,
    setHierarchySelections,
    rankValues,
    setRankValues,
    rankSearches,
    setRankSearches,
    rankLoading,
    handleSearchUsers,
    fetchRankValues,
    handleRankSelect,
    handleRankSearch,
    resetUserSearch
  } = userSearchState;

  const userProfilePicture = (() => {
    const picFromContext = user?.profile_picture;
    if (picFromContext) return picFromContext;
    const lsPic = localStorage.getItem('profile_picture');
    return lsPic ? getImageUrl(lsPic) : null;
  })();

  const handleLogout = async () => {
    try {
      await apiFetch('/logout', { method: 'POST' });
      localStorage.clear();
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkUserAuth = () => {
    const token = localStorage.getItem('jwt_token');
    const storedProfilePic = localStorage.getItem('profile_picture');
    const storedUser = {
      id: localStorage.getItem('user_id'),
      uname: localStorage.getItem('username'),
      totalObservations: localStorage.getItem('totalObservations'),
      profile_picture: storedProfilePic ? getImageUrl(storedProfilePic) : null,
    };

    if (token && storedUser.id) {
      setUser(storedUser);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserAuth();
  }, [setUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        updateTotalObservations();
      }
    }, 30000);
  
    return () => clearInterval(interval);
  }, [user]);

  const fetchUnreadMessageCount = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;
      
      const response = await apiFetch('/messages/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUnreadMessageCount(data.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUnreadMessageCount();
      const interval = setInterval(fetchUnreadMessageCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleOpenAuthModal = (event) => {
      const { tab } = event.detail || {};
      setAuthModalTab(tab || 'login');
      setShowAuthModal(true);
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal);
    return () => window.removeEventListener('openAuthModal', handleOpenAuthModal);
  }, []);

  const handleSpeciesSelect = async (suggestion) => {
    try {
      const isSynonym = (suggestion?.full_data?.taxonomic_status || suggestion?.taxonomic_status) === 'SYNONYM';
      const acceptedName = suggestion?.full_data?.accepted_scientific_name || suggestion?.accepted_scientific_name;

      if (isSynonym && acceptedName) {
        try {
          setIsLoadingSpecies(true);
          const resp = await fetch(
            `${import.meta.env.VITE_API_URL}/species-suggestions?` +
            `query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true`
          );
          const respJson = await resp.json();
          if (respJson?.success && Array.isArray(respJson?.data) && respJson.data.length > 0) {
            const acceptedMatch = respJson.data.find(item =>
              (item.scientific_name === acceptedName) &&
              ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
            ) || respJson.data[0];
            if (acceptedMatch) {
              suggestion = acceptedMatch;
            }
          }
        } catch (e) {
          console.error('Header: Error fetching accepted taxon', e);
        } finally {
          setIsLoadingSpecies(false);
        }
      }

      const normalizedScientificName = normalizeScientificName(suggestion.scientific_name || '');
      const display = suggestion.display_name || formatDisplayName(suggestion, getTaxonomicLevel);

      const newSearchParams = {
        ...searchParams,
        search: normalizedScientificName,
        searchType: suggestion.rank,
        selectedId: suggestion.id,
        display
      };
      setSearchParams(newSearchParams);
      setSpeciesSuggestions([]);

      if (onFilterChange) {
        onFilterChange({
          taxa_id: suggestion.id,
          search: normalizedScientificName,
          searchType: suggestion.rank,
          data_source: ['fobi'],
          radius: searchParams.radius || 10,
          autoSubmit: true
        });
      }

      fetchFilteredStats({
        ...filterParams,
        ...newSearchParams,
        taxa_id: suggestion.id
      });

      if (onSearch) {
        onSearch(newSearchParams);
      }

      setIsSearchOpen(false);
    } catch (err) {
      console.error('Header: handleSpeciesSelect error', err);
    }
  };

  const handleFilterTaxaSearch = async (query, pageNum = 1) => {
    if (!query || query.length < 2) {
      setFilterTaxaSuggestions([]);
      return;
    }
    if (filterTaxaAbortRef.current) filterTaxaAbortRef.current.abort();
    filterTaxaAbortRef.current = new AbortController();
    const currentReqId = ++filterTaxaRequestIdRef.current;
    setIsLoadingFilterTaxa(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=20&include_all_taxa=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: filterTaxaAbortRef.current.signal
        }
      );
      if (currentReqId === filterTaxaRequestIdRef.current && response.ok) {
        const data = await response.json();
        if (data.success && data.data && currentReqId === filterTaxaRequestIdRef.current) {
          const grouped = groupSuggestionsHierarchically(data.data);
          setFilterTaxaSuggestions(grouped);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error filter taxa search:', error);
    } finally {
      if (currentReqId === filterTaxaRequestIdRef.current) setIsLoadingFilterTaxa(false);
    }
  };

  const handleFilterTaxaSelect = async (suggestion) => {
    const isSynonym = (suggestion?.full_data?.taxonomic_status || suggestion?.taxonomic_status) === 'SYNONYM';
    const acceptedName = suggestion?.full_data?.accepted_scientific_name || suggestion?.accepted_scientific_name;
    if (isSynonym && acceptedName) {
      try {
        setIsLoadingFilterTaxa(true);
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true`
        );
        const respJson = await resp.json();
        if (respJson?.success && Array.isArray(respJson?.data) && respJson.data.length > 0) {
          const accepted = respJson.data.find(item =>
            item.scientific_name === acceptedName && ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
          ) || respJson.data[0];
          if (accepted) suggestion = accepted;
        }
      } catch (e) { console.error('Error fetching accepted taxon:', e); }
      finally { setIsLoadingFilterTaxa(false); }
    }

    const normalized = normalizeScientificName(suggestion.scientific_name || '');
    const rank = suggestion.rank || 'species';
    const displayName = suggestion.common_name
      ? `${suggestion.scientific_name} (${suggestion.common_name})`
      : suggestion.scientific_name;

    setFilterTaxaSearch(displayName);
    setFilterTaxaSuggestions([]);
    const newFilterParams = {
      ...filterParams,
      taxonomy_rank: rank,
      taxonomy_value: normalized
    };
    setFilterParams(newFilterParams);

    if (onFilterChange) {
      onFilterChange({
        search: searchParams.search || '',
        location: searchParams.location || '',
        latitude: searchParams.latitude || null,
        longitude: searchParams.longitude || null,
        radius: searchParams.radius || 10,
        boundingbox: searchParams.boundingbox || null,
        grade: newFilterParams.grade || [],
        data_source: newFilterParams.data_source || ['fobi'],
        has_media: newFilterParams.has_media || false,
        media_type: newFilterParams.media_type || null,
        start_date: newFilterParams.start_date || null,
        end_date: newFilterParams.end_date || null,
        date_type: newFilterParams.date_type || 'created_at',
        user_id: newFilterParams.user_id || null,
        user_name: newFilterParams.user_name || null,
        taxonomy_rank: rank,
        taxonomy_value: normalized,
        autoSubmit: true
      });
    }

    if (onSearch) {
      onSearch({
        ...searchParams,
        ...newFilterParams,
        taxonomy_rank: rank,
        taxonomy_value: normalized,
        autoSubmit: true
      });
    }

    setIsSearchOpen(false);
  };

  const handleLocationSelectWrapper = (location) => {
    locationSearchState.handleLocationSelect(
      location, 
      searchParams, 
      setSearchParams, 
      onFilterChange, 
      fetchFilteredStats
    );
  };

  const handleSearch = () => {
    const combinedParams = {
      ...searchParams,
      ...filterParams,
      autoSubmit: true
    };

    if (onFilterChange) {
      onFilterChange({
        search: searchParams.search || '',
        location: searchParams.location || '',
        latitude: searchParams.latitude || null,
        longitude: searchParams.longitude || null,
        radius: searchParams.radius || 10,
        boundingbox: searchParams.boundingbox || null,
        grade: filterParams.grade || [],
        data_source: filterParams.data_source || ['fobi'],
        has_media: filterParams.has_media || false,
        media_type: filterParams.media_type || null,
        start_date: filterParams.start_date || null,
        end_date: filterParams.end_date || null,
        date_type: filterParams.date_type || 'created_at',
        user_id: filterParams.user_id || null,
        user_name: filterParams.user_name || null,
        taxonomy_rank: filterParams.taxonomy_rank || null,
        taxonomy_value: filterParams.taxonomy_value || null,
        autoSubmit: true
      });
    }

    if (onSearch) {
      onSearch(combinedParams);
    }

    setIsSearchOpen(false);
  };

  const handleReset = () => {
    resetFilters();
    resetUserSearch();

    if (onFilterChange) {
      onFilterChange({
        search: '',
        location: '',
        latitude: null,
        longitude: null,
        radius: 10,
        boundingbox: null,
        grade: [],
        data_source: ['fobi'],
        has_media: false,
        media_type: null,
        start_date: null,
        end_date: null,
        date_type: 'created_at',
        user_id: null,
        user_name: null,
        taxonomy_rank: null,
        taxonomy_value: null,
        reset: true
      });
    }

    if (onMapReset) {
      onMapReset();
    }
    
    setIsSearchOpen(false);
  };

  const fetchFilteredStats = async (params) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.search) {
        queryParams.append('search', params.search);
      }

      if (params.data_source && Array.isArray(params.data_source)) {
        params.data_source.forEach(source => {
          queryParams.append('data_source[]', source);
        });
      } else if (!queryParams.has('data_source[]')) {
        ['fobi'].forEach(source => {
          queryParams.append('data_source[]', source);
        });
      }

      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.date_type) queryParams.append('date_type', params.date_type);
      if (params.grade && params.grade.length > 0) {
        params.grade.forEach(g => queryParams.append('grade[]', g));
      }
      if (params.has_media) queryParams.append('has_media', params.has_media);
      if (params.media_type) queryParams.append('media_type', params.media_type);
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.taxonomy_rank) queryParams.append('taxonomy_rank', params.taxonomy_rank);
      if (params.taxonomy_value) queryParams.append('taxonomy_value', params.taxonomy_value);
      
      if (params.latitude) queryParams.append('latitude', params.latitude);
      if (params.longitude) queryParams.append('longitude', params.longitude);
      if (params.radius) queryParams.append('radius', params.radius);
      
      if (params.boundingbox && Array.isArray(params.boundingbox) && params.boundingbox.length === 4) {
        queryParams.append('min_lat', params.boundingbox[0]);
        queryParams.append('max_lat', params.boundingbox[1]);
        queryParams.append('min_lng', params.boundingbox[2]);
        queryParams.append('max_lng', params.boundingbox[3]);
      }

      console.log('Header: Fetching filtered stats with params:', queryParams.toString());
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParams}`);
      const data = await response.json();

      if (data.success && data.stats) {
        const validStats = {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };
        
        localStorage.setItem('currentStats', JSON.stringify(validStats));
        console.log('Header: Menyimpan stats ke localStorage:', validStats);
        
        if (setStats) {
          setStats(validStats);
        }
        
        return validStats;
      } else {
        console.error('Header: API returned error:', data.message || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
      return null;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (communityDropdownRef.current && !communityDropdownRef.current.contains(event.target)) {
        setIsCommunityDropdownOpen(false);
      }
      if (filterTaxaSuggestionRef.current && !filterTaxaSuggestionRef.current.contains(event.target)) {
        setFilterTaxaSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchParams.search && !searchParams.selectedId) {
        handleSpeciesSearch(searchParams.search, 1);
      } else if (!searchParams.search) {
        setSpeciesSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchParams.search, searchParams.selectedId]);

  useEffect(() => {
    if (searchParams.selectedId || hasActiveFilters()) {
      const combinedParams = {
        ...searchParams,
        ...filterParams
      };
      fetchFilteredStats(combinedParams);
    }
  }, [searchParams.selectedId]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-[#121212] shadow-md z-[55] h-14">
        <div className="w-full h-full px-4">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center h-full">
              <Link to="/" className="flex items-center mr-6">
                <div className="p-1 flex items-center justify-center">
                  <img src="/FOBI.png" alt="Logo" className="h-7" />
                </div>
              </Link>

              <DesktopNav
                communityDropdownRef={communityDropdownRef}
                isCommunityDropdownOpen={isCommunityDropdownOpen}
                toggleCommunityDropdown={toggleCommunityDropdown}
                setIsCommunityDropdownOpen={setIsCommunityDropdownOpen}
              />
            </div>

            <div className="hidden md:flex items-center">
              <Link
                to="/pilih-observasi"
                className="bg-[#1a73e8] text-white px-4 py-2 rounded-md hover:bg-[#0d47a1] text-sm font-medium transition duration-150 ease-in-out mr-4"
              >
                Observasi Baru
              </Link>

              <UserMenu
                user={user}
                userProfilePicture={userProfilePicture}
                isDropdownOpen={isDropdownOpen}
                toggleDropdown={toggleDropdown}
                dropdownRef={dropdownRef}
                handleLogout={handleLogout}
                setShowAuthModal={setShowAuthModal}
                setAuthModalTab={setAuthModalTab}
                setIsDropdownOpen={setIsDropdownOpen}
              />

              {user && (
                <div className="flex items-center space-x-4">
                  <NotificationButton
                    notificationRef={notificationRef}
                    showNotifications={showNotifications}
                    setShowNotifications={setShowNotifications}
                    notifications={notifications}
                    isLoading={isLoadingNotifications}
                    handleMarkAsRead={handleMarkAsRead}
                  />

                  <Link to="/messages" className="relative group">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-gray-400 group-hover:text-[#1a73e8] transition-colors text-xl"
                    />
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>

            <MobileControls
              setIsFilterModalOpen={setIsFilterModalOpen}
              toggleSidebar={toggleSidebar}
              hasActiveExternalFilters={hasActiveExternalFilters}
              hasActiveFilters={hasActiveFilters}
              unreadCount={unreadCount}
              unreadMessageCount={unreadMessageCount}
            />
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalTab}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        filterParams={filterParams}
        setFilterParams={setFilterParams}
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        speciesSuggestions={speciesSuggestions}
        isLoadingSpecies={isLoadingSpecies}
        handleSpeciesSearch={handleSpeciesSearch}
        handleSpeciesSelect={handleSpeciesSelect}
        locationSuggestions={locationSuggestions}
        isLoadingLocation={isLoadingLocation}
        handleLocationSearch={handleLocationSearch}
        handleLocationSelect={handleLocationSelectWrapper}
        filterTaxaSearch={filterTaxaSearch}
        setFilterTaxaSearch={setFilterTaxaSearch}
        filterTaxaSuggestions={filterTaxaSuggestions}
        isLoadingFilterTaxa={isLoadingFilterTaxa}
        handleFilterTaxaSearch={handleFilterTaxaSearch}
        handleFilterTaxaSelect={handleFilterTaxaSelect}
        filterTaxaSuggestionRef={filterTaxaSuggestionRef}
        usernameSearch={usernameSearch}
        usernameResults={usernameResults}
        isLoadingUsers={isLoadingUsers}
        handleSearchUsers={handleSearchUsers}
        hierarchySelections={hierarchySelections}
        rankValues={rankValues}
        rankSearches={rankSearches}
        rankLoading={rankLoading}
        handleRankSelect={(rank, value) => handleRankSelect(rank, value, setFilterParams)}
        handleRankSearch={handleRankSearch}
        fetchRankValues={fetchRankValues}
        handleGradeChange={handleGradeChange}
        handleSearch={handleSearch}
        handleReset={handleReset}
        onFilterChange={onFilterChange}
        TAXONOMY_RANKS={TAXONOMY_RANKS}
      />
    </>
  );
};

Header.propTypes = {
  onSearch: PropTypes.func,
  setStats: PropTypes.func,
  onMapReset: PropTypes.func,
  onFilterChange: PropTypes.func,
  hasActiveExternalFilters: PropTypes.bool
};

export default Header;
