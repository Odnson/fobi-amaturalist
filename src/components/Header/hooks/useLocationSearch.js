import { useState, useRef } from 'react';
import { calculateDistance, calculateZoomLevel } from '../../../utils/geoHelpers';
import { MAJOR_ISLANDS } from '../utils';

export const useLocationSearch = () => {
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const locationDebounceTimer = useRef(null);

  const handleLocationSearch = async (locationName) => {
    if (!locationName) {
      setLocationSuggestions([]);
      return;
    }

    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(locationName)}&` +
        `limit=5&` +
        `addressdetails=1&` +
        `bounded=1&` +
        `countrycodes=id`
      );
      const nominatimData = await response.json();

      const processedNominatim = nominatimData
        .filter(item => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          return !isNaN(lat) && !isNaN(lon) &&
                 lat >= -11.0 && lat <= 6.0 &&
                 lon >= 95.0 && lon <= 141.0;
        })
        .map(item => {
          const address = item.address;
          const parts = [];

          if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
          }
          if (address.state || address.province) {
            parts.push(address.state || address.province);
          }

          const bbox = item.boundingbox.map(coord => parseFloat(coord));
          const [south, north, west, east] = bbox;
          const width = calculateDistance(south, west, south, east);
          const height = calculateDistance(south, west, north, west);
          const radius = Math.max(width, height) / 2;

          const normalizedLon = ((parseFloat(item.lon) + 180) % 360) - 180;

          return {
            display_name: parts.join(', '),
            lat: parseFloat(item.lat),
            lon: normalizedLon,
            boundingbox: bbox,
            radius: radius,
            type: address.city ? 'city' :
                  address.town ? 'town' :
                  address.municipality ? 'municipality' :
                  address.state ? 'state' :
                  'area'
          };
        });

      const searchLower = locationName.toLowerCase();
      const suggestions = [];

      Object.entries(MAJOR_ISLANDS).forEach(([key, islandData]) => {
        if (searchLower.includes(key)) {
          suggestions.push({
            ...islandData,
            type: 'island'
          });
        }
      });

      suggestions.push(...processedNominatim);

      const sortedSuggestions = suggestions.sort((a, b) => {
        if (a.type === 'island' && b.type !== 'island') return -1;
        if (a.type !== 'island' && b.type === 'island') return 1;
        if (a.type === 'state' && b.type !== 'state') return -1;
        if (a.type !== 'state' && b.type === 'state') return 1;
        return 0;
      });

      setLocationSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Error searching location:', error);
      setLocationSuggestions([]);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSelect = (location, searchParams, setSearchParams, onFilterChange, fetchFilteredStats) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    const bbox = location.boundingbox;

    if (isNaN(lat) || isNaN(lon) || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180) {
      console.error('Invalid coordinates:', {lat, lon});
      return;
    }

    const zoomLevel = calculateZoomLevel(location.radius, bbox);

    setSearchParams({
      ...searchParams,
      location: location.display_name,
      latitude: lat,
      longitude: lon,
      radius: location.radius,
      boundingbox: bbox,
      zoomLevel: zoomLevel
    });

    setLocationSuggestions([]);

    if (onFilterChange) {
      onFilterChange({
        latitude: lat,
        longitude: lon,
        radius: location.radius || 10
      });
    }

    fetchFilteredStats({
      latitude: lat,
      longitude: lon,
      radius: location.radius || 10
    });
  };

  return {
    locationSuggestions,
    setLocationSuggestions,
    isLoadingLocation,
    setIsLoadingLocation,
    locationDebounceTimer,
    handleLocationSearch,
    handleLocationSelect
  };
};

export default useLocationSearch;
