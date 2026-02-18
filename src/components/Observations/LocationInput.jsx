import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import LocationLabelInput from './LocationLabelInput';

function LocationInput({ locationName, latitude, longitude, onTrigger, label, onLabelChange, osmName, showLabel = true }) {
    const handleClick = () => {
        onTrigger({
            latitude: latitude || null,
            longitude: longitude || null,
            locationName: locationName || ''
        });
    };
    const formatCoordinate = (coord) => {
        if (typeof coord === 'number') {
            return coord.toFixed(6);
        }
        return coord;
    };
    const isCoordinateOnly = !locationName || /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(locationName);
    const getDisplayName = () => {
        if (latitude && longitude) {
            return `📍 ${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
        }
        return 'Pilih lokasi';
    };
    const getSubtitle = () => {
        if (latitude && longitude) {
            if (locationName && !isCoordinateOnly) {
                return locationName;
            } else {
                return 'Koordinat manual';
            }
        }
        return 'Klik untuk memilih lokasi pada peta';
    };

    return (
        <div className="space-y-3">
            <button
                onClick={handleClick}
                className="w-full border border-[#444] p-3 rounded-lg bg-[#2c2c2c] hover:border-[#1a73e8] transition-colors flex items-center justify-between text-left group"
            >
                <div className="flex-1">
                    <div className="text-[#e0e0e0] group-hover:text-white transition-colors">
                        {getDisplayName()}
                    </div>
                    <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors mt-1">
                        {getSubtitle()}
                    </div>
                    {latitude && longitude && locationName && !isCoordinateOnly && (
                        <div className="text-xs text-[#1a73e8] mt-1 flex items-center gap-1">
                            <span>✓</span>
                            <span>Lokasi tersimpan</span>
                        </div>
                    )}
                </div>
                <FontAwesomeIcon 
                    icon={faMapMarkerAlt} 
                    className={`ml-3 h-5 w-5 transition-colors ${
                        latitude && longitude 
                            ? 'text-[#1a73e8] group-hover:text-[#1565c0]' 
                            : 'text-gray-500 group-hover:text-[#1a73e8]'
                    }`}
                />
            </button>

            {/* Input Nama Lokasi (Label) - langsung di bawah peta */}
            {showLabel && onLabelChange && (
                <div className="space-y-1">
                    <label className="block text-sm text-gray-300">
                        Nama Lokasi
                    </label>
                    <LocationLabelInput
                        value={label || ''}
                        onChange={onLabelChange}
                        latitude={latitude}
                        longitude={longitude}
                        osmName={osmName}
                        placeholder="Nama lokasi (contoh: Cafe ABC, Taman Nasional XYZ)"
                    />
                </div>
            )}
        </div>
    );
}

export default LocationInput;