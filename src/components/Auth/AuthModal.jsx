import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { Eye, EyeOff, Loader2, Info, Mail, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../utils/api';
import { verifyBurungnesiaEmail, verifyKupunesiaEmail } from '../../utils/emailVerification';
import amaturalistLogo from '../../assets/icon/amaturalist-black.png';
import burungnesiaSvg from '../../assets/icon/icon.png';
import kupunesiaSvg from '../../assets/icon/kupnes.png';
const VerificationHelpModal = ({ isOpen, onClose, email, onResendVerification, isResending, verificationStatus, onCheckStatus, cooldownTimer }) => {
  if (!isOpen) return null;

  const allVerified = verificationStatus && 
    verificationStatus.fobi && 
    (!verificationStatus.burungnesia || verificationStatus.burungnesia) && 
    (!verificationStatus.kupunesia || verificationStatus.kupunesia);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] px-4">
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
              <X className="h-5 w-5" />
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
const LoginTab = ({ onClose, onSwitchToRegister }) => {
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const { setUser } = useUser();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordMessage({ type: 'error', text: 'Masukkan alamat email yang valid' });
      return;
    }

    setIsSendingReset(true);
    setForgotPasswordMessage({ type: '', text: '' });

    try {
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage({ 
          type: 'success', 
          text: data.message || 'Link reset password telah dikirim ke email Anda. Silakan cek inbox dan folder spam.' 
        });
        toast.success('Link reset password telah dikirim ke email Anda');
      } else {
        setForgotPasswordMessage({ 
          type: 'error', 
          text: data.message || 'Gagal mengirim link reset password' 
        });
        toast.error(data.message || 'Gagal mengirim link reset password');
      }
    } catch (err) {
      console.error('Error sending reset password:', err);
      setForgotPasswordMessage({ 
        type: 'error', 
        text: 'Terjadi kesalahan saat mengirim link reset password' 
      });
      toast.error('Terjadi kesalahan saat mengirim link reset password');
    } finally {
      setIsSendingReset(false);
    }
  };

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

      if (data.success) {
        toast.success('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
        
        setCooldownTimer(30);
        
        if (data.verificationStatus) {
          setVerificationStatus(data.verificationStatus);
        }
        
        const checkIntervals = [10000, 20000, 30000];
        
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setEmailVerificationRequired(false);

    if (password.length < 6) {
      setIsLoading(false);
      toast.error('Password minimal harus 6 karakter');
      setError('Password terlalu pendek. Silakan masukkan password minimal 6 karakter.');
      return;
    }

    try {
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

      if (data.user && data.user.id) {
        setEmailOrUsername('');
        setPassword('');
        
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

        const observationsResponse = await apiFetch(`/user-total-observations/${data.user.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (!observationsResponse.ok) {
          throw new Error('Failed to fetch total observations.');
        }

        const observationsData = await observationsResponse.json();

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
        onClose();
        navigate(from, { replace: true });
      } else {
        throw new Error('Data pengguna tidak ditemukan. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      
      if (err.status === 403 && err.data) {
        if (err.data.error === 'EMAIL_NOT_VERIFIED') {
          setVerificationStatus(err.data.verificationStatus || null);
          handleVerificationRequired();
          return;
        } else if (err.data.error === 'ACCOUNT_NOT_APPROVED') {
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
      } else {
        const fallbackError = err.message || 'Login gagal. Pastikan email dan kata sandi Anda benar.';
        toast.error(fallbackError.split('\n')[0]);
        setError(fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
      
      <form onSubmit={handleSubmit} className="space-y-6 mt-8" autoComplete="off">
        <div className="space-y-5">
          <div className="relative">
            <label htmlFor="emailOrUsername" className="block text-xs font-medium text-gray-700 mb-2">
              Email atau username
            </label>
            <input
              id="emailOrUsername"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              autoComplete="new-login"
              className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 transition-colors"
              placeholder="Email atau username"
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 transition-colors"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className={`rounded-md p-3 border ${
            emailVerificationRequired 
              ? 'bg-amber-50 border-amber-300' 
              : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                ? 'bg-blue-50 border-blue-300'
                : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start">
              <AlertTriangle className={`h-5 w-5 ${
                emailVerificationRequired 
                  ? 'text-amber-600' 
                  : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                    ? 'text-blue-600'
                    : 'text-red-600'
              } mr-2 mt-0.5`} />
              <div className="flex-1">
                <div className={`text-sm ${
                  emailVerificationRequired 
                    ? 'text-amber-800' 
                    : error.includes('persetujuan') || error.includes('disetujui') || error.includes('approval')
                      ? 'text-blue-800'
                      : 'text-red-800'
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
                    <p className="mt-2 text-xs text-amber-700">
                      Email verifikasi sudah dikirim ke alamat email Anda. Silakan cek inbox dan folder spam Anda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(true);
              setForgotPasswordEmail(emailOrUsername.includes('@') ? emailOrUsername : '');
            }}
            className="text-sm text-[#1a73e8] hover:text-[#0d47a1] hover:underline"
          >
            Lupa password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            'Masuk'
          )}
        </button>

        <div className="text-center text-sm mt-6">
          <span className="text-gray-600">Belum punya akun? </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#1a73e8] hover:text-[#0d47a1] font-medium"
          >
            Daftar di sini
          </button>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Lupa Password
                </h3>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordMessage({ type: '', text: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleForgotPassword} className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Masukkan alamat email Anda untuk menerima link reset password.
              </p>
              
              <div className="mb-4">
                <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Masukkan email Anda"
                  disabled={isSendingReset}
                />
              </div>

              {forgotPasswordMessage.text && (
                <div className={`mb-4 p-3 rounded-md ${
                  forgotPasswordMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="text-sm">{forgotPasswordMessage.text}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordMessage({ type: '', text: '' });
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md text-white bg-[#1a73e8] hover:bg-[#0d47a1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Mengirim...
                    </>
                  ) : (
                    'Kirim Link Reset'
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Ingat password Anda?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordMessage({ type: '', text: '' });
                  }}
                  className="text-[#1a73e8] hover:underline"
                >
                  Kembali ke login
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
const RegisterBurungnesia = ({ onClose, onBack }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    burungnesia_email: '',
    uname: '',
    password: '',
    phone: '',  // Hidden field - not required
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return ['Password minimal harus 6 karakter'];
    }
    return [];
  };

  const verifyBurungnesiaEmailHandler = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailVerificationStatus(null);
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const result = await verifyBurungnesiaEmail(email);
      if (result.success) {
        setEmailVerificationStatus(result.exists ? 'valid' : 'invalid');
      } else {
        setEmailVerificationStatus(null);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setEmailVerificationStatus(null);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    if (name === 'password') {
      const passwordErrors = validatePassword(value);
      if (passwordErrors.length > 0) {
        setErrors(prev => ({ ...prev, password: passwordErrors }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    }
    if (name === 'burungnesia_email') {
      setTimeout(() => verifyBurungnesiaEmailHandler(value), 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    let validationErrors = {};
    
    if (!agreedToTerms) {
      validationErrors.terms = 'Anda harus menyetujui Term & Condition';
      toast.error('Silakan setujui Term & Condition terlebih dahulu');
      setIsSubmitting(false);
      setErrors(validationErrors);
      return;
    }
    
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      validationErrors.password = passwordErrors;
      toast.error('Password minimal harus 6 karakter');
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fname: '',
          lname: '',
          email: formData.burungnesia_email,
          organization: '',
          kupunesia_email: '',
        }),
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${rawText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          Object.values(data.errors).forEach(error => {
            toast.error(error);
          });
        } else if (data.error) {
          switch (data.error) {
            case 'EMAIL_EXISTS':
              setErrors({ burungnesia_email: 'Email sudah terdaftar' });
              toast.error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
              break;
            case 'USERNAME_EXISTS':
              setErrors({ uname: 'Username sudah digunakan' });
              toast.error('Username sudah digunakan. Silakan pilih username lain.');
              break;
            default:
              let errorMessage = data.error || data.message || 'Terjadi kesalahan saat mendaftar';
              if (response.status === 500) {
                errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
              } else if (response.status === 503) {
                errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
              } else if (response.status === 429) {
                errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
              } else if (response.status >= 400 && response.status < 500) {
                errorMessage = data.message || 'Data yang Anda masukkan tidak valid. Silakan periksa kembali.';
              }
              setErrors({ general: errorMessage });
              toast.error(errorMessage);
          }
        } else {
          let errorMessage = 'Terjadi kesalahan saat mendaftar';
          if (response.status === 500) {
            errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
          } else if (response.status === 503) {
            errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
          } else if (response.status === 429) {
            errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
          }
          setErrors({ general: errorMessage });
          toast.error(errorMessage);
        }
        return;
      }

      const successMsg = `Pendaftaran berhasil! Silakan cek email Anda di ${formData.burungnesia_email} untuk verifikasi akun.`;
      
      setSuccessMessage(successMsg);
      toast.success('Pendaftaran berhasil!');

    } catch (err) {
      console.error('Error during registration:', err);
      let errorMsg = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (err.message && err.message.includes('NetworkError')) {
        errorMsg = 'Terjadi kesalahan jaringan. Silakan coba lagi.';
      } else if (err.message && err.message.includes('timeout')) {
        errorMsg = 'Permintaan timeout. Silakan coba lagi.';
      }
      
      setErrors({
        general: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (successMessage) {
    return (
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Registrasi berhasil!
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            Kami mengirimkan pesan verifikasi ke email<br />
            <span className="font-semibold text-gray-900">{formData.burungnesia_email}</span>. Segera lakukan verifikasi<br />
            untuk bisa login ke Amaturalist! Periksa<br />
            folder spam jika pesan tidak ditemukan di<br />
            inbox utama.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = `mailto:${formData.burungnesia_email}`;
          }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] transition-colors"
        >
          Periksa email sekarang!
        </button>

        <p className="text-xs text-gray-500">
          Tidak menerima email?{' '}
          <button
            type="button"
            onClick={() => {
              toast.info('Fitur kirim ulang email akan segera hadir');
            }}
            className="text-[#1a73e8] hover:underline"
          >
            Kirim ulang
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Kamu sedang registrasi menggunakan<br />
          <span className="font-semibold">akun Burungnesia</span>
        </p>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <img 
              src={burungnesiaSvg} 
              alt="Burungnesia" 
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="burungnesia_email" className="block text-xs font-medium text-gray-700 mb-1">
            Masukkan email kredensial Burungnesia kamu<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="burungnesia_email"
              type="email"
              name="burungnesia_email"
              value={formData.burungnesia_email}
              onChange={handleChange}
              required
              placeholder="email@burungnesia.org"
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
            />
            {isVerifyingEmail && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {!isVerifyingEmail && emailVerificationStatus === 'valid' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {!isVerifyingEmail && emailVerificationStatus === 'invalid' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>
          {emailVerificationStatus === 'invalid' && (
            <p className="mt-1 text-xs text-yellow-600">Email tidak ditemukan di database Burungnesia. Pastikan email sudah terdaftar di Aplikasi Burungnesia</p>
          )}
          {emailVerificationStatus === 'valid' && (
            <p className="mt-1 text-xs text-green-600">Email terverifikasi di database Burungnesia</p>
          )}
          {errors.burungnesia_email && <p className="mt-1 text-xs text-red-600">{errors.burungnesia_email}</p>}
        </div>

        <div>
          <label htmlFor="uname" className="block text-xs font-medium text-gray-700 mb-1">
            Buat username baru Amaturalist<span className="text-red-500">*</span>
          </label>
          <input
            id="uname"
            type="text"
            name="uname"
            value={formData.uname}
            onChange={handleChange}
            required
            placeholder="username"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.uname && <p className="mt-1 text-xs text-red-600">{errors.uname}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Masukkan sandi (tidak harus sama dengan Burungnesia/Kupunesia)<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm pr-10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && Array.isArray(errors.password) && (
            <div className="mt-1 text-xs text-amber-700">
              <ul className="list-disc pl-4">
                {errors.password.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden">
          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
            No telepon (tidak harus sama dengan yang kamu daftarkan di Burungnesia/Kupunesia)<span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            maxLength="14"
            placeholder="081234567890"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>

      <div className="flex items-start mt-4">
        <input
          id="terms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 h-4 w-4 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]"
        />
        <label htmlFor="terms" className="ml-2 text-xs text-gray-700">
          Saya sudah membaca dan menyetujui{' '}
          <a href="/terms" target="_blank" className="text-[#1a73e8] hover:underline">
            Term & Condition
          </a>
        </label>
      </div>
      {errors.terms && <p className="text-xs text-red-600 mt-1">{errors.terms}</p>}

      {errors.general && (
        <div className="rounded-md bg-red-50 p-3 border border-red-300">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin h-5 w-5" />
        ) : (
          'Buat akun'
        )}
      </button>

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Catatan:</span><br />
          Sandi yang kamu pakai di Burungnesia/Kupunesia mungkin berbeda dengan Amaturalist, begitu juga username.
        </p>
      </div>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-[#1a73e8] hover:text-[#0d47a1] font-medium"
        >
          ← Kembali ke pilihan registrasi
        </button>
      </div>
    </form>
  );
};
const RegisterKupunesia = ({ onClose, onBack }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    kupunesia_email: '',
    uname: '',
    password: '',
    phone: '',  // Hidden field - not required
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return ['Password minimal harus 6 karakter'];
    }
    return [];
  };

  const verifyKupunesiaEmailHandler = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailVerificationStatus(null);
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const result = await verifyKupunesiaEmail(email);
      if (result.success) {
        setEmailVerificationStatus(result.exists ? 'valid' : 'invalid');
      } else {
        setEmailVerificationStatus(null);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setEmailVerificationStatus(null);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    if (name === 'password') {
      const passwordErrors = validatePassword(value);
      if (passwordErrors.length > 0) {
        setErrors(prev => ({ ...prev, password: passwordErrors }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    }
    if (name === 'kupunesia_email') {
      setTimeout(() => verifyKupunesiaEmailHandler(value), 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    let validationErrors = {};
    
    if (!agreedToTerms) {
      validationErrors.terms = 'Anda harus menyetujui Term & Condition';
      toast.error('Silakan setujui Term & Condition terlebih dahulu');
      setIsSubmitting(false);
      setErrors(validationErrors);
      return;
    }
    
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      validationErrors.password = passwordErrors;
      toast.error('Password minimal harus 6 karakter');
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fname: '',
          lname: '',
          email: formData.kupunesia_email,
          organization: '',
          burungnesia_email: '',
        }),
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${rawText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          Object.values(data.errors).forEach(error => {
            toast.error(error);
          });
        } else if (data.error) {
          switch (data.error) {
            case 'EMAIL_EXISTS':
              setErrors({ kupunesia_email: 'Email sudah terdaftar' });
              toast.error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
              break;
            case 'USERNAME_EXISTS':
              setErrors({ uname: 'Username sudah digunakan' });
              toast.error('Username sudah digunakan. Silakan pilih username lain.');
              break;
            default:
              let errorMessage = data.error || data.message || 'Terjadi kesalahan saat mendaftar';
              if (response.status === 500) {
                errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
              } else if (response.status === 503) {
                errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
              } else if (response.status === 429) {
                errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
              } else if (response.status >= 400 && response.status < 500) {
                errorMessage = data.message || 'Data yang Anda masukkan tidak valid. Silakan periksa kembali.';
              }
              setErrors({ general: errorMessage });
              toast.error(errorMessage);
          }
        } else {
          let errorMessage = 'Terjadi kesalahan saat mendaftar';
          if (response.status === 500) {
            errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
          } else if (response.status === 503) {
            errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
          } else if (response.status === 429) {
            errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
          }
          setErrors({ general: errorMessage });
          toast.error(errorMessage);
        }
        return;
      }

      const successMsg = `Pendaftaran berhasil! Silakan cek email Anda di ${formData.kupunesia_email} untuk verifikasi akun.`;
      
      setSuccessMessage(successMsg);
      toast.success('Pendaftaran berhasil!');

    } catch (err) {
      console.error('Error during registration:', err);
      let errorMsg = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (err.message && err.message.includes('NetworkError')) {
        errorMsg = 'Terjadi kesalahan jaringan. Silakan coba lagi.';
      } else if (err.message && err.message.includes('timeout')) {
        errorMsg = 'Permintaan timeout. Silakan coba lagi.';
      }
      
      setErrors({
        general: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (successMessage) {
    return (
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Registrasi berhasil!
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            Kami mengirimkan pesan verifikasi ke email<br />
            <span className="font-semibold text-gray-900">{formData.kupunesia_email}</span>. Segera lakukan verifikasi<br />
            untuk bisa login ke Amaturalist! Periksa<br />
            folder spam jika pesan tidak ditemukan di<br />
            inbox utama.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = `mailto:${formData.kupunesia_email}`;
          }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] transition-colors"
        >
          Periksa email sekarang!
        </button>

        <p className="text-xs text-gray-500">
          Tidak menerima email?{' '}
          <button
            type="button"
            onClick={() => {
              toast.info('Fitur kirim ulang email akan segera hadir');
            }}
            className="text-[#1a73e8] hover:underline"
          >
            Kirim ulang
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Kamu sedang registrasi menggunakan<br />
          <span className="font-semibold">akun Kupunesia</span>
        </p>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <img 
              src={kupunesiaSvg} 
              alt="Kupunesia" 
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="kupunesia_email" className="block text-xs font-medium text-gray-700 mb-1">
            Masukkan email kredensial Kupunesia kamu<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="kupunesia_email"
              type="email"
              name="kupunesia_email"
              value={formData.kupunesia_email}
              onChange={handleChange}
              required
              placeholder="email@kupunesia.org"
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
            />
            {isVerifyingEmail && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {!isVerifyingEmail && emailVerificationStatus === 'valid' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {!isVerifyingEmail && emailVerificationStatus === 'invalid' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>
          {emailVerificationStatus === 'invalid' && (
            <p className="mt-1 text-xs text-yellow-600">Email tidak ditemukan di database Kupunesia. Pastikan email sudah terdaftar di Aplikasi Kupunesia</p>
          )}
          {emailVerificationStatus === 'valid' && (
            <p className="mt-1 text-xs text-green-600">Email terverifikasi di database Kupunesia</p>
          )}
          {errors.kupunesia_email && <p className="mt-1 text-xs text-red-600">{errors.kupunesia_email}</p>}
        </div>

        <div>
          <label htmlFor="uname" className="block text-xs font-medium text-gray-700 mb-1">
            Buat username baru Amaturalist<span className="text-red-500">*</span>
          </label>
          <input
            id="uname"
            type="text"
            name="uname"
            value={formData.uname}
            onChange={handleChange}
            required
            placeholder="username"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.uname && <p className="mt-1 text-xs text-red-600">{errors.uname}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Masukkan sandi (tidak harus sama dengan Burungnesia/Kupunesia)<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm pr-10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && Array.isArray(errors.password) && (
            <div className="mt-1 text-xs text-amber-700">
              <ul className="list-disc pl-4">
                {errors.password.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden">
          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
            No telepon (tidak harus sama dengan yang kamu daftarkan di Burungnesia/Kupunesia)<span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            maxLength="14"
            placeholder="081234567890"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>

      <div className="flex items-start mt-4">
        <input
          id="terms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 h-4 w-4 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]"
        />
        <label htmlFor="terms" className="ml-2 text-xs text-gray-700">
          Saya sudah membaca dan menyetujui{' '}
          <a href="/terms" target="_blank" className="text-[#1a73e8] hover:underline">
            Term & Condition
          </a>
        </label>
      </div>
      {errors.terms && <p className="text-xs text-red-600 mt-1">{errors.terms}</p>}

      {errors.general && (
        <div className="rounded-md bg-red-50 p-3 border border-red-300">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin h-5 w-5" />
        ) : (
          'Buat akun'
        )}
      </button>

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Catatan:</span><br />
          Sandi yang kamu pakai di Burungnesia/Kupunesia mungkin berbeda dengan Amaturalist, begitu juga username.
        </p>
      </div>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-[#1a73e8] hover:text-[#0d47a1] font-medium"
        >
          ← Kembali ke pilihan registrasi
        </button>
      </div>
    </form>
  );
};
const RegisterTab = ({ onClose, onSwitchToLogin, onSelectBurungnesia, onSelectKupunesia }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    uname: '',
    password: '',
    phone: '',  // Hidden field - not required
    organization: '',
    burungnesia_email: '',
    kupunesia_email: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0 || isResendingEmail) return;
    
    setIsResendingEmail(true);
    try {
      const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
        ? 'https://amaturalist.com/api'
        : 'http://localhost:8000/api';
        
      const response = await fetch(`${baseURL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
        setResendCooldown(60); // 60 detik cooldown
      } else {
        toast.error(data.message || 'Gagal mengirim ulang email verifikasi');
      }
    } catch (err) {
      console.error('Error resending verification email:', err);
      toast.error('Terjadi kesalahan saat mengirim ulang email verifikasi');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return ['Password minimal harus 6 karakter'];
    }
    return [];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    if (name === 'password') {
      const passwordErrors = validatePassword(value);
      if (passwordErrors.length > 0) {
        setErrors(prev => ({ ...prev, password: passwordErrors }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    let validationErrors = {};
    if (!agreedToTerms) {
      validationErrors.terms = 'Anda harus menyetujui Term & Condition';
      toast.error('Silakan setujui Term & Condition terlebih dahulu');
      setIsSubmitting(false);
      setErrors(validationErrors);
      return;
    }
    
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      validationErrors.password = passwordErrors;
      toast.error('Password minimal harus 6 karakter');
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(formData),
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${rawText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          Object.values(data.errors).forEach(error => {
            toast.error(error);
          });
        } else if (data.error) {
          switch (data.error) {
            case 'EMAIL_EXISTS':
              setErrors({ email: 'Email sudah terdaftar' });
              toast.error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
              break;
            case 'USERNAME_EXISTS':
              setErrors({ uname: 'Username sudah digunakan' });
              toast.error('Username sudah digunakan. Silakan pilih username lain.');
              break;
            default:
              let errorMessage = data.error || data.message || 'Terjadi kesalahan saat mendaftar';
              if (response.status === 500) {
                errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
              } else if (response.status === 503) {
                errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
              } else if (response.status === 429) {
                errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
              } else if (response.status >= 400 && response.status < 500) {
                errorMessage = data.message || 'Data yang Anda masukkan tidak valid. Silakan periksa kembali.';
              }
              setErrors({ general: errorMessage });
              toast.error(errorMessage);
          }
        } else {
          let errorMessage = 'Terjadi kesalahan saat mendaftar';
          if (response.status === 500) {
            errorMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
          } else if (response.status === 503) {
            errorMessage = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
          } else if (response.status === 429) {
            errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
          }
          setErrors({ general: errorMessage });
          toast.error(errorMessage);
        }
        return;
      }

      const successMsg = `Pendaftaran berhasil! Silakan cek email Anda di ${formData.email} untuk verifikasi akun.`;
      
      setSuccessMessage(successMsg);
      toast.success('Pendaftaran berhasil!');

    } catch (err) {
      console.error('Error during registration:', err);
      let errorMsg = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (err.message && err.message.includes('NetworkError')) {
        errorMsg = 'Terjadi kesalahan jaringan. Silakan coba lagi.';
      } else if (err.message && err.message.includes('timeout')) {
        errorMsg = 'Permintaan timeout. Silakan coba lagi.';
      }
      
      setErrors({
        general: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (successMessage) {
    return (
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Registrasi berhasil!
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            Kami mengirimkan pesan verifikasi ke email<br />
            <span className="font-semibold text-gray-900">{formData.email}</span>. Segera lakukan verifikasi<br />
            untuk bisa login ke Amaturalist! Periksa<br />
            folder spam jika pesan tidak ditemukan di<br />
            inbox utama.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = `mailto:${formData.email}`;
          }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] transition-colors"
        >
          Periksa email sekarang!
        </button>

        <p className="text-xs text-gray-500">
          Tidak menerima email?{' '}
          <button
            type="button"
            onClick={handleResendVerificationEmail}
            disabled={isResendingEmail || resendCooldown > 0}
            className="text-[#1a73e8] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResendingEmail ? (
              'Mengirim...'
            ) : resendCooldown > 0 ? (
              `Kirim ulang (${resendCooldown}s)`
            ) : (
              'Kirim ulang'
            )}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Header Section */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">
          Silahkan <span className="font-bold">registrasi</span> menggunakan
        </p>
      </div>

      {/* Burungnesia & Kupunesia Options with Divider */}
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          className="flex-1 flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-[#1a73e8] hover:bg-blue-50 transition-all"
          onClick={onSelectBurungnesia}
        >
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            <img 
              src={burungnesiaSvg} 
              alt="Burungnesia" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs text-gray-700 font-medium">Akun Burungnesia</span>
        </button>

        {/* Divider - Between Icons */}
        <div className="flex flex-col items-center">
          <span className="my-2 text-xs text-gray-500">atau</span>
        </div>

        <button
          type="button"
          className="flex-1 flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-[#1a73e8] hover:bg-blue-50 transition-all"
          onClick={onSelectKupunesia}
        >
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            <img 
              src={kupunesiaSvg} 
              alt="Kupunesia" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs text-gray-700 font-medium">Akun Kupunesia</span>
        </button>
      </div>

      {/* Small text below icons */}
      <p className="text-xs text-center text-gray-500 mb-6">
        Sangat disarankan untuk pengguna Burungnesia atau Kupunesia. Semua catatan akan tersinkronisasi dan lebih mudah dikelola.
      </p>

      {/* Divider - Horizontal */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
      </div>

      {/* Email Registration Section */}
      <div className="text-center mb-4">
        <h3 className="text-sm text-gray-800 mt-8">Atau e-mail</h3>
        <p className="text-xs text-gray-500">Disarankan untuk pengguna baru</p>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
            Alamat email<span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Masukkan alamat email"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="uname" className="block text-xs font-medium text-gray-700 mb-1">
            Username<span className="text-red-500">*</span>
          </label>
          <input
            id="uname"
            type="text"
            name="uname"
            value={formData.uname}
            onChange={handleChange}
            required
            placeholder="Masukkan username"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.uname && <p className="mt-1 text-xs text-red-600">{errors.uname}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Masukkan password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm pr-10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && Array.isArray(errors.password) && (
            <div className="mt-1 text-xs text-amber-700">
              <ul className="list-disc pl-4">
                {errors.password.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden">
          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
            No telepon<span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            
            maxLength="14"
            placeholder="Masukkan nomor telepon"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] hover:border-gray-400 bg-white text-gray-900 placeholder-gray-400 text-sm transition-colors"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="flex items-start mt-4">
        <input
          id="terms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 h-4 w-4 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]"
        />
        <label htmlFor="terms" className="ml-2 text-xs text-gray-700">
          Saya sudah membaca dan menyetujui{' '}
          <a href="/terms" target="_blank" className="text-[#1a73e8] hover:underline">
            Term & Condition
          </a>
        </label>
      </div>
      {errors.terms && <p className="text-xs text-red-600 mt-1">{errors.terms}</p>}

      {errors.general && (
        <div className="rounded-md bg-red-50 p-3 border border-red-300">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#0d47a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin h-5 w-5" />
        ) : (
          'Buat akun'
        )}
      </button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Sudah punya akun? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#1a73e8] hover:text-[#0d47a1] font-medium"
        >
          Masuk di sini
        </button>
      </div>
    </form>
  );
};
const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [registerMode, setRegisterMode] = useState('default'); // 'default', 'burungnesia', 'kupunesia'
  const [authMedia, setAuthMedia] = useState({
    login: { url: null, photographer: null },
    register: { url: null, photographer: null }
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
    setRegisterMode('default');
  }, [initialTab]);
  useEffect(() => {
    const fetchAuthMedia = async () => {
      try {
        setIsLoadingMedia(true);
        const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
          ? 'https://amaturalist.com/api'
          : 'http://localhost:8000/api';
        
        const response = await fetch(`${baseURL}/auth-media`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAuthMedia({
              login: { 
                url: data.data.login?.media_url || null,
                photographer: data.data.login?.photographer_name || null
              },
              register: { 
                url: data.data.register?.media_url || null,
                photographer: data.data.register?.photographer_name || null
              }
            });
          } else {
            setAuthMedia({
              login: { url: null, photographer: null },
              register: { url: null, photographer: null }
            });
          }
        } else {
          setAuthMedia({
            login: { url: null, photographer: null },
            register: { url: null, photographer: null }
          });
        }
      } catch (error) {
        console.error('Error fetching auth media:', error);
        setAuthMedia({
          login: { url: null, photographer: null },
          register: { url: null, photographer: null }
        });
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchAuthMedia();
  }, []);
  const currentMedia = activeTab === 'login' ? authMedia.login : authMedia.register;
  const currentImage = currentMedia?.url;
  const currentPhotographer = currentMedia?.photographer;

  const handleSelectBurungnesia = () => {
    setRegisterMode('burungnesia');
  };

  const handleSelectKupunesia = () => {
    setRegisterMode('kupunesia');
  };

  const handleBackToDefault = () => {
    setRegisterMode('default');
  };

  const renderContent = () => {
    if (activeTab === 'login') {
      return (
        <LoginTab 
          onClose={onClose} 
          onSwitchToRegister={() => setActiveTab('register')}
        />
      );
    }
    if (registerMode === 'burungnesia') {
      return (
        <RegisterBurungnesia 
          onClose={onClose} 
          onBack={handleBackToDefault}
        />
      );
    }

    if (registerMode === 'kupunesia') {
      return (
        <RegisterKupunesia 
          onClose={onClose} 
          onBack={handleBackToDefault}
        />
      );
    }
    return (
      <RegisterTab 
        onClose={onClose} 
        onSwitchToLogin={() => setActiveTab('login')}
        onSelectBurungnesia={handleSelectBurungnesia}
        onSelectKupunesia={handleSelectKupunesia}
      />
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <div className="flex flex-col md:flex-row min-h-[700px] max-h-[90vh]">
                  {/* Left Side - Image */}
                  <div className="hidden md:block md:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                    {!isLoadingMedia && currentImage && (
                      <img 
                        key={currentImage} 
                        src={currentImage}
                        alt={activeTab === 'login' ? 'Login' : 'Register'}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image load error:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {isLoadingMedia && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p>Memuat media...</p>
                        </div>
                      </div>
                    )}
                    {/* Overlay untuk meningkatkan keterbacaan */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>
                    
                    {/* Photographer Name - Bottom Left */}
                    {!isLoadingMedia && currentImage && currentPhotographer && (
                      <div className="absolute bottom-4 left-4 z-10">
                        <p className="text-white text-sm font-medium drop-shadow-lg bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <span className="opacity-80">Foto oleh</span> {currentPhotographer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Form */}
                  <div className="w-full md:w-1/2 p-8 overflow-y-auto relative">
                    {/* Close Button - Positioned Absolute */}
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    >
                      <X className="h-6 w-6" />
                    </button>

                    {/* Header - Centered */}
                    <div className="mb-4">
                      {activeTab === 'register' && registerMode === 'default' ? (
                        <div className="flex flex-col items-center">
                          <img 
                            src={amaturalistLogo} 
                            alt="Amaturalist Logo" 
                            className="h-14 mb-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : activeTab === 'login' ? (
                        <div className="flex flex-col items-center">
                          <img 
                            src={amaturalistLogo} 
                            alt="Amaturalist Logo" 
                            className="h-14 mb-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <p className="text-sm text-gray-600">
                            Selamat Datang!
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Tab Content */}
                    {renderContent()}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AuthModal;
