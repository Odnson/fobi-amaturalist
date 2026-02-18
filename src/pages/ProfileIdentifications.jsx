import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SpectrogramPlayer from '../components/SpectrogramPlayer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, faTimes, faSpinner, faMapMarkerAlt, faCalendar, 
  faUser, faComment, faCheckCircle, faQuestionCircle, faExternalLinkAlt,
  faIdCard
} from '@fortawesome/free-solid-svg-icons';
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
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyMjIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

const ProfileIdentifications = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [identifications, setIdentifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const currentUserId = localStorage.getItem('user_id');
  const isOwnProfile = currentUserId === id;
  const { ref: infiniteScrollRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  });
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
        const data = await res.json();
        if (data.success) setProfileData(data.data);
      } catch (e) {
        console.error('Gagal memuat data profil:', e);
      }
    };
    fetchProfile();
  }, [id]);
  const fetchIdentifications = useCallback(async (page = 1, append = false) => {
    if (!id) return;
    
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const url = new URL(`${import.meta.env.VITE_API_URL}/profile/identifications/${id}`);
      url.searchParams.append('page', page);
      url.searchParams.append('per_page', 12);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const newData = data.data.data || [];
        
        if (append) {
          setIdentifications(prev => [...prev, ...newData]);
        } else {
          setIdentifications(newData);
        }
        
        setCurrentPage(data.data.current_page);
        setTotalPages(data.data.last_page);
        setTotalItems(data.data.total);
        setHasMore(data.data.current_page < data.data.last_page);
      } else {
        setError(data.message || 'Gagal memuat data');
      }
    } catch (e) {
      console.error('Error fetching identifications:', e);
      setError('Gagal memuat data identifikasi');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);
  useEffect(() => {
    fetchIdentifications(1, false);
  }, [fetchIdentifications]);
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      fetchIdentifications(currentPage + 1, true);
    }
  }, [inView, hasMore, loading, loadingMore, currentPage, fetchIdentifications]);
  const getGradeDisplay = (grade) => {
    if (!grade) return 'Casual';
    if (grade.toLowerCase() === 'research grade') return 'ID Lengkap';
    if (grade.toLowerCase() === 'confirmed id') return 'ID Terkonfirmasi';
    if (grade.toLowerCase() === 'needs id') return 'Bantu Iden';
    if (grade.toLowerCase() === 'low quality id') return 'ID Kurang';
    return 'Casual';
  };
  const getGradeColor = (grade) => {
    if (!grade) return 'bg-gray-700/70';
    if (grade.toLowerCase() === 'research grade') return 'bg-blue-700/70';
    if (grade.toLowerCase() === 'confirmed id') return 'bg-green-700/70';
    if (grade.toLowerCase() === 'needs id') return 'bg-yellow-700/70';
    if (grade.toLowerCase() === 'low quality id') return 'bg-orange-700/70';
    return 'bg-gray-700/70';
  };
  const getSpectrogramUrl = (ident) => {
    if (ident.spectrogram_url) return ident.spectrogram_url;
    return null;
  };
  const getAudioUrl = (ident) => {
    if (ident.audio_url) return ident.audio_url;
    return null;
  };
  const renderIdentificationCard = (ident) => {
    return (
      <Link 
        key={ident.id}
        to={`/observations/${ident.checklist_id}`}
        className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#252525] rounded-xl overflow-hidden hover:border-[#3B82F6]/50 transition-all duration-300 block"
      >
        {/* Image / Spectrogram */}
        <div className="relative aspect-square overflow-hidden">
          {getSpectrogramUrl(ident) ? (
            <SpectrogramPlayer 
              spectrogramUrl={getSpectrogramUrl(ident)}
              audioUrl={getAudioUrl(ident)}
            />
          ) : (
            <img
              src={ident.photo_url || placeholderImage}
              alt={ident.scientific_name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = placeholderImage; }}
            />
          )}
        </div>
        
        {/* Content */}
        <div className="p-3 space-y-1">
          {/* Taxa info - observation taxa */}
          <p className="text-white font-medium text-sm truncate">
            {ident.common_name || ident.scientific_name}
          </p>
          {ident.common_name && (
            <p className="text-gray-400 text-xs italic truncate">
              {ident.scientific_name}
            </p>
          )}
          
          {/* Observer info */}
          <p className="text-gray-400 text-xs mt-2">
            Observer: {ident.observer_username}
          </p>
          
          {/* Date */}
          <p className="text-gray-400 text-xs">
            Tanggal obs: {formatDate(ident.observation_date)}
          </p>
          
          {/* Location */}
          {ident.location && (
            <p className="text-gray-400 text-xs line-clamp-2">
              Lokasi: {ident.location}
            </p>
          )}
          
          {/* Total idents + Grade Badge */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#252525]">
            <span className="text-gray-500 text-xs">
              {ident.total_idents} Ident
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getGradeColor(ident.grade)}`}>
              {getGradeDisplay(ident.grade)}
            </span>
          </div>
          
          {/* My identification section */}
          <div className="pt-2 border-t border-[#252525] mt-2">
            <p className="text-[#3B82F6] text-xs font-medium mb-1">
              {isOwnProfile ? 'ID saya' : `ID ${profileData?.user?.uname || ''}`}
            </p>
            <p className="text-white text-sm truncate">
              {ident.common_name || ident.scientific_name}
            </p>
            {ident.common_name && (
              <p className="text-gray-400 text-xs italic truncate">
                {ident.scientific_name}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  };

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
            activeItem="Identifikasi"
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
            {/* Header Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {isOwnProfile ? 'Identifikasi saya' : `Identifikasi ${profileData?.user?.uname || 'Pengguna'}`}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {totalItems > 0 ? `${totalItems} identifikasi diberikan` : 'Belum ada identifikasi'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-2 sm:p-6">
              {loading && identifications.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-[#3B82F6]" />
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={() => fetchIdentifications(1, false)}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : identifications.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <FontAwesomeIcon icon={faQuestionCircle} className="text-4xl mb-4" />
                  <p>Belum ada identifikasi yang diberikan</p>
                </div>
              ) : (
                <>
                  {/* Grid of cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {identifications.map(ident => renderIdentificationCard(ident))}
                  </div>
                  
                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div ref={infiniteScrollRef} className="flex justify-center py-8">
                      {loadingMore && (
                        <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3B82F6]" />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileIdentifications;