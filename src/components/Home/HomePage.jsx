import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge, faThList, faMap } from '@fortawesome/free-solid-svg-icons';
import GridView from './GridView';
import ListView from './ListView';
import MapView from './MapView';
import StatsBar from './StatsBar';
import { apiFetch } from '../../utils/api';
import { debounce } from 'lodash';
import SpeciesMapOverlay from '../SpeciesMapOverlay';
import Header from '../Header';
import { defaultMapConfig } from '../../utils/mapHelpers';
import { checkHasActiveFilters } from './ActiveFilterBar';
const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length || valA.some((v, i) => v !== valB[i])) return false;
    } else if (valA !== valB) {
      return false;
    }
  }
  return true;
};

const HomePage = ({ searchParams, filterParams, onSearch }) => {
  const [view, setView] = useState(() => {
    return localStorage.getItem('viewMode') || 'map';
  });
  const [loading, setLoading] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [stats, setStats] = useState(() => {
    const savedStats = localStorage.getItem('currentStats');
    return savedStats ? JSON.parse(savedStats) : {
      observasi: 0,
      taksa: 0,
      media: 0,
    };
  });
  const lastViewStatsRef = useRef({ map: null, grid: null, list: null });
  
  
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(5);
  const mapRef = useRef(null);
  const [mapResetHandler, setMapResetHandler] = useState(null);
  const [activePolygon, setActivePolygon] = useState(() => {
    const savedPolygon = localStorage.getItem('activePolygon');
    return savedPolygon ? JSON.parse(savedPolygon) : null;
  });
  const [centralizedFilters, setCentralizedFilters] = useState({
    search: searchParams?.query || '',
    polygon: null,
    start_date: filterParams?.start_date || null,
    end_date: filterParams?.end_date || null,
    date_type: filterParams?.date_type || 'created_at',
    latitude: null,
    longitude: null,
    radius: 10,
    grade: filterParams?.grade || [],
    data_source: filterParams?.data_source || ['fobi'],
    has_media: filterParams?.has_media || false,
    media_type: filterParams?.media_type || null,
    user_id: filterParams?.user_id || null,
    user_name: filterParams?.user_name || null,
    taxonomy_rank: filterParams?.taxonomy_rank || null,
    taxonomy_value: filterParams?.taxonomy_value || null,
    location_name: filterParams?.location_name || null,
    location_source: filterParams?.location_source || null
  });
  const updateCentralizedFilters = useCallback((updater) => {
    setCentralizedFilters(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (shallowEqual(prev, next)) return prev;
      return next;
    });
  }, []);
  useEffect(() => {
    localStorage.setItem('currentStats', JSON.stringify(stats));
    lastViewStatsRef.current[view] = stats;
  }, [stats, view]);
  useEffect(() => {
    if (activePolygon) {
      localStorage.setItem('activePolygon', JSON.stringify(activePolygon));
      setCentralizedFilters(prev => ({
        ...prev,
        polygon: formatPolygonForApi(activePolygon)
      }));
    } else {
      localStorage.removeItem('activePolygon');
      setCentralizedFilters(prev => ({
        ...prev,
        polygon: null
      }));
    }
  }, [activePolygon]);
  const formatPolygonForApi = (polygon) => {
    if (!polygon) return null;
    
    if (polygon.type === 'Polygon') {
      return polygon.coordinates[0]
        .map(coord => `${coord[0]},${coord[1]}`)
        .join('|');
    } else if (polygon.type === 'Circle') {
      const { center, radius } = polygon;
      const points = [];
      const numPoints = 32; // Jumlah titik untuk membuat lingkaran
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const lng = center[0] + (radius / 111320 * Math.cos(angle)) / Math.cos(center[1] * Math.PI / 180);
        const lat = center[1] + (radius / 111320 * Math.sin(angle));
        points.push(`${lng},${lat}`);
      }
      points.push(points[0]);
      
      return points.join('|');
    }
    
    return null;
  };
  useEffect(() => {
    updateCentralizedFilters(prev => ({
      ...prev,
      search: searchParams?.query || '',
      start_date: filterParams?.start_date || null,
      end_date: filterParams?.end_date || null,
      date_type: filterParams?.date_type || 'created_at',
      grade: filterParams?.grade || [],
      data_source: filterParams?.data_source || ['fobi'],
      has_media: filterParams?.has_media || false,
      media_type: filterParams?.media_type || null,
      user_id: filterParams?.user_id || null,
      user_name: filterParams?.user_name || null,
      taxonomy_rank: filterParams?.taxonomy_rank || null,
      taxonomy_value: filterParams?.taxonomy_value || null
    }));
  }, [searchParams, filterParams, updateCentralizedFilters]);
  const fetchMarkers = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt_token');
      const commonParams = new URLSearchParams();
      if (filters.user_id) commonParams.append('user_id', filters.user_id);
      if (filters.taxonomy_rank) commonParams.append('taxonomy_rank', filters.taxonomy_rank);
      if (filters.taxonomy_value) commonParams.append('taxonomy_value', filters.taxonomy_value);
      if (filters.start_date) commonParams.append('start_date', filters.start_date);
      if (filters.end_date) commonParams.append('end_date', filters.end_date);
      if (filters.date_type) commonParams.append('date_type', filters.date_type);
      if (filters.has_media) commonParams.append('has_media', '1');
      if (filters.media_type) commonParams.append('media_type', filters.media_type);
      const fobiParams = new URLSearchParams(commonParams);
      if (filters.grade && filters.grade.length > 0) {
        filters.grade.forEach(g => fobiParams.append('grade[]', g));
      }
      
      const commonString = commonParams.toString() ? `?${commonParams}` : '';
      const fobiString = fobiParams.toString() ? `?${fobiParams}` : '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [markersResult, fobiResult] = await Promise.allSettled([
        apiFetch(`/markers${commonString}`, { headers }).then(r => r.json()),
        apiFetch(`/fobi-markers${fobiString}`, { headers }).then(r => r.json())
      ]);

      const markersData = markersResult.status === 'fulfilled' && Array.isArray(markersResult.value)
        ? markersResult.value : [];
      const fobiData = fobiResult.status === 'fulfilled' && Array.isArray(fobiResult.value)
        ? fobiResult.value : [];
      const combinedMarkers = [
        ...markersData.map(marker => ({ ...marker, source: marker.source || 'burungnesia' })),
        ...fobiData.map(marker => ({ ...marker, source: 'fobi' }))
      ];

      setMarkers(combinedMarkers);
    } catch (error) {
      console.error('Error fetching markers:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  const prevFilterSigRef = useRef('');
  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);
  useEffect(() => {
    const filterSig = JSON.stringify({
      user_id: centralizedFilters?.user_id || null,
      taxonomy_value: centralizedFilters?.taxonomy_value || null,
      start_date: centralizedFilters?.start_date || null,
      end_date: centralizedFilters?.end_date || null,
      grade: centralizedFilters?.grade || [],
      has_media: centralizedFilters?.has_media || false,
      media_type: centralizedFilters?.media_type || null,
    });
    
    if (filterSig === prevFilterSigRef.current) return;
    prevFilterSigRef.current = filterSig;
    
    fetchMarkers({
      user_id: centralizedFilters?.user_id,
      taxonomy_rank: centralizedFilters?.taxonomy_rank,
      taxonomy_value: centralizedFilters?.taxonomy_value,
      start_date: centralizedFilters?.start_date,
      end_date: centralizedFilters?.end_date,
      date_type: centralizedFilters?.date_type,
      grade: centralizedFilters?.grade,
      has_media: centralizedFilters?.has_media,
      media_type: centralizedFilters?.media_type,
    });
  }, [
    centralizedFilters?.user_id, centralizedFilters?.taxonomy_value, centralizedFilters?.taxonomy_rank,
    centralizedFilters?.start_date, centralizedFilters?.end_date, centralizedFilters?.date_type,
    centralizedFilters?.grade, centralizedFilters?.has_media, centralizedFilters?.media_type,
    fetchMarkers
  ]);
  const filteredMarkers = useMemo(() => {
    if (markers.length === 0) return markers;
    
    return markers.filter(marker => {
      if (searchParams?.query && typeof searchParams.query === 'string' && searchParams.query.trim() !== '') {
        const searchLower = searchParams.query.toLowerCase();
        const matchesSearch = 
          (marker.name?.toLowerCase().includes(searchLower)) ||
          (marker.location?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      if (filterParams?.data_source?.length > 0) {
        const sourceMatch = filterParams.data_source.some(source => marker.source === source);
        if (!sourceMatch) return false;
      }

      return true;
    });
  }, [markers, searchParams?.query, filterParams?.data_source]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      onSearch(value);
    }, 500),
    []
  );

  const fetchStats = async () => {
    const cachedStats = localStorage.getItem('cachedStats');

    if (cachedStats) {
      setStats(JSON.parse(cachedStats));
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?data_source[]=fobi&data_source[]=burungnesia&data_source[]=kupunesia`);
      const data = await response.json();

      if (data.success) {
        const newStats = {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };

        setStats(newStats);
        localStorage.setItem('cachedStats', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const resetStats = () => {
    fetchStats();
  };

  const fetchFilteredStats = async (params) => {
    try {
      const apiParams = {...params};
      delete apiParams.isReset;
      const queryParts = [];
      Object.entries(apiParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        if (Array.isArray(value)) {
          value.forEach(v => queryParts.push(`${key}[]=${encodeURIComponent(v)}`));
        } else {
          queryParts.push(`${key}=${encodeURIComponent(value)}`);
        }
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParts.join('&')}`);
      const data = await response.json();
      if (data.success) {
        const newStats = {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };
        setStats(newStats);
        localStorage.setItem('currentStats', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
    }
  };
  const fetchDefaultStats = useCallback(async () => {
    localStorage.removeItem('cachedStats');
    await fetchStats();
  }, []);

  const handleReset = useCallback((params = {}) => {
    if (onSearch) {
      onSearch(params);
    }
    updateCentralizedFilters({
      search: '',
      polygon: null,
      start_date: null,
      end_date: null,
      date_type: 'created_at',
      latitude: null,
      longitude: null,
      radius: 10,
      grade: [],
      data_source: ['fobi'],
      has_media: false,
      media_type: null,
      user_id: null,
      user_name: null,
      taxonomy_rank: null,
      taxonomy_value: null,
      location_name: null
    });
    setActivePolygon(null);
    const cachedStats = localStorage.getItem('cachedStats');
    if (cachedStats) {
      const statsData = JSON.parse(cachedStats);
      setStats(statsData);
    } else {
      fetchDefaultStats();
    }
    if (view === 'map' && mapRef.current) {
      mapRef.current.setView(defaultMapConfig.center, defaultMapConfig.zoom);
    }
  }, [view, onSearch, updateCentralizedFilters, fetchDefaultStats]);

  const handleViewChange = useCallback((newView) => {
    if (view === newView) return;
    lastViewStatsRef.current[view] = stats;
    localStorage.setItem('currentStats', JSON.stringify(stats));
    setView(newView);
    localStorage.setItem('viewMode', newView);
  }, [view, stats]);
  const handleSpeciesSelect = (species) => {
    setSelectedSpecies(species);
    setStats({
      observasi: 0,
      taksa: 0,
      media: 0,
    });
  };
  const handlePolygonChange = (polygon) => {
    setActivePolygon(polygon);
    if (!polygon) {
      fetchDefaultStats();
    }
  };
  const handleMapChange = (newBounds, newZoom) => {
    setBounds(newBounds);
    setZoom(newZoom);
  };
  const syncStats = useCallback((newStats) => {
    setStats(newStats);
    lastViewStatsRef.current = {
      map: newStats,
      grid: newStats,
      list: newStats
    };
  }, []);
  const handleFilterChange = useCallback((newFilters) => {
    const { autoSubmit, skipSearch, reset, ...filtersWithoutFlag } = newFilters;
    updateCentralizedFilters(prev => ({
      ...prev,
      ...filtersWithoutFlag
    }));
    if (autoSubmit === true) {
      fetchFilteredStats({
        search: filtersWithoutFlag.search || '',
        data_source: filtersWithoutFlag.data_source || ['fobi'],
        taxonomy_rank: filtersWithoutFlag.taxonomy_rank || '',
        taxonomy_value: filtersWithoutFlag.taxonomy_value || '',
        location_name: filtersWithoutFlag.location_name || '',
        polygon: filtersWithoutFlag.polygon ? JSON.stringify(filtersWithoutFlag.polygon) : '',
      });
    }
    if (autoSubmit === true && !skipSearch) {
      const isNewSearch = newFilters.search !== undefined;
      const newSearchParams = isNewSearch ? {
        search: '',
        location: '',
        latitude: '',
        longitude: '',
        searchType: 'all',
        boundingbox: null,
        calculatedRadius: null
      } : { ...searchParams };
      if (newFilters.search !== undefined) newSearchParams.search = newFilters.search;
      if (newFilters.searchType !== undefined) newSearchParams.searchType = newFilters.searchType;
      if (newFilters.display !== undefined) newSearchParams.display = newFilters.display;
      if (newFilters.selectedId !== undefined) newSearchParams.selectedId = newFilters.selectedId;
      if (newFilters.species !== undefined) newSearchParams.species = newFilters.species;
      if (newFilters.latitude !== undefined) newSearchParams.latitude = newFilters.latitude;
      if (newFilters.longitude !== undefined) newSearchParams.longitude = newFilters.longitude;
      if (newFilters.radius !== undefined) newSearchParams.radius = newFilters.radius;
      if (newFilters.location !== undefined) newSearchParams.location = newFilters.location;
      if (newFilters.boundingbox !== undefined) newSearchParams.boundingbox = newFilters.boundingbox;
      if (newFilters.calculatedRadius !== undefined) newSearchParams.calculatedRadius = newFilters.calculatedRadius;
      
      if (onSearch) {
        onSearch(newSearchParams);
      }
    }
  }, [searchParams, onSearch, updateCentralizedFilters]);

  return (
    <div>
      <Header 
        onSearch={onSearch} 
        setStats={syncStats}
        onMapReset={mapResetHandler}
        onFilterChange={handleFilterChange}
        hasActiveExternalFilters={checkHasActiveFilters(searchParams, centralizedFilters)}
      />
      <div className="relative">
        <StatsBar
          stats={stats}
          onSearch={onSearch}
          searchParams={searchParams}
          filterParams={filterParams}
          setStats={syncStats}
          onSpeciesSelect={handleSpeciesSelect}
          selectedSpecies={selectedSpecies}
          onMapReset={mapResetHandler}
          onFilterChange={handleFilterChange}
        />
        <div className="flex justify-center md:justify-end md:absolute md:right-4 md:top-30 space-x-1 bg-none p-1 cursor-pointer z-50 text-white">
          <button 
            onClick={() => handleViewChange('map')}
            className={`p-2 ${view === 'map' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faMap} className="text-shadow-md" />
          </button>
          <button 
            onClick={() => handleViewChange('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faThLarge} className="text-shadow-md" />
          </button>
          <button 
            onClick={() => handleViewChange('list')}
            className={`p-2 ${view === 'list' ? 'bg-[#0d47a1]' : 'bg-[#1a73e8]'} hover:bg-[#333] shadow-inner`}
          >
            <FontAwesomeIcon icon={faThList} className="text-shadow-md" />
          </button>
        </div>
      </div>

      <div className="mt-0 relative overflow-hidden">
        {loading && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="w-5 h-5 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 text-sm">Memuat data...</span>
            </div>
          </div>
        )}

        {/* GridView/ListView - render saat aktif */}
        <div style={{ display: (view === 'grid' || view === 'list') ? 'block' : 'none' }}>
          <GridView
            searchParams={searchParams}
            filterParams={filterParams}
            view={view}
            setStats={syncStats}
            activePolygon={activePolygon}
            centralizedFilters={centralizedFilters}
            isActive={view === 'grid' || view === 'list'}
          />
        </div>

        {/* MapView - selalu render, hide/show via CSS agar tidak remount */}
        <div style={{ display: view === 'map' ? 'block' : 'none' }}>
          <div className="relative w-full h-[calc(100vh-120px)]">
            {selectedSpecies ? (
              <div className="absolute inset-0 z-[900] flex">
                <SpeciesMapOverlay
                  species={selectedSpecies}
                  bounds={bounds}
                  zoomLevel={zoom}
                  setStats={syncStats}
                  onClose={() => setSelectedSpecies(null)}
                  dataSources={centralizedFilters?.data_source}
                />
              </div>
            ) : (
              <MapView
                markers={filteredMarkers}
                setStats={syncStats}
                searchParams={searchParams}
                filterParams={filterParams}
                setLoading={setLoading}
                onReset={handleReset}
                onMapChange={handleMapChange}
                mapRef={mapRef}
                setMapResetHandler={setMapResetHandler}
                activePolygon={activePolygon}
                onPolygonChange={handlePolygonChange}
                centralizedFilters={centralizedFilters}
                onFilterChange={handleFilterChange}
                isActive={view === 'map'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
