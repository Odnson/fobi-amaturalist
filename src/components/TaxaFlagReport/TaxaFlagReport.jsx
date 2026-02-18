import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Box,
    Typography,
    Chip,
    CircularProgress
} from '@mui/material';
import { Flag, Send, Close } from '@mui/icons-material';
import axios from 'axios';

const TaxaFlagReport = ({ 
    open, 
    onClose, 
    taxaId, 
    taxaName, 
    commonName = null,
    flagType = null, // Default flag type
    apiBaseUrl = null // Will be determined from environment
}) => {
    const getApiBaseUrl = () => {
        if (apiBaseUrl) return apiBaseUrl; // Use provided URL if available
        
        const env = import.meta.env.VITE_APP_ENV || 'development';
        
        if (env === 'production') {
            return import.meta.env.VITE_API_URL || 'https://api.amaturalist.com/api';
        } else {
            return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        }
    };
    
    const API_BASE_URL = getApiBaseUrl();
    const [flagTypes, setFlagTypes] = useState({});
    const [formData, setFormData] = useState({
        taxa_id: taxaId,
        taxa_name: taxaName, // Include taxa_name for missing taxa
        flag_type: flagType || '', // Use provided flag type or empty
        reason: '',
        suggested_correction: '',
        user_name: '',
        user_email: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    useEffect(() => {
        const tokenSources = {
            'localStorage.token': localStorage.getItem('token'),
            'localStorage.jwt_token': localStorage.getItem('jwt_token'),
            'localStorage.auth_token': localStorage.getItem('auth_token'),
            'sessionStorage.token': sessionStorage.getItem('token')
        };
        
        const token = tokenSources['localStorage.token'] || 
                     tokenSources['localStorage.jwt_token'] || 
                     tokenSources['localStorage.auth_token'] ||
                     tokenSources['sessionStorage.token'];
        
        console.log('TaxaFlagReport - Token sources:', tokenSources);
        console.log('TaxaFlagReport - Selected token:', token ? 'Found' : 'Not found');
        console.log('TaxaFlagReport - Authentication status:', !!token);
        
        setIsAuthenticated(!!token);
    }, []);
    useEffect(() => {
        if (open) {
            loadFlagTypes();
        }
    }, [open]);
    useEffect(() => {
        setFormData(prev => ({ 
            ...prev, 
            taxa_id: taxaId,
            taxa_name: taxaName,
            flag_type: flagType || prev.flag_type
        }));
    }, [taxaId, taxaName, flagType]);

    const loadFlagTypes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/taxa-flags/types`);
            if (response.data.success) {
                setFlagTypes(response.data.data);
            }
        } catch (error) {
            console.error('Error loading flag types:', error);
            showAlert('error', 'Gagal memuat jenis laporan');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => {
            setAlert({ show: false, type: 'info', message: '' });
        }, 5000);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.flag_type) {
            showAlert('error', 'Silakan pilih jenis laporan');
            return false;
        }
        if (!formData.reason.trim()) {
            showAlert('error', 'Silakan masukkan alasan laporan');
            return false;
        }
        if (formData.reason.trim().length < 10) {
            showAlert('error', 'Alasan laporan minimal 10 karakter');
            return false;
        }
        if (!isAuthenticated) {
            if (!formData.user_name.trim()) {
                showAlert('error', 'Silakan masukkan nama Anda');
                return false;
            }
            if (!formData.user_email.trim()) {
                showAlert('error', 'Silakan masukkan email Anda');
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.user_email)) {
                showAlert('error', 'Format email tidak valid');
                return false;
            }
        }
        
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            
            const submitData = {
                taxa_id: formData.taxa_id,
                taxa_name: formData.taxa_name, // Include taxa_name for missing taxa reports
                flag_type: formData.flag_type,
                reason: formData.reason.trim(),
                suggested_correction: formData.suggested_correction.trim() || null
            };
            if (!isAuthenticated) {
                submitData.user_name = formData.user_name.trim();
                submitData.user_email = formData.user_email.trim();
            }

            const config = {};
            if (isAuthenticated) {
                const token = localStorage.getItem('token') || 
                             localStorage.getItem('jwt_token') || 
                             localStorage.getItem('auth_token') ||
                             sessionStorage.getItem('token');
                if (token) {
                    config.headers = {
                        'Authorization': `Bearer ${token}`
                    };
                }
            }

            const response = await axios.post(`${API_BASE_URL}/taxa-flags`, submitData, config);

            if (response.data.success) {
                showAlert('success', response.data.message);
                setFormData({
                    taxa_id: taxaId,
                    taxa_name: taxaName,
                    flag_type: flagType || '',
                    reason: '',
                    suggested_correction: '',
                    user_name: '',
                    user_email: ''
                });
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                showAlert('error', response.data.message || 'Gagal mengirim laporan');
            }
        } catch (error) {
            console.error('Error submitting flag:', error);
            
            if (error.response?.data?.errors) {
                const errors = Object.values(error.response.data.errors).flat();
                showAlert('error', errors.join(', '));
            } else if (error.response?.data?.message) {
                showAlert('error', error.response.data.message);
            } else {
                showAlert('error', 'Terjadi kesalahan saat mengirim laporan');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { 
                    borderRadius: 2,
                    backgroundColor: '#1e1e1e',
                    color: '#e5e7eb',
                    border: '1px solid #444'
                }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                borderBottom: 1,
                borderColor: '#444',
                pb: 2,
                backgroundColor: '#1e1e1e',
                color: '#e5e7eb'
            }}>
                <Flag color="warning" />
                <Box>
                    <Typography variant="h6">
                        Laporkan Masalah Penamaan Taksa
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        {taxaName}
                        {commonName && (
                            <Chip 
                                label={commonName} 
                                size="small" 
                                sx={{ 
                                    ml: 1,
                                    backgroundColor: '#374151',
                                    color: '#e5e7eb',
                                    borderColor: '#6b7280'
                                }}
                                variant="outlined"
                            />
                        )}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ 
                pt: 3, 
                backgroundColor: '#1e1e1e',
                color: '#e5e7eb'
            }}>
                {alert.show && (
                    <Alert 
                        severity={alert.type} 
                        sx={{ 
                            mb: 2,
                            backgroundColor: alert.type === 'error' ? '#7f1d1d' : '#065f46',
                            color: '#e5e7eb',
                            '& .MuiAlert-icon': {
                                color: '#e5e7eb'
                            }
                        }}
                        onClose={() => setAlert({ show: false, type: '', message: '' })}
                    >
                        {alert.message}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Flag Type Selection */}
                        <FormControl fullWidth required>
                            <InputLabel sx={{ color: '#9ca3af' }}>Jenis Masalah</InputLabel>
                            <Select
                                value={formData.flag_type}
                                label="Jenis Masalah"
                                onChange={(e) => handleInputChange('flag_type', e.target.value)}
                                disabled={submitting}
                                sx={{
                                    backgroundColor: '#374151',
                                    color: '#e5e7eb',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#6b7280'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#9ca3af'
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: '#e5e7eb'
                                    }
                                }}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            backgroundColor: '#374151',
                                            color: '#e5e7eb'
                                        }
                                    }
                                }}
                            >
                                {Object.entries(flagTypes).map(([key, display]) => (
                                    <MenuItem 
                                        key={key} 
                                        value={key}
                                        sx={{
                                            backgroundColor: '#374151',
                                            color: '#e5e7eb',
                                            '&:hover': {
                                                backgroundColor: '#4b5563'
                                            }
                                        }}
                                    >
                                        {display}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Reason */}
                        <TextField
                            label="Alasan Laporan"
                            multiline
                            rows={4}
                            fullWidth
                            required
                            value={formData.reason}
                            onChange={(e) => handleInputChange('reason', e.target.value)}
                            placeholder="Jelaskan masalah yang Anda temukan dengan detail..."
                            disabled={submitting}
                            helperText={`${formData.reason.length}/2000 karakter (minimal 10)`}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    color: '#9ca3af'
                                },
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#374151',
                                    color: '#e5e7eb',
                                    '& fieldset': {
                                        borderColor: '#6b7280'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#9ca3af'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiFormHelperText-root': {
                                    color: '#9ca3af'
                                }
                            }}
                        />

                        {/* Suggested Correction */}
                        <TextField
                            label="Saran Perbaikan (Opsional)"
                            multiline
                            rows={3}
                            fullWidth
                            value={formData.suggested_correction}
                            onChange={(e) => handleInputChange('suggested_correction', e.target.value)}
                            placeholder="Jika Anda memiliki saran perbaikan, silakan tulis di sini..."
                            disabled={submitting}
                            helperText={`${formData.suggested_correction.length}/1000 karakter`}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    color: '#9ca3af'
                                },
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#374151',
                                    color: '#e5e7eb',
                                    '& fieldset': {
                                        borderColor: '#6b7280'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#9ca3af'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiFormHelperText-root': {
                                    color: '#9ca3af'
                                }
                            }}
                        />

                        {/* Anonymous User Fields */}
                        {!isAuthenticated && (
                            <Box sx={{ 
                                p: 3, 
                                backgroundColor: '#374151', 
                                borderRadius: 2,
                                border: 1,
                                borderColor: '#6b7280'
                            }}>
                                <Typography variant="subtitle1" gutterBottom sx={{ 
                                    color: '#f59e0b',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    📝 Informasi Pelapor (Laporan Anonim)
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                                    Silakan isi informasi kontak Anda untuk laporan anonim
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label="Nama Anda *"
                                        fullWidth
                                        required
                                        value={formData.user_name}
                                        onChange={(e) => handleInputChange('user_name', e.target.value)}
                                        disabled={submitting}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiInputLabel-root': {
                                                color: '#9ca3af'
                                            },
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#1e1e1e',
                                                color: '#e5e7eb',
                                                '& fieldset': {
                                                    borderColor: '#6b7280'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#9ca3af'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#3b82f6'
                                                }
                                            }
                                        }}
                                    />
                                    <TextField
                                        label="Email Anda *"
                                        type="email"
                                        fullWidth
                                        required
                                        value={formData.user_email}
                                        onChange={(e) => handleInputChange('user_email', e.target.value)}
                                        disabled={submitting}
                                        variant="outlined"
                                        helperText="Email tidak akan dipublikasikan dan hanya digunakan untuk komunikasi terkait laporan ini"
                                        sx={{
                                            '& .MuiInputLabel-root': {
                                                color: '#9ca3af'
                                            },
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#1e1e1e',
                                                color: '#e5e7eb',
                                                '& fieldset': {
                                                    borderColor: '#6b7280'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#9ca3af'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#3b82f6'
                                                }
                                            },
                                            '& .MuiFormHelperText-root': {
                                                color: '#9ca3af'
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {/* User Status Info */}
                        <Box sx={{ 
                            p: 2, 
                            backgroundColor: isAuthenticated ? '#065f46' : '#92400e', 
                            borderRadius: 1,
                            border: 1,
                            borderColor: isAuthenticated ? '#10b981' : '#f59e0b',
                            display: 'none'
                        }}>
                            <Typography variant="body2" sx={{ 
                                color: isAuthenticated ? '#10b981' : '#f59e0b',
                                fontWeight: 500
                            }}>
                                {isAuthenticated ? (
                                    <>
                                        ✅ Anda login sebagai pengguna terdaftar. 
                                        Laporan akan dikaitkan dengan akun Anda untuk tracking yang lebih baik.
                                    </>
                                ) : (
                                    <>
                                        ⚠️ Anda melaporkan sebagai pengguna anonim. 
                                        Silakan isi informasi kontak di bawah atau 
                                        <strong> login untuk tracking laporan yang lebih baik</strong>.
                                        <br/><br/>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => window.location.reload()}
                                            sx={{ 
                                                mt: 1,
                                                color: '#f59e0b',
                                                borderColor: '#f59e0b',
                                                '&:hover': {
                                                    borderColor: '#d97706',
                                                    backgroundColor: 'rgba(245, 158, 11, 0.1)'
                                                }
                                            }}
                                        >
                                            Refresh Status Login
                                        </Button>
                                        <br/><small style={{opacity: 0.7, fontSize: '11px'}}>
                                            Debug: Periksa console browser untuk detail token
                                        </small>
                                    </>
                                )}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ 
                p: 3, 
                borderTop: 1, 
                borderColor: '#444',
                backgroundColor: '#1e1e1e'
            }}>
                <Button 
                    onClick={handleClose}
                    disabled={submitting}
                    startIcon={<Close />}
                    sx={{
                        color: '#9ca3af',
                        '&:hover': {
                            backgroundColor: '#374151'
                        }
                    }}
                >
                    Batal
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || submitting}
                    startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
                    sx={{
                        backgroundColor: '#f59e0b',
                        color: '#1e1e1e',
                        '&:hover': {
                            backgroundColor: '#d97706'
                        },
                        '&:disabled': {
                            backgroundColor: '#6b7280',
                            color: '#9ca3af'
                        }
                    }}
                >
                    {submitting ? 'Mengirim...' : 'Kirim Laporan'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaxaFlagReport;
