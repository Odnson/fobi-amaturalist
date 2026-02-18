import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEdit, faTrash, faPlus, faSpinner, faTimes, faMapMarkerAlt, faCalendar, faExclamationTriangle, faBars, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, Circle } from 'react-leaflet';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DeleteObservationModal from '../components/UserObservations/DeleteObservationModal';
import ObservationDetailsModal from '../components/UserObservations/ObservationDetailsModal';
import MultiSpeciesModal from '../components/UserObservations/MultiSpeciesModal';
import axios from 'axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import defaultPlaceholder from '../assets/icon/FOBI.png';
import defaultPlaceholderKupunesia from '../assets/icon/kupnes.png';
import defaultPlaceholderBurungnesia from '../assets/icon/icon.png';
import { useMap } from 'react-leaflet';
import { toast } from 'react-hot-toast';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const UserObservations = () => {
  const navigate = useNavigate();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date | created_at | name
  const [sortOrder, setSortOrder] = useState('desc'); // asc | desc
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMultiSpeciesModal, setShowMultiSpeciesModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mapCenter, setMapCenter] = useState([-2.5489, 118.0149]);
  const [mapObservations, setMapObservations] = useState([]);
  const [gridLevels, setGridLevels] = useState({
    small: [],      // ~2km
    medium: [],     // ~5km
    large: [],      // ~20km
    extraLarge: []  // ~50km
  });
  const [visibleGrid, setVisibleGrid] = useState('extraLarge');
  const [showMarkers, setShowMarkers] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const validateDateRange = (startDate, endDate) => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateRangeError('Tanggal mulai tidak boleh lebih muda dari tanggal akhir');
      return false;
    }
    setDateRangeError('');
    return true;
  };
  const handleDateStartChange = (value) => {
    setDateStartFilter(value);
    if (value && !dateEndFilter) {
      setDateEndFilter(format(new Date(), 'yyyy-MM-dd'));
    }
    validateDateRange(value, dateEndFilter || format(new Date(), 'yyyy-MM-dd'));
  };
  const handleDateEndChange = (value) => {
    setDateEndFilter(value);
    if (value && !dateStartFilter) {
      setDateStartFilter(format(new Date(), 'yyyy-MM-dd'));
    }
    validateDateRange(dateStartFilter || format(new Date(), 'yyyy-MM-dd'), value);
  };
  const activeFiltersCount = [
    searchQuery,
    dateFilter,
    createdDateFilter,
    dateStartFilter,
    dateEndFilter,
    mediaTypeFilter !== 'all' ? mediaTypeFilter : '',
    gradeFilter !== 'all' ? gradeFilter : ''
  ].filter(Boolean).length;
  useEffect(() => {
    const user = {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      profile_picture: localStorage.getItem('profile_picture'),
    };
    setUserData(user);
  }, []);
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: id });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };
  const fetchObservations = useCallback(async () => {
    if (!userData || !userData.id) return;
    
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        per_page: pageSize,
        search: searchQuery,
        search_type: searchType,
        date: dateFilter, // Format tanggal sudah YYYY-MM-DD dari input
        created_date: createdDateFilter,
        date_start: dateStartFilter,
        date_end: dateEndFilter,
        media_type: mediaTypeFilter,
        grade: gradeFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      console.log('Frontend sending params:', params);
      console.log('Current sortBy state:', sortBy);
      console.log('Current sortOrder state:', sortOrder);
      
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Token tidak ditemukan');
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations`, {
        params,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const observationsWithLocationAndDate = response.data.data.data.map((obs) => {
          const fallbackCoords = (obs.latitude && obs.longitude) ? `${obs.latitude}, ${obs.longitude}` : '-';
          return {
            ...obs,
            location_name: obs.location_name || obs.location || fallbackCoords,
            formatted_date: formatDate(obs.observation_date || obs.date || obs.created_at) // Prioritaskan observation_date
          };
        });

        setObservations(observationsWithLocationAndDate);
        setMapObservations(observationsWithLocationAndDate);
        setTotalPages(response.data.data.last_page);
        
        if (observationsWithLocationAndDate.length > 0 && !searchQuery) {
          setMapCenter([observationsWithLocationAndDate[0].latitude, observationsWithLocationAndDate[0].longitude]);
        }
      } else {
        setError(response.data.message || 'Gagal memuat data observasi');
      }
    } catch (err) {
      console.error('Error fetching observations:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  }, [userData, currentPage, pageSize, searchQuery, searchType, dateFilter, createdDateFilter, dateStartFilter, dateEndFilter, mediaTypeFilter, gradeFilter, sortBy, sortOrder, navigate]);
  
  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchObservations();
  };
  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchType('all');
    setDateFilter('');
    setCreatedDateFilter('');
    setDateStartFilter('');
    setDateEndFilter('');
    setDateRangeError('');
    setMediaTypeFilter('all');
    setGradeFilter('all');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handleEdit = (observation) => {
    if (observation.source === 'burungnesia' || observation.source === 'kupunesia') {
      toast.error(
        'Fitur edit untuk observasi Burungnesia dan Kupunesia sedang dinonaktifkan sementara karena adanya perubahan besar pada struktur database. Saat ini, fitur edit hanya tersedia untuk observasi Amaturalist.',
        {
          duration: 5000, 
          style: {
            background: '#2c2c2c',
            color: '#e0e0e0',
            border: '1px solid #444',
          },
        }
      );
      return; 
    }
    
    let editId = observation.id;
    if (observation.source === 'burungnesia') {
      editId = `BN${observation.id}`;
    } else if (observation.source === 'kupunesia') {
      editId = `KN${observation.id}`;
    }
    
    navigate(`/edit-observation/${editId}`);
  };
  
  const handlePhotoClick = (observation) => {
    if (!observation) return;
    let url = '';
    if (observation.source === 'burungnesia') {
      url = `/detail-checklist/BN${observation.id}`;
    } else if (observation.source === 'kupunesia') {
      url = `/detail-checklist/KP${observation.id}`;
    } else {
      url = `/observations/${observation.id}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  const handleDeleteClick = (observation) => {
    setSelectedObservation(observation);
    setShowDeleteModal(true);
  };
  
  const fetchObservationDetails = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-observations/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setDetails(response.data.data);
      } else {
        setError(response.data.message || 'Gagal memuat detail observasi');
      }
    } catch (err) {
      console.error('Error fetching observation details:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedObservation) return;
    
    try {
      setIsDeleting(true);
      
      let deleteId = selectedObservation.id;
      if (selectedObservation.source === 'burungnesia') {
        deleteId = `BN${selectedObservation.id}`;
      } else if (selectedObservation.source === 'kupunesia') {
        deleteId = `KN${selectedObservation.id}`;
      }
      
      const token = localStorage.getItem('jwt_token');
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/user-observations/${deleteId}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setObservations(observations.filter(obs => obs.id !== selectedObservation.id || obs.source !== selectedObservation.source));
        setMapObservations(mapObservations.filter(obs => obs.id !== selectedObservation.id || obs.source !== selectedObservation.source));
        
        setShowDeleteModal(false);
        setSelectedObservation(null);
        
        toast.success('Observasi berhasil dihapus');
      } else {
        setError(response.data.message || 'Gagal menghapus observasi');
      }
    } catch (err) {
      console.error('Error deleting observation:', err);
      if (err.response?.status === 401) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setError('Gagal menghapus observasi. Silakan coba lagi nanti.');
        toast.error('Gagal menghapus observasi');
      }
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleViewDetails = (observation) => {
    setSelectedObservation(observation);
    
    if (observation.source === 'burungnesia' || observation.source === 'kupunesia') {
      setShowMultiSpeciesModal(true);
    } else {
      setShowDetailsModal(true);
    }
  };

  const generateGrid = useCallback((observations, gridSize) => {
    if (!Array.isArray(observations)) return [];
    
    const grid = {};
    observations.forEach((obs) => {
      if (obs.latitude && obs.longitude) {
        const lat = Math.floor(obs.latitude / gridSize) * gridSize;
        const lng = Math.floor(obs.longitude / gridSize) * gridSize;
        const key = `${lat},${lng}`;

        if (!grid[key]) {
          grid[key] = { count: 0, data: [] };
        }
        grid[key].count++;
        grid[key].data.push(obs);
      }
    });

    return Object.keys(grid).map(key => {
      const [lat, lng] = key.split(',').map(Number);
      return {
        bounds: [
          [lat, lng],
          [lat + gridSize, lng + gridSize]
        ],
        count: grid[key].count,
        data: grid[key].data
      };
    });
  }, []);

  const generateGridLevels = useCallback((observations) => {
    return {
      small: generateGrid(observations, 0.02),      // ~2km
      medium: generateGrid(observations, 0.05),     // ~5km
      large: generateGrid(observations, 0.2),       // ~20km
      extraLarge: generateGrid(observations, 0.5)   // ~50km
    };
  }, [generateGrid]);

  const getColor = (count) => {
    return count > 50 ? 'rgba(66, 133, 244, 0.9)' :
           count > 20 ? 'rgba(52, 120, 246, 0.85)' :
           count > 10 ? 'rgba(30, 108, 247, 0.8)' :
           count > 5  ? 'rgba(8, 96, 248, 0.75)' :
           count > 2  ? 'rgba(8, 84, 216, 0.7)' :
                       'rgba(8, 72, 184, 0.65)';
  };

  const handleGridClick = (grid) => {
    setSelectedGrid(grid);
    setShowMarkers(true);
  };

  const ZoomHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleZoom = () => {
        const zoom = map.getZoom();
        if (zoom >= 12) {
          setVisibleGrid('small');
          setShowMarkers(true);
        } else if (zoom >= 10) {
          setVisibleGrid('medium');
          setShowMarkers(false);
        } else if (zoom >= 8) {
          setVisibleGrid('large');
          setShowMarkers(false);
        } else {
          setVisibleGrid('extraLarge');
          setShowMarkers(false);
        }
      };
      
      map.on('zoomend', handleZoom);
      return () => {
        map.off('zoomend', handleZoom);
      };
    }, [map]);
    
    return null;
  };

  useEffect(() => {
    if (observations.length > 0) {
      const levels = generateGridLevels(observations);
      setGridLevels(levels);
    }
  }, [observations, generateGridLevels]);
  
  const getSourceBadge = (source) => {
    if (source === 'burungnesia') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-800 text-white">
          Burungnesia
        </span>
      );
    } else if (source === 'kupunesia') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-800 text-white">
          Kupunesia
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-800 text-white">
          Amaturalist
        </span>
      );
    }
  };

  const getSpeciesSummary = (observation) => {
    if (observation.source !== 'burungnesia' && observation.source !== 'kupunesia') {
      return observation.scientific_name;
    }
    
    if (observation.faunas && observation.faunas.length > 0) {
      const count = observation.faunas.length;
      
      if (count === 1 && observation.faunas[0].fauna) {
        return observation.faunas[0].fauna.nameLat;
      }
      
      const firstSpecies = observation.faunas[0]?.fauna?.nameLat || 'Unknown Species';
      return `${count} spesies (${firstSpecies}, dsb.)`;
    }
    
    return observation.scientific_name || 'Belum ada spesies terdaftar';
  };

  const isAudioFile = (observation) => {
    if (observation.media_type === 'audio') {
      return true;
    }
    
    if (observation.photo_url) {
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
      const url = observation.photo_url.toLowerCase();
      return audioExtensions.some(ext => url.includes(ext));
    }
    
    if (observation.spectrogram || observation.audio_url) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      <Header userData={userData} />
      
      <div className="container mx-auto px-4 py-8 mt-16">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden mb-4 p-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] flex items-center justify-center gap-2 w-full"
        >
          <FontAwesomeIcon icon={showSidebar ? faTimes : faBars} />
          <span>Menu</span>
        </button>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:block lg:w-1/5 xl:w-1/6">
            <Sidebar 
              userId={userData?.id} 
              activeItem="Kelola Observasi"
              isMobileOpen={showSidebar}
              onMobileClose={() => setShowSidebar(false)}
            />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-2xl font-bold text-[#e0e0e0] mb-4 md:mb-0">Kelola Observasi Anda</h1>
              <button 
                onClick={() => navigate('/pilih-observasi')}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0] transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Tambah Observasi</span>
              </button>
            </div>
            
            <div className="mb-6 bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari observasi..."
                      className="w-full pl-10 pr-3 py-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"><FontAwesomeIcon icon={faSearch} /></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(true)}
                    className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#3c3c3c] border border-[#444]"
                  >
                    Filter
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-[#1a73e8] text-white">
                        Aktif ({activeFiltersCount})
                      </span>
                    )}
                  </button>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#3c3c3c] border border-[#444]"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setCurrentPage(1); fetchObservations(); }}
                    className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0]"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Modal */}
            {showFilterModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilterModal(false)} />
                <div className="relative z-10 w-[95%] max-w-xl bg-[#1e1e1e] border border-[#333] rounded-lg shadow-lg p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#e0e0e0]">Filter & Urutkan</h2>
                    <button onClick={() => setShowFilterModal(false)} className="text-[#aaa] hover:text-white">
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <form onSubmit={(e)=>{ e.preventDefault(); setCurrentPage(1); fetchObservations(); setShowFilterModal(false); }} className="space-y-4">
                    <div>
                      <label className="block text-sm text-[#bbb] mb-1">Pencarian</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama spesies, lokasi, dll."
                        className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-[#bbb] mb-1" htmlFor="searchType">Tipe Pencarian</label>
                        <select
                          id="searchType"
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value)}
                          className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        >
                          <option value="all">Semua</option>
                          <option value="species">Nama Spesies</option>
                          <option value="location">Lokasi</option>
                          <option value="date">Tanggal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#bbb] mb-1" htmlFor="mediaType">Tipe Media</label>
                        <select
                          id="mediaType"
                          value={mediaTypeFilter}
                          onChange={(e) => setMediaTypeFilter(e.target.value)}
                          className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        >
                          <option value="all">Semua</option>
                          <option value="photo">Foto</option>
                          <option value="audio">Audio</option>
                          <option value="checklist">Checklist (Burungnesia/Kupunesia)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#bbb] mb-1" htmlFor="grade">Grade</label>
                        <select
                          id="grade"
                          value={gradeFilter}
                          onChange={(e) => setGradeFilter(e.target.value)}
                          className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        >
                          <option value="all">Semua</option>
                          <option value="casual">Casual</option>
                          <option value="needs_id">Bantu Iden</option>
                          <option value="low_quality">ID Kurang</option>
                          <option value="confirmed">ID Terkonfirmasi</option>
                          <option value="research_grade">ID Lengkap</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#bbb] mb-1" htmlFor="sort">Urutkan</label>
                        <select
                          id="sort"
                          aria-label="Urutkan"
                          value={`${sortBy}_${sortOrder}`}
                          onChange={(e) => {
                            const val = e.target.value; // e.g., 'date_desc' or 'created_at_desc'
                            const parts = val.split('_');
                            if (parts.length === 3 && parts[0] === 'created' && parts[1] === 'at') {
                              setSortBy('created_at');
                              setSortOrder(parts[2]);
                            } else {
                              const [by, order] = parts;
                              setSortBy(by);
                              setSortOrder(order);
                            }
                            setCurrentPage(1);
                          }}
                          className="w-full p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        >
                          <option value="date_desc">Tanggal Observasi: Terbaru</option>
                          <option value="date_asc">Tanggal Observasi: Terlama</option>
                          <option value="created_at_desc">Dibuat: Terbaru</option>
                          <option value="created_at_asc">Dibuat: Terlama</option>
                          <option value="name_asc">Nama: A → Z</option>
                          <option value="name_desc">Nama: Z → A</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label htmlFor="dateFilter" className="text-sm text-[#bbb] mb-1">Tanggal Observasi</label>
                        <input
                          id="dateFilter"
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          placeholder="Tanggal Observasi"
                          className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="createdDateFilter" className="text-sm text-[#bbb] mb-1">Tanggal Dibuat (created_at)</label>
                        <input
                          id="createdDateFilter"
                          type="date"
                          value={createdDateFilter}
                          onChange={(e) => setCreatedDateFilter(e.target.value)}
                          placeholder="Tanggal Dibuat (created_at)"
                          className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                          title="Tanggal Dibuat (created_at)"
                        />
                      </div>
                    </div>
                    
                    {/* Date Range Filter */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-[#e0e0e0] mb-2">Filter Rentang Tanggal Observasi</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="dateStartFilter" className="text-sm text-[#bbb] mb-1">Tanggal Mulai</label>
                          <input
                            id="dateStartFilter"
                            type="date"
                            value={dateStartFilter}
                            onChange={(e) => handleDateStartChange(e.target.value)}
                            className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label htmlFor="dateEndFilter" className="text-sm text-[#bbb] mb-1">Tanggal Akhir</label>
                          <input
                            id="dateEndFilter"
                            type="date"
                            value={dateEndFilter}
                            onChange={(e) => handleDateEndChange(e.target.value)}
                            className="p-2 border border-[#444] rounded-lg focus:ring-2 focus:ring-[#1a73e8] bg-[#2c2c2c] text-[#e0e0e0]"
                          />
                        </div>
                      </div>
                      {dateRangeError && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/50 rounded-lg">
                          <p className="text-sm text-red-400 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {dateRangeError}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-[#aaa] mt-4">"Tanggal Observasi" = tanggal di lapangan. "Tanggal Dibuat" = tanggal pencatatan di sistem (created_at).</p>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button type="button" onClick={handleClearFilters} className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded-lg hover:bg-[#3c3c3c] border border-[#444]">Reset</button>
                      <button type="submit" className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1565c0]">Terapkan</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Map View */}
            {mapObservations.length > 0 && (
              <div className="mb-6 bg-[#1e1e1e] p-4 rounded-lg shadow-md border border-[#333]">
                <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Lokasi Observasi</h2>
                <div className="h-[300px] rounded-lg overflow-hidden">
                  <MapContainer
                    center={mapCenter}
                    zoom={5}
                    style={{ height: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <ZoomHandler />
                    
                    {/* Grid System */}
                    {!showMarkers && visibleGrid !== 'none' && 
                      gridLevels[visibleGrid]?.map((grid, index) => (
                        <Rectangle
                          key={`grid-${index}`}
                          bounds={grid.bounds}
                          pathOptions={{
                            color: getColor(grid.count),
                            fillColor: getColor(grid.count),
                            fillOpacity: 0.8,
                            weight: 1
                          }}
                          eventHandlers={{
                            click: () => handleGridClick(grid)
                          }}
                        >
                          {selectedGrid === grid && (
                            <Popup className="dark-popup">
                              <div className="bg-[#2c2c2c] p-2 rounded">
                                <h3 className="font-bold text-[#e0e0e0]">Total Observasi: {grid.count}</h3>
                                <div className="max-h-40 overflow-y-auto">
                                  {grid.data.map((obs, i) => (
                                    <div key={i} className="mt-2 border-t border-[#444] pt-1">
                                      <p className="italic text-[#e0e0e0]">{obs.scientific_name}</p>
                                      <p className="text-gray-300">{obs.location_name}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Popup>
                          )}
                        </Rectangle>
                      ))
                    }

                    {/* Individual Markers */}
                    {showMarkers && mapObservations.map((obs, index) => (
                      <Circle
                        key={`marker-${obs.id}-${index}`}
                        center={[obs.latitude, obs.longitude]}
                        radius={800}
                        pathOptions={{
                          color: '#1a73e8',
                          fillColor: '#1a73e8',
                          fillOpacity: 0.6,
                          weight: 1
                        }}
                      >
                        <Popup>
                          <div className="bg-[#2c2c2c] p-2 rounded shadow-md max-w-[200px]">
                            {obs.photo_url && (
                              <img
                                src={obs.photo_url}
                                alt={obs.scientific_name}
                                className="w-full h-24 object-cover rounded mb-2"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  if (obs.source === 'kupunesia') {
                                    e.target.src = defaultPlaceholderKupunesia;
                                  } else if (obs.source === 'burungnesia') {
                                    e.target.src = defaultPlaceholderBurungnesia;
                                  } else {
                                    e.target.src = defaultPlaceholder;
                                  }
                                }}
                              />
                            )}
                            <h3 className="font-bold text-[#e0e0e0] italic">{obs.scientific_name}</h3>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                              <span>{obs.location_name}</span>
                            </p>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                              <FontAwesomeIcon icon={faCalendar} className="text-[#1a73e8]" />
                              <span>{obs.formatted_date}</span>
                            </p>
                          </div>
                        </Popup>
                      </Circle>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}
            
            {/* Observations Table */}
            <div className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-[#333]">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex justify-center items-center p-8">
                    <FontAwesomeIcon icon={faSpinner} spin size="lg" className="text-[#1a73e8]" />
                    <span className="ml-2">Memuat data...</span>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center p-8 text-red-400">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    <span>{error}</span>
                  </div>
                ) : observations.length === 0 ? (
                  <div className="p-8 text-center text-[#aaa]">
                    Tidak ada observasi ditemukan.
                    {(searchQuery || dateFilter) && (
                      <p className="mt-2">
                        <button
                          onClick={handleClearFilters}
                          className="text-[#1a73e8] hover:underline"
                        >
                          Hapus filter
                        </button>
                      </p>
                    )}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-[#333]">
                    <thead className="bg-[#2c2c2c]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Foto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Spesies / Taksa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Lokasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[120px]">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[110px]">
                          Sumber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider min-w-[130px]">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#aaa] uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {observations.map((observation) => (
                        <tr 
                          key={`${observation.source}-${observation.id}`} 
                          className="hover:bg-[#2a2a2a] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className="w-16 h-16 relative bg-[#2c2c2c] rounded flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#1a73e8]"
                              onClick={() => handlePhotoClick(observation)}
                              role="button"
                              aria-label={`Lihat detail observasi ${observation.scientific_name}`}
                            >
                              {isAudioFile(observation) ? (
                                <FontAwesomeIcon 
                                  icon={faVolumeUp} 
                                  className="text-[#1a73e8] text-2xl"
                                  title="File Audio"
                                />
                              ) : observation.photo_url ? (
                                <img
                                  src={observation.photo_url}
                                  alt={observation.scientific_name}
                                  className="w-16 h-16 object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    if (observation.source === 'kupunesia') {
                                      e.target.src = defaultPlaceholderKupunesia;
                                    } else if (observation.source === 'burungnesia') {
                                      e.target.src = defaultPlaceholderBurungnesia;
                                    } else {
                                      e.target.src = defaultPlaceholder;
                                    }
                                    console.log('Error loading image:', observation.photo_url);
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', observation.photo_url);
                                  }}
                                />
                              ) : (
                                <img
                                  src={observation.source === 'kupunesia' ? defaultPlaceholderKupunesia : observation.source === 'burungnesia' ? defaultPlaceholderBurungnesia : defaultPlaceholder}
                                  alt="Default"
                                  className="w-12 h-12 object-contain opacity-60"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-[#e0e0e0] font-medium italic">
                                {getSpeciesSummary(observation)}
                              </p>
                              {observation.genus && observation.species && observation.source === 'taxa' && (
                                <p className="text-[#aaa] text-sm">
                                  {observation.family}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8] mr-2" />
                              <span className="text-[#e0e0e0]">{observation.location_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#e0e0e0] whitespace-nowrap">
                            {observation.formatted_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSourceBadge(observation.source)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs text-white ${
                              observation.quality_assessment?.grade?.toLowerCase() === 'research grade' ? 'bg-blue-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'confirmed id' ? 'bg-green-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'needs id' ? 'bg-yellow-700/70' :
                              observation.quality_assessment?.grade?.toLowerCase() === 'low quality id' ? 'bg-orange-700/70' :
                              'bg-gray-700/70'
                            }`}>
                              {observation.quality_assessment?.grade 
                                ? (observation.quality_assessment.grade.toLowerCase() === 'research grade' ? 'ID Lengkap' :
                                   observation.quality_assessment.grade.toLowerCase() === 'confirmed id' ? 'ID Terkonfirmasi' :
                                   observation.quality_assessment.grade.toLowerCase() === 'needs id' ? 'Bantu Iden' :
                                   observation.quality_assessment.grade.toLowerCase() === 'low quality id' ? 'ID Kurang' :
                                   'casual')
                                : (observation.source === 'burungnesia' ? 'Checklist' :
                                   observation.source === 'kupunesia' ? 'Checklist' :
                                   'casual')
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleViewDetails(observation)}
                                className="p-2 bg-[#323232] hover:bg-[#3c3c3c] rounded text-blue-300 transition-colors"
                                title="Lihat Detail"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(observation)}
                                className="p-2 bg-[#323232] hover:bg-[#3c3c3c] rounded text-red-400 transition-colors"
                                title="Hapus"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Pagination & Page Size */}
              {observations.length > 0 && (
                <div className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-[#333]">
                  <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-[#aaa]">Baris per halaman:</label>
                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="p-1.5 bg-[#2c2c2c] text-[#e0e0e0] border border-[#444] rounded"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#aaa] md:text-center">
                      Halaman {currentPage} dari {Math.max(totalPages, 1)}
                    </p>
                  </div>
                  <div className="flex gap-2 md:justify-end">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || totalPages <= 1}
                      className="px-3 py-1 bg-[#323232] text-[#e0e0e0] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages <= 1}
                      className="px-3 py-1 bg-[#323232] text-[#e0e0e0] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Modal */}
      <DeleteObservationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        observation={selectedObservation}
      />
      
      {/* Details Modal for single species (FOBI-Amaturalist) */}
      <ObservationDetailsModal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        observation={selectedObservation}
        onEdit={() => {
          setShowDetailsModal(false);
          if (selectedObservation) {
            handleEdit(selectedObservation);
          }
        }}
      />
      
      {/* Multi-species Modal for Burungnesia/Kupunesia */}
      <MultiSpeciesModal
        show={showMultiSpeciesModal}
        onClose={() => setShowMultiSpeciesModal(false)}
        observation={selectedObservation}
        onEdit={() => {
          setShowMultiSpeciesModal(false);
          if (selectedObservation) {
            handleEdit(selectedObservation);
          }
        }}
      />
    </div>
  );
};

export default UserObservations; 