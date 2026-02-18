// utils/gridHelpers.js
const GRID_SIZES = {
  tiny: 0.005,         
  verySmall: 0.01,     
  small: 0.02,         
  mediumSmall: 0.035,  
  medium: 0.05,        
  mediumLarge: 0.1,    
  large: 0.2,          
  veryLarge: 0.3,      
  extremelyLarge: 0.5  
};

const getGridSizeFromType = (gridType) => {
  return GRID_SIZES[gridType] || GRID_SIZES.large;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

const generateGrid = (markers, gridSize) => {
  if (!markers || !Array.isArray(markers) || markers.length === 0 || !gridSize) {
    return [];
  }

  const grid = {};
  const validMarkers = markers.filter(marker => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  });

  if (validMarkers.length === 0) {
    return [];
  }

  validMarkers.forEach(marker => {
    const lat = parseFloat(marker.latitude);
    const lng = parseFloat(marker.longitude);
    
    const normalizedLng = ((lng + 180) % 360) - 180;
    const latKey = Math.floor(lat / gridSize) * gridSize;
    const lngKey = Math.floor(normalizedLng / gridSize) * gridSize;
    const gridKey = `${latKey}_${lngKey}`;

    if (!grid[gridKey]) {
      grid[gridKey] = {
        bounds: [
          [latKey, lngKey],
          [latKey + gridSize, lngKey + gridSize]
        ],
        count: 0,
        data: [],
        source: marker.source
      };
    }

    grid[gridKey].data.push({
      id: marker.id,
      checklist_id: marker.checklist_id || marker.id,
      source: marker.source,
      latitude: marker.latitude,
      longitude: marker.longitude,
      created_at: marker.created_at
    });

    grid[gridKey].count++;
    
    if (marker.source?.includes('fobi')) {
      grid[gridKey].source = 'fobi';
    }
  });

  return Object.values(grid).filter(tile => {
    if (!tile.bounds || !Array.isArray(tile.bounds)) return false;
    const [[south, west], [north, east]] = tile.bounds;
    return !isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east) &&
           south >= -90 && south <= 90 && north >= -90 && north <= 90 &&
           west >= -180 && west <= 180 && east >= -180 && east <= 180;
  });
};

const getGridType = (zoom) => {
  if (zoom >= 14) return 'tiny';
  if (zoom >= 12) return 'verySmall';
  if (zoom >= 10) return 'small';
  if (zoom >= 9) return 'mediumSmall';
  if (zoom >= 8) return 'medium';
  if (zoom >= 7) return 'mediumLarge';
  if (zoom >= 6) return 'large';
  if (zoom >= 5) return 'veryLarge';
  return 'extremelyLarge';
};

const isTileInBounds = (tileBounds, mapBounds) => {
  if (!mapBounds) return true;
  const [[south, west], [north, east]] = tileBounds;
  return mapBounds.intersects([[south, west], [north, east]]);
};

export {
  generateGrid,
  getGridType,
  isTileInBounds,
  GRID_SIZES,
  getGridSizeFromType
}; 