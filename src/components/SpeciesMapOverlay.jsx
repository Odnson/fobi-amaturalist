import React, { useEffect, useState, useMemo } from 'react';
import { Marker, Popup, Rectangle } from 'react-leaflet';
import { redCircleIcon } from '../utils/mapHelpers';
import { generateGrid, getGridType, GRID_SIZES, isTileInBounds } from '../utils/gridHelpers';
import { Sidebar } from './Map/Sidebar';

const SpeciesMapOverlay = ({ species, bounds, zoomLevel, setStats, dataSources }) => {
  const activeSources = dataSources || ['fobi', 'burungnesia', 'kupunesia'];
  const sourceKey = [...activeSources].sort().join(','); // Stable key untuk dependency
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarData, setSidebarData] = useState({
    selectedGrid: null,
    species: [],
    currentPage: 1,
    loading: false,
    error: null,
    isOpen: false
  });

  useEffect(() => {
    const fetchMarkers = async () => {
      if (!species?.id) return;
      
      setLoading(true);
      try {
        const needFobi = activeSources.includes('fobi');
        const needBurungnesia = activeSources.includes('burungnesia') || activeSources.includes('kupunesia');
        
        const promises = [];
        const labels = [];
        if (needFobi) {
          const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
          promises.push(fetch(`${import.meta.env.VITE_API_URL}/fobi-markers-by-taxa?taxa_id=${species.id}&${sourceParams}`));
          labels.push('fobi');
        }
        if (needBurungnesia) {
          promises.push(fetch(`${import.meta.env.VITE_API_URL}/markers-by-taxa?taxa_id=${species.id}`));
          labels.push('markers');
        }
        
        const responses = await Promise.all(promises);
        const dataArrays = await Promise.all(responses.map(r => r.json()));
        
        let allMarkers = [];
        dataArrays.forEach((data, i) => {
          if (Array.isArray(data)) allMarkers = [...allMarkers, ...data];
        });
        const mapSource = (source) => {
          if (source === 'burungnesia_fobi' || source === 'burungnesia') return 'burungnesia';
          if (source === 'kupunesia_fobi' || source === 'kupunesia') return 'kupunesia';
          if (source === 'taxa_fobi' || source === 'fobi') return 'fobi';
          return source || 'fobi';
        };
        allMarkers = allMarkers.map(m => ({ ...m, source: mapSource(m.source) }));
        allMarkers = allMarkers.filter(m => activeSources.includes(m.source));
        
        setMarkers(allMarkers);
      } catch (error) {
        console.error('Error fetching species markers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, [species?.id, sourceKey]);
  useEffect(() => {
    if (!setStats || !sidebarData.selectedGrid) return;

    const gridData = sidebarData.selectedGrid.data || [];
    
    const fetchStats = async () => {
      try {
        const searchName = species?.scientific_name || species?.display_name || '';
        const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/filtered-stats?search=${encodeURIComponent(searchName)}&${sourceParams}`
        );
        const data = await response.json();

        if (data.success) {
          setStats({
            observasi: data.stats.observasi || gridData.length,
            taksa: data.stats.taksa || 1,
            media: data.stats.media || 0,
          });
        } else {
          setStats({
            observasi: gridData.length,
            taksa: 1,
            media: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching grid stats:', error);
        
        setStats({
          observasi: gridData.length,
          taksa: 1,
          media: 0,
        });
      }
    };

    fetchStats();
  }, [sidebarData.selectedGrid, species, setStats]);

  const gridType = getGridType(zoomLevel);
  const gridSize = GRID_SIZES[gridType];
  
  const grid = useMemo(() => {
    if (!bounds || !markers.length) return [];
    return generateGrid(markers, gridSize);
  }, [bounds, markers, gridSize]);

  const visibleGrid = useMemo(() => {
    return grid.filter(tile => isTileInBounds(tile.bounds, bounds));
  }, [grid, bounds]);

  const handleGridClick = (tile) => {
    setSidebarData({
      selectedGrid: tile,
      species: [species],
      currentPage: 1,
      loading: false,
      error: null,
      isOpen: true
    });
  };

  const handleLoadMore = () => {
    setSidebarData(prev => ({
      ...prev,
      currentPage: prev.currentPage + 1
    }));
  };

  const handleCloseSidebar = () => {
    setSidebarData(prev => ({
      ...prev,
      selectedGrid: null,
      isOpen: false
    }));
    setStats(null);
  };

  if (loading || !markers.length) return null;

  const getGridStyle = (count) => {
    const baseOpacity = 0.1;
    const opacityIncrement = 0.05;
    const maxOpacity = 0.4;
    
    return {
      color: '#ff0000',
      weight: 1,
      fillColor: '#ff0000',
      fillOpacity: Math.min(baseOpacity + (count * opacityIncrement), maxOpacity)
    };
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        {zoomLevel < 12 ? (
          visibleGrid.map((tile, index) => (
            <Rectangle
              key={`${tile.bounds[0][0]}_${tile.bounds[0][1]}_${index}`}
              bounds={tile.bounds}
              pathOptions={getGridStyle(tile.count)}
              eventHandlers={{
                click: () => handleGridClick(tile)
              }}
            >
              <Popup>
                <div>
                  <p>Jumlah observasi: {tile.count}</p>
                  <p>Klik untuk melihat detail</p>
                </div>
              </Popup>
            </Rectangle>
          ))
        ) : (
          markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={redCircleIcon}
            >
              <Popup>
                <div>
                  <p>ID: {marker.id}</p>
                  <p>Source: {marker.source}</p>
                  <p>Date: {new Date(marker.created_at).toLocaleDateString()}</p>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </div>

      {/* Sidebar dengan styling yang konsisten */}
      {sidebarData.isOpen && (
        <div className="w-400 h-full">
          <Sidebar
            data={sidebarData}
            setStats={setStats}
            onClose={handleCloseSidebar}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}
    </div>
  );
};

export default SpeciesMapOverlay;