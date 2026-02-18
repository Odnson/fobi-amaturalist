import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import NotificationBar from '../../NotificationBar';

const NotificationButton = ({
  notificationRef,
  showNotifications,
  setShowNotifications,
  notifications,
  isLoading,
  handleMarkAsRead
}) => {
  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-400 hover:text-gray-200"
      >
        <FontAwesomeIcon icon={faBell} className="text-xl" />
        {!isLoading && notifications.filter(n => !n.is_read).length > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
          </span>
        )}
      </button>
      {showNotifications && !isLoading && (
        <NotificationBar
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={handleMarkAsRead}
        />
      )}
    </div>
  );
};

export default NotificationButton;
