import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Popup, Rectangle, useMap, Circle } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMapMarkerAlt, faSpinner, faBars, faTimes, faMap, faThLarge, faList,
    faSearch, faEye, faImage, faLocationDot, faCalendar, faUsers,
    faChevronLeft, faChevronRight, faAngleDoubleLeft, faAngleDoubleRight, faTrash, faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DeleteObservationModal from '../components/UserObservations/DeleteObservationModal';
import SpectrogramPlayer from '../components/SpectrogramPlayer';
import axios from 'axios';
import { toast } from 'react-toastify';
import fobiLogo from '../assets/icon/FOBI.png';
import birdLogo from '../assets/icon/icon.png';
import butterflyLogo from '../assets/icon/kupnes.png';
const getUserData = () => {
    return {
      uname: localStorage.getItem('username'),
      level: localStorage.getItem('level'),
      email: localStorage.getItem('email'),
      bio: localStorage.getItem('bio'),
      profile_picture: localStorage.getItem('profile_picture'),
      totalObservations: localStorage.getItem('totalObservations'),
    };
  };
const getColor = (count) => {
    return count > 50 ? 'rgba(66, 133, 244, 0.9)' :
           count > 20 ? 'rgba(52, 120, 246, 0.85)' :
           count > 10 ? 'rgba(30, 108, 247, 0.8)' :
           count > 5  ? 'rgba(8, 96, 248, 0.75)' :
           count > 2  ? 'rgba(8, 84, 216, 0.7)' :
                       'rgba(8, 72, 184, 0.65)';
};
const getSourceName = (source) => {
    switch(source) {
        case 'bird':
        case 'burungnesia':
            return 'Burungnesia';
        case 'butterfly':
        case 'kupunesia':
            return 'Kupunesia';
        case 'fobi':
        case 'taxa':
            return 'Amaturalist';
        default:
            return source;
    }
};

const getMarkerColor = (source) => {
    switch(source) {
        case 'fobi':
        case 'taxa':
            return '#1a73e8'; // blue - sama dengan UserObservations
        case 'bird':
        case 'burungnesia':
            return '#e91e63'; // pink - sama dengan UserObservations
        case 'butterfly':
        case 'kupunesia':
            return '#9c27b0'; // purple - sama dengan UserObservations
        default:
            return '#6b7280'; // gray
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
};

const ProfileObservations = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileData, setProfileData] = useState(null);
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
    const [mapMode, setMapMode] = useState('agregat'); // 'agregat' atau 'realtime'
    const [selectedGrid, setSelectedGrid] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = currentUserId === id;
    const [viewMode, setViewMode] = useState('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        totalObservations: 0,
        totalSpecies: 0,
        totalIdentPerdana: 0,
        totalIdentifications: 0,
        fopiObservations: 0,
        birdObservations: 0,
        butterflyObservations: 0,
        birdSpecies: 0,
        butterflySpecies: 0,
        hasBurungnesia: false,
        hasKupunesia: false
    });
    const [gridObservations, setGridObservations] = useState([]);
    const [listObservations, setListObservations] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [perPage, setPerPage] = useState(20);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimeoutRef = useRef(null);
    const [sourceFilter, setSourceFilter] = useState('all'); // all, fobi, burungnesia, kupunesia
    const [gradeFilter, setGradeFilter] = useState('all'); // all, research_grade, confirmed_id, needs_id, low_quality_id
    const { ref: infiniteScrollRef, inView } = useInView({
        threshold: 0,
        rootMargin: '100px'
    });
    const AMAT_SOURCES = useMemo(() => new Set(['fobi', 'taxa']), []);
    const BIRD_SOURCES = useMemo(() => new Set(['burungnesia', 'bird']), []);
    const KUPU_SOURCES = useMemo(() => new Set(['kupunesia', 'butterfly']), []);
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
    useMemo(() => {
        const amat = [];
        const bird = [];
        const kupu = [];
        for (const obs of mapObservations) {
            if (AMAT_SOURCES.has(obs.source)) amat.push(obs);
            else if (BIRD_SOURCES.has(obs.source)) bird.push(obs);
            else if (KUPU_SOURCES.has(obs.source)) kupu.push(obs);
        }
        return { obsAmat: amat, obsBird: bird, obsKupu: kupu };
    }, [mapObservations, AMAT_SOURCES, BIRD_SOURCES, KUPU_SOURCES]);
    const handleGridClick = useCallback((grid) => {
        setSelectedGrid(grid);
        setShowMarkers(true);
    }, []);
    const ZoomHandler = () => {
        const map = useMap();

        useEffect(() => {
            if (!map) return;

            const handleZoomEnd = () => {
                const zoom = map.getZoom();
                if (zoom > 12) {
                    setShowMarkers(true);
                    setVisibleGrid('none');
                } else if (zoom > 10) {
                    setShowMarkers(false);
                    setVisibleGrid('small');
                } else if (zoom > 8) {
                    setVisibleGrid('medium');
                } else if (zoom > 6) {
                    setVisibleGrid('large');
                } else {
                    setVisibleGrid('extraLarge');
                }
            };

            map.on('zoomend', handleZoomEnd);
            handleZoomEnd();

            return () => {
                map.off('zoomend', handleZoomEnd);
            };
        }, [map]);

        return null;
    };
    const fetchMapData = useCallback(async () => {
        try {
            setLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('map', 'true');
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const observations = Array.isArray(data.data) ? data.data : [];
                setMapObservations(observations);
                const grids = generateGridLevels(observations);
                setGridLevels(grids);
                if (observations.length > 0) {
                    setMapCenter([observations[0].latitude, observations[0].longitude]);
                }
            }
        } catch (error) {
            console.error('Error fetching map data:', error);
            setError('Gagal memuat data peta. Silakan coba lagi nanti.');
        } finally {
            setLoading(false);
        }
    }, [id, generateGridLevels]);
    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);
    useEffect(() => {
        if (!id) return;
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
                const data = await response.json();
                if (data.success) {
                    setProfileData(data.data);
                    setStats({
                        totalObservations: data.data?.stats?.totalObservations || data.data?.user?.totalObservations || 0,
                        totalSpecies: data.data?.stats?.totalSpecies || 0,
                        totalIdentPerdana: data.data?.stats?.totalIdentPerdana || 0,
                        totalIdentifications: data.data?.stats?.totalIdentifications || 0,
                        fopiObservations: data.data?.stats?.fopiObservations || 0,
                        birdObservations: data.data?.stats?.birdObservations || 0,
                        butterflyObservations: data.data?.stats?.butterflyObservations || 0,
                        birdSpecies: data.data?.stats?.birdSpecies || 0,
                        butterflySpecies: data.data?.stats?.butterflySpecies || 0,
                        hasBurungnesia: data.data?.stats?.hasBurungnesia || false,
                        hasKupunesia: data.data?.stats?.hasKupunesia || false
                    });
                }
            } catch (e) {
                console.error('Gagal memuat data profil untuk Sidebar:', e);
            }
        };
        fetchProfile();
    }, [id]);
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
            setGridObservations([]);
            setHasMore(true);
        }, 500);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);
    const fetchPaginatedObservations = useCallback(async (page = 1, append = false, customPerPage = null) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setListLoading(true);
            }
            
            const effectivePerPage = customPerPage || perPage;
            const url = new URL(`${import.meta.env.VITE_API_URL}/profile/observations/${id}`, window.location.origin);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('per_page', effectivePerPage.toString());
            if (debouncedSearch.trim()) {
                url.searchParams.append('search', debouncedSearch.trim());
            }
            if (sourceFilter !== 'all') {
                url.searchParams.append('source', sourceFilter);
            }
            if (gradeFilter !== 'all') {
                url.searchParams.append('grade', gradeFilter);
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const observations = Array.isArray(data.data) ? data.data : [];
                const meta = data.meta || {};
                
                if (append) {
                    setGridObservations(prev => [...prev, ...observations]);
                } else {
                    setGridObservations(observations);
                    setListObservations(observations);
                }
                const total = meta.total || observations.length;
                const lastPage = meta.last_page || Math.ceil(total / perPage);
                setTotalPages(lastPage);
                setHasMore(page < lastPage);
            }
        } catch (error) {
            console.error('Error fetching paginated observations:', error);
        } finally {
            setLoadingMore(false);
            setListLoading(false);
        }
    }, [id, debouncedSearch, sourceFilter, gradeFilter, perPage]);
    useEffect(() => {
        if (viewMode === 'grid' || viewMode === 'list') {
            fetchPaginatedObservations(1, false);
        }
    }, [viewMode, debouncedSearch, sourceFilter, gradeFilter, fetchPaginatedObservations]);
    useEffect(() => {
        if (inView && hasMore && !loadingMore && viewMode === 'grid') {
            const nextPage = Math.ceil(gridObservations.length / perPage) + 1;
            fetchPaginatedObservations(nextPage, true);
        }
    }, [inView, hasMore, loadingMore, viewMode, gridObservations.length, perPage, fetchPaginatedObservations]);
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchPaginatedObservations(newPage, false);
        }
    };
    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setCurrentPage(1);
        fetchPaginatedObservations(1, false, newPerPage);
    };
    const handleClearFilters = () => {
        setSearchQuery('');
        setSourceFilter('all');
        setGradeFilter('all');
    };
    const formatNumber = (num) => {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    const getObsGrade = (obs) => {
        return obs.grade || obs.quality_assessment?.grade || null;
    };
    const getGradeDisplay = (obs) => {
        const grade = getObsGrade(obs);
        if (!grade) {
            if (obs.source === 'burungnesia' || obs.source === 'bird') return 'Checklist';
            if (obs.source === 'kupunesia' || obs.source === 'butterfly') return 'Checklist';
            return 'Casual';
        }
        if (grade.toLowerCase() === 'research grade') return 'ID Lengkap';
        if (grade.toLowerCase() === 'confirmed id') return 'ID Terkonfirmasi';
        if (grade.toLowerCase() === 'needs id') return 'Bantu Iden';
        if (grade.toLowerCase() === 'low quality id') return 'ID Kurang';
        return 'Checklist';
    };
    const getGradeColor = (obs) => {
        const grade = getObsGrade(obs);
        if (!grade) return 'bg-gray-700/70';
        if (grade.toLowerCase() === 'research grade') return 'bg-blue-700/70';
        if (grade.toLowerCase() === 'confirmed id') return 'bg-green-700/70';
        if (grade.toLowerCase() === 'needs id') return 'bg-yellow-700/70';
        if (grade.toLowerCase() === 'low quality id') return 'bg-orange-700/70';
        return 'bg-gray-700/70';
    };
    const getPhotoUrl = (obs) => {
        if (obs.photo_url) return obs.photo_url;
        if (obs.images && Array.isArray(obs.images) && obs.images.length > 0) {
            const firstImage = obs.images[0];
            return typeof firstImage === 'string' ? firstImage : firstImage?.url;
        }
        if (obs.image) return obs.image;
        if (obs.media && Array.isArray(obs.media) && obs.media.length > 0) {
            return obs.media[0]?.url || obs.media[0];
        }
        return null;
    };
    const getDefaultImage = (obs) => {
        if (obs.source === 'burungnesia' || obs.source === 'bird') return birdLogo;
        if (obs.source === 'kupunesia' || obs.source === 'butterfly') return butterflyLogo;
        return fobiLogo;
    };
    const getSpectrogramUrl = (obs) => {
        if (obs.spectrogram_url) return obs.spectrogram_url;
        if (obs.media && Array.isArray(obs.media)) {
            const audioMedia = obs.media.find(m => m.spectrogram_url || m.media_type === 'audio');
            return audioMedia?.spectrogram_url || null;
        }
        return null;
    };
    const getAudioUrl = (obs) => {
        if (obs.audio_url) return obs.audio_url;
        if (obs.media && Array.isArray(obs.media)) {
            const audioMedia = obs.media.find(m => m.media_type === 'audio' || m.spectrogram_url);
            return audioMedia?.url || null;
        }
        return null;
    };
    const hasAudio = (obs) => {
        return !!(getSpectrogramUrl(obs) || getAudioUrl(obs));
    };
    const handleObservationClick = (obs) => {
        let path;
        if (obs.source === 'burungnesia' || obs.source === 'bird') {
            path = `/app-checklist/BN${obs.id}`;
        } else if (obs.source === 'kupunesia' || obs.source === 'butterfly') {
            path = `/app-checklist/KP${obs.id}`;
        } else {
            path = `/observations/${obs.id}`;
        }
        window.open(path, '_blank');
    };
    const handleDeleteClick = (observation) => {
        setSelectedObservation(observation);
        setShowDeleteModal(true);
    };
    const handleDeleteConfirm = async () => {
        if (!selectedObservation) return;
        
        try {
            setIsDeleting(true);
            let deleteId = selectedObservation.id;
            if (selectedObservation.source === 'burungnesia' || selectedObservation.source === 'bird') {
                deleteId = `BN${selectedObservation.id}`;
            } else if (selectedObservation.source === 'kupunesia' || selectedObservation.source === 'butterfly') {
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
                setMapObservations(prev => prev.filter(obs => !(obs.id === selectedObservation.id && obs.source === selectedObservation.source)));
                setGridObservations(prev => prev.filter(obs => !(obs.id === selectedObservation.id && obs.source === selectedObservation.source)));
                setListObservations(prev => prev.filter(obs => !(obs.id === selectedObservation.id && obs.source === selectedObservation.source)));
                setShowDeleteModal(false);
                setSelectedObservation(null);
                toast.success('Observasi berhasil dihapus');
            } else {
                toast.error(response.data.message || 'Gagal menghapus observasi');
            }
        } catch (err) {
            console.error('Error deleting observation:', err);
            if (err.response?.status === 401) {
                toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
            } else {
                toast.error('Gagal menghapus observasi. Silakan coba lagi nanti.');
            }
        } finally {
            setIsDeleting(false);
        }
    };
    const filteredObservations = useMemo(() => {
        if (!searchQuery.trim()) return mapObservations;
        const query = searchQuery.toLowerCase();
        return mapObservations.filter(obs => 
            (obs.scientific_name && obs.scientific_name.toLowerCase().includes(query)) ||
            (obs.nama_latin && obs.nama_latin.toLowerCase().includes(query)) ||
            (obs.location_name && obs.location_name.toLowerCase().includes(query))
        );
    }, [mapObservations, searchQuery]);
    const toggleSidebar = () => {
        setShowSidebar(!showSidebar);
    };
    const ObservationMarker = React.memo(({ observation }) => {
        const isSelected = selectedMarker?.id === observation.id;
        const isHovered = hoveredMarker?.id === observation.id;
        
        const handleClick = () => {
            setSelectedMarker(observation);
        };

        const handleMouseOver = () => {
            setHoveredMarker(observation);
        };

        const handleMouseOut = () => {
            setHoveredMarker(null);
        };

        return (
            <Circle
                center={[observation.latitude, observation.longitude]}
                radius={isSelected || isHovered ? 1000 : 800}
                pathOptions={{
                    color: getMarkerColor(observation.source),
                    fillColor: getMarkerColor(observation.source),
                    fillOpacity: isSelected || isHovered ? 0.8 : 0.6,
                    weight: isSelected || isHovered ? 2 : 1
                }}
                eventHandlers={{
                    click: handleClick,
                    mouseover: handleMouseOver,
                    mouseout: handleMouseOut
                }}
            >
                {(isSelected || isHovered) && (
                    <Popup>
                        <div className="bg-[#2c2c2c] p-2 rounded shadow-md max-w-[200px]">
                            {observation.photo_url && (
                                <img
                                    src={observation.photo_url}
                                    alt={observation.scientific_name || observation.nama_latin}
                                    className="w-full h-24 object-cover rounded mb-2"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        if (observation.source === 'kupunesia' || observation.source === 'butterfly') {
                                            e.target.src = butterflyLogo;
                                        } else if (observation.source === 'burungnesia' || observation.source === 'bird') {
                                            e.target.src = birdLogo;
                                        } else {
                                            e.target.src = fobiLogo;
                                        }
                                    }}
                                />
                            )}
                            <h3 className="font-bold text-[#e0e0e0] italic">{observation.scientific_name || observation.nama_latin}</h3>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                                <span>{observation.location_name || "Memuat lokasi..."}</span>
                            </p>
                            <p className="text-sm text-[#aaa] flex items-center gap-1 mt-1">
                                <span className="whitespace-nowrap">{formatDate(observation.observation_date || observation.date || observation.created_at)}</span>
                            </p>
                            <div className="mt-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                    observation.source === 'burungnesia' || observation.source === 'bird' ? 'bg-pink-800 text-white' : 
                                    observation.source === 'kupunesia' || observation.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                    'bg-blue-800 text-white'
                                }`}>
                                    {getSourceName(observation.source)}
                                </span>
                            </div>
                        </div>
                    </Popup>
                )}
            </Circle>
        );
    });
    const renderMapView = () => (
        <div className="relative">
            <div className="h-[500px] sm:h-[600px] rounded-lg overflow-hidden shadow-lg border border-[#333]">
                <MapContainer
                    center={mapCenter}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                    className="dark-map"
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <ZoomHandler />
                    
                    {/* Grid Rectangles - hanya tampil jika mode agregat */}
                    {mapMode === 'agregat' && visibleGrid !== 'none' && 
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
                                                    <p className="italic text-[#e0e0e0]">{obs.scientific_name || obs.nama_latin}</p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                                                            obs.source === 'burungnesia' || obs.source === 'bird' ? 'bg-pink-800 text-white' : 
                                                            obs.source === 'kupunesia' || obs.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                                            'bg-blue-800 text-white'
                                                        }`}>
                                                            {getSourceName(obs.source)}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{formatDate(obs.observation_date || obs.date || obs.created_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Popup>
                            )}
                        </Rectangle>
                    ))}

                    {/* Individual Markers - hanya tampil jika mode realtime */}
                    {mapMode === 'realtime' && filteredObservations.map((obs, index) => (
                        <ObservationMarker 
                            key={`marker-${obs.id}-${index}`}
                            observation={obs}
                        />
                    ))}
                </MapContainer>

                {/* Floating Legend */}
                <div className="absolute bottom-4 left-4 z-[1000] p-3">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors ${mapMode === 'agregat' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => setMapMode('agregat')}
                            >
                                <div className="w-3 h-3 bg-white"></div>
                                <span>Agregat</span>
                            </button>
                            <button 
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors ${mapMode === 'realtime' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => setMapMode('realtime')}
                            >
                                <div className="w-3 h-3 rounded-full bg-white"></div>
                                <span>Real time</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm text-gray-400">Amaturalist</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                                <span className="text-sm text-gray-400">Burungnesia</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-sm text-gray-400">Kupunesia</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    const isDefaultIcon = (url) => {
        if (!url) return true;
        return [fobiLogo, birdLogo, butterflyLogo].some(icon => url === icon);
    };
    const isChecklist = (obs) => {
        return obs.source === 'bird' || obs.source === 'burungnesia' || 
               obs.source === 'butterfly' || obs.source === 'kupunesia';
    };
    const renderGridView = () => (
        <>
            {/* Grid Container */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {gridObservations.map((obs, index) => {
                    const photoUrl = getPhotoUrl(obs);
                    const defaultImg = getDefaultImage(obs);
                    const showAsIcon = !photoUrl || isDefaultIcon(photoUrl);
                    const isChecklistObs = isChecklist(obs);
                    
                    return (
                        <div 
                            key={`grid-${obs.id}-${obs.source}-${index}`}
                            className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] hover:border-[#444] transition-all duration-200 cursor-pointer group hover:shadow-lg hover:scale-[1.02] hover:bg-[#252525]"
                            onClick={() => handleObservationClick(obs)}
                        >
                            {/* Image / Spectrogram */}
                            <div className="relative h-40 bg-[#2c2c2c]">
                                {getSpectrogramUrl(obs) ? (
                                    <SpectrogramPlayer 
                                        spectrogramUrl={getSpectrogramUrl(obs)}
                                        audioUrl={getAudioUrl(obs)}
                                    />
                                ) : (
                                    <div className={`w-full h-full overflow-hidden ${showAsIcon ? 'bg-[#1a1a1a] flex items-center justify-center' : 'bg-[#2c2c2c]'}`}>
                                        <img 
                                            src={photoUrl || defaultImg}
                                            alt={obs.scientific_name || obs.nama_latin}
                                            className={`${showAsIcon ? 'w-16 h-16 object-contain opacity-40' : 'w-full h-full object-cover'}`}
                                            loading={index < 12 ? 'eager' : 'lazy'}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = defaultImg;
                                                e.target.className = 'w-16 h-16 object-contain opacity-40';
                                                e.target.parentElement.className = 'w-full h-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center';
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Grade Badge */}
                                <div className="absolute top-2 right-2 z-10">
                                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getGradeColor(obs)}`}>
                                        {getGradeDisplay(obs)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-2 flex flex-col">
                                {isChecklistObs ? (
                                    <>
                                        {/* Checklist: lokasi sebagai title */}
                                        <h3 className="font-medium text-white text-sm truncate" title={obs.location_name}>
                                            {obs.location_name || `${parseFloat(obs.latitude)?.toFixed(2)}, ${parseFloat(obs.longitude)?.toFixed(2)}`}
                                        </h3>
                                        <p className="text-xs text-gray-400 truncate italic">{obs.nama_latin || obs.nama_umum || ''}</p>
                                        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                                            <span>{obs.observation_date ? new Date(obs.observation_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</span>
                                            <span className="text-blue-400">{obs.species_count || 1} Jenis</span>
                                        </div>
                                    </>
                                ) : (
                                    /* Amaturalist: species sebagai title */
                                    <>
                                        <h3 className="font-medium text-white text-sm truncate">
                                            {obs.nama_umum || obs.scientific_name || obs.nama_latin || 'Unknown'}
                                        </h3>
                                        {obs.nama_latin && (
                                            <p className="text-xs text-gray-400 truncate italic">{obs.nama_latin}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                                            <span>{obs.observation_date ? new Date(obs.observation_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</span>
                                            <span>{obs.identifications_count || 0} ID</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Infinite Scroll Loading Indicator */}
            {hasMore && (
                <div ref={infiniteScrollRef} className="mt-6 flex justify-center">
                    {loadingMore ? (
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-5 h-5 border-2 border-gray-600 border-t-[#3B82F6] rounded-full animate-spin"></div>
                            <span>Memuat lebih banyak...</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                const nextPage = Math.ceil(gridObservations.length / perPage) + 1;
                                fetchPaginatedObservations(nextPage, true);
                            }}
                            className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#252525] rounded-lg text-sm text-gray-300 transition-colors border border-[#333]"
                        >
                            Muat Lebih Banyak
                        </button>
                    )}
                </div>
            )}
            
            {/* Empty State */}
            {!loadingMore && gridObservations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FontAwesomeIcon icon={faImage} className="text-4xl mb-4" />
                    <p>Tidak ada observasi ditemukan</p>
                    {(debouncedSearch || sourceFilter !== 'all' || gradeFilter !== 'all') && (
                        <button
                            onClick={handleClearFilters}
                            className="mt-4 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
            )}
        </>
    );
    const renderListView = () => (
        <>
            {/* Loading State */}
            {listLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-[#3B82F6] rounded-full animate-spin"></div>
                        <span>Memuat data...</span>
                    </div>
                </div>
            )}
            
            {/* Table */}
            {!listLoading && (
                <div className="bg-[#1e1e1e] rounded-lg border border-[#333] overflow-hidden">
                    {/* Per Page Selector */}
                    <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-[#333]">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Tampilkan</span>
                            <select
                                value={perPage}
                                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                className="bg-[#252525] border border-[#444] rounded px-2 py-1 text-white focus:outline-none focus:border-[#3B82F6]"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>data per halaman</span>
                        </div>
                        <div className="text-sm text-gray-400">
                            Total: <span className="text-white font-medium">{stats.totalObservations}</span> observasi
                        </div>
                    </div>
                    
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-[#252525] border-b border-[#333] text-sm font-medium text-gray-400">
                        <div className="col-span-1">FOTO</div>
                        <div className="col-span-3">SPESIES / TAKSA</div>
                        <div className="col-span-2">LOKASI</div>
                        <div className="col-span-2">TANGGAL</div>
                        <div className="col-span-1">SUMBER</div>
                        <div className="col-span-2">GRADE</div>
                        <div className="col-span-1">AKSI</div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="divide-y divide-[#333]">
                        {listObservations.map((obs, index) => (
                            <div 
                                key={`list-${obs.id}-${obs.source}-${index}`}
                                className="p-4 hover:bg-[#252525] transition-colors cursor-pointer"
                                onClick={() => handleObservationClick(obs)}
                            >
                                {/* Mobile Layout */}
                                <div className="md:hidden">
                                    {(() => {
                                        const photoUrl = getPhotoUrl(obs);
                                        const defaultImg = getDefaultImage(obs);
                                        const showAsIcon = !photoUrl || isDefaultIcon(photoUrl);
                                        const isChecklistObs = isChecklist(obs);
                                        
                                        return (
                                            <div className="flex gap-3">
                                                {/* Photo / Spectrogram */}
                                                <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${showAsIcon ? 'bg-[#1a1a1a] flex items-center justify-center' : 'bg-[#2c2c2c]'}`}>
                                                    {getSpectrogramUrl(obs) ? (
                                                        <SpectrogramPlayer 
                                                            spectrogramUrl={getSpectrogramUrl(obs)}
                                                            audioUrl={getAudioUrl(obs)}
                                                        />
                                                    ) : (
                                                        <img 
                                                            src={photoUrl || defaultImg}
                                                            alt={obs.scientific_name || obs.nama_latin}
                                                            className={`${showAsIcon ? 'w-8 h-8 object-contain opacity-40' : 'w-full h-full object-cover'}`}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = defaultImg;
                                                                e.target.className = 'w-8 h-8 object-contain opacity-40';
                                                                e.target.parentElement.className = 'w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            {isChecklistObs ? (
                                                                <>
                                                                    <span className="font-medium text-white text-sm block truncate">
                                                                        {obs.location_name || `${parseFloat(obs.latitude)?.toFixed(2)}, ${parseFloat(obs.longitude)?.toFixed(2)}`}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400 italic block truncate">{obs.nama_latin || obs.nama_umum || ''}</span>
                                                                    {obs.species_count > 1 && (
                                                                        <span className="text-[10px] text-blue-400">+{obs.species_count - 1} jenis lain</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="font-medium text-white text-sm block truncate">{obs.nama_umum || obs.scientific_name || obs.nama_latin || 'Unknown'}</span>
                                                                    {obs.nama_latin && obs.nama_umum && (
                                                                        <span className="text-xs text-gray-400 italic block truncate">{obs.nama_latin}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button 
                                                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); handleObservationClick(obs); }}
                                                                title="Lihat Detail"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="text-sm" />
                                                            </button>
                                                            {isOwnProfile && (
                                                                <button 
                                                                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(obs); }}
                                                                    title="Hapus"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="text-sm" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                                                        <FontAwesomeIcon icon={faCalendar} className="text-[10px]" />
                                                        <span>{formatDate(obs.observation_date || obs.date || obs.created_at)}</span>
                                                        {isChecklistObs && (
                                                            <span className="text-blue-400 ml-2">{obs.species_count || 1} Jenis</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                                            obs.source === 'burungnesia' || obs.source === 'bird' ? 'bg-pink-800 text-white' : 
                                                            obs.source === 'kupunesia' || obs.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                                            'bg-blue-800 text-white'
                                                        }`}>
                                                            {getSourceName(obs.source)}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] text-white ${getGradeColor(obs)}`}>
                                                            {getGradeDisplay(obs)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                
                                {/* Desktop Layout */}
                                {(() => {
                                    const photoUrl = getPhotoUrl(obs);
                                    const defaultImg = getDefaultImage(obs);
                                    const showAsIcon = !photoUrl || isDefaultIcon(photoUrl);
                                    const isChecklistObs = isChecklist(obs);
                                    
                                    return (
                                        <div className="hidden md:grid md:grid-cols-12 gap-4">
                                            {/* Photo / Spectrogram */}
                                            <div className="col-span-1 flex items-center">
                                                <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${showAsIcon ? 'bg-[#1a1a1a] flex items-center justify-center' : 'bg-[#2c2c2c]'}`}>
                                                    {getSpectrogramUrl(obs) ? (
                                                        <SpectrogramPlayer 
                                                            spectrogramUrl={getSpectrogramUrl(obs)}
                                                            audioUrl={getAudioUrl(obs)}
                                                        />
                                                    ) : (
                                                        <img 
                                                            src={photoUrl || defaultImg}
                                                            alt={obs.scientific_name || obs.nama_latin}
                                                            className={`${showAsIcon ? 'w-6 h-6 object-contain opacity-40' : 'w-full h-full object-cover'}`}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = defaultImg;
                                                                e.target.className = 'w-6 h-6 object-contain opacity-40';
                                                                e.target.parentElement.className = 'w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Species / Taksa */}
                                            <div className="col-span-3 flex flex-col justify-center">
                                                {isChecklistObs ? (
                                                    <>
                                                        <span className="font-medium text-white italic">{obs.nama_latin || obs.nama_umum || 'Unknown'}</span>
                                                        {obs.species_count > 1 && (
                                                            <span className="text-[10px] text-blue-400">+{obs.species_count - 1} jenis lain</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-medium text-white">{obs.nama_umum || obs.scientific_name || obs.nama_latin || 'Unknown'}</span>
                                                        {obs.nama_latin && obs.nama_umum && (
                                                            <span className="text-xs text-gray-400 italic">{obs.nama_latin}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            
                                            {/* Location */}
                                            <div className="col-span-2 flex items-center text-sm text-gray-300 truncate">
                                                <span className="truncate" title={obs.location_name || ''}>
                                                    {obs.location_name || `${parseFloat(obs.latitude)?.toFixed(4) || '-'}, ${parseFloat(obs.longitude)?.toFixed(4) || '-'}`}
                                                </span>
                                            </div>
                                            
                                            {/* Date */}
                                            <div className="col-span-2 flex items-center text-sm text-gray-300">
                                                {formatDate(obs.observation_date || obs.date || obs.created_at)}
                                            </div>
                                            
                                            {/* Source */}
                                            <div className="col-span-1 flex items-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                                    obs.source === 'burungnesia' || obs.source === 'bird' ? 'bg-pink-800 text-white' : 
                                                    obs.source === 'kupunesia' || obs.source === 'butterfly' ? 'bg-purple-800 text-white' : 
                                                    'bg-blue-800 text-white'
                                                }`}>
                                                    {getSourceName(obs.source)}
                                                </span>
                                            </div>
                                            
                                            {/* Grade */}
                                            <div className="col-span-2 flex items-center">
                                                <span className={`px-2 py-1 rounded-full text-xs text-white ${getGradeColor(obs)}`}>
                                                    {getGradeDisplay(obs)}
                                                </span>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="col-span-1 flex items-center gap-2">
                                                <button 
                                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleObservationClick(obs); }}
                                                    title="Lihat Detail"
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                                {isOwnProfile && (
                                                    <button 
                                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(obs); }}
                                                        title="Hapus"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                    
                    {/* Empty State */}
                    {listObservations.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <FontAwesomeIcon icon={faList} className="text-4xl mb-4" />
                            <p>Tidak ada observasi ditemukan</p>
                            {(debouncedSearch || sourceFilter !== 'all' || gradeFilter !== 'all') && (
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-4 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && !listLoading && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {/* First Page */}
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === 1 
                                ? 'text-gray-600 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                        }`}
                    >
                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                    </button>
                    
                    {/* Previous Page */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === 1 
                                ? 'text-gray-600 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                        }`}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-[#3B82F6] text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Next Page */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === totalPages 
                                ? 'text-gray-600 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                        }`}
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                    
                    {/* Last Page */}
                    <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === totalPages 
                                ? 'text-gray-600 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                        }`}
                    >
                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                    </button>
                    
                    {/* Page Info */}
                    <span className="ml-4 text-sm text-gray-400">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                </div>
            )}
        </>
    );

    return (
        <>
            <Header userData={getUserData()} />

            <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 mt-16">
                {/* Layout wrapper dengan fixed sidebar */}
                <div className="flex gap-0">
                    {/* Sidebar - Fixed di desktop, floating button di mobile */}
                    <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
                        {/* Placeholder untuk space sidebar fixed */}
                    </div>
                    <Sidebar 
                        userId={id} 
                        activeItem="Observasi"
                        isMobileOpen={showSidebar}
                        onMobileClose={() => setShowSidebar(false)}
                        onMobileOpen={() => setShowSidebar(true)}
                        userOverride={{
                            uname: profileData?.user?.uname,
                            level: profileData?.user?.level,
                            profile_picture: profileData?.user?.profile_picture,
                            totalObservations: profileData?.user?.totalObservations || profileData?.stats?.totalObservations
                        }}
                    />
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* Header Card - sama dengan Profile.jsx */}
{/* Header Card */}
<div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">

  {/* Header */}
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-white mb-1">
      {isOwnProfile ? 'Observasi saya' : `Observasi ${profileData?.user?.uname || 'Pengguna'}`}
    </h1>
    <p className="text-gray-400 text-sm">
      Visualisasi semua lokasi observasi dan checklist pengguna
    </p>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">

    {/* OBSERVASI */}
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-semibold text-white">
        {formatNumber(stats.totalObservations)}
      </div>

      <div className="text-sm text-[#3B82F6]">
        Observasi
        <span className="relative inline-block align-middle ml-1 group">
          <span
            className="inline-block w-3 h-3
                       text-[9px] leading-[11px]
                       text-[#9CA3AF]
                       border border-[#6B7280]
                       rounded-full
                       text-center cursor-help mb-2"
            tabIndex={0}
          >
            ?
          </span>

          <span
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                       w-64 px-3 py-2
                       bg-[#1f1f1f] border border-[#333]
                       rounded-md text-xs text-gray-300
                       opacity-0 invisible
                       group-hover:opacity-100 group-hover:visible
                       group-focus-within:opacity-100 group-focus-within:visible
                       transition-opacity duration-200
                       z-50 shadow-lg"
          >
            <strong className="block text-white mb-1">Observasi</strong>
            Jumlah total observasi yang diunggah di Amaturalist serta checklist Burungnesia dan Kupunesia.
          </span>
        </span>
      </div>
    </div>

    {/* SPESIES */}
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-semibold text-white">
        {formatNumber(stats.totalSpecies)}
      </div>

      <div className="text-sm text-[#3B82F6]">
        Spesies
        <span className="relative inline-block align-middle ml-1 group">
          <span
            className="inline-block w-3 h-3
                       text-[9px] leading-[11px]
                       text-[#9CA3AF]
                       border border-[#6B7280]
                       rounded-full
                       text-center cursor-help mb-2"
            tabIndex={0}
          >
            ?
          </span>

          <span
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                       w-64 px-3 py-2
                       bg-[#1f1f1f] border border-[#333]
                       rounded-md text-xs text-gray-300
                       opacity-0 invisible
                       group-hover:opacity-100 group-hover:visible
                       group-focus-within:opacity-100 group-focus-within:visible
                       transition-opacity duration-200
                       z-50 shadow-lg"
          >
            <strong className="block text-white mb-1">Spesies</strong>
            Jumlah unggahan yang telah mencapai identifikasi tingkat spesies (ID Lengkap).
          </span>
        </span>
      </div>
    </div>

    {/* IDENT PERDANA */}
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-semibold text-white">
        {formatNumber(stats.totalIdentPerdana)}
      </div>

      <div className="text-sm text-[#3B82F6]">
        Ident perdana
        <span className="relative inline-block align-middle ml-1 group">
          <span
            className="inline-block w-3 h-3
                       text-[9px] leading-[11px]
                       text-[#9CA3AF]
                       border border-[#6B7280]
                       rounded-full
                       text-center cursor-help mb-2"
            tabIndex={0}
          >
            ?
          </span>

          <span
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                       w-64 px-3 py-2
                       bg-[#1f1f1f] border border-[#333]
                       rounded-md text-xs text-gray-300
                       opacity-0 invisible
                       group-hover:opacity-100 group-hover:visible
                       group-focus-within:opacity-100 group-focus-within:visible
                       transition-opacity duration-200
                       z-50 shadow-lg"
          >
            <strong className="block text-white mb-1">Identifikasi Perdana</strong>
            Identifikasi awal yang diusulkan oleh pengunggah dan disetujui komunitas hingga ID Lengkap.
          </span>
        </span>
      </div>
    </div>

    {/* IDENTIFIKASI */}
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-semibold text-white">
        {formatNumber(stats.totalIdentifications)}
      </div>

      <div className="text-sm text-[#3B82F6]">
        Identifikasi
        <span className="relative inline-block align-middle ml-1 group">
          <span
            className="inline-block w-3 h-3
                       text-[9px] leading-[11px]
                       text-[#9CA3AF]
                       border border-[#6B7280]
                       rounded-full
                       text-center cursor-help mb-2"
            tabIndex={0}
          >
            ?
          </span>

          <span
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                       w-64 px-3 py-2
                       bg-[#1f1f1f] border border-[#333]
                       rounded-md text-xs text-gray-300
                       opacity-0 invisible
                       group-hover:opacity-100 group-hover:visible
                       group-focus-within:opacity-100 group-focus-within:visible
                       transition-opacity duration-200
                       z-50 shadow-lg"
          >
            <strong className="block text-white mb-1">Identifikasi</strong>
            Usulan identifikasi untuk mendukung atau menentang identifikasi pengguna lain hingga tercapai ID Lengkap.
          </span>
        </span>
      </div>
    </div>

  </div>

  {/* Stats Breakdown per Source */}
  {(stats.fopiObservations > 0 || stats.birdObservations > 0 || stats.butterflyObservations > 0) && (
    <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-[#252525]">
      {stats.fopiObservations > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-700/30 text-xs text-blue-300">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Amaturalist: {formatNumber(stats.fopiObservations)}
        </span>
      )}
      {stats.birdObservations > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-900/30 border border-pink-700/30 text-xs text-pink-300">
          <span className="w-2 h-2 rounded-full bg-pink-500"></span>
          Burungnesia: {formatNumber(stats.birdObservations)}
          {stats.birdSpecies > 0 && (
            <span className="text-pink-400/70 ml-1">({formatNumber(stats.birdSpecies)} spesies)</span>
          )}
        </span>
      )}
      {stats.butterflyObservations > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          Kupunesia: {formatNumber(stats.butterflyObservations)}
          {stats.butterflySpecies > 0 && (
            <span className="text-purple-400/70 ml-1">({formatNumber(stats.butterflySpecies)} spesies)</span>
          )}
        </span>
      )}
    </div>
  )}
</div>


                        {/* View Mode Toggle & Search */}
                        <div className="flex flex-col gap-4 mb-6">
                            {/* Row 1: View Mode & Search */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* View Mode Buttons */}
                                <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#333]">
                                    <button
                                        onClick={() => setViewMode('map')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                                            viewMode === 'map' 
                                                ? 'bg-[#3B82F6] text-white' 
                                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faMap} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                                            viewMode === 'grid' 
                                                ? 'bg-[#3B82F6] text-white' 
                                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faThLarge} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                                            viewMode === 'list' 
                                                ? 'bg-[#3B82F6] text-white' 
                                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faList} />
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="flex-1 relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari nama spesies, lokasi..."
                                        className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                                    />
                                </div>
                            </div>
                            
                            {/* Row 2: Filters (only show for grid/list view) */}
                            {(viewMode === 'grid' || viewMode === 'list') && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Source Filter */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">Sumber:</span>
                                        <select
                                            value={sourceFilter}
                                            onChange={(e) => setSourceFilter(e.target.value)}
                                            className="px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                        >
                                            <option value="all">Semua</option>
                                            <option value="fobi">Amaturalist</option>
                                            <option value="burungnesia">Burungnesia</option>
                                            <option value="kupunesia">Kupunesia</option>
                                        </select>
                                    </div>
                                    
                                    {/* Grade Filter */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">Grade:</span>
                                        <select
                                            value={gradeFilter}
                                            onChange={(e) => setGradeFilter(e.target.value)}
                                            className="px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                        >
                                            <option value="all">Semua</option>
                                            <option value="research_grade">ID Lengkap</option>
                                            <option value="confirmed_id">ID Terkonfirmasi</option>
                                            <option value="needs_id">Bantu Iden</option>
                                            <option value="low_quality_id">ID Kurang</option>
                                        </select>
                                    </div>
                                    
                                    {/* Clear Filters */}
                                    {(sourceFilter !== 'all' || gradeFilter !== 'all' || searchQuery) && (
                                        <button
                                            onClick={handleClearFilters}
                                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                    
                                    {/* Results Count */}
                                    <div className="ml-auto text-sm text-gray-400">
                                        {viewMode === 'grid' 
                                            ? `${gridObservations.length} observasi dimuat`
                                            : `${listObservations.length} observasi`
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                                <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg flex flex-col items-center gap-4 border border-[#444]">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[#1a73e8]" />
                                    <p className="text-lg text-[#e0e0e0]">Memuat data...</p>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="bg-[#3a0f0f] border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        {/* Content based on view mode */}
                        {viewMode === 'map' && renderMapView()}
                        {viewMode === 'grid' && renderGridView()}
                        {viewMode === 'list' && renderListView()}
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
        </>
    );
};

export default ProfileObservations;

