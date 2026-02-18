export const toRad = (value) => {
  return value * Math.PI / 180;
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const calculateCenterPoint = (south, north, west, east) => {
  const lat = (south + north) / 2;
  const lng = (west + east) / 2;
  return { lat, lng };
};

export const calculateZoomLevel = (radius, boundingbox) => {
  if (boundingbox) {
    const [south, north, west, east] = boundingbox.map(coord => parseFloat(coord));
    const width = calculateDistance(south, west, south, east);
    const height = calculateDistance(south, west, north, west);
    const size = Math.max(width, height);
    
    if (size > 1000) return 5;  
    if (size > 500) return 6;  
    if (size > 200) return 7;   
    if (size > 100) return 8;   
    if (size > 50) return 9;    
    if (size > 20) return 10;   
    if (size > 10) return 11;   
    return 12;                  
  }
  
  if (radius >= 100) return 7;
  if (radius >= 50) return 8;
  if (radius >= 10) return 10;
  if (radius >= 5) return 11;
  return 12;
}; 