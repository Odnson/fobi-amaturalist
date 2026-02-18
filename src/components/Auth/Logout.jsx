import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { apiFetch } from '../../utils/api';

const Logout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const from = location.state?.from?.pathname || '/';
  const clearBrowserCache = async () => {
    if ('caches' in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (err) {
        console.error('Error clearing cache:', err);
      }
    }
  };
  const clearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        clearAllStorage();
        await clearBrowserCache();
        window.location.href = from;
        return;
      }
      const response = await apiFetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('Logout successful');
      }

    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      clearAllStorage();
      await clearBrowserCache();
      window.location.href = from;
    }
  };
  useEffect(() => {
    handleLogout();
  }, []);

  return (
    <div className="logout-container">
      <h2>Logging out...</h2>
      <p>Please wait while we securely log you out.</p>
    </div>
  );
};

export default Logout;