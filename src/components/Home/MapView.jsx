import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useMarkers } from '../../hooks/useMarkers';
import { useMapZoom } from '../../hooks/useMapZoom';
import { useSidebar } from '../../hooks/useSidebar';
import { useGridData } from '../../hooks/useGridData';
import { MapControls } from '../Map/MapControls';
import { MapOverlay } from '../Map/GridMarkers';
import { defaultMapConfig, redCircleIcon } from '../../utils/mapHelpers';
import { generateGrid, getGridType, GRID_SIZES } from '../../utils/gridHelpers';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { ZoomHandler } from '../Map/ZoomHandler';
import { calculateZoomLevel } from '../../utils/geoHelpers';
import { throttle, debounce } from 'lodash';
import { Sidebar } from '../Map/Sidebar';
import SpeciesMapOverlay from '../SpeciesMapOverlay';
import DrawingTools from '../Map/DrawingTools';
import * as turf from '@turf/turf';
import { PolygonSidebar } from '../Map/PolygonSidebar';
import { apiFetch } from '../../utils/api';
import L from 'leaflet';
import { getVisibleGridType } from '../../utils/mapHelpers';
import { FooterBottom } from '../Footer';
const MapController = ({ setVisibleBounds, setZoomLevel, setVisibleGrid }) => {
  const map = useMap();
  const updateRef = useRef(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const updateMapState = throttle(() => {
      const currentZoom = map.getZoom();
      const bounds = map.getBounds();
      
      if (bounds && bounds._southWest && bounds._northEast) {
        setVisibleBounds(bounds);
      }
      
      setZoomLevel(currentZoom);
      const gridType = getVisibleGridType(currentZoom);
      setVisibleGrid(gridType);
    }, 100); // Kurangi throttle untuk initial load
    if (!initialLoadRef.current) {
      updateMapState();
      initialLoadRef.current = true;
    }

    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);
    map.on('load', updateMapState);

    return () => {
      map.off('moveend', updateMapState);
      map.off('zoomend', updateMapState);
      map.off('load', updateMapState);
      updateMapState.cancel();
    };
  }, [map, setVisibleBounds, setZoomLevel, setVisibleGrid]);

  return null;
};

const MapView = ({ 
  searchParams, 
  filterParams, 
  setStats, 
  setLoading: setParentLoading, 
  onReset, 
  onMapChange, 
  mapRef, 
  setMapResetHandler, 
  activePolygon, 
  onPolygonChange,
  centralizedFilters,
  onFilterChange,
  isActive = true
}) => {
  const isMobile = window.innerWidth <= 768;
  const centralizedFiltersRef = useRef(centralizedFilters);
  const filterParamsRef = useRef(filterParams);
  useEffect(() => { centralizedFiltersRef.current = centralizedFilters; }, [centralizedFilters]);
  useEffect(() => { filterParamsRef.current = filterParams; }, [filterParams]);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive && mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, [isActive]);
  const safeSetStats = useCallback((newStats) => {
    if (isActiveRef.current && setStats) {
      setStats(newStats);
    }
  }, [setStats]);
  const { mapMarkers, loading, filterLoading, filterMarkers, refreshMarkers, fetchFilteredMarkers, lastUpdate, currentShape, setCurrentShape } = useMarkers();
  const { gridData, updateGridData } = useGridData();
  const { currentZoom, handleZoom } = useMapZoom();
  const { sidebarData, toggleSidebar, loadMore } = useSidebar();

  const [visibleBounds, setVisibleBounds] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(5);
  const [visibleGrid, setVisibleGrid] = useState('large');
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [speciesMarkers, setSpeciesMarkers] = useState([]);
  const isSpeciesView = Boolean(searchParams?.species);
  const [polygonSidebarData, setPolygonSidebarData] = useState({
    isOpen: false,
    gridsInPolygon: [],
    loading: false,
    shape: null
  });
  const [activePolygonLayer, setActivePolygonLayer] = useState(null);
  const polygonInitializedRef = useRef(false);
  const polygonStatsLoadedRef = useRef(false);
  const [activeShape, setActiveShape] = useState(null);
  const isInitialLoad = useRef(true);
  const isLoading = localLoading || filterLoading;
  useEffect(() => {
    if (isActive) {
      setParentLoading(isLoading);
    }
  }, [isLoading, setParentLoading, isActive]);
  const gridType = getGridType(zoomLevel);
  const gridSize = GRID_SIZES[gridType];
  const createTileIndex = useCallback((markers, bounds) => {
    if (!markers || !bounds) return new Map();
    
    const tileSize = 1; // 1 derajat per tile
    const tileIndex = new Map();

    markers.forEach(marker => {
      const lat = parseFloat(marker.latitude);
      const lng = parseFloat(marker.longitude);
      const tileX = Math.floor(lng / tileSize);
      const tileY = Math.floor(lat / tileSize);
      const tileKey = `${tileX}:${tileY}`;

      if (!tileIndex.has(tileKey)) {
        tileIndex.set(tileKey, []);
      }
      tileIndex.get(tileKey).push(marker);
    });

    return tileIndex;
  }, []);
  useEffect(() => {
    const updateMap = async () => {
      if (!mapMarkers || !visibleBounds) return;

      setLocalLoading(true);
      try {
        const effectiveFilters = centralizedFilters || filterParams;
        
        const filteredMarkers = activeShape 
          ? filterMarkers(mapMarkers, effectiveFilters, searchParams, activeShape)
          : filterMarkers(mapMarkers, effectiveFilters, searchParams);
        
        const tileIndex = createTileIndex(filteredMarkers, visibleBounds);
        const visibleTiles = getVisibleTiles(visibleBounds, zoomLevel);
        const visibleMarkers = [];
        
        visibleTiles.forEach(tileKey => {
          const tileMarkers = tileIndex.get(tileKey) || [];
          visibleMarkers.push(...tileMarkers);
        });

        updateGridData(visibleMarkers, zoomLevel, visibleBounds);
        setLocalLoading(false);
      } catch (error) {
        console.error('Error updating map:', error);
        setLocalLoading(false);
      }
    };

    updateMap();
  }, [mapMarkers, visibleBounds, zoomLevel, filterParams, searchParams, activeShape, centralizedFilters]);
  const getVisibleTiles = (bounds, zoom) => {
    if (!bounds) return [];

    const tileSize = 1; // 1 derajat per tile
    const tiles = new Set();

    const minLng = Math.floor(bounds.getWest() / tileSize);
    const maxLng = Math.ceil(bounds.getEast() / tileSize);
    const minLat = Math.floor(bounds.getSouth() / tileSize);
    const maxLat = Math.ceil(bounds.getNorth() / tileSize);

    for (let x = minLng; x <= maxLng; x++) {
      for (let y = minLat; y <= maxLat; y++) {
        tiles.add(`${x}:${y}`);
      }
    }

    return Array.from(tiles);
  };
  useEffect(() => {
    if (mapRef.current && mapMarkers && !gridData.tiles.length) {
      const map = mapRef.current;
      const currentZoom = map.getZoom();
      const currentBounds = map.getBounds();
      
      if (currentBounds && currentBounds._southWest && currentBounds._northEast) {
        const effectiveFilters = centralizedFilters || filterParams;
        const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
      }
    }
  }, [mapRef.current, mapMarkers]);

  const handleMapCreated = useCallback((map) => {
    mapRef.current = map;
    
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();
    
    if (currentBounds && currentBounds._southWest && currentBounds._northEast) {
      setZoomLevel(currentZoom);
      setVisibleBounds(currentBounds);
      
      if (mapMarkers) {
        const effectiveFilters = centralizedFilters || filterParams;
        const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
      }
    }
  }, [mapMarkers, filterParams, searchParams, updateGridData, centralizedFilters]);
  useEffect(() => {
    if (mapRef.current && searchParams?.latitude && searchParams?.longitude) {
      const map = mapRef.current;
      
      if (searchParams.boundingbox) {
        const bounds = [
          [searchParams.boundingbox[0], searchParams.boundingbox[2]],
          [searchParams.boundingbox[1], searchParams.boundingbox[3]]
        ];
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 12,
          animate: true,
          duration: 1 // durasi animasi dalam detik
        });
      } else {
        const zoom = filterParams?.radius 
          ? calculateZoomFromRadius(filterParams.radius)
          : 12;

        map.setView(
          [searchParams.latitude, searchParams.longitude],
          zoom,
          {
            animate: true,
            duration: 1
          }
        );
      }
    }
  }, [searchParams?.latitude, searchParams?.longitude, searchParams?.boundingbox, filterParams?.radius]);
  const calculateZoomFromRadius = (radius) => {
    if (radius <= 1) return 15;
    if (radius <= 5) return 13;
    if (radius <= 10) return 12;
    if (radius <= 20) return 11;
    if (radius <= 50) return 10;
    if (radius <= 100) return 9;
    return 8;
  };
  const handleSidebarClose = useCallback((newStats) => {
    if (sidebarData.isOpen) {
      toggleSidebar(null);
      if (newStats) {
        localStorage.setItem('currentStats', JSON.stringify(newStats));
        console.log('MapView: Menyimpan stats ke localStorage dari handleSidebarClose:', newStats);
        
        safeSetStats(newStats);
      }
    }
  }, [sidebarData.isOpen, toggleSidebar, setStats]);
  const calculateRadiusFromBounds = (bounds) => {
    const center = bounds.getCenter();
    const northEast = bounds.getNorthEast();
    const radiusInMeters = center.distanceTo(northEast);
    
    return radiusInMeters;
  };
  const fetchFilteredStats = async (params) => {
    try {
      const { bounds, zoom, filters } = params || {};
      const queryParams = new URLSearchParams();
      if (centralizedFilters) {
        if (centralizedFilters.search) queryParams.append('search', centralizedFilters.search);
        if (centralizedFilters.start_date) queryParams.append('start_date', centralizedFilters.start_date);
        if (centralizedFilters.end_date) queryParams.append('end_date', centralizedFilters.end_date);
        if (centralizedFilters.grade && centralizedFilters.grade.length > 0) {
          centralizedFilters.grade.forEach(g => queryParams.append('grade[]', g));
        }
        if (centralizedFilters.data_source && centralizedFilters.data_source.length > 0) {
          centralizedFilters.data_source.forEach(ds => queryParams.append('data_source[]', ds));
        }
        if (centralizedFilters.has_media) queryParams.append('has_media', '1');
        if (centralizedFilters.media_type) queryParams.append('media_type', centralizedFilters.media_type);
        if (centralizedFilters.date_type) queryParams.append('date_type', centralizedFilters.date_type);
        if (centralizedFilters.user_id) queryParams.append('user_id', centralizedFilters.user_id);
        if (centralizedFilters.taxonomy_rank) queryParams.append('taxonomy_rank', centralizedFilters.taxonomy_rank);
        if (centralizedFilters.taxonomy_value) queryParams.append('taxonomy_value', centralizedFilters.taxonomy_value);
        if (centralizedFilters.polygon) queryParams.append('polygon', centralizedFilters.polygon);
      } else {
        if (filterParams) {
          Object.entries(filterParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(`${key}[]`, v));
            } else if (value !== null && value !== undefined) {
              queryParams.append(key, value);
            }
          });
        }
        if (searchParams?.query) {
          queryParams.append('search', searchParams.query);
        }
      }
      if (bounds && typeof bounds.getNorthEast === 'function') {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        queryParams.append('min_lat', sw.lat);
        queryParams.append('max_lat', ne.lat);
        queryParams.append('min_lng', sw.lng);
        queryParams.append('max_lng', ne.lng);
      }
      if (zoom) {
        queryParams.append('zoom', zoom);
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParams}`);
      const data = await response.json();
      
      if (setStats && data.stats) {
        const validStats = {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };
        
        localStorage.setItem('currentStats', JSON.stringify(validStats));
        safeSetStats(validStats);
      }
      
      return data.stats;
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
      return null;
    }
  };
  useEffect(() => {
    if (mapMarkers && mapMarkers.length > 0 && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [mapMarkers]);
  useEffect(() => {
    if (searchParams?.species) {
      setSelectedSpecies(searchParams.species);
    } else {
      setSelectedSpecies(null);
    }
  }, [searchParams?.species]);

  const handleBoundsChange = (newBounds) => {
    setVisibleBounds(newBounds);
  };

  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      
      const handleMapUpdate = () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        onMapChange?.(bounds, zoom);
      };

      map.on('moveend', handleMapUpdate);
      map.on('zoomend', handleMapUpdate);

      return () => {
        map.off('moveend', handleMapUpdate);
        map.off('zoomend', handleMapUpdate);
      };
    }
  }, [onMapChange]);
  useEffect(() => {
    if (!searchParams?.species?.id) {
      setSpeciesMarkers([]);
    }
  }, [searchParams?.species]);
  const handleReset = useCallback(() => {
    console.log('MapView: handleReset dipanggil');
    
    const emptyParams = {
      search: '',
      location: '',
      latitude: '',
      longitude: '',
      searchType: 'all',
      selectedId: null,
      display: '',
      species: null,
      start_date: '',
      end_date: '',
      date_type: 'created_at',
      grade: [],
      has_media: false,
      media_type: '',
      data_source: ['fobi'], // Default hanya FOBi/Amaturalist
      user_id: null,
      user_name: '',
      taxonomy_rank: '',
      taxonomy_value: ''
    };
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView(
        defaultMapConfig.center,
        defaultMapConfig.zoom,
        { animate: true }
      );
      setZoomLevel(defaultMapConfig.zoom);
      setVisibleGrid('large');
      setSpeciesMarkers([]);
      setSelectedSpecies(null);
      setLocalLoading(false);
      toggleSidebar(null);
      if (onReset) {
        console.log('MapView: Memanggil onReset (handleReset di HomePage)');
        onReset(emptyParams);
      }
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats && setStats) {
        console.log('MapView: Menggunakan cachedStats dari localStorage setelah reset');
        safeSetStats(JSON.parse(cachedStats));
      }
    }
    setCurrentShape(null);
    setActiveShape(null);
  }, [mapRef, toggleSidebar, onReset, setZoomLevel, setVisibleGrid, setSpeciesMarkers, setSelectedSpecies, setLocalLoading, setStats]);
  useEffect(() => {
    if (setMapResetHandler) {
      setMapResetHandler(() => handleReset);
    }
  }, [handleReset, setMapResetHandler]);
  const [drawnShape, setDrawnShape] = useState(activePolygon);
  const [indonesiaBoundary, setIndonesiaBoundary] = useState(null);
  useEffect(() => {
    fetch('/indo.geojson')
      .then(response => response.json())
      .then(data => {
        setIndonesiaBoundary(data);
      })
      .catch(error => console.error('Error loading Indonesia boundary:', error));
  }, []);
  const fetchPolygonStatsDebounced = useRef(
    debounce(async (shapeData, activeDataSource) => {
      try {
        if (polygonStatsLoadedRef.current) {
          console.log('Polygon stats already loaded, skipping fetch');
          return;
        }
        
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/polygon-stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            shape: shapeData,
            data_source: activeDataSource || ['fobi', 'burungnesia', 'kupunesia']
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && setStats) {
          safeSetStats(data.stats);
          polygonStatsLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching polygon stats:', error);
      }
    }, 1000)
  ).current;
  const handleShapeDrawn = useCallback(async (layer, shapeData) => {
    try {
      setActiveShape(shapeData);
      if (onPolygonChange) {
        onPolygonChange(shapeData);
      }
      polygonStatsLoadedRef.current = false;
      setTimeout(async () => {
        try {
      const effectiveFilters = centralizedFiltersRef.current || filterParamsRef.current;
      const activeDataSource = effectiveFilters?.data_source || ['fobi', 'burungnesia', 'kupunesia'];
      const response = await apiFetch('/grids-in-polygon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          shape: shapeData,
          data_source: activeDataSource
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        if (sidebarData.isOpen) {
          toggleSidebar(null);
        }
        setPolygonSidebarData({
          isOpen: true,
          gridsInPolygon: data.gridsInPolygon,
              loading: false,
              shape: shapeData,
              dataSource: activeDataSource
        });
            fetchPolygonStatsDebounced(shapeData, activeDataSource);
      } else {
        console.error('Error fetching grids in polygon:', data.message);
      }
        } catch (error) {
          console.error('Error handling shape drawn (delayed):', error);
        }
      }, 500);
    } catch (error) {
      console.error('Error handling shape drawn:', error);
    }
  }, [onPolygonChange, fetchPolygonStatsDebounced]);

  const handleShapeDeleted = () => {
    setDrawnShape(null);
    if (onPolygonChange) {
      onPolygonChange(null);
    }
    
    if (mapMarkers) {
      const effectiveFilters = centralizedFilters || filterParams;
      const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
      updateGridData(filteredMarkers, zoomLevel, visibleBounds);
    }
    setPolygonSidebarData({
      isOpen: false,
      gridsInPolygon: [],
      loading: false,
      shape: null
    });
  };
  useEffect(() => {
    if (sidebarData) {
      const speciesArray = Array.isArray(sidebarData.species) ? sidebarData.species : [];
      
      if (speciesArray.length > 0) {
        speciesArray.forEach(species => {
        });
      }
    }
  }, [sidebarData]);
  useEffect(() => {
    if (!activePolygon || !mapRef.current || polygonInitializedRef.current) return;
    const initializePolygon = () => {
      try {
        let layer;
        if (activePolygon.type === 'Circle') {
          const center = L.latLng(activePolygon.center[1], activePolygon.center[0]);
          layer = L.circle(center, { radius: activePolygon.radius });
        } else if (activePolygon.type === 'Polygon') {
          const latLngs = activePolygon.coordinates[0].map(coord => 
            L.latLng(coord[1], coord[0])
          );
          layer = L.polygon(latLngs);
        }
        
        if (layer) {
          layer.addTo(mapRef.current);
          setActivePolygonLayer(layer);
          polygonInitializedRef.current = true;
          setActiveShape(activePolygon);
          setTimeout(() => {
            handlePolygonInitialized(layer, activePolygon);
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing polygon:', error);
      }
    };
    if (mapRef.current._loaded) {
      initializePolygon();
    } else {
      mapRef.current.once('load', initializePolygon);
    }
    
    return () => {
      if (mapRef.current && !mapRef.current._loaded) {
        mapRef.current.off('load', initializePolygon);
      }
    };
  }, [activePolygon, mapRef.current]);
  const handlePolygonInitialized = async (layer, shapeData) => {
    try {
      if (onPolygonChange) {
        onPolygonChange(shapeData);
      }
      if (onFilterChange) {
        onFilterChange({
          polygon: formatPolygonForApi(shapeData)
        });
      }
      const effectiveFilters = centralizedFiltersRef.current || filterParamsRef.current;
      const activeDS = effectiveFilters?.data_source || ['fobi', 'burungnesia', 'kupunesia'];
      fetchPolygonStatsDebounced(shapeData, activeDS);
    } catch (error) {
      console.error('Error initializing polygon:', error);
    }
  };
  const fetchPolygonStats = async (shapeData) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/polygon-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shape: shapeData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && setStats) {
        safeSetStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching polygon stats:', error);
    }
  };
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
  const handlePolygonSidebarClose = useCallback((resetPolygon = false, newStats = null) => {
    if (resetPolygon) {
      setActiveShape(null);
      if (onPolygonChange) {
        onPolygonChange(null);
      }
      if (activePolygonLayer && mapRef.current) {
        mapRef.current.removeLayer(activePolygonLayer);
        setActivePolygonLayer(null);
      }
      polygonInitializedRef.current = false;
      if (mapMarkers) {
        const effectiveFilters = centralizedFilters || filterParams;
        const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
        updateGridData(filteredMarkers, zoomLevel, visibleBounds);
      }
      if (newStats && setStats) {
        localStorage.setItem('currentStats', JSON.stringify(newStats));
        console.log('MapView: Menyimpan stats ke localStorage dari handlePolygonSidebarClose:', newStats);
        
        safeSetStats(newStats);
      }
    }
    setPolygonSidebarData(prev => ({
      ...prev,
      isOpen: false
    }));
  }, [mapMarkers, filterParams, searchParams, zoomLevel, visibleBounds, updateGridData, onPolygonChange, activePolygonLayer, mapRef, setStats, centralizedFilters]);
  const wasActiveRef = useRef(isActive);
  useEffect(() => {
    if (isActive && !wasActiveRef.current && mapMarkers && mapRef.current) {
      const currentBounds = mapRef.current.getBounds();
      const currentZoom = mapRef.current.getZoom();
      if (currentBounds && currentZoom) {
        const effectiveFilters = centralizedFilters || filterParams;
        const filteredMarkers = filterMarkers(mapMarkers, effectiveFilters, searchParams);
        updateGridData(filteredMarkers, currentZoom, currentBounds);
        fetchFilteredStats({ bounds: currentBounds, zoom: currentZoom, filters: effectiveFilters });
      }
    }
    wasActiveRef.current = isActive;
  }, [isActive]);
  const prevFilterSigRef = useRef('');
  useEffect(() => {
    if (!centralizedFilters) return;
    const filterSig = JSON.stringify({
      user_id: centralizedFilters.user_id || null,
      taxonomy_rank: centralizedFilters.taxonomy_rank || null,
      taxonomy_value: centralizedFilters.taxonomy_value || null,
      start_date: centralizedFilters.start_date || null,
      end_date: centralizedFilters.end_date || null,
      date_type: centralizedFilters.date_type || 'created_at',
      grade: centralizedFilters.grade || [],
      has_media: centralizedFilters.has_media || false,
      media_type: centralizedFilters.media_type || null,
      data_source: centralizedFilters.data_source || ['fobi'],
      location_name: centralizedFilters.location_name || null,
    });
    if (filterSig === prevFilterSigRef.current) return;
    prevFilterSigRef.current = filterSig;
    
    fetchFilteredMarkers({
      user_id: centralizedFilters.user_id,
      taxonomy_rank: centralizedFilters.taxonomy_rank,
      taxonomy_value: centralizedFilters.taxonomy_value,
      start_date: centralizedFilters.start_date,
      end_date: centralizedFilters.end_date,
      date_type: centralizedFilters.date_type,
      grade: centralizedFilters.grade,
      has_media: centralizedFilters.has_media,
      media_type: centralizedFilters.media_type,
      data_source: centralizedFilters.data_source,
      location_name: centralizedFilters.location_name,
    });
  }, [
    centralizedFilters?.user_id, centralizedFilters?.taxonomy_value, centralizedFilters?.taxonomy_rank,
    centralizedFilters?.start_date, centralizedFilters?.end_date, centralizedFilters?.date_type,
    centralizedFilters?.grade, centralizedFilters?.has_media, centralizedFilters?.media_type,
    centralizedFilters?.data_source, centralizedFilters?.location_name,
    fetchFilteredMarkers
  ]);
  useEffect(() => {
    if (!activeShape || !polygonSidebarData.shape) return;
    
    const activeDataSource = centralizedFilters?.data_source || ['fobi', 'burungnesia', 'kupunesia'];
    const currentDataSource = polygonSidebarData.dataSource || [];
    const sourceChanged = JSON.stringify(activeDataSource.sort()) !== JSON.stringify([...currentDataSource].sort());
    if (!sourceChanged) return;
    
    const refetchPolygonData = async () => {
      try {
        const response = await apiFetch('/grids-in-polygon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shape: polygonSidebarData.shape,
            data_source: activeDataSource
          })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          setPolygonSidebarData(prev => ({
            ...prev,
            isOpen: true,
            gridsInPolygon: data.gridsInPolygon,
            loading: false,
            dataSource: activeDataSource
          }));
          polygonStatsLoadedRef.current = false;
          fetchPolygonStatsDebounced(polygonSidebarData.shape, activeDataSource);
        }
      } catch (error) {
        console.error('Error re-fetching polygon data after filter change:', error);
      }
    };
    
    refetchPolygonData();
  }, [centralizedFilters?.data_source, activeShape, polygonSidebarData.shape]);

  if (loading) {
    return (
      <div className="h-[70vh] w-full bg-gray-900 relative overflow-hidden">
        {/* Skeleton Loading untuk Peta Indonesia */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Grid overlay effect */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
            {Array(48).fill().map((_, i) => (
              <div key={i} className="border border-gray-800 opacity-30"></div>
            ))}
          </div>
          
          {/* Pulau-pulau Utama Indonesia */}
          <div className="w-[80%] max-w-4xl relative">
            {/* Sumatra */}
            <div className="absolute top-[25%] left-[10%] w-[20%] h-[40%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Jawa */}
            <div className="absolute top-[60%] left-[30%] w-[18%] h-[8%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Kalimantan */}
            <div className="absolute top-[30%] left-[35%] w-[22%] h-[30%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Sulawesi */}
            <div className="absolute top-[30%] left-[60%] w-[10%] h-[25%] bg-gray-700 rounded-full opacity-70 animate-pulse transform rotate-45"></div>
            
            {/* Papua */}
            <div className="absolute top-[35%] left-[75%] w-[18%] h-[25%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            
            {/* Pulau-pulau kecil */}
            <div className="absolute top-[65%] left-[50%] w-[5%] h-[5%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            <div className="absolute top-[50%] left-[55%] w-[7%] h-[7%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
            <div className="absolute top-[60%] left-[65%] w-[6%] h-[6%] bg-gray-700 rounded-full opacity-70 animate-pulse"></div>
          </div>
          
          {/* Beberapa titik data acak sebagai indikator */}
          <div className="absolute inset-0">
            {Array(15).fill().map((_, i) => (
              <div 
                key={i} 
                className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-70 animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 1}s`
                }}
              ></div>
            ))}
          </div>
          
          {/* Loading Text */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-200 text-sm">Memuat peta...</span>
            </div>
          </div>
          
          {/* Background pulse effect */}
          <div className="absolute inset-0 bg-blue-500 opacity-5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="relative flex flex-col md:flex-row h-full pb-8">
      <div className="relative w-full h-full">
        <MapContainer
          center={defaultMapConfig.center}
          zoom={defaultMapConfig.zoom}
          ref={mapRef}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapController 
            setVisibleBounds={setVisibleBounds}
            setZoomLevel={setZoomLevel}
            setVisibleGrid={setVisibleGrid}
          />

          <ZoomHandler 
            gridData={gridData}
            setVisibleGrid={setVisibleGrid}
            isMobile={isMobile}
          />

          <MapControls onReset={handleReset} />

          <MapOverlay
            grid={gridData.tiles}
            markers={mapMarkers}
            bounds={visibleBounds}
            zoomLevel={zoomLevel}
            onGridClick={(tile) => {
              if (isSpeciesView) {
                tile.data = tile.data?.map(item => ({
                  ...item,
                  species_name_latin: searchParams.species.scientific_name,
                  species_name_local: searchParams.species.common_name,
                  count: item.count || 1
                }));
              }
              setPolygonSidebarData(prev => ({ ...prev, isOpen: false }));
              toggleSidebar(tile);
            }}
            filterParams={filterParams}
            searchParams={searchParams}
          />

          <DrawingTools 
            onShapeDrawn={handleShapeDrawn}
            onShapeDeleted={handleShapeDeleted}
            setStats={setStats}
            onDrawingStateChange={setDrawingMode}
            activePolygon={activePolygon}
          />

          {/* Tambahkan indikator polygon aktif dengan tombol toggle sidebar */}
          {activePolygon && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-lg flex items-center space-x-2">
              <span>Filter Polygon Aktif</span>
              <button 
                onClick={() => {
                  const willOpen = !polygonSidebarData.isOpen;
                  if (willOpen && sidebarData.isOpen) {
                    toggleSidebar(null);
                  }
                  setPolygonSidebarData(prev => ({
                    ...prev,
                    isOpen: willOpen
                  }));
                }}
                className="ml-2 text-white hover:text-gray-200 bg-blue-700 hover:bg-blue-800 px-2 py-0.5 rounded-full text-xs"
                aria-label="Toggle sidebar polygon"
              >
                {polygonSidebarData.isOpen ? 'Sembunyikan Detail' : 'Lihat Detail'}
              </button>
              <button 
                onClick={() => handlePolygonSidebarClose(true)}
                className="ml-1 text-white hover:text-red-200"
                aria-label="Hapus filter polygon"
              >
                ×
              </button>
            </div>
          )}
        </MapContainer>

        {isLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-200 text-sm">Memuat data peta...</span>
              <div className="ml-1 flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      {sidebarData.isOpen && (
        <Sidebar
          data={{
            ...sidebarData,
            species: isSpeciesView ? [searchParams.species] : sidebarData.species
          }}
          setStats={setStats}
          onClose={handleSidebarClose}
          onLoadMore={loadMore}
          onReset={handleReset}
        />
      )}

      {/* Polygon Sidebar */}
      {polygonSidebarData.isOpen && (
        <div className="absolute inset-0 z-[1001] md:relative md:inset-auto md:z-[999]">
        <PolygonSidebar
          data={polygonSidebarData}
          onClose={handlePolygonSidebarClose}
          setStats={setStats}
        />
        </div>
      )}
    </div>
    
    {/* Footer Bottom - Fixed di bawah layar */}
    <FooterBottom />
    </>
  );
};

export default React.memo(MapView);
