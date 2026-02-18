import localforage from 'localforage';

const geocodeCache = localforage.createInstance({
  name: 'geocodeCache'
});

export const getLocationName = async (latitude, longitude) => {
  try {
    const cacheKey = `${latitude},${longitude}`;
    
    const cachedLocation = await geocodeCache.getItem(cacheKey);
    if (cachedLocation) {
      return cachedLocation;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'FOBI-WebApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    let locationName = '';
    if (data.address) {
      const parts = [];
      if (data.address.village) parts.push(data.address.village);
      else if (data.address.suburb) parts.push(data.address.suburb);
      else if (data.address.town) parts.push(data.address.town);
      else if (data.address.city) parts.push(data.address.city);
      
      if (data.address.state) parts.push(data.address.state);
      
      locationName = parts.join(', ');
    }

    await geocodeCache.setItem(cacheKey, locationName);

    return locationName || `${latitude}, ${longitude}`;
  } catch (error) {
    console.warn('Error getting location name:', error);
    return `${latitude}, ${longitude}`;
  }
};

const queue = [];
let processing = false;

const processQueue = async () => {
  if (processing || queue.length === 0) return;
  
  processing = true;
  const task = queue.shift();
  
  try {
    const result = await getLocationName(task.latitude, task.longitude);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  }
  
  setTimeout(() => {
    processing = false;
    processQueue();
  }, 1000);
};

export const queueLocationName = (latitude, longitude) => {
  return new Promise((resolve, reject) => {
    queue.push({ latitude, longitude, resolve, reject });
    processQueue();
  });
}; 