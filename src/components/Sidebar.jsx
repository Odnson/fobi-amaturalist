import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faList, faStar, faMicroscope, faComments, faEdit, faTimes, faTachometerAlt, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const RadarChart = ({ data, size = 70 }) => {
    const center = size / 2;
    const radius = (size / 2) - 8;
    const labels = ['Obs', 'Iden', 'BN', 'KP'];
    
    const maxVal = Math.max(...data, 1);
    const normalizedData = data.map(v => v / maxVal);
    
    const getPoint = (index, value) => {
        const angle = (Math.PI * 2 * index / 4) - Math.PI / 2;
        const r = radius * value;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };
    
    const polygonPoints = normalizedData.map((val, i) => {
        const point = getPoint(i, val);
        return `${point.x},${point.y}`;
    }).join(' ');
    
    const gridLevels = [0.25, 0.5, 0.75, 1];
    
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {gridLevels.map((level, i) => (
                <polygon
                    key={i}
                    points={[0,1,2,3].map(idx => {
                        const p = getPoint(idx, level);
                        return `${p.x},${p.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#444"
                    strokeWidth="0.5"
                />
            ))}
            
            {[0,1,2,3].map(i => {
                const p = getPoint(i, 1);
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={p.x}
                        y2={p.y}
                        stroke="#444"
                        strokeWidth="0.5"
                    />
                );
            })}
            
            <polygon
                points={polygonPoints}
                fill="rgba(59, 130, 246, 0.4)"
                stroke="#3B82F6"
                strokeWidth="1.5"
            />
            
            {normalizedData.map((val, i) => {
                const point = getPoint(i, val);
                return (
                    <circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r="2"
                        fill="#3B82F6"
                    />
                );
            })}
        </svg>
    );
};

const ROLES = Object.freeze({
    1: 'User',
    2: 'Kurator',
    3: 'Admin',
    4: 'Superadmin',
    5: 'GOD'
});

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
    
    if (profilePicture.startsWith('http')) {
        return profilePicture;
    }
    
    const cleanPath = profilePicture
        .replace(/^\/storage\//, '')
        .replace(/^\/api\/storage\//, '')
        .replace(/^storage\//, '')
        .replace(/^api\/storage\//, '');
    
    return `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${cleanPath}`;
};

const getUserData = () => {
    const userId = localStorage.getItem('user_id');
    const profile_picture = localStorage.getItem('profile_picture');
    
    return {
        uname: localStorage.getItem('username'),
        level: localStorage.getItem('level'),
        profile_picture: profile_picture ? getImageUrl(profile_picture) : null,
        totalObservations: localStorage.getItem('totalObservations'),
        totalIdentifications: localStorage.getItem('totalIdentifications'),
        burungnesiaCount: localStorage.getItem('burungnesiaCount'),
        kupunesiaCount: localStorage.getItem('kupunesiaCount'),
        user_id: userId
    };
};

function Sidebar({ userId, activeItem, isMobileOpen, onMobileClose, onMobileOpen, userOverride }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('user_id');
    const isOwnProfile = userId && currentUserId && userId.toString() === currentUserId.toString();
    const userData = getUserData();
    const displayUser = (() => {
        if (userOverride && !isOwnProfile) {
            const rawLevel = userOverride.level ?? userOverride.role ?? userOverride.level_id ?? userOverride.role_id;
            const levelNum = Number(rawLevel);
            return {
                uname: userOverride.uname ?? '',
                level: Number.isFinite(levelNum) && levelNum > 0 ? levelNum : 1,
                profile_picture: userOverride.profile_picture ? getImageUrl(userOverride.profile_picture) : null,
                totalObservations: userOverride.totalObservations ?? null,
                totalIdentifications: userOverride.totalIdentifications ?? null,
                burungnesiaCount: userOverride.burungnesiaCount ?? null,
                kupunesiaCount: userOverride.kupunesiaCount ?? null,
            };
        }
        return {
            ...userData,
            profile_picture: userData.profile_picture ? getImageUrl(userData.profile_picture) : null,
        };
    })();
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [stats, setStats] = useState({
        totalObservations: 0,
        totalIdentifications: 0,
        burungnesiaCount: 0,
        kupunesiaCount: 0
    });
    
    useEffect(() => {
        if (!userId) return;
        
        const fetchStats = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${userId}`);
                const data = await response.json();
                if (data.success) {
                    setStats({
                        totalObservations: data.data?.stats?.totalObservations || data.data?.user?.totalObservations || 0,
                        totalIdentifications: data.data?.stats?.totalIdentifications || 0,
                        burungnesiaCount: data.data?.stats?.birdObservations || 0,
                        kupunesiaCount: data.data?.stats?.butterflyObservations || 0
                    });
                }
            } catch (e) {
                console.error('Gagal memuat stats untuk Sidebar:', e);
            }
        };
        fetchStats();
    }, [userId]);
    
    const radarData = [
        stats.totalObservations,
        stats.totalIdentifications,
        stats.burungnesiaCount,
        stats.kupunesiaCount
    ];
    
    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1024);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);
    
    const menuItems = [];

    if (isOwnProfile) {
        menuItems.push({ path: `/profile/${userId}/dashboard`, label: 'Dashboard', icon: faTachometerAlt });
    }
    
    menuItems.push(
        { path: `/profile/${userId}`, label: 'Profil', icon: faUser },
        { path: `/profile/${userId}/observasi`, label: 'Observasi', icon: faList },
        { path: `/profile/${userId}/taksa`, label: 'Taksa favorit', icon: faStar },
        { path: `/profile/${userId}/spesies`, label: 'Spesies', icon: faMicroscope },
        { path: `/profile/${userId}/identifikasi`, label: 'Identifikasi', icon: faComments }
    );

    const handleNavigate = (path) => {
        navigate(path);
        if (isSmallScreen && onMobileClose) {
            onMobileClose();
        }
    };

    const handleLinkClick = (e, item) => {
        if (item.isAbsolute) {
            e.preventDefault();
            handleNavigate(item.path);
        } else if (isSmallScreen && onMobileClose) {
            onMobileClose();
        }
    };

    const sidebarClasses = `
        ${isSmallScreen ? 'fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out' : 'lg:fixed lg:top-24 lg:w-64 xl:w-72 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto'} 
        ${isSmallScreen && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
        bg-[#1e1e1e] shadow-sm rounded border border-[#444] overflow-y-auto
    `;

    return (
        <>
            {/* Floating button untuk mobile - di kiri tengah layar */}
            {isSmallScreen && !isMobileOpen && onMobileOpen && (
                <button
                    onClick={onMobileOpen}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-[#3B82F6] text-white p-2 rounded-r-lg shadow-lg hover:bg-[#2563EB] transition-colors"
                    style={{ marginLeft: 0 }}
                >
                    <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                </button>
            )}
            
            {/* Overlay untuk mobile */}
            {isSmallScreen && isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={onMobileClose}
                ></div>
            )}
            
            <div className={sidebarClasses}>
                {/* Header dengan tombol tutup untuk mobile */}
                {isSmallScreen && (
                    <div className="flex items-center justify-between p-4 border-b border-[#444]">
                        <h2 className="font-bold text-lg text-white">Menu</h2>
                        <button 
                            onClick={onMobileClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}
                
                {/* Profil user dengan Flip Card */}
                <div className="p-4 border-b border-[#444]">
                    <div className="text-center">
                        {/* Flip Card Container */}
                        <div 
                            className="relative w-20 h-20 mx-auto mb-2 cursor-pointer"
                            style={{ perspective: '1000px' }}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            <div 
                                className="relative w-full h-full transition-transform duration-500"
                                style={{ 
                                    transformStyle: 'preserve-3d',
                                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                }}
                            >
                                {/* Front - Profile Picture */}
                                <div 
                                    className="absolute w-full h-full rounded-full overflow-hidden border-2 border-[#444]"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    {displayUser.profile_picture ? (
                                        <img 
                                            src={displayUser.profile_picture}
                                            alt="User Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                                        style={{ 
                                            backgroundColor: getAvatarColor(displayUser.uname),
                                            display: displayUser.profile_picture ? 'none' : 'flex'
                                        }}
                                    >
                                        {getInitials(displayUser.uname)}
                                    </div>
                                </div>

                                {/* Back - Radar Chart SVG */}
                                <div 
                                    className="absolute w-full h-full rounded-full overflow-hidden border-2 border-[#3B82F6] bg-[#1e1e1e] flex items-center justify-center"
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)'
                                    }}
                                >
                                    <RadarChart data={radarData} size={70} />
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-500 text-[9px] mb-1 hidden">Klik foto untuk stats</p>

                        <h3 className="font-bold text-base text-white">{displayUser.uname}</h3>
                        <span className="inline-block bg-[#1a73e8] text-white text-[10px] px-1.5 py-0.5 rounded-full mt-1">
                            {ROLES[Number(displayUser.level)] || 'User'}
                        </span>

                        {/* Stats Grid - menggunakan data dari API */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                            <div className="bg-[#252525] rounded px-2 py-1.5">
                                <p className="text-gray-400">Observasi</p>
                                <p className="text-white font-semibold">{stats.totalObservations || '-'}</p>
                            </div>
                            <div className="bg-[#252525] rounded px-2 py-1.5">
                                <p className="text-gray-400">Identifikasi</p>
                                <p className="text-white font-semibold">{stats.totalIdentifications || '-'}</p>
                            </div>
                            <div className="bg-[#252525] rounded px-2 py-1.5">
                                <p className="text-gray-400">Burungnesia</p>
                                <p className="text-white font-semibold">{stats.burungnesiaCount || '-'}</p>
                            </div>
                            <div className="bg-[#252525] rounded px-2 py-1.5">
                                <p className="text-gray-400">Kupunesia</p>
                                <p className="text-white font-semibold">{stats.kupunesiaCount || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={(e) => handleLinkClick(e, item)}
                            className={`block px-4 py-3 text-sm flex items-center transition-colors duration-200 ${
                                (activeItem === item.label || 
                                (item.isAbsolute ? location.pathname === item.path : location.pathname === item.path))
                                ? 'bg-[#1a73e8] text-white'
                                : 'text-[#e0e0e0] hover:bg-[#2c2c2c]'
                            }`}
                        >
                            <FontAwesomeIcon icon={item.icon} className="mr-3 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Sidebar;