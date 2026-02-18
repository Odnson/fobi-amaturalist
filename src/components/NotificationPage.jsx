import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faBell, 
    faCheck, 
    faUserPlus, 
    faEnvelope,
    faComment,
    faFingerprint,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';

const NotificationPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('all');
    const [tabIndex, setTabIndex] = useState(0);

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiFetch('/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            return data.success ? data.data : [];
        },
        enabled: !!localStorage.getItem('jwt_token'),
        refetchInterval: 30000
    });

    const handleMarkAsRead = async (notificationId) => {
        try {
            await apiFetch(`/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };
    const identificationTypes = useMemo(() => new Set([
        'identification',
        'identification_agreed',
        'withdraw_identification',
        'agreement_converted',
    ]), []);
    const socialTypes = useMemo(() => new Set([
        'new_follower',
        'new_message',
    ]), []);

    const filteredNotifications = useMemo(() => {
        if (activeTab === 'all') return notifications;
        if (activeTab === 'identification') return notifications.filter(n => identificationTypes.has(n.type));
        if (activeTab === 'social') return notifications.filter(n => socialTypes.has(n.type));
        return notifications.filter(n => n.type === 'comment' || n.type === 'mention');
    }, [notifications, activeTab, identificationTypes, socialTypes]);

    const tabs = [
        { key: 'all', label: 'Semua', icon: faBell },
        { key: 'identification', label: 'Identifikasi', icon: faFingerprint },
        { key: 'comments', label: 'Komentar', icon: faComment },
        { key: 'social', label: 'Sosial', icon: faUserPlus },
    ];

    const tabCounts = useMemo(() => ({
        all: notifications?.length || 0,
        identification: notifications?.filter(n => identificationTypes.has(n.type)).length || 0,
        comments: notifications?.filter(n => n.type === 'comment' || n.type === 'mention').length || 0,
        social: notifications?.filter(n => socialTypes.has(n.type)).length || 0,
    }), [notifications, identificationTypes, socialTypes]);

    const handleTabClick = (key, index) => {
        setActiveTab(key);
        setTabIndex(index);
    };

    const getNotificationIcon = (type) => {
        if (type === 'new_follower') return { icon: faUserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        if (type === 'new_message') return { icon: faEnvelope, color: 'text-blue-400', bg: 'bg-blue-500/10' };
        if (identificationTypes.has(type)) return { icon: faFingerprint, color: 'text-purple-400', bg: 'bg-purple-500/10' };
        return { icon: faComment, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    };

    const getNotificationLabel = (type) => {
        if (type === 'new_follower') return 'Pengikut Baru';
        if (type === 'new_message') return 'Pesan';
        if (identificationTypes.has(type)) return 'Identifikasi';
        return 'Komentar';
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays < 7) return `${diffDays} hari lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl mt-10">
            <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-[#2a2a2a] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-[#2a2a2a] flex items-center justify-between sticky top-0 bg-[#1a1a1a] z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a73e8]/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBell} className="text-[#1a73e8] text-lg" />
                        </div>
                        <h1 className="text-xl font-semibold text-white">Notifikasi</h1>
                    </div>
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-sm text-[#1a73e8] hover:text-[#4285f4] flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a73e8]/10 transition-colors"
                    >
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Tandai semua dibaca</span>
                    </button>
                </div>

                {/* Tabs - Icon only, text on selected/hover */}
                <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#1a1a1a] sticky top-[76px] z-10">
                    <div className="flex items-center justify-center gap-2">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabClick(tab.key, index)}
                                className={`group flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === tab.key
                                        ? 'bg-[#1a73e8] text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                                }`}
                            >
                                <FontAwesomeIcon icon={tab.icon} className="text-sm" />
                                <span className={`overflow-hidden transition-all duration-200 ${
                                    activeTab === tab.key 
                                        ? 'max-w-[100px] opacity-100' 
                                        : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100'
                                }`}>
                                    {tab.label}
                                </span>
                                {tabCounts[tab.key] > 0 && (
                                    <span className={`text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.key ? 'bg-white/20' : 'bg-[#2a2a2a]'
                                    }`}>
                                        {tabCounts[tab.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notification List */}
                <div className="divide-y divide-[#2a2a2a]">
                    {isLoading ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center animate-pulse">
                                <FontAwesomeIcon icon={faBell} className="text-2xl text-gray-500" />
                            </div>
                            <p className="text-gray-400 text-sm">Memuat notifikasi...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                                <FontAwesomeIcon icon={faBell} className="text-2xl text-gray-500" />
                            </div>
                            <p className="text-gray-400 text-sm">Tidak ada notifikasi</p>
                            <p className="text-gray-500 text-xs mt-1">Notifikasi baru akan muncul di sini</p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => {
                            const { icon, color, bg } = getNotificationIcon(notification.type);
                            const label = getNotificationLabel(notification.type);
                            
                            return (
                                <div
                                    key={`${notification.source || 'taxa'}-${notification.id}`}
                                    className={`px-6 py-5 hover:bg-[#222] cursor-pointer transition-colors group ${
                                        !notification.is_read ? 'bg-[#1a73e8]/5 border-l-2 border-l-[#1a73e8]' : ''
                                    }`}
                                    onClick={() => {
                                        handleMarkAsRead(notification.id);
                                        if (notification.type === 'new_follower') {
                                            const data = notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : {};
                                            navigate(`/profile/${data.follower_id}`);
                                        } else if (notification.type === 'new_message') {
                                            const data = notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : {};
                                            navigate(`/messages/${data.sender_id}`);
                                        } else {
                                            navigate(`/observations/${notification.checklist_id}`);
                                        }
                                    }}
                                >
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`shrink-0 w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                                            <FontAwesomeIcon icon={icon} className={`${color} text-lg`} />
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <p className="text-sm text-gray-200 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <FontAwesomeIcon 
                                                    icon={faChevronRight} 
                                                    className="text-gray-500 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs px-2.5 py-1 rounded-full ${bg} ${color} font-medium`}>
                                                    {label}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTimeAgo(notification.created_at)}
                                                </span>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-[#1a73e8]"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;

