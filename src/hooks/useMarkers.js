import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { openDB } from 'idb';
import * as turf from '@turf/turf';

const DB_NAME = 'markersDB';
const STORE_NAME = 'markers';
const CACHE_VERSION = 2; // Bumped: fix source mapping
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 jam dalam milliseconds

// Inisialisasi IndexedDB
const initDB = async () => {
  return openDB(DB_NAME, CACHE_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Hapus store lama saat version naik (invalidate cache lama)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME);
      store.createIndex('timestamp', 'timestamp');
    },
  });
};

export const useMarkers = () => {
  const [mapMarkers, setMapMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);

  // Fungsi untuk mengambil data dari cache
  const getFromCache = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const cachedData = await store.get('markersData');
      
      if (cachedData && 
          cachedData.timestamp && 
          Date.now() - cachedData.timestamp < CACHE_TIME) {
        return cachedData.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  };

  // Fungsi untuk mengambil data dari API
  const fetchFromAPI = async () => {
    const [markersResult, fobiMarkersResult] = await Promise.allSettled([
      apiFetch('/markers').then(r => r.json()),
      apiFetch('/fobi-markers').then(r => r.json())
    ]);

    const markersData = markersResult.status === 'fulfilled' && Array.isArray(markersResult.value)
      ? markersResult.value : [];
    const fobiMarkersData = fobiMarkersResult.status === 'fulfilled' && Array.isArray(fobiMarkersResult.value)
      ? fobiMarkersResult.value : [];

    if (markersResult.status === 'rejected') console.error('Error /markers:', markersResult.reason);
    if (fobiMarkersResult.status === 'rejected') console.error('Error /fobi-markers:', fobiMarkersResult.reason);

    // Mapping source dari backend ke frontend
    const mapSource = (source) => {
      if (source === 'burungnesia_fobi' || source === 'burungnesia') return 'burungnesia';
      if (source === 'kupunesia_fobi' || source === 'kupunesia') return 'kupunesia';
      if (source === 'taxa_fobi' || source === 'fobi') return 'fobi';
      return source || 'burungnesia'; // default
    };

    return [
      ...markersData.map(marker => ({
        ...marker,
        source: mapSource(marker.source)
      })),
      ...fobiMarkersData.map(marker => ({
        ...marker,
        source: mapSource(marker.source)
      }))
    ];
  };

  // Fungsi untuk menyimpan data ke cache dengan metadata
  const saveToCache = async (data) => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const timestamp = Date.now();
      await store.put({
        data,
        timestamp,
        lastChecked: timestamp
      }, 'markersData');
      
      await tx.done;
      setLastUpdate(timestamp);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fungsi untuk memperbarui lastChecked di cache
  const updateLastChecked = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const cachedData = await store.get('markersData');
      if (cachedData) {
        await store.put({
          ...cachedData,
          lastChecked: Date.now()
        }, 'markersData');
      }
      
      await tx.done;
    } catch (error) {
      console.error('Error updating lastChecked:', error);
    }
  };

  // Fungsi untuk memeriksa pembaruan data
  const checkForUpdates = async () => {
    try {
      const newData = await fetchFromAPI();
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const cachedData = await store.get('markersData');

      // Bandingkan jumlah data dan timestamp terakhir
      if (!cachedData || 
          newData.length !== cachedData.data.length || 
          Date.now() - cachedData.timestamp > CACHE_TIME) {
        await saveToCache(newData);
        setMapMarkers(newData);
        return true;
      }

      await updateLastChecked();
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  };

  // Effect untuk inisialisasi dan pemeriksaan berkala
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Coba ambil dari cache dulu
        const cachedData = await getFromCache();
        if (cachedData) {
          setMapMarkers(cachedData);
          setLoading(false);
          
          // Periksa pembaruan di background
          checkForUpdates();
        } else {
          // Jika tidak ada cache, fetch dari API
          const newData = await fetchFromAPI();
          await saveToCache(newData);
          setMapMarkers(newData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    };

    initializeData();

    // Set interval untuk memeriksa pembaruan setiap 5 menit
    const updateInterval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(updateInterval);
  }, []);

  // Fungsi untuk memperbarui data secara manual
  const refreshMarkers = useCallback(async () => {
    setLoading(true);
    try {
      const newData = await fetchFromAPI();
      await saveToCache(newData);
      setMapMarkers(newData);
    } catch (error) {
      console.error('Error refreshing markers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fungsi untuk fetch markers dengan filter (dasar + advanced)
  const fetchFilteredMarkers = useCallback(async (filters) => {
    // data_source juga dianggap filter aktif jika bukan default ['fobi'] saja
    const hasNonDefaultDataSource = filters?.data_source && (
      filters.data_source.length !== 1 || filters.data_source[0] !== 'fobi'
    );
    const hasAnyFilter = filters?.user_id || filters?.taxonomy_value ||
      filters?.start_date || filters?.end_date || 
      (filters?.grade && filters.grade.length > 0) ||
      filters?.has_media || filters?.media_type || filters?.location_name ||
      hasNonDefaultDataSource;
    
    if (!hasAnyFilter) {
      // Tidak ada filter aktif, gunakan cached markers
      const cachedData = await getFromCache();
      if (cachedData) {
        setMapMarkers(cachedData);
        return;
      }
      const newData = await fetchFromAPI();
      await saveToCache(newData);
      setMapMarkers(newData);
      return;
    }

    setFilterLoading(true);
    try {
      // Tentukan endpoint mana yang perlu dipanggil berdasarkan data_source
      const dataSources = filters.data_source || ['fobi'];
      const needBurungnesia = dataSources.includes('burungnesia') || dataSources.includes('kupunesia');
      const needFobi = dataSources.includes('fobi');

      // Query params umum (untuk kedua endpoint)
      const commonParams = new URLSearchParams();
      if (filters.user_id) commonParams.append('user_id', filters.user_id);
      if (filters.taxonomy_rank) commonParams.append('taxonomy_rank', filters.taxonomy_rank);
      if (filters.taxonomy_value) commonParams.append('taxonomy_value', filters.taxonomy_value);
      if (filters.start_date) commonParams.append('start_date', filters.start_date);
      if (filters.end_date) commonParams.append('end_date', filters.end_date);
      if (filters.date_type) commonParams.append('date_type', filters.date_type);
      if (filters.has_media) commonParams.append('has_media', '1');
      if (filters.media_type) commonParams.append('media_type', filters.media_type);
      if (filters.location_name) commonParams.append('location_name', filters.location_name);

      // Query params khusus fobi (grade hanya untuk fobi, burungnesia/kupunesia tidak punya grade)
      const fobiParams = new URLSearchParams(commonParams);
      if (filters.grade && filters.grade.length > 0) {
        filters.grade.forEach(g => fobiParams.append('grade[]', g));
      }
      // Kirim data_source ke backend agar filter server-side
      dataSources.forEach(ds => fobiParams.append('data_source[]', ds));

      // Fetch hanya endpoint yang diperlukan berdasarkan data_source
      const promises = [];
      const promiseLabels = [];
      if (needBurungnesia) {
        promises.push(apiFetch(`/markers?${commonParams}`).then(r => r.json()));
        promiseLabels.push('markers');
      }
      if (needFobi) {
        promises.push(apiFetch(`/fobi-markers?${fobiParams}`).then(r => r.json()));
        promiseLabels.push('fobi-markers');
      }

      const results = await Promise.allSettled(promises);

      let markersData = [];
      let fobiMarkersData = [];

      results.forEach((result, index) => {
        const label = promiseLabels[index];
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          if (label === 'markers') markersData = result.value;
          else if (label === 'fobi-markers') fobiMarkersData = result.value;
        } else if (result.status === 'rejected') {
          console.error(`Error /${label}:`, result.reason);
        } else if (result.status === 'fulfilled' && !Array.isArray(result.value)) {
          console.error(`Error /${label} response:`, result.value);
        }
      });

      // Mapping source dari backend ke frontend
      const mapSource = (source) => {
        if (source === 'burungnesia_fobi' || source === 'burungnesia') return 'burungnesia';
        if (source === 'kupunesia_fobi' || source === 'kupunesia') return 'kupunesia';
        if (source === 'taxa_fobi' || source === 'fobi') return 'fobi';
        return source || 'burungnesia'; // default
      };

      const filteredData = [
        ...markersData.map(marker => ({
          ...marker,
          source: mapSource(marker.source)
        })),
        ...fobiMarkersData.map(marker => ({
          ...marker,
          source: mapSource(marker.source)
        }))
      ];

      console.log(`Filtered markers: ${markersData.length} from /markers, ${fobiMarkersData.length} from /fobi-markers, sources: ${dataSources.join(',')}, location_name: ${filters.location_name || 'none'}`);
      setMapMarkers(filteredData);
    } catch (error) {
      console.error('Error fetching filtered markers:', error);
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const filterMarkers = (markers, filterParams, searchParams, shape) => {
    if (!markers || markers.length === 0) return [];

    // Debug: log source distribution sebelum filter
    const sourceCounts = {};
    markers.forEach(m => { sourceCounts[m.source] = (sourceCounts[m.source] || 0) + 1; });
    console.log('[filterMarkers] Input:', markers.length, 'markers, sources:', sourceCounts, 'filter data_source:', filterParams?.data_source);

    let filteredMarkers = markers.filter(marker => {
      // Filter berdasarkan sumber data (selalu aktif — client-side only)
      if (filterParams?.data_source?.length > 0) {
        const sourceMatch = filterParams.data_source.some(source => {
          if (source === 'burungnesia') {
            return marker.source === 'burungnesia';
          }
          if (source === 'kupunesia') {
            return marker.source === 'kupunesia';
          }
          if (source === 'fobi') {
            return marker.source === 'fobi';
          }
          return false;
        });
        if (!sourceMatch) return false;
      }

      // Filter berdasarkan pencarian spesies/nama — SKIP jika species sudah dipilih
      // (selectedId/taxonomy_value ada = server sudah filter, markers tidak punya field name/scientific_name)
      const serverAlreadyFiltered = searchParams?.selectedId || filterParams?.taxonomy_value;
      if (searchParams?.search && searchParams.search.trim() !== '' && !serverAlreadyFiltered) {
        const searchLower = searchParams.search.toLowerCase();
        const matchesSearch = 
          (marker.name?.toLowerCase().includes(searchLower)) ||
          (marker.scientific_name?.toLowerCase().includes(searchLower)) ||
          (marker.location?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Grade, date, media sudah difilter server-side oleh fetchFilteredMarkers
      // JANGAN filter ulang di sini — marker dari API tidak punya field photos/photo_url/audio_url

      // Filter berdasarkan lokasi jika ada parameter pencarian
      if (searchParams?.latitude && searchParams?.longitude && filterParams?.radius) {
        const distance = calculateDistance(
          searchParams.latitude,
          searchParams.longitude,
          marker.latitude,
          marker.longitude
        );
        if (distance > filterParams.radius) return false;
      }

      return true;
    });

    // Debug: log hasil setelah filter
    const outCounts = {};
    filteredMarkers.forEach(m => { outCounts[m.source] = (outCounts[m.source] || 0) + 1; });
    console.log('[filterMarkers] Output:', filteredMarkers.length, 'markers, sources:', outCounts);

    // Filter berdasarkan shape jika ada
    if (shape) {
      return filteredMarkers.filter(marker => {
        try {
          const point = [parseFloat(marker.longitude), parseFloat(marker.latitude)];
          
          if (shape.type === 'Polygon') {
            // Pastikan coordinates ada dan valid
            if (!shape.coordinates || !shape.coordinates[0] || !Array.isArray(shape.coordinates[0])) {
              return true; // Skip filter jika format tidak valid
            }
            return turf.booleanPointInPolygon(point, {
              type: 'Polygon',
              coordinates: shape.coordinates
            });
          } 
          else if (shape.type === 'Circle') {
            // Untuk circle, gunakan perhitungan jarak
            if (!shape.center || !shape.radius) {
              return true; // Skip filter jika format tidak valid
            }
            const distance = turf.distance(
              point,
              shape.center,
              { units: 'meters' }
            );
            return distance <= shape.radius;
          }
          return true;
        } catch (error) {
          console.error('Error filtering marker with shape:', error);
          return true; // Jika error, tampilkan marker
        }
      });
    }
    
    return filteredMarkers;
  };

  // Fungsi helper untuk menghitung jarak
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  return {
    mapMarkers,
    loading,
    filterLoading,
    filterMarkers,
    refreshMarkers,
    fetchFilteredMarkers,
    lastUpdate,
    currentShape,
    setCurrentShape
  };
}; 