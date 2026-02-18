import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';

export const useNotifications = (user) => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user || !localStorage.getItem('jwt_token')) {
        return [];
      }
      const response = await apiFetch('/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!user && !!localStorage.getItem('jwt_token'),
    refetchInterval: 30000
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

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

  return {
    notifications,
    isLoading,
    unreadCount,
    handleMarkAsRead,
    handleMarkAllAsRead
  };
};

export default useNotifications;
