import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import debounce from 'lodash/debounce';

/**
 * LocationLabelInput - Input nama lokasi dengan autocomplete dari database.
 * 
 * Props:
 * - value: string - nilai label saat ini
 * - onChange: (label) => void - callback saat label berubah
 * - latitude: number|string - latitude untuk prioritas suggestion terdekat
 * - longitude: number|string - longitude untuk prioritas suggestion terdekat
 * - osmName: string - nama lokasi dari OSM (auto-fill awal)
 * - onSaveToDb: (label, osmName) => void - optional callback setelah simpan ke DB
 * - placeholder: string
 * - className: string - tambahan class untuk container
 */
function LocationLabelInput({ 
    value = '', 
    onChange, 
    latitude, 
    longitude, 
    osmName = '',
    placeholder = 'Nama lokasi (contoh: Cafe ABC, Taman Nasional XYZ)',
    className = ''
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debouncedSearch = useRef(
        debounce(async (query) => {
            if (!query || query.length < 2) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            try {
                const params = new URLSearchParams({ q: query });
                if (latitude) params.append('lat', latitude);
                if (longitude) params.append('lng', longitude);

                const response = await apiFetch(`/location-labels/search?${params.toString()}`);
                const data = await response.json();
                if (data.success && data.data) {
                    setSuggestions(data.data);
                }
            } catch (error) {
                console.warn('Error searching location labels:', error);
            } finally {
                setIsLoading(false);
            }
        }, 300)
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        
        if (newValue.length >= 2) {
            setShowSuggestions(true);
            debouncedSearch(newValue);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const handleFocus = () => {
        if (value && value.length >= 2) {
            setShowSuggestions(true);
            debouncedSearch(value);
        } else if (!value && latitude && longitude) {
            setShowSuggestions(true);
            debouncedSearch('');
            fetchNearbyLabels();
        }
    };

    const fetchNearbyLabels = async () => {
        if (!latitude || !longitude) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ 
                lat: latitude, 
                lng: longitude 
            });
            const response = await apiFetch(`/location-labels/search?${params.toString()}`);
            const data = await response.json();
            if (data.success && data.data) {
                setSuggestions(data.data);
            }
        } catch (error) {
            console.warn('Error fetching nearby labels:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSuggestion = (suggestion) => {
        onChange(suggestion.label);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const formatDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return '';
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        if (d < 1) return `${Math.round(d * 1000)}m`;
        return `${d.toFixed(1)}km`;
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className="w-full border border-[#444] p-2 rounded bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] pr-8"
                />
                {isLoading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a73e8]"></div>
                    </div>
                )}
            </div>

            {/* OSM name hint */}
            {osmName && value !== osmName && (
                <button
                    type="button"
                    onClick={() => onChange(osmName)}
                    className="text-xs text-gray-400 hover:text-[#1a73e8] mt-1 flex items-center gap-1 transition-colors"
                >
                    <span>📍</span>
                    <span className="truncate">OSM: {osmName}</span>
                    <span className="text-[#1a73e8]">← klik untuk pakai</span>
                </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute w-full bg-[#2c2c2c] border border-[#444] rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto z-[9999]">
                    <div className="p-1.5 border-b border-[#444] bg-[#1e1e1e] text-gray-400 text-xs">
                        Lokasi tersimpan
                    </div>
                    {suggestions.map((suggestion) => {
                        const dist = formatDistance(
                            parseFloat(latitude), parseFloat(longitude),
                            parseFloat(suggestion.latitude), parseFloat(suggestion.longitude)
                        );
                        return (
                            <div
                                key={suggestion.id}
                                className="px-3 py-2 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444] last:border-b-0"
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-[#e0e0e0] truncate">
                                            {suggestion.label}
                                        </div>
                                        {suggestion.osm_name && suggestion.osm_name !== suggestion.label && (
                                            <div className="text-xs text-gray-500 truncate">
                                                OSM: {suggestion.osm_name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                        {dist && (
                                            <span className="text-xs text-gray-500">{dist}</span>
                                        )}
                                        {suggestion.use_count > 1 && (
                                            <span className="text-xs bg-[#374151] text-gray-300 px-1.5 py-0.5 rounded">
                                                {suggestion.use_count}x
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Utility function: simpan label lokasi ke database.
 * Dipanggil saat user submit form (bukan saat mengetik).
 */
export const saveLocationLabel = async (label, latitude, longitude, osmName = '') => {
    if (!label || !latitude || !longitude) return;
    
    try {
        await apiFetch('/location-labels', {
            method: 'POST',
            body: JSON.stringify({
                label,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                osm_name: osmName || ''
            })
        });
    } catch (error) {
        console.warn('Error saving location label:', error);
    }
};

export default LocationLabelInput;
