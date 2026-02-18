import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext'; // Import hook useUser
import { Eye, EyeOff, Loader2, Info, Mail, AlertTriangle, CheckCircle } from 'lucide-react'; // Import icons
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Auth.css';
import { apiFetch } from '../../utils/api';
const VerificationHelpModal = ({ isOpen, onClose, email, onResendVerification, isResending, verificationStatus, onCheckStatus, cooldownTimer }) => {
  if (!isOpen) return null;
  const allVerified = verificationStatus && 
    verificationStatus.fobi && 
    (!verificationStatus.burungnesia || verificationStatus.burungnesia) && 
    (!verificationStatus.kupunesia || verificationStatus.kupunesia);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1e1e1e] rounded-lg shadow-lg border border-[#444] w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-[#444]">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-[#e0e0e0] flex items-center">
              <Mail className="mr-2 h-5 w-5 text-[#1a73e8]" />
              Bantuan Verifikasi Email
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-5">
          <div className="mb-4 bg-[#2c2c2c] p-4 rounded-md border border-[#444]">
            <p className="text-[#e0e0e0] mb-2">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-[#b0b0b0] text-sm">
              Silakan cek email Anda untuk link verifikasi yang telah dikirim.
            </p>
          </div>
          
          {verificationStatus ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[#e0e0e0] font-medium">Status Verifikasi:</h4>
                <button 
                  onClick={onCheckStatus}
                  className="text-[#1a73e8] hover:text-[#4285f4] text-xs flex items-center"
                >
                  <Loader2 className="h-3 w-3 mr-1" />
                  Periksa Pembaruan
                </button>
              </div>
              <ul className="bg-[#232323] rounded-md p-3 border border-[#444]">
                <li className="mb-2 flex items-center">
                  {verificationStatus.fobi 
                    ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                  }
                  <span className={`${verificationStatus.fobi ? 'text-green-400' : 'text-amber-400'}`}>
                    FOBI: {verificationStatus.fobi ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                  </span>
                </li>
                {verificationStatus.burungnesia !== null && (
                  <li className="mb-2 flex items-center">
                    {verificationStatus.burungnesia 
                      ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                    }
                    <span className={`${verificationStatus.burungnesia ? 'text-green-400' : 'text-amber-400'}`}>
                      Burungnesia: {verificationStatus.burungnesia ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                    </span>
                  </li>
                )}
                {verificationStatus.kupunesia !== null && (
                  <li className="flex items-center">
                    {verificationStatus.kupunesia 
                      ? <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                    }
                    <span className={`${verificationStatus.kupunesia ? 'text-green-400' : 'text-amber-400'}`}>
                      Kupunesia: {verificationStatus.kupunesia ? 'Sudah Terverifikasi' : 'Belum Terverifikasi'}
                    </span>
                  </li>
                )}
              </ul>
              
              {/* Tampilkan pesan informasi jika semua email sudah terverifikasi */}
              {allVerified && (
                <div className="mt-3 p-3 bg-[#133312] border border-[#2b4c2b] rounded text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4 inline-block mr-2" />
                  Semua email telah terverifikasi. Anda dapat melanjutkan login.
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 p-4 flex justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-[#1a73e8]" />
              <span className="ml-2 text-[#e0e0e0]">Memeriksa status verifikasi...</span>
            </div>
          )}
          
          <div className="mb-4 text-sm text-[#b0b0b0]">
            <p className="mb-2">Tidak menerima email verifikasi? Periksa hal berikut:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cek folder spam/junk email Anda</li>
              <li>Pastikan alamat email yang Anda masukkan benar</li>
              <li>Tunggu beberapa menit untuk pengiriman email</li>
            </ul>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2c2c2c] text-[#e0e0e0] rounded border border-[#444] hover:bg-[#3c3c3c]"
            >
              Tutup
            </button>
            <button
              onClick={onResendVerification}
              disabled={isResending || allVerified || cooldownTimer > 0}
              className="flex items-center px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#0d47a1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Mengirim...
                </>
              ) : allVerified ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sudah Terverifikasi
                </>
              ) : cooldownTimer > 0 ? (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Kirim Ulang ({cooldownTimer}s)
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Kirim Ulang Verifikasi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const { setUser } = useUser(); // Dapatkan fungsi setUser dari context
  useEffect(() => {
    let timerId;
    if (cooldownTimer > 0) {
      timerId = setTimeout(() => {
        setCooldownTimer(cooldownTimer - 1);
      }, 1000);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [cooldownTimer]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const needVerification = params.get('needVerification');
    const userEmail = params.get('email');
    
    if (needVerification && userEmail) {
      setEmailOrUsername(userEmail);
      setEmailVerificationRequired(true);
      setError('Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.');
      setShowVerificationModal(true);
      fetchVerificationStatus(userEmail);
    }
  }, [location]);
  useEffect(() => {
    let intervalId;
    
    if (showVerificationModal && emailOrUsername && emailOrUsername.includes('@')) {
      const initialTimeoutId = setTimeout(() => {
        fetchVerificationStatus(emailOrUsername);
      }, 5000);
      intervalId = setInterval(() => {
        fetchVerificationStatus(emailOrUsername);
      }, 30000);
      
      return () => {
        clearTimeout(initialTimeoutId);
        clearInterval(intervalId);
      };
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showVerificationModal, emailOrUsername]);
  useEffect(() => {
    if (verificationStatus && verificationStatus.fobi && 
        (!verificationStatus.burungnesia || verificationStatus.burungnesia) && 
        (!verificationStatus.kupunesia || verificationStatus.kupunesia)) {
      if (password && emailVerificationRequired) {
        toast.success('Verifikasi selesai! Mencoba login otomatis...');
        setEmailVerificationRequired(false);
        setShowVerificationModal(false);
        setTimeout(() => {
          handleSubmit(new Event('submit'));
        }, 1000);
      } else if (emailVerificationRequired) {
        toast.success('Semua email terverifikasi! Silakan masukkan password untuk login.');
        setEmailVerificationRequired(false);
        setError('');
        setShowVerificationModal(false);
      }
    }
  }, [verificationStatus]);

  const fetchVerificationStatus = async (userIdentifier) => {
    if (!userIdentifier.includes('@') || isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    try {
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/verification-status`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userIdentifier })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authorization failed when checking verification status');
          return;
        }
        throw new Error('Gagal memeriksa status verifikasi');
      }
      
      const data = await response.json();
      console.log('Verification status response:', data);
      
      if (data.success && data.verificationStatus) {
        setVerificationStatus(data.verificationStatus);
        const allVerified = data.verificationStatus.fobi && 
          (!data.verificationStatus.burungnesia || data.verificationStatus.burungnesia) && 
          (!data.verificationStatus.kupunesia || data.verificationStatus.kupunesia);
          
        if (allVerified) {
          toast.success('Semua email berhasil diverifikasi!');
        }
      }
    } catch (err) {
      console.error('Error fetching verification status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailOrUsername || !emailOrUsername.includes('@')) {
      toast.error('Email tidak valid');
      return;
    }
    if (cooldownTimer > 0) {
      toast.info(`Harap tunggu ${cooldownTimer} detik sebelum mengirim ulang verifikasi`);
      return;
    }

    setIsResendingVerification(true);
    try {
      console.log('Resending verification email to:', emailOrUsername);
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailOrUsername })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengirim ulang email verifikasi');
      }
      
      const data = await response.json();
      console.log('Resend verification response:', data);

      if (data.success) {
        toast.success('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
        setCooldownTimer(30);
        if (data.verificationStatus) {
          setVerificationStatus(data.verificationStatus);
        }
        const checkIntervals = [10000, 20000, 30000]; // cek pada 10, 20, dan 30 detik
        
        checkIntervals.forEach(interval => {
          setTimeout(() => {
            fetchVerificationStatus(emailOrUsername);
          }, interval);
        });
      } else {
        toast.error(data.message || 'Gagal mengirim ulang email verifikasi');
      }
    } catch (err) {
      console.error('Error resending verification email:', err);
      toast.error('Terjadi kesalahan saat mengirim ulang email verifikasi');
    } finally {
      setIsResendingVerification(false);
    }
  };
  const handleVerificationRequired = () => {
    setEmailVerificationRequired(true);
    setError('Email belum diverifikasi. Silakan cek email Anda untuk link verifikasi atau kirim ulang verifikasi.');
    toast.warning('Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.');
    if (emailOrUsername.includes('@')) {
      fetchVerificationStatus(emailOrUsername);
      setShowVerificationModal(true);
    }
  };
  const handleAccountNotApproved = (message) => {
    setEmailVerificationRequired(false); // Reset verification flag
    setError(message);
    toast.warning(message);
    setShowVerificationModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); // Hanya reset error message, bukan input fields
    setEmailVerificationRequired(false);
    if (password.length < 6) {
      setIsLoading(false);
      toast.error('Password minimal harus 6 karakter');
      setError('Password terlalu pendek. Silakan masukkan password minimal 6 karakter.');
      return;
    }

    try {
      console.log('Attempting login with:', emailOrUsername);
      const response = await apiFetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          login_identifier: emailOrUsername, 
          password
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.user && data.user.id) {
        setEmailOrUsername('');
        setPassword('');
        
        console.log('Login successful');
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('username', data.user.uname);
        localStorage.setItem('totalObservations', data.user.totalObservations);
        localStorage.setItem('level', data.user.level);
        localStorage.setItem('email', data.user.email);
        localStorage.setItem('burungnesia_user_id', data.user.burungnesia_user_id);
        localStorage.setItem('kupunesia_user_id', data.user.kupunesia_user_id);
        localStorage.setItem('bio', data.user.bio);
        localStorage.setItem('profile_picture', data.user.profile_picture);
        localStorage.setItem('auth_expiry', data.expires_at || '');
        localStorage.setItem('license_observation', data.user.license_observation || '');
        localStorage.setItem('license_photo', data.user.license_photo || '');
        localStorage.setItem('license_audio', data.user.license_audio || '');
        localStorage.setItem('fname', data.user.fname || '');
        localStorage.setItem('lname', data.user.lname || '');
        localStorage.setItem('fullname', `${data.user.fname || ''} ${data.user.lname || ''}`.trim());
        const userResponse = await apiFetch(`/fobi-users/${data.user.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data.');
        }

        const userData = await userResponse.json();
        console.log('User data:', userData);
        const observationsResponse = await apiFetch(`/user-total-observations/${data.user.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (!observationsResponse.ok) {
          throw new Error('Failed to fetch total observations.');
        }

        const observationsData = await observationsResponse.json();
        console.log('Total observations:', observationsData);
        setUser({
          ...userData,
          id: userData.id,
          uname: userData.uname,
          level: userData.level,
          email: userData.email,
          burungnesia_user_id: userData.burungnesia_user_id,
          kupunesia_user_id: userData.kupunesia_user_id,
          bio: userData.bio,
          profile_picture: userData.profile_picture,
          totalObservations: observationsData.userTotalObservations,
          license_observation: userData.license_observation,
          license_photo: userData.license_photo,
          license_audio: userData.license_audio,
          fname: userData.fname || '',
          lname: userData.lname || '',
          fullname: `${userData.fname || ''} ${userData.lname || ''}`.trim(),
        });
        localStorage.setItem('user_id', userData.id);
        localStorage.setItem('username', userData.uname);
        localStorage.setItem('totalObservations', observationsData.userTotalObservations);
        localStorage.setItem('level', userData.level);
        localStorage.setItem('email', userData.email);
        localStorage.setItem('burungnesia_user_id', userData.burungnesia_user_id);
        localStorage.setItem('kupunesia_user_id', userData.kupunesia_user_id);
        localStorage.setItem('bio', userData.bio);
        localStorage.setItem('profile_picture', userData.profile_picture);
        localStorage.setItem('license_observation', userData.license_observation);
        localStorage.setItem('license_photo', userData.license_photo);
        localStorage.setItem('license_audio', userData.license_audio);
        localStorage.setItem('fname', userData.fname || '');
        localStorage.setItem('lname', userData.lname || '');
        localStorage.setItem('fullname', `${userData.fname || ''} ${userData.lname || ''}`.trim());

        toast.success('Login berhasil! Mengalihkan...');
        navigate(from, { replace: true });
      } else {
        throw new Error('Data pengguna tidak ditemukan. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      if (err.status === 403 && err.data) {
        console.log('403 Forbidden error with data:', err.data);
        
        if (err.data.error === 'EMAIL_NOT_VERIFIED') {
          console.log('Email not verified from catch:', err.data);
          setVerificationStatus(err.data.verificationStatus || null);
          handleVerificationRequired();
          return;
        } else if (err.data.error === 'ACCOUNT_NOT_APPROVED') {
          console.log('Account not approved from catch:', err.data);
          const approvalMessage = err.data.user_friendly_message || err.data.message || 'Akun Anda sedang dalam proses persetujuan. Silakan tunggu konfirmasi dari administrator.';
          toast.warning(approvalMessage);
          setError(approvalMessage);
          return;
        }
      }
      if (err.message && (
          err.message.includes('Email belum diverifikasi') || 
          err.message.includes('EMAIL_NOT_VERIFIED') ||
          err.message.includes('belum diverifikasi')
        )) {
        handleVerificationRequired();
      } else if (err.message && (
          err.message.includes('persetujuan') || 
          err.message.includes('disetujui') || 
          err.message.includes('approval')
        )) {
        toast.warning(err.message);
        setError(err.message);
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = 'Tidak dapat terhubung ke server. Mohon periksa koneksi internet Anda dan coba lagi.';
        toast.error(networkError);
        setError(networkError);
      } else if (err.name === 'AbortError') {
        const abortError = 'Permintaan login dibatalkan. Silakan coba lagi.';
        toast.error(abortError);
        setError(abortError);
      } else if (err.message && err.message.includes('JSON')) {
        const jsonError = 'Terjadi kesalahan dalam memproses respons server. Silakan coba lagi.';
        toast.error(jsonError);
        setError(jsonError);
      } else if (err.message && err.message.includes('timeout')) {
        const timeoutError = 'Koneksi timeout. Silakan periksa koneksi internet Anda dan coba lagi.';
        toast.error(timeoutError);
        setError(timeoutError);
      } else {
        const fallbackError = err.message || 'Login gagal.\n\n- Pastikan email dan kata sandi Anda benar.\n- Jika Anda baru mendaftar, silakan cek email Anda untuk verifikasi (jangan lupa periksa folder Spam).\n- Jika akun Anda terkunci atau dinonaktifkan, hubungi tim support kami.\n- Jika masalah berlanjut, coba beberapa saat lagi atau hubungi admin.';
        toast.error(fallbackError.split('\n')[0]); // Hanya tampilkan baris pertama di toast
        setError(fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] py-12 px-4 sm:px-6 lg:px-8">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Modal bantuan verifikasi */}
      <VerificationHelpModal 
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={emailOrUsername}
        onResendVerification={handleResendVerification}
        isResending={isResendingVerification}
        verificationStatus={verificationStatus}
        onCheckStatus={() => fetchVerificationStatus(emailOrUsername)}
        cooldownTimer={cooldownTimer}
      />
      
      <div className="max-w-md w-full space-y-8 bg-[#1e1e1e] p-8 rounded-lg shadow-lg border border-[#444]">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Selamat Datang di Amaturalist
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Portal Biodiversity Citizen Science Indonesia
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6" autoComplete="off">
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-300 flex items-center">
                Email atau Username
                <button
                  type="button"
                  className="ml-2"
                  onMouseEnter={() => setShowEmailTooltip(true)}
                  onMouseLeave={() => setShowEmailTooltip(false)}
                >
                  <Info className="h-4 w-4 text-gray-400" />
                </button>
              </label>
              {showEmailTooltip && (
                <div className="absolute z-10 w-64 px-3 py-2 text-sm font-light text-white bg-[#333] rounded-lg shadow-sm -top-2 left-32">
                  Masukkan email atau username Anda
                </div>
              )}
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                autoComplete="new-login"
                className="mt-1 block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
                placeholder="Email atau username"
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 flex items-center">
                Password
                <button
                  type="button"
                  className="ml-2"
                  onMouseEnter={() => setShowPasswordTooltip(true)}
                  onMouseLeave={() => setShowPasswordTooltip(false)}
                >
                  <Info className="h-4 w-4 text-gray-400" />
                </button>
              </label>
              {showPasswordTooltip && (
                <div className="absolute z-10 w-64 px-3 py-2 text-sm font-light text-white bg-[#333] rounded-lg shadow-sm -top-2 left-32">
                  Masukkan password Anda dengan benar
                </div>
              )}
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="block w-full px-3 py-2 border border-[#444] rounded-md shadow-sm focus:outline-none focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-[#2c2c2c] text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="py-2 text-sm text-gray-300">
              <p>Sesi login akan bertahan selama 7 hari</p>
            </div>
          </div>

          {error && (
            <div className={`rounded-md p-4 border ${
              emailVerificationRequired 
                ? 'bg-amber-900 bg-opacity-20 border-amber-800' 
                : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                  ? 'bg-blue-900 bg-opacity-20 border-blue-800'
                  : 'bg-red-900 bg-opacity-20 border-red-800'
            }`}>
              <div className="flex items-start">
                <AlertTriangle className={`h-5 w-5 ${
                  emailVerificationRequired 
                    ? 'text-amber-400' 
                    : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                      ? 'text-blue-400'
                      : 'text-red-400'
                } mr-2 mt-0.5`} />
                <div className="flex-1">
                  <div className={`text-sm ${
                    emailVerificationRequired 
                      ? 'text-amber-400' 
                      : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                        ? 'text-blue-400'
                        : 'text-red-400'
                  }`}>
                    {error.split('\n').map((line, index) => (
                      <p key={index} className={line.startsWith('-') ? 'ml-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                  
                  {emailVerificationRequired && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowVerificationModal(true)}
                        className="bg-[#1a73e8] hover:bg-[#0d47a1] text-white py-1 px-3 rounded text-sm flex items-center"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Bantuan Verifikasi Email
                      </button>
                      <p className="mt-2 text-xs text-amber-300">
                        Email verifikasi sudah dikirim ke alamat email Anda. Silakan cek inbox dan folder spam Anda.
                      </p>
                    </div>
                  )}
                  
                  {(error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')) && (
                    <div className="mt-3">
                      <p className="text-xs text-blue-300">
                        Akun Anda sedang menunggu persetujuan dari administrator. Proses ini biasanya memakan waktu 1-2 hari kerja.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Masuk'
            )}
          </button>

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[#1a73e8] hover:text-[#4285f4]"
            >
              Lupa Password?
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-[#1a73e8] hover:text-[#4285f4]"
            >
              Daftar di sini
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;