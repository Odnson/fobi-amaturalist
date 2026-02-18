import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import debounce from 'lodash/debounce';
import L from 'leaflet';
import LocationLabelInput, { saveLocationLabel } from './LocationLabelInput';
const customIcon = new L.Icon({
    iconUrl: 'https://cdn.mapmarker.io/api/v1/pin?size=50&background=%231a73e8&icon=fa-location-dot&color=%23FFFFFF',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
    className: 'custom-marker-icon'
});
const markerStyle = `
  .custom-marker-icon {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
  }
`;
const tileLayers = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Normal'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
        name: 'Dark'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        name: 'Satelit'
    }
};
const LOCATION_CACHE_KEY = 'fobi_location_cache';
const MAX_CACHE_ITEMS = 10;

function LocationPicker({ onSave, onClose, initialPosition, initialLocationName }) {
    const [position, setPosition] = useState(initialPosition || null);
    const [locationName, setLocationName] = useState(initialLocationName || '');
    const [searchQuery, setSearchQuery] = useState(initialLocationName || '');
    const [searchResults, setSearchResults] = useState([]);
    const [cachedLocations, setCachedLocations] = useState([]);
    const [showCachedLocations, setShowCachedLocations] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchContainerRef = useRef(null);
    const [isGPSLoading, setIsGPSLoading] = useState(false);
    const [gpsError, setGpsError] = useState(null);
    const [activeLayer, setActiveLayer] = useState('osm');
    const [copySuccess, setCopySuccess] = useState('');
    const [showCopyTooltip, setShowCopyTooltip] = useState(false);
    const [manualCoordinates, setManualCoordinates] = useState({ lat: '', lng: '' });
    const [showManualInput, setShowManualInput] = useState(false);
    const [coordinateError, setCoordinateError] = useState('');
    const [isManualMode, setIsManualMode] = useState(false);
    const [centerPointMode, setCenterPointMode] = useState(false);
    const [customLabel, setCustomLabel] = useState('');
    const customLabelEditedRef = useRef(false);
    useEffect(() => {
        if (position) {
            customLabelEditedRef.current = false;
        }
    }, [position]);
    useEffect(() => {
        if (locationName && !customLabelEditedRef.current) {
            setCustomLabel(locationName);
        }
    }, [locationName]);
    const handleCustomLabelChange = (val) => {
        customLabelEditedRef.current = true;
        setCustomLabel(val);
    };
    useEffect(() => {
        loadCachedLocations();
        loadCenterPointPreference();
    }, []);
    const loadCenterPointPreference = () => {
        try {
            const savedPreference = localStorage.getItem('fobi_center_point_mode');
            if (savedPreference !== null) {
                setCenterPointMode(JSON.parse(savedPreference));
            }
        } catch (error) {
            console.error('Error loading center point preference:', error);
        }
    };
    const saveCenterPointPreference = (enabled) => {
        try {
            localStorage.setItem('fobi_center_point_mode', JSON.stringify(enabled));
            setCenterPointMode(enabled);
        } catch (error) {
            console.error('Error saving center point preference:', error);
        }
    };
    const loadCachedLocations = () => {
        try {
            const cachedData = localStorage.getItem(LOCATION_CACHE_KEY);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                setCachedLocations(parsedData);
            }
        } catch (error) {
            console.error('Error loading cached locations:', error);
            setCachedLocations([]);
        }
    };
    const saveToCacheLocation = (lat, lng, name) => {
        try {
            const newLocation = {
                id: Date.now().toString(),
                display_name: name,
                lat: lat,
                lon: lng,
                type: 'Tersimpan',
                useCount: 1,
                lastUsed: Date.now()
            };
            let existingCache = [];
            const cachedData = localStorage.getItem(LOCATION_CACHE_KEY);
            
            if (cachedData) {
                existingCache = JSON.parse(cachedData);
            }
            const existingIndex = existingCache.findIndex(
                item => (
                    Math.abs(parseFloat(item.lat) - lat) < 0.0001 && 
                    Math.abs(parseFloat(item.lon) - lng) < 0.0001
                ) || item.display_name === name
            );

            if (existingIndex !== -1) {
                existingCache[existingIndex].useCount += 1;
                existingCache[existingIndex].lastUsed = Date.now();
                if (!existingCache[existingIndex].display_name && name) {
                    existingCache[existingIndex].display_name = name;
                }
            } else {
                existingCache.push(newLocation);
            }
            existingCache.sort((a, b) => {
                return b.lastUsed - a.lastUsed;
            });
            if (existingCache.length > MAX_CACHE_ITEMS) {
                existingCache = existingCache.slice(0, MAX_CACHE_ITEMS);
            }
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(existingCache));
            setCachedLocations(existingCache);
        } catch (error) {
            console.error('Error saving location to cache:', error);
        }
    };
    const searchWithMultipleProviders = async (query) => {
        const results = [];
        try {
            const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}&` +
                `format=json&` +
                `limit=15&` +
                `countrycodes=id&` +
                `addressdetails=1&` +
                `namedetails=1&` +
                `dedupe=1&` +
                `extratags=1&` +
                `accept-language=id,en&` +
                `bounded=1&` +
                `viewbox=95.0,-11.0,141.0,6.0&` + // Bounding box Indonesia
                `polygon_geojson=0`
            );
            
            if (nominatimResponse.ok) {
                const nominatimData = await nominatimResponse.json();
                results.push(...nominatimData.map(item => ({ ...item, source: 'nominatim' })));
            }
        } catch (error) {
            console.warn('Nominatim search failed:', error);
        }
        try {
            const photonResponse = await fetch(
                `https://photon.komoot.io/api/?` +
                `q=${encodeURIComponent(query)}&` +
                `limit=10&` +
                `lang=id&` +
                `bbox=95.0,-11.0,141.0,6.0` // Bounding box Indonesia
            );
            
            if (photonResponse.ok) {
                const photonData = await photonResponse.json();
                if (photonData.features) {
                    const photonResults = photonData.features
                        .filter(feature => {
                            const props = feature.properties;
                            return props.country === 'Indonesia' || props.countrycode === 'ID';
                        })
                        .map(feature => {
                            const props = feature.properties;
                            const coords = feature.geometry.coordinates;
                            return {
                                lat: coords[1],
                                lon: coords[0],
                                display_name: props.name,
                                address: {
                                    village: props.name,
                                    city: props.city,
                                    state: props.state,
                                    country: props.country
                                },
                                type: props.osm_value || 'place',
                                importance: 0.5,
                                source: 'photon'
                            };
                        });
                    results.push(...photonResults);
                }
            }
        } catch (error) {
            console.warn('Photon search failed:', error);
        }

        return results;
    };
    const getIndonesianLocationType = (item) => {
        const address = item.address || {};
        const extraTags = item.extratags || {};
        const osmType = item.type;
        const osmClass = item.class;
        const typeMapping = {
            'university': 'Universitas',
            'college': 'Perguruan Tinggi',
            'school': 'Sekolah',
            'kindergarten': 'TK/PAUD',
            'hospital': 'Rumah Sakit',
            'clinic': 'Klinik',
            'pharmacy': 'Apotek',
            'dentist': 'Dokter Gigi',
            'mosque': 'Masjid',
            'church': 'Gereja',
            'temple': 'Pura/Vihara',
            'place_of_worship': 'Tempat Ibadah',
            'townhall': 'Balai Kota',
            'government': 'Kantor Pemerintah',
            'embassy': 'Kedutaan',
            'police': 'Kantor Polisi',
            'airport': 'Bandara',
            'railway_station': 'Stasiun KA',
            'bus_station': 'Terminal Bus',
            'ferry_terminal': 'Terminal Ferry',
            'fuel': 'SPBU',
            'tourism': 'Tempat Wisata',
            'attraction': 'Objek Wisata',
            'museum': 'Museum',
            'zoo': 'Kebun Binatang',
            'theme_park': 'Taman Hiburan',
            'beach': 'Pantai',
            'park': 'Taman',
            'peak': 'Puncak Gunung',
            'volcano': 'Gunung Berapi',
            'forest': 'Hutan',
            'nature_reserve': 'Cagar Alam',
            'national_park': 'Taman Nasional',
            'waterfall': 'Air Terjun',
            'lake': 'Danau',
            'river': 'Sungai',
            'island': 'Pulau',
            'mall': 'Mall',
            'supermarket': 'Supermarket',
            'market': 'Pasar',
            'restaurant': 'Restoran',
            'cafe': 'Kafe',
            'hotel': 'Hotel',
            'bank': 'Bank',
            'atm': 'ATM'
        };
        if (typeMapping[osmType]) return typeMapping[osmType];
        if (typeMapping[osmClass]) return typeMapping[osmClass];
        if (typeMapping[extraTags.amenity]) return typeMapping[extraTags.amenity];
        if (typeMapping[extraTags.tourism]) return typeMapping[extraTags.tourism];
        if (typeMapping[extraTags.natural]) return typeMapping[extraTags.natural];
        if (address.state_district || address.regency) return 'Kabupaten/Kota';
        if (address.city || address.town || address.municipality) return 'Kota';
        if (address.village || address.hamlet) return 'Desa/Kelurahan';
        if (address.suburb || address.neighbourhood) return 'Kecamatan';
        if (address.county) return 'Kabupaten';
        if (address.state) return 'Provinsi';
        
        return 'Lokasi';
    };
    const formatIndonesianAddress = (item) => {
        const address = item.address || {};
        const parts = [];
        let mainName = '';
        if (item.namedetails?.name) {
            mainName = item.namedetails.name;
        } else if (item.display_name) {
            mainName = item.display_name.split(',')[0].trim();
        }
        
        if (mainName) parts.push(mainName);
        const addressHierarchy = [
            address.village || address.hamlet,
            address.suburb || address.neighbourhood,
            address.city || address.town || address.municipality || address.county,
            address.state
        ].filter(Boolean).filter(part => !parts.includes(part));
        
        parts.push(...addressHierarchy);
        
        return parts.join(', ');
    };

    const debouncedSearch = useRef(
        debounce(async (query) => {
            if (!query || query.length < 2) { // Kurangi minimum length untuk pencarian yang lebih responsif
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const allResults = await searchWithMultipleProviders(query);
                const filteredResults = allResults
                    .map(item => {
                        const type = getIndonesianLocationType(item);
                        const display_name = formatIndonesianAddress(item);
                        
                        return {
                            display_name,
                            lat: parseFloat(item.lat),
                            lon: parseFloat(item.lon),
                            type,
                            importance: item.importance || 0.3,
                            source: item.source || 'unknown'
                        };
                    })
                    .filter(item => {
                        return item.display_name && 
                               item.display_name.length > 0 &&
                               !isNaN(item.lat) && 
                               !isNaN(item.lon) &&
                               item.lat >= -11 && item.lat <= 6 && // Latitude Indonesia
                               item.lon >= 95 && item.lon <= 141;  // Longitude Indonesia
                    })
                    .sort((a, b) => {
                        if (a.importance !== b.importance) {
                            return b.importance - a.importance;
                        }
                        if (a.source === 'nominatim' && b.source !== 'nominatim') return -1;
                        if (b.source === 'nominatim' && a.source !== 'nominatim') return 1;
                        return a.display_name.localeCompare(b.display_name, 'id');
                    })
                    .slice(0, 12); // Batasi hasil maksimal
                const uniqueResults = [];
                filteredResults.forEach(result => {
                    const isDuplicate = uniqueResults.some(existing => {
                        const latDiff = Math.abs(existing.lat - result.lat);
                        const lonDiff = Math.abs(existing.lon - result.lon);
                        return latDiff < 0.001 && lonDiff < 0.001; // ~100m radius
                    });
                    
                    if (!isDuplicate) {
                        uniqueResults.push(result);
                    }
                });

                setSearchResults(uniqueResults);
            } catch (error) {
                console.error('Error searching location:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300) // Kurangi debounce delay untuk responsivitas yang lebih baik
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);
    const detectCoordinates = (input) => {
        const coordPattern = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
        const match = input.match(coordPattern);
        
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return { lat, lng, isValid: true };
            }
        }
        
        return { lat: null, lng: null, isValid: false };
    };
    const handleManualCoordinateInput = (lat, lng) => {
        setCoordinateError('');
        if (lat < -90 || lat > 90) {
            setCoordinateError('Latitude harus antara -90 dan 90');
            return;
        }
        
        if (lng < -180 || lng > 180) {
            setCoordinateError('Longitude harus antara -180 dan 180');
            return;
        }
        const newPosition = [lat, lng];
        setIsManualMode(true);
        
        if (centerPointMode) {
            if (window.mapInstance) {
                window.mapInstance.setView(newPosition, 15, { animate: true });
            }
            setTimeout(() => {
                if (window.mapInstance) {
                    const center = window.mapInstance.getCenter();
                    setPosition([center.lat, center.lng]);
                    fetchLocationName(center.lat, center.lng).catch(() => {
                        setLocationName(`${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
                    });
                }
            }, 500);
        } else {
            setPosition(newPosition);
            fetchLocationName(lat, lng).catch(() => {
                setLocationName(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            });
            if (window.mapInstance) {
                window.mapInstance.setView(newPosition, 15, { animate: true });
            }
        }
        setShowManualInput(false);
        setManualCoordinates({ lat: '', lng: '' });
    };
    const toggleManualInput = () => {
        setShowManualInput(!showManualInput);
        setCoordinateError('');
        if (!showManualInput) {
            setManualCoordinates({ lat: '', lng: '' });
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setIsManualMode(false);
        const coordDetection = detectCoordinates(value);
        
        if (coordDetection.isValid) {
            handleManualCoordinateInput(coordDetection.lat, coordDetection.lng);
            setSearchResults([]);
            setShowCachedLocations(false);
            return;
        }
        
        if (value.length === 0) {
            setShowCachedLocations(true);
            setSearchResults([]);
        } else if (value.length < 3) {
            setShowCachedLocations(true);
            debouncedSearch.cancel();
            setSearchResults([]);
        } else {
            setShowCachedLocations(false);
            debouncedSearch(value);
        }
    };

    const handleSearchFocus = () => {
        if (searchQuery.length === 0 && cachedLocations.length > 0) {
            setShowCachedLocations(true);
        }
    };

    const handleSelectLocation = (result) => {
        const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
        setSearchResults([]);
        setShowCachedLocations(false);
        setSearchQuery(result.display_name);
        
        if (centerPointMode) {
            if (window.mapInstance) {
                window.mapInstance.setView(newPosition, 15, { animate: true });
            }
        } else {
            setPosition(newPosition);
            setLocationName(result.display_name);
            
            if (window.mapInstance) {
                window.mapInstance.setView(newPosition, 15, { animate: true });
            }
        }
        saveToCacheLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    };

    const fetchLocationName = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&` +
                `lat=${lat}&` +
                `lon=${lng}&` +
                `addressdetails=1`
    );
            const data = await response.json();
            
            const address = data.address;
            const parts = [];
            
            if (address.city || address.town || address.municipality) {
                parts.push(address.city || address.town || address.municipality);
}
            if (address.county || address.regency) {
                parts.push(address.county || address.regency);
            }
            if (address.state) parts.push(address.state);
            if (address.country) parts.push(address.country);

            const displayName = parts.join(', ');
            setLocationName(displayName || 'Lokasi tidak ditemukan');
            setSearchQuery(displayName || '');
            if (displayName) {
                saveToCacheLocation(lat, lng, displayName);
            }
        } catch (error) {
            console.error('Error fetching location name:', error);
            setLocationName('Error mendapatkan nama lokasi');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopySuccess('Tersalin!');
                setShowCopyTooltip(true);
                setTimeout(() => {
                    setShowCopyTooltip(false);
                    setCopySuccess('');
                }, 2000);
            })
            .catch(err => {
                console.error('Gagal menyalin: ', err);
                setCopySuccess('Gagal menyalin');
                setShowCopyTooltip(true);
                setTimeout(() => {
                    setShowCopyTooltip(false);
                    setCopySuccess('');
                }, 2000);
            });
    };

    const formatCoordinate = (coord) => {
        if (typeof coord === 'number') {
            return coord.toFixed(6);
        }
        return '';
    };

    const LocationMarker = () => {
        const map = useMap();
        useEffect(() => {
            window.mapInstance = map;
        }, [map]);
        
        useMapEvents({
            click(e) {
                if (centerPointMode) {
                    const center = map.getCenter();
                    setPosition([center.lat, center.lng]);
                    fetchLocationName(center.lat, center.lng);
                } else {
                    const currentZoom = map.getZoom();
                    setPosition([e.latlng.lat, e.latlng.lng]);
                    fetchLocationName(e.latlng.lat, e.latlng.lng);
                    
                    map.setView(e.latlng, currentZoom, {
                        animate: true
                    });
                }
            },
        });
        if (centerPointMode && position) {
            const mapCenter = map.getCenter();
            const centerPosition = [mapCenter.lat, mapCenter.lng];
            return (
                <Marker position={centerPosition} icon={customIcon}></Marker>
            );
        } else {
            return position === null ? null : (
                <Marker position={position} icon={customIcon}></Marker>
            );
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setSearchResults([]);
                setShowCachedLocations(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentLocation = () => {
        setIsGPSLoading(true);
        setGpsError(null);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    if (centerPointMode) {
                        if (window.mapInstance) {
                            window.mapInstance.setView([lat, lng], 15, { animate: true });
                        }
                        setTimeout(() => {
                            if (window.mapInstance) {
                                const center = window.mapInstance.getCenter();
                                setPosition([center.lat, center.lng]);
                                try {
                                    fetchLocationName(center.lat, center.lng);
                                } catch (error) {
                                    console.error('Error fetching location name:', error);
                                }
                            }
                        }, 500);
                    } else {
                        setPosition([lat, lng]);
                        
                        try {
                            await fetchLocationName(lat, lng);
                        } catch (error) {
                            console.error('Error fetching location name:', error);
                        }
                    }

                    setIsGPSLoading(false);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setGpsError('Tidak dapat mengakses lokasi. Pastikan GPS aktif.');
                    setIsGPSLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            setGpsError('GPS tidak didukung di browser ini');
            setIsGPSLoading(false);
        }
    };

    useEffect(() => {
        if (initialPosition && initialLocationName) {
            setPosition(initialPosition);
            setLocationName(initialLocationName);
            setSearchQuery(initialLocationName);
            saveToCacheLocation(initialPosition[0], initialPosition[1], initialLocationName);
        }
    }, [initialPosition, initialLocationName]);

    const MapLayerUpdater = () => {
        const map = useMap();
        useEffect(() => {
        }, [activeLayer]);
        
        return null;
    };
    const filteredCachedLocations = searchQuery
        ? cachedLocations.filter(location => 
            location.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
        : cachedLocations;

    return (
        <div className='mt-20'>
            <style>{markerStyle}</style>
            
            <div className="mb-4 relative" ref={searchContainerRef}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                        <div className="flex items-center border border-[#444] rounded-lg overflow-hidden shadow-sm bg-[#2c2c2c]">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={handleSearchFocus}
                                placeholder={centerPointMode ? "Cari area untuk zoom atau koordinat (lat, lng)..." : "Cari lokasi atau masukan koordinat (lat, lng)..."}
                                className="w-full p-3 outline-none bg-transparent text-[#e0e0e0]"
                            />
                            {isLoading && (
                                <div className="px-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1a73e8]"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={toggleManualInput}
                        className={`p-3 rounded-lg transition-colors ${
                            showManualInput 
                                ? 'bg-[#f59e0b] hover:bg-[#d97706] text-white' 
                                : 'bg-[#374151] hover:bg-[#4b5563] text-[#e0e0e0]'
                        }`}
                        title="Input koordinat manual"
                    >
                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                    </button>
                    <button
                        onClick={getCurrentLocation}
                        disabled={isGPSLoading}
                        className={`p-3 rounded-lg transition-colors ${
                            isGPSLoading 
                                ? 'bg-[#3c3c3c] cursor-not-allowed' 
                                : 'bg-[#1a73e8] hover:bg-[#1565c0] text-white'
                        }`}
                    >
                        {isGPSLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            'Gunakan GPS'
                        )}
                    </button>
                </div>
                {gpsError && (
                    <div className="text-red-500 text-sm mb-2">{gpsError}</div>
                )}

                {/* Manual Coordinate Input Modal */}
                {showManualInput && (
                    <div className="absolute w-full bg-[#2c2c2c] border border-[#444] rounded-lg mt-1 shadow-lg z-[9999] p-4">
                        <div className="text-[#e0e0e0] font-medium mb-3">Input Koordinat Manual</div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={manualCoordinates.lat}
                                    onChange={(e) => setManualCoordinates(prev => ({ ...prev, lat: e.target.value }))}
                                    placeholder="-6.200000"
                                    className="w-full p-2 bg-[#1e1e1e] border border-[#444] rounded text-[#e0e0e0] text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={manualCoordinates.lng}
                                    onChange={(e) => setManualCoordinates(prev => ({ ...prev, lng: e.target.value }))}
                                    placeholder="106.816666"
                                    className="w-full p-2 bg-[#1e1e1e] border border-[#444] rounded text-[#e0e0e0] text-sm"
                                />
                            </div>
                        </div>
                        {coordinateError && (
                            <div className="text-red-500 text-sm mb-3">{coordinateError}</div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const lat = parseFloat(manualCoordinates.lat);
                                    const lng = parseFloat(manualCoordinates.lng);
                                    if (!isNaN(lat) && !isNaN(lng)) {
                                        handleManualCoordinateInput(lat, lng);
                                    } else {
                                        setCoordinateError('Masukkan koordinat yang valid');
                                    }
                                }}
                                className="flex-1 bg-[#1a73e8] hover:bg-[#1565c0] text-white px-3 py-2 rounded text-sm transition-colors"
                            >
                                Set Lokasi
                            </button>
                            <button
                                onClick={() => {
                                    setShowManualInput(false);
                                    setCoordinateError('');
                                    setManualCoordinates({ lat: '', lng: '' });
                                }}
                                className="flex-1 bg-[#374151] hover:bg-[#4b5563] text-[#e0e0e0] px-3 py-2 rounded text-sm transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            💡 Tip: {centerPointMode ? 'Mode Center Point aktif - marker akan selalu di tengah peta saat klik.' : 'Klik peta untuk menentukan koordinat. Aktifkan Center Point untuk marker di tengah.'}
                        </div>
                    </div>
                )}

                {showCachedLocations && filteredCachedLocations.length > 0 && (
                    <div className="absolute w-full bg-[#2c2c2c] border border-[#444] rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto z-[9999]">
                        <div className="p-2 border-b border-[#444] bg-[#1e1e1e] text-gray-400 text-xs flex justify-between items-center">
                            <span>Histori lokasi (terbaru ke lama)</span>
                            <span className="text-[#1a73e8]">
                                <FontAwesomeIcon icon={faMapMarkerAlt} />
                            </span>
                        </div>
                        {filteredCachedLocations.map((location, index) => {
                            const isRecent = index < 3;
                            const timeAgo = location.lastUsed ? new Date(location.lastUsed).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : '';
                            
                            return (
                                <div
                                    key={location.id || index}
                                    className="p-3 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444] last:border-b-0 relative"
                                    onClick={() => handleSelectLocation(location)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium text-[#e0e0e0] flex items-center gap-2">
                                                {location.display_name || `${parseFloat(location.lat).toFixed(6)}, ${parseFloat(location.lon).toFixed(6)}`}
                                                {isRecent && <span className="text-xs bg-[#1a73e8] text-white px-1 py-0.5 rounded">Baru</span>}
                                            </div>
                                            <div className="text-sm text-gray-400 mt-1">
                                                {location.type} • {parseFloat(location.lat).toFixed(6)}, {parseFloat(location.lon).toFixed(6)}
                                            </div>
                                            {timeAgo && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Terakhir digunakan: {timeAgo}
                                                </div>
                                            )}
                                        </div>
                                        {location.useCount > 1 && (
                                            <div className="text-xs bg-[#374151] text-gray-300 px-2 py-1 rounded ml-2">
                                                {location.useCount}x
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="absolute w-full bg-[#2c2c2c] border border-[#444] rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto z-[9999]">
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                className="p-3 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444] last:border-b-0"
                                onClick={() => handleSelectLocation(result)}
                            >
                                <div className="font-medium text-[#e0e0e0]">{result.display_name}</div>
                                <div className="text-sm text-gray-400">
                                    {result.type} • {result.lat}, {result.lon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Controls: Layer Selector & Center Point Mode */}
            <div className="mb-2 space-y-2">
                {/* Layer Selector */}
                <div className="flex items-center justify-center bg-[#1e1e1e] p-2 rounded-lg border border-[#444]">
                    <div className="flex space-x-1 bg-[#2c2c2c] p-1 rounded-md">
                        {Object.entries(tileLayers).map(([key, layer]) => (
                            <button
                                key={key}
                                onClick={() => setActiveLayer(key)}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                    activeLayer === key 
                                        ? 'bg-[#1a73e8] text-white' 
                                        : 'bg-transparent text-gray-300 hover:bg-[#3c3c3c]'
                                }`}
                            >
                                {layer.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Center Point Mode Toggle */}
                <div className="flex items-center justify-center bg-[#1e1e1e] p-2 rounded-lg border border-[#444]">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={centerPointMode}
                            onChange={(e) => saveCenterPointPreference(e.target.checked)}
                            className="w-4 h-4 text-[#1a73e8] bg-[#2c2c2c] border-[#444] rounded focus:ring-[#1a73e8] focus:ring-2"
                        />
                        <span className="text-sm text-[#e0e0e0]">
                            📍 Mode Center Point
                        </span>
                        <span className="text-xs text-gray-400">
                            (Marker selalu di tengah peta)
                        </span>
                    </label>
                </div>
            </div>

            <MapContainer 
                center={position || [-2.5489, 118.0149]} 
                zoom={position ? 13 : 5} 
                className="rounded-lg shadow-md"
                style={{ height: '400px', width: '100%' }}>
                <TileLayer
                    url={tileLayers[activeLayer].url}
                    attribution={tileLayers[activeLayer].attribution}
                />
                <LocationMarker />
                <RecenterAutomatically position={position} />
                <MapLayerUpdater />
            </MapContainer>

            <div className="mt-4 space-y-3">
                {position && (
                    <div className="p-3 bg-[#2c2c2c] rounded-lg border border-[#444]">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm text-gray-400">Koordinat:</div>
                            <div className="relative">
                                <button
                                    onClick={() => copyToClipboard(`${formatCoordinate(position[0])}, ${formatCoordinate(position[1])}`)}
                                    className="text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#e0e0e0] px-2 py-1 rounded"
                                >
                                    Salin
                                </button>
                                {showCopyTooltip && (
                                    <div className="absolute right-0 bottom-full mb-1 bg-[#1a73e8] text-white text-xs py-1 px-2 rounded">
                                        {copySuccess}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-[#e0e0e0] font-mono">
                            {formatCoordinate(position[0])}, {formatCoordinate(position[1])}
                        </div>
                    </div>
                )}
                
                {locationName && (
                    <div className="p-3 bg-[#2c2c2c] rounded-lg border border-[#444]">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm text-gray-400">Lokasi terpilih:</div>
                            <button
                                onClick={() => copyToClipboard(locationName)}
                                className="text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#e0e0e0] px-2 py-1 rounded"
                            >
                                Salin
                            </button>
                        </div>
                        <div className="text-[#e0e0e0]">{locationName}</div>
                    </div>
                )}

                {/* Input Nama Lokasi Editable dengan Suggestion */}
                {position && (
                    <div className="p-3 bg-[#2c2c2c] rounded-lg border border-[#444]">
                        <label className="block text-sm text-gray-400 mb-1">Nama Lokasi (editable)</label>
                        <LocationLabelInput
                            value={customLabel}
                            onChange={handleCustomLabelChange}
                            latitude={position[0]}
                            longitude={position[1]}
                            osmName={locationName}
                            placeholder="Nama lokasi (contoh: Cafe ABC, Taman Nasional XYZ)"
                        />
                    </div>
                )}
                
                <div className="flex space-x-3">
                    <button 
                        onClick={() => {
                            if (position) {
                                const finalLabel = customLabel || locationName;
                                saveToCacheLocation(position[0], position[1], finalLabel);
                                saveLocationLabel(finalLabel, position[0], position[1], locationName || '');
                                onSave(position[0], position[1], finalLabel);
                            }
                        }} 
                        className={`flex-1 p-3 rounded-lg transition-colors ${
                            position 
                                ? 'bg-[#1a73e8] hover:bg-[#1565c0] text-white' 
                                : 'bg-[#3c3c3c] text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!position}
                    >
                        {position ? 'Simpan Lokasi' : 'Pilih lokasi pada peta'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            if (typeof onClose === 'function') {
                                onClose();
                            }
                        }}
                        className="flex-1 p-3 rounded-lg border border-[#444] hover:bg-[#2c2c2c] text-[#e0e0e0] transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}

function RecenterAutomatically({ position }) {
    const map = useMap();
    
    useEffect(() => {
        if (position) {
            const currentZoom = map.getZoom();
        }
    }, [position, map]);
    
    return null;
}

export default LocationPicker;