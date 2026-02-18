import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, 
    faCheck, 
    faUserPlus, 
    faEnvelope, 
    faBell,
    faComment,
    faFingerprint,
    faChevronRight,
    faChevronLeft
} from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';

const NotificationBar = ({ notifications, onClose, onMarkAsRead, variant = 'desktop' }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('all');
    const [tabIndex, setTabIndex] = useState(0);

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

    const handleNotificationClick = async (notification) => {
        try {
            await onMarkAsRead(notification.id);
            onClose();
            if (notification.type === 'new_follower') {
                const data = notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : {};
                navigate(`/profile/${data.follower_id}`);
            } else if (notification.type === 'new_message') {
                const data = notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : {};
                navigate(`/messages/${data.sender_id}`);
            } else {
                navigate(`/observations/${notification.checklist_id}`);
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
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

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

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
        if (!notifications) return [];
        if (activeTab === 'all') return notifications;
        if (activeTab === 'identification') return notifications.filter(n => identificationTypes.has(n.type));
        if (activeTab === 'social') return notifications.filter(n => socialTypes.has(n.type));
        return notifications.filter(n => n.type === 'comment' || n.type === 'mention');
    }, [notifications, activeTab, identificationTypes, socialTypes]);

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

    const tabCounts = useMemo(() => ({
        all: notifications?.length || 0,
        identification: notifications?.filter(n => identificationTypes.has(n.type)).length || 0,
        comments: notifications?.filter(n => n.type === 'comment' || n.type === 'mention').length || 0,
        social: notifications?.filter(n => socialTypes.has(n.type)).length || 0,
    }), [notifications, identificationTypes, socialTypes]);

    const tabs = [
        { key: 'all', label: 'Semua', icon: faBell },
        { key: 'identification', label: 'Identifikasi', icon: faFingerprint },
        { key: 'comments', label: 'Komentar', icon: faComment },
        { key: 'social', label: 'Sosial', icon: faUserPlus },
    ];

    const handleTabNav = (direction) => {
        const newIndex = direction === 'next' 
            ? Math.min(tabIndex + 1, tabs.length - 1)
            : Math.max(tabIndex - 1, 0);
        setTabIndex(newIndex);
        setActiveTab(tabs[newIndex].key);
    };

    const handleTabClick = (key, index) => {
        setActiveTab(key);
        setTabIndex(index);
    };

    const containerClass = variant === 'mobile'
        ? 'fixed inset-x-4 top-20 bg-[#1a1a1a] rounded-2xl shadow-2xl z-50 max-h-[75vh] overflow-hidden border border-[#2a2a2a]'
        : 'absolute right-0 mt-2 w-[420px] bg-[#1a1a1a] rounded-2xl shadow-2xl z-50 max-h-[calc(100vh-100px)] overflow-hidden border border-[#2a2a2a]';

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#2a2a2a] bg-[#1a1a1a] sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-[#1a73e8] hover:text-[#4285f4] flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#1a73e8]/10 transition-colors"
                            >
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Tandai dibaca</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </div>

                {/* Tabs - Icon only, text on selected/hover */}
                <div className="flex items-center justify-center gap-2">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key, index)}
                            className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
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
                                <span className={`text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-full ${
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
            <div className="overflow-y-auto max-h-[calc(75vh-140px)]">
                {filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                            <FontAwesomeIcon icon={faBell} className="text-2xl text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-sm">Tidak ada notifikasi</p>
                        <p className="text-gray-500 text-xs mt-1">Notifikasi baru akan muncul di sini</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#2a2a2a]">
                        {filteredNotifications.map(notification => {
                            const { icon, color, bg } = getNotificationIcon(notification.type);
                            const label = getNotificationLabel(notification.type);
                            
                            return (
                                <div
                                    key={`${notification.source || 'taxa'}-${notification.id}`}
                                    className={`px-5 py-4 hover:bg-[#222] cursor-pointer transition-colors group ${
                                        !notification.is_read ? 'bg-[#1a73e8]/5 border-l-2 border-l-[#1a73e8]' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex gap-3">
                                        {/* Icon */}
                                        <div className={`shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                                            <FontAwesomeIcon icon={icon} className={`${color} text-sm`} />
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="text-sm text-gray-200 leading-relaxed line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <FontAwesomeIcon 
                                                    icon={faChevronRight} 
                                                    className="text-gray-500 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${bg} ${color} font-medium`}>
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
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#2a2a2a] bg-[#1a1a1a]">
                <Link 
                    to="/notifications" 
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 text-sm text-[#1a73e8] hover:text-[#4285f4] font-medium py-2 rounded-lg hover:bg-[#1a73e8]/10 transition-colors"
                >
                    <span>Lihat semua notifikasi</span>
                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                </Link>
            </div>
        </div>
    );
};

export default NotificationBar;

