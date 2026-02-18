import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEllipsisV, faSync, faArrowLeft, faChevronUp, faChevronDown, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import { useNavigate } from 'react-router-dom';
import { MediaSlider } from './MediaSlider';
import { queueLocationName } from '../../utils/geocoding';
import { apiFetch } from '../../utils/api';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { debounce } from 'lodash';
import { SkeletonLoader } from './SkeletonLoader';
const ITEMS_PER_PAGE = 10; // 10 item per halaman (5 baris x 2 kolom)
const BATCH_SIZE = 2; 
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;
const getGradeDisplay = (grade) => {
  if (!grade) return 'Bantu Iden';
  const g = grade.toLowerCase();
  if (g === 'research grade') return 'ID Lengkap';
  if (g === 'confirmed id') return 'ID Terkonfirmasi';
  if (g === 'needs id') return 'Bantu Iden';
  if (g === 'low quality id') return 'ID Kurang';
  return grade;
};
const getGradeBadgeClass = (grade) => {
  if (!grade) return 'bg-yellow-500/70';
  const g = grade.toLowerCase();
  if (g === 'research grade') return 'bg-blue-500/70';
  if (g === 'confirmed id') return 'bg-green-500/70';
  if (g === 'needs id') return 'bg-yellow-500/70';
  if (g === 'low quality id') return 'bg-orange-500/70';
  return 'bg-gray-500/70';
};
const locationCache = {};

export const Sidebar = React.memo(({ data, onClose, onLoadMore, setStats }) => {
  const { selectedGrid, species, currentPage, loading, error, checklist } = data;
  const paginatedData = useMemo(() => {
    return selectedGrid?.data?.slice(0, currentPage * ITEMS_PER_PAGE) || [];
  }, [selectedGrid, currentPage]);
  const dynamicStats = useMemo(() => {
    const allData = selectedGrid?.data || [];
    const totalObs = allData.length;
    const sources = {};
    allData.forEach(item => {
      const src = item.source?.includes('fobi') ? 'fobi' : 
                  item.source?.includes('burungnesia') ? 'burungnesia' : 
                  item.source?.includes('kupunesia') ? 'kupunesia' : 'lainnya';
      sources[src] = (sources[src] || 0) + 1;
    });
    return { totalObs, sources };
  }, [selectedGrid?.data]);

  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [locationNames, setLocationNames] = useState({});
  const [itemData, setItemData] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  const loadedMediaCount = useMemo(() => {
    let count = 0;
    Object.values(itemData).forEach(d => {
      count += (d.media?.length || 0) + (d.sounds?.length || 0);
    });
    return count;
  }, [itemData]);
  const [retryCount, setRetryCount] = useState({});
  const [fetchQueue, setFetchQueue] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [locationQueue, setLocationQueue] = useState([]);
  const [processingLocation, setProcessingLocation] = useState(false);
  const scrollContainerRef = useRef(null);
  const lastSentStatsRef = useRef('');
  useEffect(() => {
    if (!setStats || !selectedGrid?.data?.length) return;
    
    const speciesSet = new Set();
    Object.values(itemData).forEach(d => {
      (d.species || []).forEach(s => {
        if (s.nameLat) speciesSet.add(s.nameLat);
      });
    });
    
    const newStats = {
      observasi: selectedGrid.data.length,
      taksa: data.totalUniqueSpecies || speciesSet.size,
      media: loadedMediaCount
    };
    const key = `${newStats.observasi}_${newStats.taksa}_${newStats.media}`;
    if (key !== lastSentStatsRef.current) {
      lastSentStatsRef.current = key;
      setStats(newStats);
    }
  }, [selectedGrid?.data?.length, itemData, loadedMediaCount, setStats, data.totalUniqueSpecies]);
  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?data_source[]=fobi&data_source[]=burungnesia&data_source[]=kupunesia`);
      const data = await response.json();
      if (data.success) {
        return {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  };
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      fetchStats().then(stats => {
        if (stats) {
          setTimeout(() => {
            onClose(stats);
          }, 100);
        }
      });
    }
  }, [onClose]);
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 200;
    const shouldLoadMore = scrollHeight - scrollTop - threshold <= clientHeight;
    
    if (shouldLoadMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [loading, onLoadMore]);
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.paddingBottom = '0';
    }
  }, [paginatedData]);

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  const handleImageClick = (index, e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === index ? null : index);
  };
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Tanggal tidak tersedia';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  }, []);
  const handleLogoClick = useCallback((item, newTab = true) => {
    let prefix = '';
    let url;
    const baseId = item.id
      .replace(/^(fobi_[bkt]_)/, '')
      .replace(/^(brn_|kpn_)/, '');
    if (item.source === 'burungnesia' || item.source === 'burungnesia_fobi' || item.id.startsWith('fobi_b_')) {
        prefix = 'BN';
    } else if (item.source === 'kupunesia' || item.source === 'kupunesia_fobi' || item.id.startsWith('fobi_k_')) {
        prefix = 'KP';
    }
    if (item.source === 'taxa_fobi' || item.id.startsWith('fobi_t_')) {
        url = `/observations/${baseId}`;
    } else if (item.source?.includes('fobi')) {
        url = `/detail-checklist/${prefix}${baseId}`;
    } else {
        url = `/app-checklist/${prefix}${baseId}`;
    }

    if (newTab) {
        window.open(url, '_blank');
    } else {
        navigate(url);
        onClose();
    }
  }, [navigate, onClose]);
  const refreshItem = useCallback((item) => {
    if (!item || !item.id) return;
    const rawId = item.checklist_id || item.id;
    let endpoint = '';
    
    if (item.source?.includes('burungnesia')) {
      endpoint = `/grid-species/brn_${rawId}`;
    } else if (item.source?.includes('kupunesia')) {
      endpoint = `/grid-species/kpn_${rawId}`;
    } else if (item.source?.includes('fobi')) {
      const sourceType = item.source.includes('burungnesia') ? 'burungnesia_fobi' : 
                        item.source.includes('kupunesia') ? 'kupunesia_fobi' : 'taxa_fobi';
      
      const fobiId = item.id.startsWith('fobi_') ? item.id : 
                    item.source.includes('burungnesia') ? `fobi_b_${rawId}` : 
                    item.source.includes('kupunesia') ? `fobi_k_${rawId}` : `fobi_t_${rawId}`;
      
      endpoint = `/fobi-species/${fobiId}/${sourceType}`;
    }
    
    if (endpoint) {
      const cacheKey = `species_${endpoint}`;
      localStorage.removeItem(cacheKey);
    }
    setItemData(prev => {
      const newState = { ...prev };
      delete newState[item.id];
      return newState;
    });
    setLoadingItems(prev => ({
      ...prev,
      [item.id]: false
    }));
    setRetryCount(prev => {
      const newState = { ...prev };
      delete newState[item.id];
      return newState;
    });
    setFetchQueue(prev => [...prev, item]);
  }, []);
  const fetchItemData = useCallback(async (item, retry = 0) => {
    if (!item || !item.id || itemData[item.id]) return;
    
    try {
      setLoadingItems(prev => ({ ...prev, [item.id]: true }));
      
      const rawId = item.checklist_id || item.id;
      let endpoint = '';
      let sourceType = '';
      if (item.source?.includes('fobi')) {
        if (item.source.includes('burungnesia')) {
          sourceType = 'burungnesia_fobi';
        } else if (item.source.includes('kupunesia')) {
          sourceType = 'kupunesia_fobi';
        } else {
          sourceType = 'taxa_fobi';
        }
        let fobiId = rawId;
        if (!fobiId.startsWith('fobi_')) {
          if (sourceType === 'burungnesia_fobi') {
            fobiId = `fobi_b_${rawId}`;
          } else if (sourceType === 'kupunesia_fobi') {
            fobiId = `fobi_k_${rawId}`;
          } else {
            fobiId = `fobi_t_${rawId}`;
          }
        }
        
        endpoint = `/fobi-species/${fobiId}/${sourceType}`;
      } else if (item.source?.includes('burungnesia')) {
        endpoint = `/grid-species/brn_${rawId}`;
      } else if (item.source?.includes('kupunesia')) {
        endpoint = `/grid-species/kpn_${rawId}`;
      }
      
      if (!endpoint) return;
      const cacheKey = `species_${endpoint}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          const isFobiSource = item.source?.includes('fobi');
          if (isFobiSource && parsedData.grade === undefined) {
            localStorage.removeItem(cacheKey);
          } else {
            setItemData(prev => ({
              ...prev,
              [item.id]: parsedData
            }));
            setLoadingItems(prev => ({ ...prev, [item.id]: false }));
            return;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
      
      const response = await apiFetch(endpoint);
      const responseData = await response.json();
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }
      let normalizedData = {
        checklist: {},
        species: [],
        media: [],
        sounds: []
      };
      const mediaItems = Array.isArray(responseData.media) ? responseData.media : [];
      const soundItems = Array.isArray(responseData.sounds) ? responseData.sounds : [];
      if (item.source?.includes('fobi')) {
        if (Array.isArray(responseData.species)) {
          normalizedData.species = responseData.species.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          normalizedData.checklist = responseData.checklist || {};
        } 
        else if (Array.isArray(responseData)) {
          normalizedData.species = responseData.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          normalizedData.checklist = {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
        else if (responseData.data && Array.isArray(responseData.data)) {
          normalizedData.species = responseData.data.map(s => ({
            nameLat: s.scientific_name || s.nameLat,
            nameId: s.common_name || s.nameId,
            count: s.count || 1,
            id: s.id
          }));
          normalizedData.checklist = responseData.checklist || {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
        else {
          normalizedData.species = [];
          normalizedData.checklist = {
            id: item.id,
            observer: item.observer || 'Tidak diketahui',
            date: item.date || null,
            latitude: item.latitude,
            longitude: item.longitude
          };
        }
      } else {
        normalizedData.checklist = responseData.checklist || {};
        normalizedData.species = Array.isArray(responseData.species) ? responseData.species : [];
      }
      normalizedData.media = mediaItems;
      normalizedData.sounds = soundItems;
      normalizedData.grade = responseData.grade || null;
      localStorage.setItem(cacheKey, JSON.stringify(normalizedData));
      setItemData(prev => ({
        ...prev,
        [item.id]: normalizedData
      }));
      setLoadingItems(prev => ({
        ...prev,
        [item.id]: false
      }));
      setRetryCount(prev => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });
      
    } catch (error) {
      console.error('Error fetching item data:', error);
      const currentRetry = retryCount[item.id] || 0;
      setRetryCount(prev => ({
        ...prev,
        [item.id]: currentRetry + 1
      }));
      if (currentRetry < MAX_RETRIES) {
        console.log(`Retrying fetch for item ${item.id}, attempt ${currentRetry + 1}`);
        const backoffTime = Math.pow(2, currentRetry) * 1000; // Exponential backoff
        
        setTimeout(() => {
          setFetchQueue(prev => [...prev, item]);
        }, backoffTime);
      } else {
        setLoadingItems(prev => ({ ...prev, [item.id]: false }));
      }
    }
  }, [itemData, retryCount]);
  useEffect(() => {
    if (paginatedData && paginatedData.length > 0) {
      paginatedData.forEach((item, index) => {
        const lat = item.latitude;
        const lng = item.longitude;
        
        if (!lat || !lng) return;
        const cacheKey = `${lat},${lng}`;
        
        if (locationCache[cacheKey]) {
          setLocationNames(prev => ({
            ...prev,
            [index]: locationCache[cacheKey]
          }));
          return;
        }
        const storedLocation = localStorage.getItem(`location_${cacheKey}`);
        if (storedLocation) {
          locationCache[cacheKey] = storedLocation;
          setLocationNames(prev => ({
            ...prev,
            [index]: storedLocation
          }));
          return;
        }
        setLocationQueue(prev => {
          if (prev.some(item => item.index === index)) return prev;
          return [...prev, { lat, lng, index }];
        });
      });
    }
  }, [paginatedData]);
  useEffect(() => {
    const processLocationQueue = async () => {
      if (locationQueue.length === 0 || processingLocation) return;
      
      setProcessingLocation(true);
      const [item, ...rest] = locationQueue;
      setLocationQueue(rest);
      
      try {
        const locationName = await queueLocationName(item.lat, item.lng, 'id');
        locationCache[`${item.lat},${item.lng}`] = locationName;
        try {
          localStorage.setItem(`location_${item.lat},${item.lng}`, locationName);
        } catch (e) {
          console.warn('Failed to cache location:', e);
        }
        
        setLocationNames(prev => ({
          ...prev,
          [item.index]: locationName
        }));
      } catch (error) {
        console.error('Error fetching location name:', error);
      } finally {
        setProcessingLocation(false);
        if (locationQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    processLocationQueue();
  }, [locationQueue, processingLocation]);
  useEffect(() => {
    if (paginatedData && paginatedData.length > 0) {
      const itemsToFetch = paginatedData.filter(
        item => !itemData[item.id] && !loadingItems[item.id]
      );
      
      if (itemsToFetch.length > 0) {
        setFetchQueue(prev => [...prev, ...itemsToFetch]);
      }
    }
  }, [paginatedData, itemData, loadingItems]);
  useEffect(() => {
    const processFetchQueue = async () => {
      if (fetchQueue.length === 0 || isFetching) return;
      
      setIsFetching(true);
      
      try {
        const batch = fetchQueue.slice(0, BATCH_SIZE);
        setFetchQueue(prev => prev.slice(BATCH_SIZE));
        await Promise.all(batch.map(item => fetchItemData(item)));
        if (fetchQueue.length > BATCH_SIZE) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      } finally {
        setIsFetching(false);
      }
    };
    
    processFetchQueue();
  }, [fetchQueue, isFetching, fetchItemData]);
  const renderObservationCard = useCallback((item, index) => {
    const isItemLoading = loadingItems[item.id] || false;
    const itemDataValue = itemData[item.id] || {};
    const checklistData = itemDataValue.checklist || {};
    const mediaData = itemDataValue.media || [];
    const soundsData = itemDataValue.sounds || [];
    const totalMedia = mediaData.length + soundsData.length;
    const sliderImages = mediaData.map(m => m.url).filter(Boolean);
    const firstSound = soundsData.length > 0 ? soundsData[0] : null;
    const observationDate = 
      checklistData.tgl_pengamatan || 
      checklistData.observation_date || 
      checklistData.created_at || 
      checklistData.date ||
      item.date || 
      'Tanggal tidak tersedia';
    const observerName = 
      item.observer || 
      checklistData.observer || 
      checklistData.uname || 
      'Tidak diketahui';
    const speciesData = itemDataValue.species || [];
    const locationDisplay = locationNames[index] || (item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : 'Lokasi tidak tersedia');
    const firstSpecies = speciesData.length > 0 ? speciesData[0] : null;
    const speciesCount = speciesData.length;
    const isAmaturalist = item.source?.includes('fobi');
    let cardTitle, cardSubtitle;
    if (isAmaturalist) {
      cardTitle = firstSpecies?.nameLat || firstSpecies?.scientific_name || item.species || item.nameLat || 'Spesies tidak diketahui';
      cardSubtitle = firstSpecies?.nameId || firstSpecies?.common_name || item.local_name || item.nameId || '';
    } else {
      cardTitle = item.location || locationDisplay;
      cardSubtitle = firstSpecies?.nameLat || item.species || '';
    }
    const grade = isAmaturalist ? itemDataValue.grade : null;

    return (
      <div 
        key={index} 
        className="bg-[#2c2c2c] rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-blue-500/50 transition-all group"
        onClick={() => handleLogoClick(item, true)}
      >
        {/* Media Preview */}
        {!isItemLoading && totalMedia > 0 && (
          <div className="w-full h-32 relative">
            <MediaSlider 
              images={sliderImages}
              spectrogram={firstSound?.spectrogram || null}
              audioUrl={firstSound?.url || null}
              type={item.source}
              isEager={index < 6}
              mediaData={mediaData}
              soundsData={soundsData}
            />
            {/* Grade Indicator (warna saja) untuk FOBi/Amaturalist, atau media count untuk lainnya */}
            {isAmaturalist && grade ? (
              <div 
                className={`absolute top-1.5 left-1.5 w-3 h-3 rounded-full ${getGradeBadgeClass(grade)}`}
                title={getGradeDisplay(grade)}
              />
            ) : (
              <div className="absolute top-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px]">
                {totalMedia} media
              </div>
            )}
            <div className="absolute top-1.5 right-1.5">
              <img 
                src={getSourceLogo(item.source)} 
                alt={item.source} 
                className="w-6 h-6 rounded-full border border-white/50"
              />
            </div>
          </div>
        )}

        {/* Fallback: logo sumber jika tidak ada media */}
        {!isItemLoading && totalMedia === 0 && (
          <div className="w-full h-24 flex items-center justify-center bg-[#1e1e1e] relative">
            <img 
              src={getSourceLogo(item.source)} 
              alt={item.source} 
              className="w-12 h-12 object-contain opacity-40"
            />
            {/* Grade Indicator (warna saja) untuk FOBi/Amaturalist */}
            {isAmaturalist && grade && (
              <div 
                className={`absolute top-1.5 left-1.5 w-3 h-3 rounded-full ${getGradeBadgeClass(grade)}`}
                title={getGradeDisplay(grade)}
              />
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {isItemLoading && (
          <div className="w-full h-24 bg-[#1e1e1e] animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Card Info */}
        <div className="p-2">
          {/* Card title */}
          <h3 className="text-xs font-semibold text-white truncate leading-tight" title={cardTitle}>
            <span className={isAmaturalist ? 'italic' : ''}>{cardTitle}</span>
          </h3>
          {cardSubtitle && (
            <p className="text-[10px] text-gray-400 truncate" title={cardSubtitle}>
              {isAmaturalist ? cardSubtitle : <span className="italic">{cardSubtitle}</span>}
            </p>
          )}
          {speciesCount > 1 && (
            <p className="text-[10px] text-blue-400">+{speciesCount - 1} spesies lain</p>
          )}

          {/* Observer & Date */}
          <div className="mt-1 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-300 truncate">{observerName}</p>
              <p className="text-[10px] text-gray-500">{formatDate(observationDate)}</p>
            </div>
            
            {/* Tombol panah navigasi */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogoClick(item, true);
              }}
              className="ml-1 w-6 h-6 bg-[#1a73e8] hover:bg-[#0d47a1] rounded-full flex items-center justify-center flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              aria-label="Buka observasi"
              title="Buka observasi"
            >
              <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }, [itemData, loadingItems, locationNames, handleLogoClick, formatDate]);

  React.useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div
      className="fixed md:relative top-0 right-0 w-full md:w-[400px] h-[100vh] bg-[#1e1e1e] p-2 box-border text-white text-sm z-[1002] flex flex-col"
      style={{ 
        height: '100vh',
        overflowY: 'hidden'
      }}
    >
      {/* Tombol Close Floating untuk Mobile */}
      <button
        onClick={handleClose}
        className="fixed left-2 top-1/2 transform -translate-y-1/2 z-[1003] bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white p-3 rounded-full shadow-lg md:hidden"
        aria-label="Tutup sidebar"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      {/* Header */}
      <div className="flex justify-between items-center py-2 px-1 border-b border-[#444] mb-2">
        <h2 className="font-bold">Detail Observasi</h2>
        <button
          onClick={handleClose}
          className="hidden md:block hover:text-gray-200"
          aria-label="Tutup"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Stats Summary Dinamis */}
      {dynamicStats.totalObs > 0 && (
        <div className="p-2 bg-[#2c2c2c] rounded mb-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-300 font-medium">{dynamicStats.totalObs} Observasi</span>
            <div className="flex items-center gap-2">
              {data.totalUniqueSpecies > 0 && (
                <span className="text-gray-400">{data.totalUniqueSpecies} Spesies</span>
              )}
              {loadedMediaCount > 0 && (
                <span className="text-gray-400">{loadedMediaCount} Media</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {dynamicStats.sources.fobi > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-700/50 text-green-300">
                Amaturalist {dynamicStats.sources.fobi}
              </span>
            )}
            {dynamicStats.sources.burungnesia > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-700/50 text-blue-300">
                Burungnesia {dynamicStats.sources.burungnesia}
              </span>
            )}
            {dynamicStats.sources.kupunesia > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-700/50 text-orange-300">
                Kupunesia {dynamicStats.sources.kupunesia}
              </span>
            )}
          </div>
          {/* Progress bar loading */}
          {Object.keys(loadingItems).some(k => loadingItems[k]) && (
            <div className="mt-1.5">
              <div className="w-full bg-[#444] rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (Object.keys(itemData).length / Math.max(1, paginatedData.length)) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">Memuat detail {Object.keys(itemData).length}/{paginatedData.length}</p>
            </div>
          )}
        </div>
      )}

      {/* Queue Status */}
      {(fetchQueue.length > 0 || locationQueue.length > 0) && (
        <div className="p-2 bg-[#2c2c2c] rounded mb-2 text-xs">
          <div className="flex justify-between items-center">
            <span>
              Memuat data: {fetchQueue.length} item, {locationQueue.length} lokasi dalam antrian
            </span>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
          </div>
        </div>
      )}

      {/* Content dengan Skeleton Loading */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 relative pb-20"
        onScroll={handleScroll}
        style={{ 
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {loading && paginatedData.length === 0 ? (
          <SkeletonLoader count={5} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {paginatedData.map((item, index) => (
                <div key={index}>
                  {renderObservationCard(item, index)}
                </div>
              ))}
            </div>

            {/* Loading More Skeleton */}
            {loading && paginatedData.length > 0 && (
              <div className="mt-4">
                <SkeletonLoader count={2} />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && paginatedData.length === 0 && (
          <div className="p-4 text-center text-gray-200">
            Tidak ada data observasi
          </div>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar'; 