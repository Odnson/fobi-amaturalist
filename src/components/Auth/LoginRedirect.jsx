import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component untuk redirect dari /login ke home dengan membuka AuthModal
 * Ini menggantikan halaman Login.jsx yang standalone
 */
const LoginRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
    navigate('/', { replace: true });
  }, [navigate]);
  return null;
};

export default LoginRedirect;
