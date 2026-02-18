import React, { useEffect, useCallback, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap, ZoomControl, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getColor, getVisibleGridType } from '../../utils/mapHelpers';
const TILE_LAYERS = {
    osm: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: "OpenStreetMap"
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: "Dark Mode"
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '&copy; Esri',
        name: "Satellite"
    },
    terrain: {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        name: "Terrain"
    }
};

function ChecklistMapBurkup({ latitude, longitude, locationName, source = 'fobi' }) {
    const [gridData, setGridData] = useState(null);
    const [visibleGrid, setVisibleGrid] = useState('medium');
    const ZoomHandler = () => {
        const map = useMap();

        useEffect(() => {
            if (!map) return;

            const handleZoomChange = () => {
                const zoom = map.getZoom();
                setVisibleGrid(getVisibleGridType(zoom));
            };

            map.on('zoomend', handleZoomChange);
            handleZoomChange();

            return () => {
                map.off('zoomend', handleZoomChange);
            };
        }, [map]);

        return null;
    };
    const createSingleGrid = useCallback((lat, lng, gridSize) => {
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

        const halfSize = gridSize / 2;
        return {
            bounds: [
                [lat - halfSize, lng - halfSize],
                [lat + halfSize, lng + halfSize]
            ],
            center: [lat, lng]
        };
    }, []);
    useEffect(() => {
        if (latitude && longitude) {
            const mainGrids = {
                tiny: createSingleGrid(latitude, longitude, 0.005),
                verySmall: createSingleGrid(latitude, longitude, 0.01),
                small: createSingleGrid(latitude, longitude, 0.02),
                mediumSmall: createSingleGrid(latitude, longitude, 0.035),
                medium: createSingleGrid(latitude, longitude, 0.05),
                mediumLarge: createSingleGrid(latitude, longitude, 0.1),
                large: createSingleGrid(latitude, longitude, 0.2),
                veryLarge: createSingleGrid(latitude, longitude, 0.3),
                extremelyLarge: createSingleGrid(latitude, longitude, 0.4)
            };

            setGridData({
                main: mainGrids
            });
        }
    }, [latitude, longitude, createSingleGrid]);
    const gridStyle = getColor(10, source);
    const GridComponent = () => {
        const currentGrid = gridData?.main?.[visibleGrid];

        if (!currentGrid) return null;

        return (
            <Rectangle
                bounds={currentGrid.bounds}
                pathOptions={gridStyle}
            >
                <Popup className="dark-popup">
                    <div className="text-center">
                        <div className="font-bold text-[#e0e0e0]">{locationName}</div>
                        <div className="text-xs text-[#b0b0b0] mt-1">
                            {currentGrid.center[0].toFixed(6)}, {currentGrid.center[1].toFixed(6)}
                        </div>
                    </div>
                </Popup>
            </Rectangle>
        );
    };

    if (!latitude || !longitude) {
        return (
            <div className="h-64 bg-[#2c2c2c] rounded-lg flex items-center justify-center border border-[#444]">
                <p className="text-[#b0b0b0]">Lokasi tidak tersedia</p>
            </div>
        );
    }

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: "400px", width: "100%", borderRadius: "0.5rem" }}
            className="z-0 border border-[#444]"
            zoomControl={false}
        >
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={TILE_LAYERS.osm.name}>
                    <TileLayer
                        url={TILE_LAYERS.osm.url}
                        attribution={TILE_LAYERS.osm.attribution}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={TILE_LAYERS.dark.name}>
                    <TileLayer
                        url={TILE_LAYERS.dark.url}
                        attribution={TILE_LAYERS.dark.attribution}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={TILE_LAYERS.satellite.name}>
                    <TileLayer
                        url={TILE_LAYERS.satellite.url}
                        attribution={TILE_LAYERS.satellite.attribution}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={TILE_LAYERS.terrain.name}>
                    <TileLayer
                        url={TILE_LAYERS.terrain.url}
                        attribution={TILE_LAYERS.terrain.attribution}
                    />
                </LayersControl.BaseLayer>
            </LayersControl>
            <ZoomControl position="bottomright" />
            <ZoomHandler />
            <GridComponent />
        </MapContainer>
    );
}

export default ChecklistMapBurkup;
