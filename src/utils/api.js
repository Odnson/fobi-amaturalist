import { withRateLimitRetry, setCooldown } from './rateLimiting';

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
        
      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
      throw new Error('Unauthorized');
    }
    
    if (response.status === 403) {
      try {
        const errorData = await response.json();
        const error = new Error(errorData.user_friendly_message || errorData.message || 'Login gagal');
        error.status = 403;
        error.data = errorData;
        error.response = { status: 403, data: errorData };
        throw error;
      } catch (e) {
        const error = new Error('Login gagal.\n\n- Pastikan email dan kata sandi Anda benar.\n- Jika Anda baru mendaftar, silakan cek email Anda untuk verifikasi (jangan lupa periksa folder Spam).\n- Jika akun Anda terkunci atau dinonaktifkan, hubungi tim support kami.\n- Jika masalah berlanjut, coba beberapa saat lagi atau hubungi admin.');
        error.status = 403;
        throw error;
      }
    }
    
    if (response.status === 429) {
      const path = new URL(response.url).pathname;
      const endpoint = path.replace('/api', '');
      setCooldown(endpoint, 60000); // 1 menit cooldown
      
      const errorData = await response.json();
      const error = new Error(errorData.message || 'Terlalu banyak permintaan. Silakan coba lagi nanti.');
      error.status = 429;
      throw error;
    }
    
    if (response.status === 409) {
      const errorData = await response.json();
      const error = new Error(errorData.message || 'Terjadi konflik data');
      error.status = 409;
      error.data = errorData;
      error.response = { status: 409, data: errorData };
      throw error;
    }
    
    if (response.status === 404) {
      try {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Data tidak ditemukan');
        error.status = 404;
        error.data = errorData;
        throw error;
      } catch (e) {
        const error = new Error('Data tidak ditemukan');
        error.status = 404;
        throw error;
      }
    }
    
    if (response.status === 500) {
      try {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Terjadi kesalahan pada server. Silakan coba lagi nanti.');
        error.status = 500;
        error.data = errorData;
        throw error;
      } catch (e) {
        const error = new Error('Terjadi kesalahan pada server. Silakan coba lagi nanti.');
        error.status = 500;
        throw error;
      }
    }
    
    try {
      const errorData = await response.json();
      const error = new Error(errorData.user_friendly_message || errorData.message || `Login gagal (${response.status})`);
      error.status = response.status;
      error.data = errorData;
      error.response = { status: response.status, data: errorData };
      throw error;
    } catch (e) {
      const error = new Error('Login gagal.\n\n- Pastikan email dan kata sandi Anda benar.\n- Jika Anda baru mendaftar, silakan cek email Anda untuk verifikasi (jangan lupa periksa folder Spam).\n- Jika akun Anda terkunci atau dinonaktifkan, hubungi tim support kami.\n- Jika masalah berlanjut, coba beberapa saat lagi atau hubungi admin.');
      error.status = response.status;
      throw error;
    }
  }
  return response;
};

export const apiFetch = async (endpoint, options = {}, customHeaders = {}) => {
  const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
    ? 'https://amaturalist.com/api'  
    : 'http://localhost:8000/api'; 
    
  const token = localStorage.getItem('jwt_token');

  const defaultHeaders = {
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...customHeaders
  };

  if (!(options?.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers
    }
  };

  return withRateLimitRetry(async () => {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, config);
      return handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error.message.includes('Terlalu banyak permintaan') || 
          error.message.includes('Too many requests') ||
          error.status === 429) {
        throw error;
      }
      
      if (error.status === 403 && error.data) {
        const enhancedError = new Error(error.message);
        enhancedError.status = 403;
        enhancedError.data = error.data;
        enhancedError.response = error.response;
        throw enhancedError;
      }
      
      throw error;
    }
  }, {
    maxRetries: 2,              
    initialDelay: 1000,         
    maxDelay: 5000              
  });
};

export const cropImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('max_dimension', 1000); 
        formData.append('quality', 80); 

        const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/crop-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Gagal memproses gambar');
        }

        const byteString = atob(data.data.split(',')[1]);
        const mimeString = data.data.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const croppedFile = new File([blob], file.name, { type: file.type });
        
        return croppedFile;
    } catch (error) {
        console.error('Error cropping image:', error);
        throw error;
    }
};