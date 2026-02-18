import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SpectrogramPlayer from '../components/SpectrogramPlayer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, faTimes, faSpinner, faMapMarkerAlt, faCalendar, 
  faUser, faComment, faCheckCircle, faExternalLinkAlt, faEye,
  faStar, faArrowUp, faAt, faReply, faEllipsisV, faUserFriends,
  faIdCard, faLeaf, faInfoCircle
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
const formatDateGroup = (dateString) => {
  if (!dateString) return 'Lainnya';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Hari ini';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  } catch (error) {
    return 'Lainnya';
  }
};
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyMjIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};
const getProfileImageUrl = (profilePicture) => {
  if (!profilePicture) return null;
  if (profilePicture.startsWith('http')) return profilePicture;
  const cleanPath = profilePicture
    .replace(/^\/storage\//, '')
    .replace(/^\/api\/storage\//, '')
    .replace(/^storage\//, '')
    .replace(/^api\/storage\//, '');
  return `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${cleanPath}`;
};
const getAvatarColor = (name) => {
  if (!name) return '#6B7280';
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
const getGradeDisplay = (grade) => {
  if (!grade) return 'Casual';
  if (grade.toLowerCase() === 'research grade') return 'ID Lengkap';
  if (grade.toLowerCase() === 'confirmed id') return 'ID Terkonfirmasi';
  if (grade.toLowerCase() === 'needs id') return 'Bantu Iden';
  if (grade.toLowerCase() === 'low quality id') return 'ID Kurang';
  return 'Casual';
};
const getGradeColor = (grade) => {
  if (!grade) return 'bg-gray-600';
  if (grade.toLowerCase() === 'research grade') return 'bg-blue-600';
  if (grade.toLowerCase() === 'confirmed id') return 'bg-green-600';
  if (grade.toLowerCase() === 'needs id') return 'bg-yellow-600';
  if (grade.toLowerCase() === 'low quality id') return 'bg-orange-600';
  return 'bg-gray-600';
};
const getActivityIcon = (type) => {
  switch (type) {
    case 'my_observation':
      return faEye;
    case 'favorite_taxa_observation':
      return faStar;
    case 'followed_user_observation':
      return faUserFriends;
    case 'mention':
      return faAt;
    case 'comment_reply':
      return faReply;
    case 'favorite_taxa_comment':
      return faComment;
    case 'grade_change':
      return faArrowUp;
    case 'observation_comment':
      return faComment;
    default:
      return faEye;
  }
};
const getActivityColor = (type) => {
  switch (type) {
    case 'my_observation':
      return { bg: 'bg-[#2d5b6b]', text: 'Observasimu', shortText: 'Observasimu' };
    case 'favorite_taxa_observation':
      return { bg: 'bg-[#5c3f23]', text: 'Taksa Favorit', shortText: 'Taksa Favorit' };
    case 'followed_user_observation':
      return { bg: 'bg-[#8f4731]', text: 'Diikuti', shortText: 'Diikuti' };
    case 'observation_comment':
      return { bg: 'bg-[#354d28]', text: 'Komentar Baru', shortText: 'Komentar' };
    case 'favorite_taxa_comment':
      return { bg: 'bg-[#B4D4FF]', textColor: 'text-gray-800', text: 'Diskusi Favorit', shortText: 'Diskusi' };
    case 'mention':
      return { bg: 'bg-[#FFB6C1]', textColor: 'text-gray-800', text: 'Mention', shortText: 'Mention' };
    case 'comment_reply':
      return { bg: 'bg-[#DDA0DD]', textColor: 'text-gray-800', text: 'Balasan', shortText: 'Balas' };
    case 'grade_change':
      return { bg: 'bg-[#2f3334]', text: 'Grade Berubah', shortText: 'Grade berubah' };
    default:
      return { bg: 'bg-[#E8E8E8]', textColor: 'text-gray-800', text: 'Aktivitas', shortText: 'Aktivitas' };
  }
};
const getActivityLabel = (type, data) => {
  switch (type) {
    case 'my_observation':
      return 'Observasi baru kamu';
    case 'favorite_taxa_observation':
      return 'Observasi baru taksa favoritmu';
    case 'followed_user_observation':
      return `${data?.observer_username || 'User'} mengunggah observasi baru`;
    case 'mention':
      return `${data?.mentioner_username || data?.mentioner || 'User'} menyebutmu`;
    case 'comment_reply':
      return `${data?.replier_username || data?.replier || 'User'} membalas komentarmu`;
    case 'favorite_taxa_comment':
      return `${data?.commenter_username || 'User'} mengomentari taksa favoritmu`;
    case 'grade_change':
      return 'Grade observasimu berubah';
    case 'observation_comment':
      return `${data?.commenter_username || 'User'} mengomentari observasimu`;
    default:
      return 'Aktivitas';
  }
};

const ProfileDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activePopup, setActivePopup] = useState(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    return localStorage.getItem('dashboard_welcome_dismissed') !== 'true';
  });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const currentUserId = localStorage.getItem('user_id');
  const isOwnProfile = currentUserId === id;
  const { ref: infiniteScrollRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  });
  useEffect(() => {
    if (!isOwnProfile && id) {
      navigate(`/profile/${id}`);
    }
  }, [isOwnProfile, id, navigate]);
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
  const fetchActivities = useCallback(async (page = 1, append = false) => {
    if (!id || !isOwnProfile) return;
    
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const url = new URL(`${import.meta.env.VITE_API_URL}/profile/dashboard/${id}`);
      url.searchParams.append('page', page);
      url.searchParams.append('per_page', 15);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const newData = data.data.data || [];
        
        if (append) {
          setActivities(prev => [...prev, ...newData]);
        } else {
          setActivities(newData);
        }
        
        setCurrentPage(data.data.current_page);
        setTotalPages(data.data.last_page);
        setHasMore(data.data.current_page < data.data.last_page);
      } else {
        setError(data.message || 'Gagal memuat data');
      }
    } catch (e) {
      console.error('Error fetching dashboard:', e);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, isOwnProfile]);
  useEffect(() => {
    if (isOwnProfile) {
      fetchActivities(1, false);
    }
  }, [fetchActivities, isOwnProfile]);
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      fetchActivities(currentPage + 1, true);
    }
  }, [inView, hasMore, loading, loadingMore, currentPage, fetchActivities]);
  const groupedActivities = activities.reduce((groups, activity) => {
    const dateGroup = formatDateGroup(activity.created_at);
    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(activity);
    return groups;
  }, {});
  const togglePopup = (activityId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePopup(activePopup === activityId ? null : activityId);
  };
  const closePopup = () => {
    setActivePopup(null);
  };
  const renderActivityCard = (activity, index) => {
    const activityColor = getActivityColor(activity.type);
    const cardId = `${activity.type}-${activity.checklist_id}-${index}`;
    const isPopupOpen = activePopup === cardId;
    
    return (
      <div 
        key={cardId}
        className="bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl overflow-hidden break-inside-avoid mb-3 sm:mb-4 hover:border-[#3B82F6]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#3B82F6]/10 relative"
      >
        {/* Activity Type Badge - Top bar dengan warna berbeda per tipe */}
        <div className={`${activityColor.bg} px-2 py-1 sm:py-1.5 flex items-center justify-between`}>
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon 
              icon={getActivityIcon(activity.type)} 
              className={`${activityColor.textColor || 'text-white'} text-[10px] sm:text-xs`}
            />
            {/* Mobile: short text, Desktop: full text */}
            <span className={`${activityColor.textColor || 'text-white'} text-[10px] sm:text-xs font-medium sm:hidden`}>
              {activityColor.shortText}
            </span>
            <span className={`${activityColor.textColor || 'text-white'} text-xs font-medium hidden sm:inline`}>
              {activityColor.text}
            </span>
          </div>
          {/* Mobile: 3 dot menu button */}
          <button 
            onClick={(e) => togglePopup(cardId, e)}
            className={`sm:hidden p-1 ${activityColor.textColor ? 'text-gray-600 hover:text-gray-800' : 'text-white/80 hover:text-white'}`}
          >
            <FontAwesomeIcon icon={faEllipsisV} className="text-xs" />
          </button>
        </div>

        {/* Mobile Popup Detail - Full width overlay */}
        {isPopupOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="sm:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closePopup}
            />
            {/* Popup Content */}
            <div 
              className="sm:hidden fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-[#1a1a1a] border border-[#444] rounded-xl shadow-2xl p-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#333]">
                <h4 className="text-white font-semibold text-sm">Detail Observasi</h4>
                <button 
                  onClick={closePopup}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-full transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
              </div>
              
              <div className="space-y-4 text-sm">
                {/* Grade */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Grade</span>
                  <span className={`${getGradeColor(activity.grade)} px-3 py-1 rounded-full text-white text-xs font-medium`}>
                    {getGradeDisplay(activity.grade)}
                  </span>
                </div>
                
                {/* Scientific name */}
                {activity.scientific_name && (
                  <div>
                    <span className="text-gray-400 block mb-1">Nama Ilmiah</span>
                    <p className="text-white italic bg-[#252525] px-3 py-2 rounded-lg">{activity.scientific_name}</p>
                  </div>
                )}
                
                {/* Date */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tanggal Observasi</span>
                  <span className="text-white">{formatDate(activity.observation_date)}</span>
                </div>
                
                {/* Location */}
                {activity.location && (
                  <div>
                    <span className="text-gray-400 block mb-1">Lokasi</span>
                    <p className="text-white bg-[#252525] px-3 py-2 rounded-lg">{activity.location}</p>
                  </div>
                )}
                
                {/* ID count */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Jumlah Identifikasi</span>
                  <span className="text-[#3B82F6] font-semibold">{activity.total_identifications || 0}</span>
                </div>
                
                {/* Comment preview */}
                {activity.comment && (
                  <div className="pt-3 border-t border-[#333]">
                    <span className="text-gray-400 block mb-2">Komentar Terbaru</span>
                    <div className="bg-[#252525] px-3 py-2 rounded-lg">
                      <p className="text-white">
                        <span className="text-[#3B82F6] font-medium">{activity.commenter_username}</span>
                        <span className="text-gray-400">: </span>
                        {stripHtml(activity.comment)}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Action button */}
                <Link
                  to={`/observations/${activity.checklist_id}`}
                  className="block w-full mt-4 py-3 bg-[#3B82F6] text-white text-center rounded-lg font-medium hover:bg-[#2563EB] transition-colors"
                  onClick={closePopup}
                >
                  Lihat Observasi
                </Link>
              </div>
            </div>
          </>
        )}
        
        {/* Image / Spectrogram - Full width */}
        <Link to={`/observations/${activity.checklist_id}`} className="block relative group">
          {activity.spectrogram_url ? (
            <div style={{ minHeight: '100px', maxHeight: '200px' }} className="w-full">
              <SpectrogramPlayer 
                spectrogramUrl={activity.spectrogram_url}
                audioUrl={activity.audio_url}
              />
            </div>
          ) : (
            <img
              src={activity.photo_url || placeholderImage}
              alt={activity.scientific_name || 'Observasi'}
              className="w-full object-cover"
              style={{ minHeight: '100px', maxHeight: '200px' }}
              onError={(e) => { e.target.src = placeholderImage; }}
            />
          )}
          {/* Overlay on hover - desktop only */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center z-10">
            <span className="text-white text-sm font-medium">Lihat Detail</span>
          </div>
          {/* Mobile: Grade dot indicator di pojok gambar */}
          <div className={`sm:hidden absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full ${getGradeColor(activity.grade)} border border-white/30 z-10`}></div>
        </Link>
        
        {/* Card Content */}
        <div className="p-2 sm:p-3">
          {/* Taxa name + Grade badge (desktop) */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/observations/${activity.checklist_id}`} className="block flex-1 min-w-0">
              <h3 className="text-white font-medium text-xs sm:text-sm hover:text-[#3B82F6] line-clamp-1 transition-colors">
                {activity.common_name || activity.scientific_name || '-'}
              </h3>
              {/* Scientific name - desktop only */}
              {activity.common_name && activity.scientific_name && (
                <p className="hidden sm:block text-gray-500 text-xs italic line-clamp-1 mt-0.5">
                  {activity.scientific_name}
                </p>
              )}
            </Link>
            {/* Desktop: Grade badge - di samping nama species */}
            <span className={`hidden sm:inline-block flex-shrink-0 ${getGradeColor(activity.grade)} px-1.5 py-0.5 rounded text-[10px] text-white`}>
              {getGradeDisplay(activity.grade)}
            </span>
          </div>
          
          {/* Observer info row */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            {/* Avatar - selalu render keduanya, gunakan CSS untuk toggle */}
            <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">
              {activity.observer_profile_picture && (
                <img
                  src={getProfileImageUrl(activity.observer_profile_picture)}
                  alt={activity.observer_username}
                  className="absolute inset-0 w-full h-full rounded-full object-cover"
                  onError={(e) => { 
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div 
                className="w-full h-full rounded-full flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold"
                style={{ backgroundColor: getAvatarColor(activity.observer_username) }}
              >
                {(activity.observer_username || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            {/* Username */}
            <Link to={`/profile/${activity.observer_id}`} className="text-gray-400 text-[10px] sm:text-xs hover:text-[#3B82F6] truncate flex-1 min-w-0">
              {activity.observer_username || '-'}
            </Link>
          </div>
          
          {/* Desktop: Additional info */}
          <div className="hidden sm:block mt-2 space-y-1">
            {/* Date */}
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <FontAwesomeIcon icon={faCalendar} className="text-[10px]" />
              {formatDate(activity.observation_date)}
            </p>
            {/* Location */}
            {activity.location && (
              <p className="text-gray-500 text-xs flex items-center gap-1 line-clamp-1">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" />
                {activity.location}
              </p>
            )}
            {/* ID count */}
            <p className="text-[#3B82F6] text-xs flex items-center gap-1">
              <FontAwesomeIcon icon={faUser} className="text-[10px]" />
              {activity.total_identifications || 0} Identifikasi
            </p>
          </div>
          
          {/* Desktop: Comment preview */}
          {activity.comment && (
            <div className="hidden sm:block mt-2 pt-2 border-t border-[#333]">
              <div className="flex items-start gap-2">
                {/* Commenter Avatar - selalu render keduanya */}
                <div className="relative w-5 h-5 flex-shrink-0">
                  {activity.commenter_profile_picture && (
                    <img
                      src={getProfileImageUrl(activity.commenter_profile_picture)}
                      alt={activity.commenter_username}
                      className="absolute inset-0 w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div 
                    className="w-full h-full rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: getAvatarColor(activity.commenter_username) }}
                  >
                    {(activity.commenter_username || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-400 text-xs line-clamp-2">
                    <span className="text-[#3B82F6] font-medium">{activity.commenter_username}</span>: {stripHtml(activity.comment)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  if (!isOwnProfile) {
    return null; // Will redirect
  }
  const dismissWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    localStorage.setItem('dashboard_welcome_dismissed', 'true');
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
            activeItem="Dashboard"
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
          
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Header dengan tombol info */}
            <div className="mb-4 pb-4 border-b border-[#333]">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Dashboard Saya</h1> <span className="sm:inline-block flex-shrink-0 bg-yellow-600 px-1.5 py-0.5 rounded text-[10px] text-white">Beta</span> 
                {/* Tombol info - muncul setelah banner di-dismiss atau selalu di desktop */}
                <div className="relative group">
                  <button 
                    onClick={() => setShowInfoModal(true)}
                    className="text-gray-400 hover:text-[#3B82F6] transition-colors p-1"
                    title="Tentang Dashboard"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} className="text-lg" />
                  </button>
                  {/* Tooltip untuk desktop (hover) */}
                  <div className="hidden lg:block absolute left-0 top-full mt-2 w-80 bg-[#252525] border border-[#444] rounded-lg p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <p className="text-gray-300 text-sm">
                      Dashboard adalah laman utama kamu. Memuat konten yang berkaitan dengan aktivitasmu di Amaturalist: 
                      update observasimu, observasi baru user yang kamu ikuti, termasuk identifikasi dan komentar di observasi yang kamu ikuti.
                    </p>
                    <Link 
                      to={`/profile/${id}/taksa`}
                      className="inline-block mt-2 text-[#3B82F6] text-sm hover:underline"
                    >
                      Kelola Taksa Favorit →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Welcome Banner (dismissable) - hanya muncul jika belum di-dismiss */}
            {showWelcomeBanner && (
              <div className="lg:hidden mb-4 bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-[#333] rounded-lg p-4 relative">
                <button 
                  onClick={dismissWelcomeBanner}
                  className="absolute top-2 right-2 text-gray-500 hover:text-white p-1"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
                <p className="text-gray-400 text-sm pr-6">
                  Dashboard adalah laman utama kamu. Memuat konten yang berkaitan dengan aktivitasmu di Amaturalist: 
                  update observasimu, observasi baru user yang kamu ikuti, termasuk identifikasi dan komentar di observasi yang kamu ikuti.
                </p>
                <Link 
                  to={`/profile/${id}/taksa`}
                  className="inline-block mt-2 text-[#3B82F6] text-sm hover:underline"
                >
                  Kelola Taksa Favorit →
                </Link>
              </div>
            )}

            {/* Info Modal untuk mobile (klik tombol info) */}
            {showInfoModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
                <div className="bg-[#1e1e1e] border border-[#444] rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Tentang Dashboard</h3>
                    <button 
                      onClick={() => setShowInfoModal(false)}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">
                    Dashboard adalah laman utama kamu. Memuat konten yang berkaitan dengan aktivitasmu di Amaturalist: 
                    update observasimu, observasi baru user yang kamu ikuti, termasuk identifikasi dan komentar di observasi yang kamu ikuti.
                  </p>
                  <Link 
                    to={`/profile/${id}/taksa`}
                    className="inline-block text-[#3B82F6] text-sm hover:underline"
                    onClick={() => setShowInfoModal(false)}
                  >
                    Kelola Taksa Favorit →
                  </Link>
                </div>
              </div>
            )}

            {/* 2 Column Layout: Content + Right Bar */}
            <div className="flex gap-6">
              {/* Center Column - Timeline (scrollable) */}
              <div className="flex-1 min-w-0">
                {/* Timeline Content */}
                {loading && activities.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-[#3B82F6]" />
                  </div>
                ) : error ? (
                  <div className="text-center py-20">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button 
                      onClick={() => fetchActivities(1, false)}
                      className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]"
                    >
                      Coba Lagi
                    </button>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <FontAwesomeIcon icon={faEye} className="text-4xl mb-4" />
                    <p>Belum ada aktivitas di dashboard</p>
                    <p className="text-sm mt-2">Mulai dengan menambahkan taksa favorit atau membuat observasi baru</p>
                  </div>
                ) : (
                  <>
                    {/* Pinterest-style Masonry Grid */}
                    <div className="columns-2 sm:columns-2 lg:columns-2 xl:columns-3 gap-3 sm:gap-4">
                      {activities.map((activity, index) => renderActivityCard(activity, index))}
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
              
              {/* Right Column - Fixed Info (desktop only) */}
              <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
                <div className="fixed top-24 w-72 xl:w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Selamat Datang!</h2>
                    <div className="text-gray-400 text-sm space-y-3">
                      <p>
                        Dashboard adalah pusat aktivitasmu di Amaturalist. Di sini kamu bisa melihat:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500">
                        <li>Observasi terbaru yang kamu buat</li>
                        <li>Observasi baru dari taksa favoritmu</li>
                        <li>Komentar dan balasan di observasimu</li>
                        <li>Mention dari pengguna lain</li>
                        <li>Perubahan grade observasi</li>
                        <li>Diskusi di taksa favoritmu</li>
                      </ul>
                      <p className="pt-2 border-t border-[#333]">
                        Tambahkan taksa favorit untuk mendapatkan notifikasi observasi dan diskusi yang relevan.
                      </p>
                      <Link 
                        to={`/profile/${id}/taksa`}
                        className="inline-block mt-2 text-[#3B82F6] hover:underline"
                      >
                        Kelola Taksa Favorit →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileDashboard;
