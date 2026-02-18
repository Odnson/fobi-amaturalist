import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { apiFetch } from '../../utils/api';
import PropTypes from 'prop-types';
import L from 'leaflet';
import './DrawingTools.css'; // Menambahkan CSS custom untuk styling

const DrawingTools = ({ onShapeDrawn, onShapeDeleted, setStats, onDrawingStateChange, activePolygon }) => {
  const map = useMap();
  const drawnLayerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const createLayerFromGeoJSON = (shapeData) => {
    if (!shapeData) return null;
    
    let layer = null;
    
    if (shapeData.type === 'Circle') {
      const center = L.latLng(shapeData.center[1], shapeData.center[0]);
      layer = L.circle(center, { 
        radius: shapeData.radius,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.3,
        weight: 2
      });
    } else if (shapeData.type === 'Polygon') {
      const latLngs = shapeData.coordinates[0].map(coord => L.latLng(coord[1], coord[0]));
      layer = L.polygon(latLngs, {
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.3,
        weight: 2
      });
    }
    
    return layer;
  };
  useEffect(() => {
    if (!map) return;
    const mapContainer = map.getContainer();
    mapContainer.classList.add('dark-theme-map');
    const customTheme = {
      drawingText: {
        color: '#e0e0e0',
        fontWeight: 'bold'
      },
      layerStyles: {
        tempLine: {
          color: '#1a73e8',
          weight: 2
        },
        hintLine: {
          color: '#4285f4',
          dashArray: [5, 5],
          weight: 2
        }
      }
    };
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawRectangle: true,
      drawPolygon: true,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      customOptions: {
        styles: customTheme
      }
    });
    map.pm.setPathOptions({
      color: '#1a73e8',
      fillColor: '#1a73e8',
      fillOpacity: 0.3,
    });
    map.on('pm:drawstart', () => {
      if (onDrawingStateChange) {
        onDrawingStateChange(true);
      }
    });

    map.on('pm:drawend', () => {
      if (onDrawingStateChange) {
        onDrawingStateChange(false);
      }
    });
    map.on('pm:create', handleShapeCreated);
    map.on('pm:remove', handleShapeDeleted);

    return () => {
      map.pm.removeControls();
      map.off('pm:create', handleShapeCreated);
      map.off('pm:remove', handleShapeDeleted);
      map.off('pm:drawstart');
      map.off('pm:drawend');
      if (drawnLayerRef.current && map.hasLayer(drawnLayerRef.current)) {
        map.removeLayer(drawnLayerRef.current);
      }
      mapContainer.classList.remove('dark-theme-map');
    };
  }, [map, onShapeDrawn, onShapeDeleted, onDrawingStateChange]);
  useEffect(() => {
    if (!map || !activePolygon || isInitializedRef.current) return;
    const layer = createLayerFromGeoJSON(activePolygon);
    
    if (layer) {
      if (drawnLayerRef.current && map.hasLayer(drawnLayerRef.current)) {
        map.removeLayer(drawnLayerRef.current);
      }
      layer.addTo(map);
      drawnLayerRef.current = layer;
      map.fitBounds(layer.getBounds());
      isInitializedRef.current = true;
      if (onShapeDrawn) {
        setTimeout(() => {
          onShapeDrawn(layer, activePolygon);
        }, 500);
      }
    }
  }, [map, activePolygon, onShapeDrawn]);

  const handleShapeCreated = async (e) => {
    console.log('PM Create event:', e);
    const layer = e.layer;
    const shape = e.shape; // Gunakan shape dari event
    layer.setStyle({
      color: '#1a73e8',
      fillColor: '#1a73e8',
      fillOpacity: 0.3,
      weight: 2
    });
    
    let shapeData = {};
    
    if (shape === 'Circle') {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      shapeData = {
        type: 'Circle',
        center: [center.lng, center.lat],
        radius: radius
      };
    } else if (shape === 'Rectangle' || shape === 'Polygon') {
      const latLngs = layer.getLatLngs()[0];
      const coordinates = latLngs.map(latLng => [latLng.lng, latLng.lat]);
      if (coordinates.length > 0 && 
          (coordinates[0][0] !== coordinates[coordinates.length-1][0] || 
           coordinates[0][1] !== coordinates[coordinates.length-1][1])) {
        coordinates.push([...coordinates[0]]);
      }
      shapeData = {
        type: 'Polygon',
        coordinates: [coordinates]
      };
    }
    
    console.log('Shape data created:', shapeData);
    drawnLayerRef.current = layer;
    isInitializedRef.current = true;
    if (onShapeDrawn && Object.keys(shapeData).length > 0) {
      onShapeDrawn(layer, shapeData);
    }
  };
  
  const fetchDefaultStats = async () => {
    try {
      const cachedStats = localStorage.getItem('cachedStats');

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?data_source[]=fobi&data_source[]=burungnesia&data_source[]=kupunesia`);
      const data = await response.json();

      if (data.success) {
        const newStats = {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };

        setStats(newStats);
        localStorage.setItem('cachedStats', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Error fetching default stats:', error);
    }
  };
  
  const handleShapeDeleted = () => {
    drawnLayerRef.current = null;
    isInitializedRef.current = false;
    if (setStats) {
      fetchDefaultStats();
    }
    
    if (onShapeDeleted) {
      onShapeDeleted();
    }
  };

  return null;
};

DrawingTools.propTypes = {
  onShapeDrawn: PropTypes.func,
  onShapeDeleted: PropTypes.func,
  setStats: PropTypes.func,
  onDrawingStateChange: PropTypes.func,
  activePolygon: PropTypes.object
};

export default DrawingTools; 