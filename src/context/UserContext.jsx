import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
const getImageUrl = (profilePicture) => {
  if (!profilePicture) return '/default-avatar.png';
  if (profilePicture.startsWith('http')) return profilePicture;
  const cleanPath = profilePicture
    .replace(/^\/storage\//, '')
    .replace(/^\/api\/storage\//, '')
    .replace(/^storage\//, '')
    .replace(/^api\/storage\//, '');
  return `https://api.amaturalist.com/storage/${cleanPath}`;
};

const UserContext = createContext({
  user: null,
  setUser: () => {},
  updateTotalObservations: () => {},
  isLoading: false
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    window.location.href = '/';
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    const tokenExpiry = localStorage.getItem('auth_expiry');
    
    if (tokenExpiry) {
      const now = new Date();
      const expiryDate = new Date(tokenExpiry);
      if (now > expiryDate) {
        console.log('Token telah kedaluwarsa');
        handleLogout();
        return;
      }
    }

    try {
      const response = await apiFetch('/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (response.data) {
        const userData = await fetchUserData(response.data.id);
        const resolvedProfilePic = userData.profile_picture
          || (response.data.profile_picture ? getImageUrl(response.data.profile_picture) : null);
        if (resolvedProfilePic) {
          localStorage.setItem('profile_picture', resolvedProfilePic);
        }
        setUser({
          ...response.data,
          ...userData,
          profile_picture: resolvedProfilePic || null
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const checkInterval = 1800000; // 30 menit
    const interval = setInterval(checkAuth, checkInterval);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const profileResponse = await apiFetch(`/profile/home/${userId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          const pic = profileData.data?.user?.profile_picture;
          const normalizedPic = pic ? getImageUrl(pic) : null;
          if (normalizedPic) {
            localStorage.setItem('profile_picture', normalizedPic);
          }
          return {
            totalObservations: profileData.data.stats.observasi.replace(/,/g, ''), // Remove commas from formatted number
            license_observation: profileData.data.user.license_observation,
            license_photo: profileData.data.user.license_photo,
            license_audio: profileData.data.user.license_audio,
            license: profileData.data.user.license,
            level: profileData.data.user.level, // ensure level available from profile
            profile_picture: normalizedPic
          };
        }
      }
      const response = await apiFetch(`/user-total-observations/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return { totalObservations: data.userTotalObservations };
      }
      return { totalObservations: 0 };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { totalObservations: 0 };
    }
  };

  const updateTotalObservations = async () => {
    if (user?.id) {
      try {
        const userData = await fetchUserData(user.id);
        setUser(prev => ({
          ...prev,
          ...userData,
          profile_picture: userData.profile_picture || prev?.profile_picture || null
        }));
        localStorage.setItem('totalObservations', userData.totalObservations?.toString() || '0');
        return userData.totalObservations;
      } catch (error) {
        console.error('Error updating observations:', error);
      }
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLogout();
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      isLoading, 
      checkAuth,
      updateTotalObservations 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);