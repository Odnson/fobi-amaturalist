import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUser, faBars, faTimes, faCalendarDay, faCalendarWeek, faCalendarAlt,
    faEdit, faUserPlus, faUserMinus, faEnvelope, faChevronDown, faEye, faFingerprint,
    faLeaf, faSpinner, faFlag, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Sidebar from '../components/Sidebar';
import EditProfileModal from '../components/Profile/EditProfileModal';
import EditBioModal from '../components/Profile/EditBioModal';
import ActivityChartApex from '../components/Charts/ActivityChartApex';
import TopTaxa from '../components/Profile/TopTaxa';
import Header from '../components/Header';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import DOMPurify from 'dompurify';

function Profile() {
    const { id } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activityData, setActivityData] = useState([]);
    const [activityPeriod, setActivityPeriod] = useState('year');
    const [topTaxa, setTopTaxa] = useState({
        observations: [],
        identifications: []
    });
    const [showSidebar, setShowSidebar] = useState(false);
    const [showAllFollowing, setShowAllFollowing] = useState(false);
    const [showAllFollowers, setShowAllFollowers] = useState(false);
    const [isBioModalOpen, setIsBioModalOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const navigate = useNavigate();
    
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = currentUserId === id;
    
    const currentUserData = {
        id: currentUserId,
        fname: profileData?.user?.fname || '',
        lname: profileData?.user?.lname || '',
        uname: profileData?.user?.uname || '',
        email: profileData?.user?.email || '',
        phone: profileData?.user?.phone || '',
        organization: profileData?.user?.organization || '',
        bio: profileData?.user?.bio || '',
        profile_picture: profileData?.user?.profile_picture || '',
        license: profileData?.user?.license || '',
        license_observation: profileData?.user?.license_observation || localStorage.getItem('license_observation'),
        license_photo: profileData?.user?.license_photo || localStorage.getItem('license_photo'),
        license_audio: profileData?.user?.license_audio || localStorage.getItem('license_audio'),
        burungnesia_email: profileData?.user?.burungnesia_email,
        burungnesia_email_verified_at: profileData?.user?.burungnesia_email_verified_at,
        kupunesia_email: profileData?.user?.kupunesia_email,
        kupunesia_email_verified_at: profileData?.user?.kupunesia_email_verified_at
    };

    const defaultBio = `"Amaturalist" adalah komunitas yang mengedepankan kejujuran dan kepercayaan antar anggota karena informasi yang termuat dalam "Amaturalist" mempunyai pertanggungjawaban secara ilmiah. Terkadang orang lain perlu mengetahui latar belakang anda untuk menaruh kepercayaan akan observasi atau bantuan identifikasi dari anda`;


    useEffect(() => {
        if (id) {
            console.log('Fetching profile data for ID:', id);
            
            Promise.all([
                fetchProfileData(),
                fetchActivityData(activityPeriod),
                fetchTopTaxa()
            ]).then(() => {
                console.log('All profile data fetched');
            }).catch(error => {
                console.error('Error fetching profile data:', error);
            });
        }
    }, [id]);
    useEffect(() => {
        if (id) {
            console.log('Fetching activity data for period:', activityPeriod);
            fetchActivityData(activityPeriod);
        }
    }, [activityPeriod, id]);

    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
            const data = await response.json();
            console.log('Profile data response:', data);
            console.log('Stats breakdown:', {
                fopiObservations: data.data?.stats?.fopiObservations,
                birdObservations: data.data?.stats?.birdObservations,
                butterflyObservations: data.data?.stats?.butterflyObservations,
                birdSpecies: data.data?.stats?.birdSpecies,
                butterflySpecies: data.data?.stats?.butterflySpecies
            });
            
            if (data.success) {
                setProfileData(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setError('Gagal memuat data profil');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityData = async (period = 'year') => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/activities/${id}?period=${period}`);
            const data = await response.json();
            
            if (data.success) {
                setActivityData(data.data);
            } else {
                console.error('Gagal memuat data aktivitas:', data.message);
            }
        } catch (err) {
            console.error('Gagal memuat data aktivitas:', err);
        }
    };

    const fetchTopTaxa = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/top-taxa/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setTopTaxa(data.data);
            }
        } catch (err) {
            console.error('Gagal memuat data taksa teratas:', err);
        }
    };
    const checkFollowStatus = async () => {
        if (!currentUserId || isOwnProfile) return;
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                console.log('No token found, skipping follow status check');
                return;
            }
            
            console.log('Checking follow status for user:', id);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/follow/status/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('Follow status response:', data);
            if (data.success) {
                setIsFollowing(data.data.is_following);
                console.log('isFollowing set to:', data.data.is_following);
            }
        } catch (err) {
            console.error('Error checking follow status:', err);
        }
    };
    const handleFollowToggle = async () => {
        if (!currentUserId) {
            return;
        }
        
        setFollowLoading(true);
        try {
            const method = isFollowing ? 'DELETE' : 'POST';
            const response = await fetch(`${import.meta.env.VITE_API_URL}/follow/${id}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setIsFollowing(data.data.is_following);
                fetchProfileData();
            }
        } catch (err) {
            console.error('Error toggling follow:', err);
        } finally {
            setFollowLoading(false);
        }
    };
    const handleSendMessage = () => {
        navigate(`/messages/${id}`);
    };
    const handleReportUser = async () => {
        if (!reportReason) {
            alert('Pilih alasan laporan');
            return;
        }

        setReportLoading(true);
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/user-reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reported_user_id: parseInt(id),
                    reason: reportReason,
                    description: reportDescription
                })
            });

            const data = await response.json();
            if (data.success) {
                setReportSuccess(true);
                setTimeout(() => {
                    setIsReportModalOpen(false);
                    setReportSuccess(false);
                    setReportReason('');
                    setReportDescription('');
                }, 2000);
            } else {
                alert(data.message || 'Gagal mengirim laporan');
            }
        } catch (err) {
            console.error('Error reporting user:', err);
            alert('Gagal mengirim laporan');
        } finally {
            setReportLoading(false);
        }
    };
    useEffect(() => {
        console.log('Follow status useEffect - id:', id, 'currentUserId:', currentUserId, 'isOwnProfile:', isOwnProfile);
        if (id && currentUserId && id !== currentUserId) {
            checkFollowStatus();
        }
    }, [id, currentUserId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a73e8]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <div className="text-center text-red-400">{error}</div>
            </div>
        );
    }
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
  const userData = getUserData();
    const ROLES = {
        1: 'User',
        2: 'Kurator',
        3: 'Admin',
        4: 'Superadmin',
        5: 'GOD'
    };
    const formatNumber = (num) => {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    const getInitials = (name) => {
        if (!name) return '??';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
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
    const getImageUrl = (profilePicture) => {
        if (!profilePicture) return null;
        if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
            return profilePicture;
        }
        const cleanPath = profilePicture
            .replace(/^\/storage\//, '')
            .replace(/^\/api\/storage\//, '')
            .replace(/^storage\//, '')
            .replace(/^api\/storage\//, '');
        return `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${cleanPath}`;
    };
    const AvatarWithInitials = ({ src, name, size = 'md', className = '' }) => {
        const sizeClasses = {
            sm: 'w-10 h-10 text-sm',
            md: 'w-12 h-12 text-base',
            lg: 'w-14 h-14 text-lg',
            xl: 'w-20 h-20 text-2xl'
        };
        
        const imageUrl = getImageUrl(src);
        
        return (
            <div className={`rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}>
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div 
                    className={`w-full h-full flex items-center justify-center text-white font-bold ${sizeClasses[size]}`}
                    style={{ 
                        backgroundColor: getAvatarColor(name),
                        display: imageUrl ? 'none' : 'flex'
                    }}
                >
                    {getInitials(name)}
                </div>
            </div>
        );
    };
    const NaturalistCard = ({ user }) => (
        <Link 
            to={`/profile/${user.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#252525] hover:bg-[#2a2a2a] transition-all duration-200 border border-[#333] hover:border-[#444]"
        >
            <div className="ring-2 ring-[#3B82F6]/30 rounded-full">
                <AvatarWithInitials 
                    src={user.profile_picture} 
                    name={user.uname} 
                    size="md"
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{user.uname}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                    <span>Obs: {formatNumber(user.totalObservations || user.observations_count || 0)}</span>
                </p>
            </div>
        </Link>
    );

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: 'head'
            }}
        >

                <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 mt-16">
                    {/* Layout wrapper dengan fixed sidebar */}
                    <div className="flex gap-0">
                        {/* Sidebar - Fixed di desktop, floating button di mobile */}
                        <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
                            {/* Placeholder untuk space sidebar fixed */}
                        </div>
                        <Sidebar 
                            userId={id} 
                            isMobileOpen={showSidebar}
                            onMobileClose={() => setShowSidebar(false)}
                            onMobileOpen={() => setShowSidebar(true)}
                            userOverride={{
                                uname: profileData?.user?.uname,
                                level: profileData?.user?.level,
                                profile_picture: profileData?.user?.profile_picture,
                                totalObservations: profileData?.user?.totalObservations || profileData?.stats?.totalObservations,
                                totalIdentifications: profileData?.stats?.totalIdentifications,
                                burungnesiaCount: profileData?.stats?.birdObservations,
                                kupunesiaCount: profileData?.stats?.butterflyObservations
                            }}
                        />

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-6">
                            {/* Profile Header Card */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">
                                {/* User Info Header - Inline Layout */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                            {profileData.user.uname}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-400">
                                            <span>
                                                Bergabung: {new Date(profileData.user.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            <span>
                                                Observasi: <span className="text-[#3B82F6] font-semibold">{formatNumber(profileData?.stats?.totalObservations || profileData?.user?.totalObservations || 0)}</span>
                                            </span>
                                            <span>
                                                Identifikasi Perdana: <span className="text-[#3B82F6] font-semibold">{formatNumber(profileData?.stats?.totalIdentPerdana || 0)}</span>
                                            </span>
                                        </div>
                                        {/* Stats Breakdown per Source */}
                                        {(profileData?.stats?.fopiObservations > 0 || profileData?.stats?.birdObservations > 0 || profileData?.stats?.butterflyObservations > 0) && (
                                            <div className="flex flex-wrap items-center gap-3 mt-2 hidden">
                                                {profileData?.stats?.fopiObservations > 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-700/30 text-xs text-blue-300">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                        Amaturalist: {formatNumber(profileData.stats.fopiObservations)}
                                                    </span>
                                                )}
                                                {profileData?.stats?.birdObservations > 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-900/30 border border-pink-700/30 text-xs text-pink-300">
                                                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                                                        Burungnesia: {formatNumber(profileData.stats.birdObservations)}
                                                        {profileData.stats.birdSpecies > 0 && (
                                                            <span className="text-pink-400/70 ml-1">({formatNumber(profileData.stats.birdSpecies)} spesies)</span>
                                                        )}
                                                    </span>
                                                )}
                                                {profileData?.stats?.butterflyObservations > 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300">
                                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                        Kupunesia: {formatNumber(profileData.stats.butterflyObservations)}
                                                        {profileData.stats.butterflySpecies > 0 && (
                                                            <span className="text-purple-400/70 ml-1">({formatNumber(profileData.stats.butterflySpecies)} spesies)</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Edit Button - Right aligned */}
                                    {isOwnProfile ? (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="px-5 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:from-[#2563EB] hover:to-[#1D4ED8] flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20 transition-all duration-300 whitespace-nowrap"
                                        >
                                            <span>Edit profil</span>
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleFollowToggle}
                                                disabled={followLoading}
                                                className={`px-5 py-2.5 flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-50 ${
                                                    isFollowing 
                                                        ? 'bg-[#252525] text-white hover:bg-red-600/20 hover:text-red-400 border border-[#333] hover:border-red-500/50' 
                                                        : 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:from-[#2563EB] hover:to-[#1D4ED8] shadow-lg shadow-blue-500/20'
                                                }`}
                                            >
                                                {followLoading ? (
                                                    <FontAwesomeIcon icon={faSpinner} spin />
                                                ) : (
                                                    <FontAwesomeIcon icon={isFollowing ? faUserMinus : faUserPlus} />
                                                )}
                                                <span>{isFollowing ? 'Berhenti Ikuti' : 'Ikuti'}</span>
                                            </button>
                                            <button
                                                onClick={handleSendMessage}
                                                className="px-5 py-2.5 bg-[#252525] text-white hover:bg-[#2a2a2a] flex items-center gap-2 font-medium border border-[#333] hover:border-[#444] transition-all duration-300"
                                            >
                                                <FontAwesomeIcon icon={faEnvelope} />
                                                <span>Kirim pesan</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Bio Section - Different logic for Owner vs Public */}
                                <div className="mb-4">
                                    {isOwnProfile ? (
                                        profileData.user.bio ? (
                                            <div 
                                                className="text-sm leading-relaxed text-gray-300 bio-content"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(profileData.user.bio, { ADD_ATTR: ['target', 'rel'] }) }}
                                            />
                                        ) : (
                                            <div className="text-sm leading-relaxed text-gray-500 italic">
                                                "{defaultBio}"
                                            </div>
                                        )
                                    ) : (
                                        profileData.user.bio && (
                                            <div 
                                                className="text-sm leading-relaxed text-gray-300 bio-content"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(profileData.user.bio, { ADD_ATTR: ['target', 'rel'] }) }}
                                            />
                                        )
                                    )}
                                </div>

                                {/* Lengkapi Biomu Button - Only for Owner */}
                                {isOwnProfile && (
                                    <button
                                        onClick={() => setIsBioModalOpen(true)}
                                        className="px-5 py-2.5 bg-[#1a3a5c] text-[#60A5FA] hover:bg-[#1e4a6e] flex items-center gap-2 font-medium border border-[#2563EB]/30 transition-all duration-300"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                        <span>{profileData.user.bio ? 'Edit Biomu' : 'Lengkapi Biomu'}</span>
                                    </button>
                                )}

                                {/* License Badge */}
                                {profileData.user.license && (
                                    <div className="mt-4 pt-4 border-t border-[#252525]">
                                        <span className="text-gray-500 text-xs mr-2">Lisensi konten:</span>
                                        <a
                                            href={(() => {
                                                const code = profileData.user.license;
                                                switch (code) {
                                                    case 'CC0': return 'https://creativecommons.org/publicdomain/zero/1.0/';
                                                    case 'CC BY': return 'https://creativecommons.org/licenses/by/4.0/';
                                                    case 'CC BY-SA': return 'https://creativecommons.org/licenses/by-sa/4.0/';
                                                    case 'CC BY-NC': return 'https://creativecommons.org/licenses/by-nc/4.0/';
                                                    case 'CC BY-ND': return 'https://creativecommons.org/licenses/by-nd/4.0/';
                                                    case 'CC BY-NC-SA': return 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
                                                    case 'CC BY-NC-ND': return 'https://creativecommons.org/licenses/by-nc-nd/4.0/';
                                                    default: return 'https://creativecommons.org/licenses/';
                                                }
                                            })()}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block px-3 py-1 rounded-full bg-[#252525] border border-[#333] text-xs text-gray-300 hover:text-white hover:border-[#444] transition-all"
                                        >
                                            {profileData.user.license}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Aktivitas Section */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <h2 className="text-lg font-semibold text-white">
                                        {isOwnProfile ? 'Aktifitas saya' : `Aktifitas ${profileData.user.uname}`}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                                activityPeriod === 'year' 
                                                    ? 'bg-[#3B82F6] text-white' 
                                                    : 'bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                                            }`}
                                            onClick={() => setActivityPeriod('year')}
                                        >
                                            1 tahun
                                        </button>
                                        <button 
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                                activityPeriod === 'month' 
                                                    ? 'bg-[#3B82F6] text-white' 
                                                    : 'bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                                            }`}
                                            onClick={() => setActivityPeriod('month')}
                                        >
                                            1 bulan
                                        </button>
                                        <button 
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                                activityPeriod === 'week' 
                                                    ? 'bg-[#3B82F6] text-white' 
                                                    : 'bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                                            }`}
                                            onClick={() => setActivityPeriod('week')}
                                        >
                                            1 minggu
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full">
                                    <ActivityChartApex data={activityData} period={activityPeriod} />
                                </div>
                            </div>

                            {/* TopTaxa Section - Hidden for now */}
                            {/* {isOwnProfile && (
                                <TopTaxa 
                                    observationTaxa={topTaxa.observations}
                                    identificationTaxa={topTaxa.identifications}
                                />
                            )} */}

                            {/* Komunitas Section */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">
                                <h2 className="text-xl font-bold text-white mb-6">Komunitas</h2>
                                
                                {/* Mengikuti */}
                                <div className="mb-8">
                                    <h3 className="text-sm text-gray-400 mb-4">
                                        Mengikuti {profileData.social.followingCount} naturalist
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {(showAllFollowing 
                                            ? profileData.social.following 
                                            : profileData.social.following.slice(0, 5)
                                        ).map(following => (
                                            <Link 
                                                key={following.id}
                                                to={`/profile/${following.id}`}
                                                className="flex flex-col items-center text-center group"
                                            >
                                                <div className="mb-2 ring-2 ring-transparent group-hover:ring-[#3B82F6]/50 transition-all rounded-full">
                                                    <AvatarWithInitials 
                                                        src={following.profile_picture} 
                                                        name={following.uname} 
                                                        size="lg"
                                                    />
                                                </div>
                                                <p className="text-sm text-white font-medium truncate w-full">{following.uname}</p>
                                                <p className="text-xs text-[#3B82F6]">Obs: {formatNumber(following.totalObservations || following.observations_count || 0)}</p>
                                            </Link>
                                        ))}
                                    </div>
                                    {profileData.social.following.length > 5 && (
                                        <button 
                                            onClick={() => setShowAllFollowing(!showAllFollowing)}
                                            className="w-full mt-4 py-2 text-center text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <span>Lihat semua</span>
                                            <FontAwesomeIcon 
                                                icon={faChevronDown} 
                                                className={`transition-transform duration-300 ${showAllFollowing ? 'rotate-180' : ''}`} 
                                            />
                                        </button>
                                    )}
                                </div>

                                {/* Diikuti */}
                                <div>
                                    <h3 className="text-sm text-gray-400 mb-4">
                                        Diikuti {profileData.social.followerCount} naturalist
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {(showAllFollowers 
                                            ? profileData.social.followers 
                                            : profileData.social.followers.slice(0, 5)
                                        ).map(follower => (
                                            <Link 
                                                key={follower.id}
                                                to={`/profile/${follower.id}`}
                                                className="flex flex-col items-center text-center group"
                                            >
                                                <div className="mb-2 ring-2 ring-transparent group-hover:ring-[#3B82F6]/50 transition-all rounded-full">
                                                    <AvatarWithInitials 
                                                        src={follower.profile_picture} 
                                                        name={follower.uname} 
                                                        size="lg"
                                                    />
                                                </div>
                                                <p className="text-sm text-white font-medium truncate w-full">{follower.uname}</p>
                                                <p className="text-xs text-[#3B82F6]">Obs: {formatNumber(follower.totalObservations || follower.observations_count || 0)}</p>
                                            </Link>
                                        ))}
                                    </div>
                                    {profileData.social.followers.length > 5 && (
                                        <button 
                                            onClick={() => setShowAllFollowers(!showAllFollowers)}
                                            className="w-full mt-4 py-2 text-center text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <span>Lihat semua</span>
                                            <FontAwesomeIcon 
                                                icon={faChevronDown} 
                                                className={`transition-transform duration-300 ${showAllFollowers ? 'rotate-180' : ''}`} 
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Report User Section - Only for other users */}
                            {!isOwnProfile && currentUserId && (
                                <div className="mt-6 pt-6 border-t border-[#333]">
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="w-full py-3 px-4 bg-[#252525] text-gray-400 hover:bg-red-600/10 hover:text-red-400 flex items-center justify-center gap-2 font-medium border border-[#333] hover:border-red-500/30 rounded-xl transition-all duration-300"
                                    >
                                        <FontAwesomeIcon icon={faFlag} />
                                        <span>Laporkan Pengguna</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Profile Modal */}
                    {isOwnProfile && (
                        <EditProfileModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            userData={currentUserData}
                            onSave={fetchProfileData}
                        />
                    )}

                    {/* Edit Bio Modal */}
                    {isOwnProfile && (
                        <EditBioModal
                            isOpen={isBioModalOpen}
                            onClose={() => setIsBioModalOpen(false)}
                            currentBio={profileData?.user?.bio || ''}
                            onSave={(newBio) => {
                                setProfileData(prev => ({
                                    ...prev,
                                    user: {
                                        ...prev.user,
                                        bio: newBio
                                    }
                                }));
                            }}
                        />
                    )}

                    {/* Report User Modal */}
                    {isReportModalOpen && !isOwnProfile && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-[#2a2a2a] shadow-2xl">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faFlag} className="text-red-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">Laporkan Pengguna</h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsReportModalOpen(false);
                                            setReportReason('');
                                            setReportDescription('');
                                            setReportSuccess(false);
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {reportSuccess ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-green-400" />
                                            </div>
                                            <p className="text-white font-medium">Laporan Terkirim!</p>
                                            <p className="text-gray-400 text-sm mt-1">Tim kami akan meninjau laporan Anda</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-gray-400 text-sm mb-4">
                                                Laporkan <span className="text-white font-medium">{profileData?.user?.uname}</span> jika melanggar ketentuan komunitas.
                                            </p>

                                            {/* Reason Selection */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Alasan Laporan <span className="text-red-400">*</span>
                                                </label>
                                                <div className="space-y-2">
                                                    {[
                                                        { value: 'spam', label: 'Spam', desc: 'Konten berulang atau tidak relevan' },
                                                        { value: 'harassment', label: 'Pelecehan', desc: 'Perilaku mengancam atau mengganggu' },
                                                        { value: 'inappropriate', label: 'Konten Tidak Pantas', desc: 'Konten vulgar atau menyinggung' },
                                                        { value: 'fake_account', label: 'Akun Palsu', desc: 'Menyamar sebagai orang lain' },
                                                        { value: 'other', label: 'Lainnya', desc: 'Alasan lain yang tidak tercantum' }
                                                    ].map(option => (
                                                        <label
                                                            key={option.value}
                                                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                                                reportReason === option.value
                                                                    ? 'bg-red-500/10 border border-red-500/50'
                                                                    : 'bg-[#252525] border border-transparent hover:border-[#333]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="reportReason"
                                                                value={option.value}
                                                                checked={reportReason === option.value}
                                                                onChange={(e) => setReportReason(e.target.value)}
                                                                className="mt-1 accent-red-500"
                                                            />
                                                            <div>
                                                                <p className="text-white text-sm font-medium">{option.label}</p>
                                                                <p className="text-gray-500 text-xs">{option.desc}</p>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Deskripsi (opsional)
                                                </label>
                                                <textarea
                                                    value={reportDescription}
                                                    onChange={(e) => setReportDescription(e.target.value)}
                                                    placeholder="Jelaskan lebih detail tentang masalah yang Anda temukan..."
                                                    className="w-full px-4 py-3 bg-[#252525] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 resize-none"
                                                    rows={3}
                                                    maxLength={1000}
                                                />
                                                <p className="text-gray-500 text-xs mt-1 text-right">{reportDescription.length}/1000</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setIsReportModalOpen(false);
                                                        setReportReason('');
                                                        setReportDescription('');
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-[#252525] text-gray-300 rounded-xl hover:bg-[#2a2a2a] transition-colors font-medium"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    onClick={handleReportUser}
                                                    disabled={!reportReason || reportLoading}
                                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {reportLoading ? (
                                                        <FontAwesomeIcon icon={faSpinner} spin />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faFlag} />
                                                    )}
                                                    <span>Kirim Laporan</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            
        </GoogleReCaptchaProvider>
    );
}
const bioStyles = document.createElement('style');
bioStyles.textContent = `
    .bio-content p {
        margin-bottom: 0.5rem;
    }
    .bio-content p:last-child {
        margin-bottom: 0;
    }
    .bio-content a {
        color: #60A5FA;
        text-decoration: underline;
    }
    .bio-content a:hover {
        color: #93C5FD;
    }
    .bio-content ul, .bio-content ol {
        margin-left: 1.5rem;
        margin-bottom: 0.5rem;
    }
    .bio-content ul {
        list-style-type: disc;
    }
    .bio-content ol {
        list-style-type: decimal;
    }
    .bio-content strong {
        font-weight: 600;
    }
    .bio-content em {
        font-style: italic;
    }
    .bio-content h1, .bio-content h2, .bio-content h3 {
        font-weight: 600;
        margin-bottom: 0.5rem;
    }
    .bio-content h1 {
        font-size: 1.5rem;
    }
    .bio-content h2 {
        font-size: 1.25rem;
    }
    .bio-content h3 {
        font-size: 1.1rem;
    }
`;
if (!document.querySelector('#bio-styles')) {
    bioStyles.id = 'bio-styles';
    document.head.appendChild(bioStyles);
}

export default Profile; 