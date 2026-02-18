import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEllipsisV, faSync, faArrowLeft, faChevronUp, faChevronDown, faTimes, faExternalLinkAlt, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import { useNavigate } from 'react-router-dom';
import { MediaSlider } from './MediaSlider';
import { getLocationName } from '../../utils/geocoding';
import { apiFetch } from '../../utils/api';
import { debounce } from 'lodash';
import { SkeletonLoader } from './SkeletonLoader';
import localforage from 'localforage';
const ITEMS_PER_PAGE = 10;
const BATCH_SIZE = 2; 
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
const INITIAL_LOAD = 5; // Jumlah data yang dimuat pertama kali
const LOAD_MORE = 5;    // Jumlah data yang dimuat saat scroll
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
const speciesCache = localforage.createInstance({
  name: 'speciesCache'
});
const fetchQueue = [];
let isProcessingQueue = false;
const processFetchQueue = async () => {
  if (isProcessingQueue || fetchQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    const { url, options, resolve, reject } = fetchQueue.shift();
    
    try {
      await new Promise(r => setTimeout(r, 300));
      
      const response = await apiFetch(url, options);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  } finally {
    isProcessingQueue = false;
    if (fetchQueue.length > 0) {
      setTimeout(processFetchQueue, 300);
    }
  }
};
const rateLimitedFetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    fetchQueue.push({ url, options, resolve, reject });
    
    if (!isProcessingQueue) {
      processFetchQueue();
    }
  });
};
const getCachedOrFetch = async (url, options = {}) => {
  const cacheKey = `${url}`;
  
  try {
    const cachedData = await speciesCache.getItem(cacheKey);
    const isFobiUrl = url.includes('fobi');
    const hasGrade = cachedData?.data?.grade !== undefined;
    
    if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < CACHE_EXPIRY)) {
      if (isFobiUrl && !hasGrade) {
        await speciesCache.removeItem(cacheKey);
      } else {
        return cachedData.data;
      }
    }
    const response = await rateLimitedFetch(url, options);
    const data = await response.json();
    await speciesCache.setItem(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching or caching ${url}:`, error);
    throw error;
  }
};

export const PolygonSidebar = React.memo(({ data, onClose, setStats }) => {
  const { gridsInPolygon, loading: initialLoading, shape, dataSource } = data;
  const [expandedItems, setExpandedItems] = useState({});
  const [locationNames, setLocationNames] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  const [loadingQueue, setLoadingQueue] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [totalGrids, setTotalGrids] = useState(0);
  const [loadedGrids, setLoadedGrids] = useState(0);
  const [allObservations, setAllObservations] = useState([]);
  const [visibleObservations, setVisibleObservations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [polygonStats, setPolygonStats] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [itemData, setItemData] = useState({});
  
  const scrollContainerRef = useRef(null);
  const dynamicStats = useMemo(() => {
    const totalObs = allObservations.length;
    const sources = {};
    allObservations.forEach(obs => {
      const src = obs.source?.includes('fobi') ? 'fobi' : 
                  obs.source?.includes('burungnesia') ? 'burungnesia' : 
                  obs.source?.includes('kupunesia') ? 'kupunesia' : 'lainnya';
      sources[src] = (sources[src] || 0) + 1;
    });
    const speciesSet = new Set();
    allObservations.forEach(obs => {
      if (obs.species) speciesSet.add(obs.species);
    });
    return { totalObs, sources, uniqueSpecies: speciesSet.size };
  }, [allObservations]);
  const loadedMediaCount = useMemo(() => {
    let count = 0;
    Object.values(itemData).forEach(d => {
      count += (d.media?.length || 0) + (d.sounds?.length || 0);
    });
    return count;
  }, [itemData]);
  const buildGridDataUrl = (gridId, ds) => {
    let url = `/grid-data/${gridId}`;
    const sources = (ds && ds.length > 0) ? ds : ['fobi', 'burungnesia', 'kupunesia'];
    const params = sources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
    url += `?${params}`;
    return url;
  };
  useEffect(() => {
    if (!shape || !gridsInPolygon) return;
    
    let cancelled = false;
    setAllObservations([]);
    setVisibleObservations([]);
    setItemData({});
    setLocationNames({});
    setLoadingItems({});
    setLoadedGrids(0);
    setCurrentPage(1);
    setHasMore(true);
    setPolygonStats(null);
    setSelectedObservation(null);
    setShowSpeciesModal(false);
    setActiveMenu(null);
    
    const run = async () => {
      await speciesCache.clear();
      
      if (cancelled) return;
      setTotalGrids(gridsInPolygon.length);
      const initialGrids = gridsInPolygon.slice(0, INITIAL_LOAD);
      const remainingGrids = gridsInPolygon.slice(INITIAL_LOAD);
      
      setLoadingQueue(remainingGrids);
      processInitialBatch(initialGrids, dataSource);
    };
    
    run();
    
    return () => { cancelled = true; };
  }, [shape, gridsInPolygon, dataSource]);
  useEffect(() => {
    setVisibleObservations(allObservations.slice(0, currentPage * ITEMS_PER_PAGE));
  }, [allObservations, currentPage]);
  const lastSentStatsRef = useRef('');
  useEffect(() => {
    if (allObservations.length === 0 || !setStats) return;
    const speciesSet = new Set();
    let mediaCount = 0;
    allObservations.forEach(obs => {
      if (obs.species) speciesSet.add(obs.species);
    });
    Object.values(itemData).forEach(d => {
      mediaCount += (d.media?.length || 0) + (d.sounds?.length || 0);
    });
    
    const newStats = {
      observasi: allObservations.length,
      taksa: speciesSet.size,
      media: mediaCount
    };
    const key = `${newStats.observasi}_${newStats.taksa}_${newStats.media}`;
    if (key !== lastSentStatsRef.current) {
      lastSentStatsRef.current = key;
      setStats(newStats);
    }
  }, [allObservations, itemData, setStats]);
  const processInitialBatch = async (initialGrids, activeDataSource) => {
    setProcessingQueue(true);
    
    try {
      const observations = [];
      
      for (const grid of initialGrids) {
        try {
          const gridData = await getCachedOrFetch(buildGridDataUrl(grid.id, activeDataSource));
          
          if (gridData.status === 'success' && gridData.data) {
            const newItemData = {};
            const processedObservations = gridData.data.map(obs => {
              if (obs.media && obs.media.length > 0) {
                newItemData[obs.id] = {
                  checklist: { observer: obs.observer, created_at: obs.date },
                  species: [],
                  media: obs.media,
                  sounds: []
                };
              }
              return {
                ...obs,
                gridId: grid.id,
                gridCenter: grid.center,
                uniqueId: `${obs.source}_${obs.id}_${grid.id}`
              };
            });
            if (Object.keys(newItemData).length > 0) {
              setItemData(prev => ({ ...prev, ...newItemData }));
            }
            
            observations.push(...processedObservations);
            if (grid.center) {
              try {
                const locationName = await getLocationName(grid.center[1], grid.center[0]);
                setLocationNames(prev => ({
                  ...prev,
                  [grid.id]: locationName
                }));
              } catch (error) {
                console.error('Error getting location name:', error);
                  setLocationNames(prev => ({
                    ...prev,
                  [grid.id]: `${grid.center[1]}, ${grid.center[0]}`
                  }));
                }
            }
          }
        } catch (error) {
          console.error('Error loading grid', grid.id, ':', error);
        }
      }
      setAllObservations(observations);
      setLoadedGrids(initialGrids.length);
    } catch (error) {
      console.error('Error processing initial batch:', error);
    } finally {
      setProcessingQueue(false);
    }
  };
  const loadMore = useCallback(() => {
    if (processingQueue || isLoadingMore) return;
    
    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    if (visibleObservations.length >= allObservations.length - 5 && loadingQueue.length > 0) {
      const nextBatch = loadingQueue.slice(0, BATCH_SIZE);
      const remainingQueue = loadingQueue.slice(BATCH_SIZE);
      
      setLoadingQueue(remainingQueue);
      processNextBatch(nextBatch, dataSource);
    } else {
      setTimeout(() => {
        setIsLoadingMore(false);
      }, 300);
    }
  }, [processingQueue, isLoadingMore, visibleObservations.length, allObservations.length, loadingQueue, dataSource]);
  const processNextBatch = async (batch, activeDataSource) => {
    setProcessingQueue(true);
    
    try {
      const newObservations = [];
      
      for (const grid of batch) {
        try {
          const gridData = await getCachedOrFetch(buildGridDataUrl(grid.id, activeDataSource));
          
          if (gridData.status === 'success' && gridData.data) {
            const newItemData = {};
            const processedObservations = gridData.data.map(obs => {
              if (obs.media && obs.media.length > 0) {
                newItemData[obs.id] = {
                  checklist: { observer: obs.observer, created_at: obs.date },
                  species: [],
                  media: obs.media,
                  sounds: []
                };
              }
              return {
                ...obs,
                gridId: grid.id,
                gridCenter: grid.center,
                uniqueId: `${obs.source}_${obs.id}_${grid.id}`
              };
            });
            
            if (Object.keys(newItemData).length > 0) {
              setItemData(prev => ({ ...prev, ...newItemData }));
            }
            
            newObservations.push(...processedObservations);
            if (grid.center) {
              try {
                const locationName = await getLocationName(grid.center[1], grid.center[0]);
                setLocationNames(prev => ({
                  ...prev,
                  [grid.id]: locationName
                }));
              } catch (error) {
                console.error('Error getting location name:', error);
                setLocationNames(prev => ({
                ...prev,
                  [grid.id]: `${grid.center[1]}, ${grid.center[0]}`
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error loading grid', grid.id, ':', error);
        }
        await new Promise(r => setTimeout(r, 100));
      }
      setAllObservations(prev => [...prev, ...newObservations]);
      setLoadedGrids(prev => prev + batch.length);
      setHasMore(loadingQueue.length > 0 || newObservations.length > 0);
    } catch (error) {
      console.error('Error processing next batch:', error);
    } finally {
            setProcessingQueue(false);
      setIsLoadingMore(false);
    }
  };
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    if (scrollBottom < 200 && !processingQueue && !isLoadingMore && hasMore) {
      loadMore();
    }
  }, [processingQueue, isLoadingMore, hasMore, loadMore]);
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const throttledScrollHandler = debounce(handleScroll, 200);
    scrollContainer.addEventListener('scroll', throttledScrollHandler);
    
    return () => {
      scrollContainer.removeEventListener('scroll', throttledScrollHandler);
      throttledScrollHandler.cancel();
    };
  }, [handleScroll]);
  useEffect(() => {
    const ensureScrollable = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (container.scrollHeight <= container.clientHeight && visibleObservations.length > 0) {
        container.style.paddingBottom = '200px';
        } else {
        container.style.paddingBottom = '0';
      }
    };
    
    ensureScrollable();
    const timer = setTimeout(ensureScrollable, 500);
    return () => clearTimeout(timer);
  }, [visibleObservations]);
  const fetchItemDataForObservation = useCallback(async (observation) => {
    const id = observation.id;
    if (itemData[id]) return itemData[id];
    
    setLoadingItems(prev => ({ ...prev, [id]: true }));
    
    try {
      let endpoint = '';
      if (observation.source === 'burungnesia' || id.startsWith('brn_')) {
        endpoint = `/grid-species/${id}`;
      } else if (observation.source === 'kupunesia' || id.startsWith('kpn_')) {
        endpoint = `/grid-species/${id}`;
      } else if (observation.source?.includes('fobi') || id.startsWith('fobi_') || id.startsWith('fobt_') || id.startsWith('fob_')) {
        let sourceType = 'taxa_fobi';
        if (observation.source?.includes('burungnesia') || id.startsWith('fobi_b_')) {
          sourceType = 'burungnesia_fobi';
        } else if (observation.source?.includes('kupunesia') || id.startsWith('fobi_k_')) {
          sourceType = 'kupunesia_fobi';
        }
        let fobiId = id;
        if (id.startsWith('fobt_')) {
          fobiId = 'fobi_t_' + id.replace('fobt_', '');
        } else if (id.startsWith('fob_')) {
          fobiId = 'fobi_c_' + id.replace('fob_', '');
        }
        endpoint = `/fobi-species/${fobiId}/${sourceType}`;
      }
      
      if (!endpoint) {
        setLoadingItems(prev => ({ ...prev, [id]: false }));
        return null;
      }
      
      const data = await getCachedOrFetch(endpoint);
      const normalizedData = {
        checklist: data?.checklist || {},
        species: Array.isArray(data?.species) ? data.species : [],
        media: Array.isArray(data?.media) ? data.media : [],
        sounds: Array.isArray(data?.sounds) ? data.sounds : [],
        grade: data?.grade || null, // Tambahkan grade dari response
      };
      
      setItemData(prev => ({ ...prev, [id]: normalizedData }));
      setLoadingItems(prev => ({ ...prev, [id]: false }));
      return normalizedData;
    } catch (error) {
      console.error(`Error fetching data for ${id}:`, error);
      setLoadingItems(prev => ({ ...prev, [id]: false }));
      return null;
    }
  }, [itemData]);
  const fetchSpeciesDataForObservation = useCallback(async (observation) => {
    const data = await fetchItemDataForObservation(observation);
    return data?.species || [];
  }, [fetchItemDataForObservation]);

  const navigate = useNavigate();
  const handleLogoClick = useCallback((observation, newTab = true) => {
    let prefix = '';
    let url;
    const baseId = observation.id
      .replace(/^(fobi_[bkt]_)/, '')
      .replace(/^(fobt_|fob_|brn_|kpn_)/, '');
    if (observation.source === 'burungnesia' || observation.source === 'burungnesia_fobi' || observation.id.startsWith('fobi_b_') || observation.id.startsWith('brn_')) {
      prefix = 'BN';
    } else if (observation.source === 'kupunesia' || observation.source === 'kupunesia_fobi' || observation.id.startsWith('fobi_k_') || observation.id.startsWith('kpn_')) {
      prefix = 'KP';
    }
    if (observation.source === 'taxa_fobi' || observation.id.startsWith('fobi_t_') || observation.id.startsWith('fobt_')) {
      url = `/observations/${baseId}`;
    } else if (observation.source?.includes('fobi') || observation.id.startsWith('fob_')) {
      url = `/detail-checklist/${prefix}${baseId}`;
    } else {
      url = `/app-checklist/${prefix}${baseId}`;
    }

    if (newTab) {
      window.open(url, '_blank');
    } else {
      navigate(url);
      if (onClose) onClose();
    }
  }, [navigate, onClose]);
  const toggleExpand = useCallback((id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);
  const refreshItem = useCallback(async (observation) => {
    const id = observation.id;
    setItemData(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    try {
      await speciesCache.removeItem(`species_${id}`);
    } catch (e) {}
    await fetchItemDataForObservation(observation);
  }, [fetchItemDataForObservation]);
  const SpeciesModal = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [species, setSpecies] = useState([]);
    
    useEffect(() => {
      if (!selectedObservation) return;
      
      const loadSpecies = async () => {
        setIsLoading(true);
        try {
          const speciesData = await fetchSpeciesDataForObservation(selectedObservation);
          setSpecies(speciesData || []);
        } catch (error) {
          console.error('Error loading species:', error);
          setSpecies([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadSpecies();
    }, [selectedObservation]);
    
    if (!showSpeciesModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1003] p-4">
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-[#444]">
            <h3 className="text-lg font-bold text-white">Daftar Spesies</h3>
            <button 
              onClick={() => setShowSpeciesModal(false)}
              className="text-white hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!isLoading && species.length === 0 && (
              <div className="text-center text-white py-8">
                <p>Tidak ada data spesies</p>
              </div>
            )}
            
            {!isLoading && species.length > 0 && (
              <ul className="space-y-3">
                {Array.isArray(species) && species.map((spesies, idx) => (
                  <li key={idx} className="bg-[#2c2c2c] p-3 rounded-lg">
                    <p className="text-white font-bold italic">{spesies.nameLat || 'Nama tidak tersedia'}</p>
                    {spesies.nameId && <p className="text-white">{spesies.nameId}</p>}
                    <div className="flex justify-between text-sm text-gray-200 mt-1">
                      <span>Jumlah: {spesies.count || 1}</span>
                      {spesies.notes && <span>Catatan: {spesies.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-[#444] flex justify-end">
            <button
              onClick={() => {
                if (selectedObservation) {
                  refreshItem(selectedObservation);
                }
              }}
              className="bg-[#1a73e8] text-white py-2 px-4 rounded mr-2 hover:bg-[#0d47a1] disabled:opacity-50"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faSync} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
              Refresh
            </button>
            <button
              onClick={() => setShowSpeciesModal(false)}
              className="bg-[#333] text-white py-2 px-4 rounded hover:bg-[#444]"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };
  useEffect(() => {
    if (visibleObservations.length === 0) return;
    
    visibleObservations.forEach(obs => {
      if (!itemData[obs.id] && !loadingItems[obs.id]) {
        fetchItemDataForObservation(obs);
      }
    });
  }, [visibleObservations, itemData, loadingItems, fetchItemDataForObservation]);
  const formatDate = useCallback((dateStr) => {
    if (!dateStr || dateStr === 'Tanggal tidak tersedia') return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }, []);
  const renderObservationCard = useCallback((observation, index) => {
    const isItemLoading = loadingItems[observation.id] || false;
    const obsData = itemData[observation.id] || {};
    const checklistData = obsData.checklist || {};
    const mediaData = obsData.media || [];
    const soundsData = obsData.sounds || [];
    const totalMedia = mediaData.length + soundsData.length;
    const sliderImages = mediaData.map(m => m.url).filter(Boolean);
    const firstSound = soundsData.length > 0 ? soundsData[0] : null;
    const observationDate = 
      checklistData.tgl_pengamatan || 
      checklistData.observation_date || 
      checklistData.created_at || 
      observation.date || 
      'Tanggal tidak tersedia';
    const observerName = 
      observation.observer || 
      checklistData.observer || 
      checklistData.uname || 
      'Tidak diketahui';
    const isAmaturalist = observation.source?.includes('fobi');
    const locationDisplay = locationNames[observation.id] || (observation.latitude && observation.longitude ? `${observation.latitude}, ${observation.longitude}` : 'Lokasi tidak tersedia');
    let cardTitle, cardSubtitle;
    if (isAmaturalist) {
      cardTitle = observation.species || 'Spesies tidak diketahui';
      cardSubtitle = observation.local_name || '';
    } else {
      cardTitle = observation.location || locationDisplay;
      cardSubtitle = observation.species || '';
    }
    const grade = isAmaturalist ? obsData.grade : null;

    return (
      <div 
        className="bg-[#2c2c2c] rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-blue-500/50 transition-all group"
        onClick={() => handleLogoClick(observation, true)}
      >
        {/* Media Preview */}
        {!isItemLoading && totalMedia > 0 && (
          <div className="w-full h-32 relative">
            <MediaSlider 
              images={sliderImages}
              spectrogram={firstSound?.spectrogram || null}
              audioUrl={firstSound?.url || null}
              type={observation.source}
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
                src={getSourceLogo(observation.source)} 
                alt={observation.source} 
                className="w-6 h-6 rounded-full border border-white/50"
              />
            </div>
          </div>
        )}

        {/* Fallback: logo sumber jika tidak ada media */}
        {!isItemLoading && totalMedia === 0 && (
          <div className="w-full h-24 flex items-center justify-center bg-[#1e1e1e] relative">
            <img 
              src={getSourceLogo(observation.source)} 
              alt={observation.source} 
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
                handleLogoClick(observation, true);
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
  }, [locationNames, handleLogoClick, loadingItems, itemData, formatDate]);
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
      onClose(false); // Ubah parameter menjadi false
    }
  }, [onClose]);
  const handleRemoveFilter = useCallback(() => {
    fetchStats().then(stats => {
      if (stats && setStats) {
        setStats(stats);
        if (onClose) {
          onClose(true);
        }
      } else {
        if (onClose) {
          onClose(true);
        }
      }
    });
  }, [onClose, setStats]);
  
  return (
    <div 
      className="fixed inset-0 z-[1002] bg-black/50 md:bg-transparent md:relative md:inset-auto md:w-96 md:h-full md:z-[999] transition-all duration-300 ease-in-out"
      style={{
        transform: data.isOpen ? 'translateX(0)' : 'translateX(-100%)',
        opacity: data.isOpen ? 1 : 0,
        pointerEvents: data.isOpen ? 'auto' : 'none'
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

      {/* Container dengan background color */}
      <div className="h-full w-full bg-[#1e1e1e] p-2 box-border text-white text-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center py-2 px-1 border-b border-[#444] mb-2">
          <h2 className="font-bold">Detail Observasi</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              className="hover:text-gray-200"
              aria-label="Tutup"
            >
          <FontAwesomeIcon icon={faXmark} />
        </button>
          </div>
        </div>
        
        {/* Tambahkan tombol untuk menghapus polygon */}
        <div className="mb-2 p-2 bg-[#2c2c2c] rounded">
          <div className="flex justify-between items-center">
            <span>Filter Polygon Aktif</span>
            <button 
              onClick={handleRemoveFilter}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              aria-label="Hapus filter polygon"
            >
              Hapus Filter
            </button>
          </div>
          {/* Badge sumber data aktif */}
          {dataSource && dataSource.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-xs text-gray-400">Sumber:</span>
              {dataSource.map(ds => (
                <span 
                  key={ds} 
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ds === 'fobi' ? 'bg-green-700/50 text-green-300' :
                    ds === 'burungnesia' ? 'bg-blue-700/50 text-blue-300' :
                    ds === 'kupunesia' ? 'bg-orange-700/50 text-orange-300' :
                    'bg-gray-700/50 text-gray-300'
                  }`}
                >
                  {ds === 'fobi' ? 'Amaturalist' : ds === 'burungnesia' ? 'Burungnesia' : ds === 'kupunesia' ? 'Kupunesia' : ds}
                </span>
              ))}
            </div>
          )}
      </div>
      
        {/* Stats Summary Dinamis */}
        {(dynamicStats.totalObs > 0 || totalGrids > 0) && (
          <div className="p-2 bg-[#2c2c2c] rounded mb-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-300 font-medium">{dynamicStats.totalObs} Observasi</span>
              <div className="flex items-center gap-2">
                {dynamicStats.uniqueSpecies > 0 && (
                  <span className="text-gray-400">{dynamicStats.uniqueSpecies} Spesies</span>
                )}
                {loadedMediaCount > 0 && (
                  <span className="text-gray-400">{loadedMediaCount} Media</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
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
            {/* Progress bar loading grid */}
            {totalGrids > 0 && (
              <div>
                <div className="w-full bg-[#444] rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (loadedGrids / totalGrids) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {loadedGrids < totalGrids 
                    ? `Memuat grid ${loadedGrids}/${totalGrids}` 
                    : `${totalGrids} grid dimuat`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Queue Status */}
        {(loadingQueue.length > 0 || processingQueue) && (
          <div className="p-2 bg-[#2c2c2c] rounded mb-2 text-xs">
            <div className="flex justify-between items-center">
              <span>
                Memuat data: {loadingQueue.length} grid tersisa
              </span>
              <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
            </div>
          </div>
        )}
        
        {/* Content dengan infinite scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 relative p-2"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            height: 'calc(100vh - 60px)'
          }}
        >
          {initialLoading || (loadingQueue.length > 0 && allObservations.length === 0) ? (
            <SkeletonLoader count={5} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {visibleObservations.map((observation, index) => (
                  <div key={observation.uniqueId}>
                    {renderObservationCard(observation, index)}
                  </div>
                ))}
              </div>

              {/* Loading More Skeleton */}
              {(processingQueue || isLoadingMore) && (
                <div className="mt-4">
                  <SkeletonLoader count={2} />
                </div>
              )}

              {/* Load More Button (fallback jika scroll tidak berfungsi) */}
              {!processingQueue && !isLoadingMore && hasMore && visibleObservations.length > 0 && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white px-4 py-2 rounded"
                  >
                    Muat lebih banyak
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!initialLoading && allObservations.length === 0 && (
            <div className="p-4 text-center text-gray-200">
              Tidak ada data observasi
            </div>
          )}
        </div>

        {/* Modal spesies */}
        <SpeciesModal />
      </div>
    </div>
  );
});

PolygonSidebar.displayName = 'PolygonSidebar'; 