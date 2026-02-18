import L from 'leaflet';
import burungnesiaLogo from '../assets/icon/icon.png';
import kupunesiaLogo from '../assets/icon/kupnes.png';
import taxaLogo from '../assets/icon/ico.png';

export const defaultMapConfig = {
  center: [-2.5489, 118.0149],
  zoom: 5,
  scrollWheelZoom: window.innerWidth > 768,
  style: { zIndex: 40 }
};

export const redCircleIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:red; width:10px; height:10px; border-radius:50%;'></div>",
  iconSize: [10, 10]
});

export const getSourceLogo = (source) => {
  if (source?.includes('burungnesia')) return burungnesiaLogo;
  if (source?.includes('kupunesia')) return kupunesiaLogo;
  if (source?.includes('taxa') || source?.includes('fobi')) return taxaLogo;
  return burungnesiaLogo;
};

export const getColor = (count, source) => {
  if (count > 100) {
    return {
      fillColor: '#ffffff', 
      color: '#1a73e8',    
      weight: 1,           
      fillOpacity: 0.85,   
      opacity: 0.9         
    };
  } else if (count > 50) {
    return {
      fillColor: '#a4cdff', 
      color: '#1a73e8',
      weight: 0.8,
      fillOpacity: 0.8,
      opacity: 0.8
    };
  } else if (count > 20) {
    return {
      fillColor: '#4d94ff', 
      color: '#1a73e8',
      weight: 0.7,
      fillOpacity: 0.75,
      opacity: 0.7
    };
  } else if (count > 10) {
    return {
      fillColor: '#0066ff', 
      color: '#1a73e8', 
      weight: 0.6,
      fillOpacity: 0.7,
      opacity: 0.6
    };
  } else if (count > 5) {
    return {
      fillColor: '#004dc4',   
      color: '#003380',
      weight: 0.5,
      fillOpacity: 0.6,
      opacity: 0.5
    };
  } else if (count > 2) {
    return {
      fillColor: '#003380', 
      color: '#001f4d',
      weight: 0.5,
      fillOpacity: 0.5,
      opacity: 0.4
    };
  } else {
    return {
      fillColor: '#2436ff', 
      color: '#2436ff',
      weight: 0.5,
      fillOpacity: 0.4,
      opacity: 0.4
    };
  }
};

export const getVisibleGridType = (zoom) => {
  const safeZoom = Math.max(0, Math.min(20, parseFloat(zoom) || 0));
  
  if (safeZoom >= 14) return 'tiny';
  if (safeZoom >= 12) return 'verySmall';
  if (safeZoom >= 10) return 'small';
  if (safeZoom >= 9) return 'mediumSmall';
  if (safeZoom >= 8) return 'medium';
  if (safeZoom >= 7) return 'mediumLarge';
  if (safeZoom >= 6) return 'large';
  if (safeZoom >= 5) return 'veryLarge';
  return 'extremelyLarge';
};

export const validateBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return false;
  
  const { _southWest, _northEast } = bounds;
  if (!_southWest || !_northEast) return false;
  
  const { lat: south, lng: west } = _southWest;
  const { lat: north, lng: east } = _northEast;
  
  return !isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east) &&
         south >= -90 && south <= 90 && north >= -90 && north <= 90 &&
         west >= -180 && west <= 180 && east >= -180 && east <= 180;
};

export const normalizeCoordinate = (coord, isLongitude = false) => {
  if (isLongitude) {
    return ((coord + 180) % 360) - 180;
  }
  return Math.max(-90, Math.min(90, coord));
}; 