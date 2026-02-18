import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import MediaCard from './MediaCard';
import BulkEditModal from './BulkEditModal';
import ImageCropModal from './ImageCropModal';
import TaxaFlagReport from './TaxaFlagReport/TaxaFlagReport';
import SynonymFallbackModal from './SynonymFallbackModal';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPencil, faUpload, faObjectGroup, faCheckCircle, faCrop } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import exifr from 'exifr';
import { v4 as uuidv4 } from 'uuid';

// License options for observation/media
const LICENSE_OPTIONS = [
    'CC BY',
    'CC BY-SA',
    'CC BY-NC',
    'CC BY-NC-SA',
    'CC0',
    'All Rights Reserved'
];

function MediaUpload() {
    const [observations, setObservations] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [locationName, setLocationName] = useState('');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        tujuan_pengamatan: 1,
        observer: '',
        scientific_name: '',
        date: '',
        latitude: '',
        longitude: '',
        locationName: '',
        habitat: '',
        description: '',
        type_sound: '',
        kingdom: '',
        phylum: '',
        class: '',
        order: '',
        family: '',
        genus: '',
        species: '',
        common_name: '',
        taxon_rank: ''
    });
    const [bulkFormData, setBulkFormData] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [qualityAssessments, setQualityAssessments] = useState({});
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadSessionId, setUploadSessionId] = useState(null);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [combinedObservations, setCombinedObservations] = useState([]);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [showCombineConfirm, setShowCombineConfirm] = useState(false);
    const [showFloatingDropZone, setShowFloatingDropZone] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [currentCropImage, setCurrentCropImage] = useState(null);
    const [cropImageUrl, setCropImageUrl] = useState('');
    const [cropFileIndex, setCropFileIndex] = useState(null);
    const [cropObservationId, setCropObservationId] = useState(null);
    const [showTaxaErrorModal, setShowTaxaErrorModal] = useState(false);
    const [taxaErrorDetails, setTaxaErrorDetails] = useState(null);
    const [showTaxaFlagModal, setShowTaxaFlagModal] = useState(false);
    const [taxaToFlag, setTaxaToFlag] = useState(null);
    const [showSynonymFallbackModal, setShowSynonymFallbackModal] = useState(false);
    const [synonymFallbackData, setSynonymFallbackData] = useState([]);
    const [flagTaxaData, setFlagTaxaData] = useState(null);

    const { user, setUser, updateTotalObservations } = useUser();
    // Per-upload observation license (applied to all items unless overridden per item)
    const [uploadObservationLicense, setUploadObservationLicense] = useState('CC BY-NC');
    const navigate = useNavigate();

    // Update license defaults when user data is available or from localStorage
    useEffect(() => {
        const licenseFromUser = user?.license_observation;
        const licenseFromStorage = localStorage.getItem('license_observation');
        
        if (licenseFromUser) {
            setUploadObservationLicense(licenseFromUser);
        } else if (licenseFromStorage) {
            setUploadObservationLicense(licenseFromStorage);
        }
    }, [user]);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const storedUser = {
            id: localStorage.getItem('user_id'),
            uname: localStorage.getItem('username'),
            totalObservations: localStorage.getItem('totalObservations'),
        };

        if (!token || !storedUser.id) {
            navigate('/login', { replace: true });
            return;
        }

        if (!user) {
            setUser(storedUser);
        }
    }, []);

    useEffect(() => {
        const initializeUploadSession = async () => {
            try {
                const response = await apiFetch('/generate-upload-session', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUploadSessionId(data.upload_session_id);
                    localStorage.setItem('currentUploadSession', data.upload_session_id);
                }
            } catch (error) {
                console.error('Error initializing upload session:', error);
                setError('Gagal membuat sesi upload');
            }
        };

        // Cek session yang ada atau buat baru
        const savedSession = localStorage.getItem('currentUploadSession');
        if (savedSession) {
            setUploadSessionId(savedSession);
        } else {
            initializeUploadSession();
        }

        return () => {
            localStorage.removeItem('currentUploadSession');
        };
    }, []);

    const extractExifData = async (file) => {
        try {
            if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')) {
                // Gunakan opsi yang lebih spesifik untuk GPS
                const exifData = await exifr.parse(file, {
                    pick: [
                        'DateTimeOriginal',
                        'GPSLatitude',
                        'GPSLongitude',
                        'GPSLatitudeRef',
                        'GPSLongitudeRef',
                        'Make',
                        'Model',
                        'Software'
                    ],
                    gps: true // Aktifkan parsing GPS
                });

                // Validasi data GPS
                const hasValidGPS = exifData?.latitude && exifData?.longitude &&
                                  !isNaN(exifData.latitude) && !isNaN(exifData.longitude);

                let locationName = '';
                if (hasValidGPS) {
                    try {
                        // Gunakan Nominatim untuk reverse geocoding
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${exifData.latitude}&lon=${exifData.longitude}&format=json`,
                            {
                                headers: {
                    'Accept-Language': 'id'
                                }
                            }
                        );
                        const data = await response.json();
        
        // Format location name consistently
        const address = data.address;
        const parts = [];
        
        if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
                    }
        if (address.county || address.regency) {
            parts.push(address.county || address.regency);
                }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);

        locationName = parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.warn('Error fetching location name:', error);
        locationName = `${exifData.latitude}, ${exifData.longitude}`;
    }
}
                // Validasi tanggal
                let formattedDate = '';
                if (exifData?.DateTimeOriginal) {
                    const date = new Date(exifData.DateTimeOriginal);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }

                return {
                    date: formattedDate,
                    latitude: hasValidGPS ? exifData.latitude : '',
                    longitude: hasValidGPS ? exifData.longitude : '',
                    locationName: locationName,
                    deviceInfo: {
                        make: exifData?.Make || '',
                        model: exifData?.Model || '',
                        software: exifData?.Software || ''
                    }
                };
            }
            return null;
        } catch (error) {
            console.warn('Error extracting EXIF data:', error);
            return null;
        }
    };

    const handleFiles = async (files) => {
        setLoading(true);
        setProgress(0);
        setLoadingMessage('Memproses file...');

        try {
            const newObservations = [];
            let processedFiles = 0;
            const totalFiles = Array.from(files).length;

            // Tambahkan delay kecil untuk memastikan state progress terupdate
            await new Promise(resolve => setTimeout(resolve, 100));

            for (const file of Array.from(files)) {
                // Ekstrak ekstensi file untuk deteksi yang lebih baik
                const fileName = file.name.toLowerCase();
                const fileExt = fileName.split('.').pop();
                
                // Deteksi tipe berdasarkan ekstensi dan MIME type
                const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4', 'ogg', 'opus'].includes(fileExt);
                const isWhatsAppAudio = 
                    fileName.includes('whatsapp audio') || 
                    fileName.includes('ptt-') || 
                    (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
                
                const isImage = file.type.startsWith('image/') || fileName.endsWith('.heic') || fileName.endsWith('.webp') || file.type === 'image/webp';
                const isAudio = file.type.startsWith('audio/') || isAudioExt || isWhatsAppAudio || file.type === 'audio/ogg' || file.type === 'audio/opus';

                console.log('File type detection:', {
                    name: fileName,
                    ext: fileExt,
                    mime: file.type,
                    isAudio,
                    isImage,
                    isWhatsAppAudio
                });
                
                if (isImage || isAudio) {
                    const exifData = await extractExifData(file);

                    const observation = {
                        id: uuidv4(),
                        file,
                        type: isImage ? 'image' : 'audio',
                        scientific_name: '',
                        date: exifData?.date || '',
                        latitude: exifData?.latitude || '',
                        longitude: exifData?.longitude || '',
                        locationName: exifData?.locationName || '',
                        habitat: '',
                        description: '',
                        type_sound: '',
                        kingdom: '',
                        phylum: '',
                        class: '',
                        order: '',
                        family: '',
                        genus: '',
                        species: '',
                        common_name: '',
                        taxon_rank: '',
                        deviceInfo: exifData?.deviceInfo || {},
                        spectrogramUrl: null,
                        // Initialize license fields from user defaults or localStorage
                        license_observation: uploadObservationLicense || (user && user.license_observation) || localStorage.getItem('license_observation') || 'CC BY-NC',
                        license_photo: (user && user.license_photo) || localStorage.getItem('license_photo') || 'CC BY-NC',
                        license_audio: (user && user.license_audio) || localStorage.getItem('license_audio') || 'CC BY-NC'
                    };

                    if (isAudio) {
                        const formData = new FormData();
                        formData.append('media', file);

                        try {
                            const response = await apiFetch('/observations/generate-spectrogram', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                                },
                                body: formData
                            });

                            if (response.ok) {
                                const data = await response.json();
                                observation.spectrogramUrl = data.spectrogramUrl;
                            }
                        } catch (error) {
                            console.error('Error generating spectrogram:', error);
                        }
                    }

                    newObservations.push(observation);
                }

                processedFiles++;
                const currentProgress = (processedFiles / totalFiles) * 100;
                setProgress(currentProgress);
                setLoadingMessage(`Memproses file ${processedFiles} dari ${totalFiles}...`);

                // Tambahkan delay kecil antara setiap file
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setProgress(100);
            setLoadingMessage('Selesai memproses file!');

            setObservations(prev => {
                const updatedObservations = [...prev, ...newObservations];
                const exifCount = newObservations.filter(obs => obs.date || obs.latitude).length;
                if (exifCount > 0) {
                    setTimeout(() => {
                        toast.info(`Berhasil mengekstrak metadata dari ${exifCount} file`, {
                            toastId: 'exif-success',
                        });
                    }, 0);
                }
                return updatedObservations;
            });

        } catch (error) {
            setError('Gagal memproses file');
            console.error(error);
            toast.error('Gagal memproses file', {
                toastId: 'process-error',
            });
        } finally {
            // Tambahkan delay sebelum menutup loading
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setLoadingMessage('');
            }, 500);
        }
    };

    const handleLocationSave = async (lat, lng, name) => {
        // Jika nama lokasi tidak diberikan, coba dapatkan dari reverse geocoding
        let locationName = name;
        if (!locationName) {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                    {
                        headers: {
                            'Accept-Language': 'id'
                        }
                    }
                );
                const data = await response.json();
                locationName = data.display_name;
            } catch (error) {
                console.warn('Error fetching location name:', error);
                locationName = `${lat}, ${lng}`;
            }
        }

        setObservations(prev =>
            prev.map(obs =>
                selectedCards.includes(obs.id)
                    ? { ...obs, latitude: lat, longitude: lng, locationName: locationName }
                    : obs
            )
        );
        
        // Reset selected cards setelah setting lokasi
        setSelectedCards([]);
        setIsSelectAll(false);
        
        setLocationName(locationName);
        setIsLocationModalOpen(false);
    };

    const handleBulkEdit = (data) => {
        // Periksa apakah data memiliki flag __isBulkEdit
        const isBulkEdit = data.__isBulkEdit === true;
        
        // Hapus flag __isBulkEdit dari data karena tidak perlu disimpan
        const { __isBulkEdit, ...cleanData } = data;
        
        // CRITICAL FIX: Set bulkFormData temporarily for MediaCard to apply changes
        // Add __isBulkEdit flag to ensure legitimate bulk edit application
        setBulkFormData({ ...cleanData, __isBulkEdit: true });
        
        // Update observation berdasarkan selectedCards
        setObservations(prev =>
            prev.map(obs => {
                if (!(selectedCards.includes(obs.id) || isBulkEdit)) return obs;

                // Reset taksonomi jika perlu
                const resetTax = cleanData.scientific_name ? {
                    taxon_id: '',
                    species: '',
                    subspecies: '',
                    variety: '',
                    form: '',
                    common_name: '',
                    scientific_name: '',
                    kingdom: '',
                    phylum: '',
                    class: '',
                    order: '',
                    family: '',
                    genus: '',
                    taxon_rank: '',
                    cname_kingdom: '',
                    cname_phylum: '',
                    cname_class: '',
                    cname_order: '',
                    cname_family: '',
                    cname_genus: '',
                    cname_species: '',
                } : {};

                let updated = {
                    ...obs,
                    ...resetTax,
                    ...cleanData,
                    displayName: cleanData.displayName || cleanData.species || cleanData.scientific_name || obs.displayName || '',
                    latitude: cleanData.latitude !== undefined ? cleanData.latitude : obs.latitude,
                    longitude: cleanData.longitude !== undefined ? cleanData.longitude : obs.longitude,
                    locationName: cleanData.locationName !== undefined ? cleanData.locationName : obs.locationName
                };

                // Recompute per-file license mapping for combined observations when license fields are present
                const licenseChanged = Object.prototype.hasOwnProperty.call(cleanData, 'license_photo') ||
                                       Object.prototype.hasOwnProperty.call(cleanData, 'license_audio');
                if (obs.isCombined && licenseChanged) {
                    const nextPhoto = cleanData.license_photo ?? obs.license_photo;
                    const nextAudio = cleanData.license_audio ?? obs.license_audio;

                    const audioCount = (obs.audioFiles?.length ?? 0) || (obs.files?.filter(f => f?.type?.startsWith('audio/')).length ?? 0) || 0;
                    const imageCount = (obs.imageFiles?.length ?? 0) || (obs.files?.filter(f => f?.type?.startsWith('image/')).length ?? 0) || 0;

                    const newMapping = [
                        ...Array(audioCount).fill(nextAudio || nextPhoto || 'CC BY-NC'),
                        ...Array(imageCount).fill(nextPhoto || nextAudio || 'CC BY-NC')
                    ];

                    updated = {
                        ...updated,
                        fileLicenseMapping: newMapping,
                    };
                }

                return updated;
            })
        );
        
        // Tampilkan toast untuk memberitahu pengguna bahwa operasi bulk edit berhasil
        toast.success(`${selectedCards.length} item berhasil diperbarui`, {
            position: "top-right",
            autoClose: 3000,
            theme: "colored"
        });
        
        setIsBulkEditOpen(false);
        
        // Delay cleanup to allow MediaCard components to process bulkFormData first
        // Then clear everything to prevent data leakage to subsequently selected cards
        setTimeout(() => {
            setSelectedCards([]);
            setIsSelectAll(false);
            setBulkFormData(null);
        }, 50);
    };

    const handleCardSelect = (id) => {
        setSelectedCards(prev => {
            const isAlreadySelected = prev.includes(id);
            let newSelection;
            
            if (isAlreadySelected) {
                // Jika sudah diselect, maka unselect
                newSelection = prev.filter(cardId => cardId !== id);
            } else {
                // Jika belum diselect, tambahkan ke selection
                newSelection = [...prev, id];
            }

            // Update isSelectAll
            setIsSelectAll(newSelection.length === observations.length);

            // Jika tidak ada kartu yang dipilih, reset bulkFormData
            if (newSelection.length === 0) {
                setBulkFormData(null);
                return newSelection;
            }
            
            // CRITICAL FIX: Clear bulkFormData when selection changes to prevent data leakage
            // This ensures previously bulk-edited data doesn't leak to newly selected cards
            if (newSelection.length <= 1) {
                // Clear bulkFormData when selecting single card or deselecting all
                setBulkFormData(null);
            } else {
                // Jika ada lebih dari satu kartu yang dipilih:
                // 1. Temukan field yang sama di semua kartu
                // 2. Hanya gunakan field tersebut dalam bulkFormData
                // 3. Jika nilai field berbeda, kosongkan field tersebut
                
                const selectedObservations = observations.filter(obs => newSelection.includes(obs.id));
                const newBulkFormData = {};
                
                // Daftar field yang ingin dicheck
                const fieldsToCheck = [
                    'scientific_name', 'species', 'kingdom', 'phylum', 'class', 
                    'order', 'family', 'genus', 'taxon_rank', 'displayName',
                    'habitat', 'description', 'type_sound', 'latitude', 
                    'longitude', 'locationName', 'date'
                ];
                
                // Untuk setiap field, cek apakah nilainya sama di semua kartu
                fieldsToCheck.forEach(field => {
                    // Ambil nilai field dari observasi pertama
                    const firstValue = selectedObservations[0][field];
                    
                    // Cek apakah nilai sama di semua observasi
                    const allSame = selectedObservations.every(obs => 
                        obs[field] === firstValue || 
                        // Jika kedua nilai undefined atau empty string, anggap sama
                        ((!obs[field] || obs[field] === '') && (!firstValue || firstValue === ''))
                    );
                    
                    // Jika semua sama dan tidak kosong, gunakan nilai tersebut
                    if (allSame && firstValue) {
                        newBulkFormData[field] = firstValue;
                    }
                });
                
                setBulkFormData(newBulkFormData);
            }

            return newSelection;
        });
    };

    const handleObservationUpdate = (id, data) => {
        setObservations(prev =>
            prev.map(obs =>
                obs.id === id ? { ...obs, ...data } : obs
            )
        );
        
        // Jika sudah pernah mencoba submit dan ada validasi error untuk observasi ini
        if (attemptedSubmit && validationErrors[id]) {
            // Validasi ulang observasi yang diupdate
            const updatedObs = observations.find(obs => obs.id === id);
            if (updatedObs) {
                const updatedObsWithNewData = { ...updatedObs, ...data };
                
                // Cek apakah masih ada error pada field yang diupdate
                const obsErrors = {};
                let hasError = false;
                
                // Validasi taksa
                const hasTaxaError = !(
                    updatedObsWithNewData.scientific_name === "Unknown" ||
                    updatedObsWithNewData.scientific_name?.trim() ||
                    updatedObsWithNewData.species?.trim() ||
                    updatedObsWithNewData.genus?.trim() ||
                    updatedObsWithNewData.family?.trim() ||
                    updatedObsWithNewData.order?.trim() ||
                    updatedObsWithNewData.class?.trim() ||
                    updatedObsWithNewData.kingdom?.trim()
                );
                
                if (hasTaxaError) {
                    obsErrors.taxa = true;
                    hasError = true;
                }
                
                // Validasi tanggal
                if (!updatedObsWithNewData.date) {
                    obsErrors.date = true;
                    hasError = true;
                }
                
                // Validasi lokasi
                if (!(updatedObsWithNewData.locationName || (updatedObsWithNewData.latitude && updatedObsWithNewData.longitude))) {
                    obsErrors.location = true;
                    hasError = true;
                }
                
                // Validasi tipe suara untuk audio
                if (updatedObsWithNewData.type === 'audio' && !updatedObsWithNewData.type_sound?.trim()) {
                    obsErrors.type_sound = true;
                    hasError = true;
                }
                
                // Update validationErrors
                setValidationErrors(prev => {
                    if (hasError) {
                        return { ...prev, [id]: obsErrors };
                    } else {
                        const newErrors = { ...prev };
                        delete newErrors[id];
                        return newErrors;
                    }
                });
            }
        }
    };

    const handleObservationDelete = (id) => {
        setObservations(prev => prev.filter(obs => obs.id !== id));
        setSelectedCards(prev => prev.filter(cardId => cardId !== id));
    };

    const handleConfirmSubmit = () => {
        // Tandai bahwa user telah mencoba submit
        setAttemptedSubmit(true);
        
        // Validasi semua observasi sebelum menampilkan modal konfirmasi
        const isValid = validateAllObservations();
        
        if (isValid) {
            setIsConfirmModalOpen(true);
            setShowValidationErrors(false);
        } else {
            setShowValidationErrors(true);
            
            // Scroll ke card pertama yang memiliki error
            const firstErrorId = Object.keys(validationErrors)[0];
            if (firstErrorId) {
                const errorElement = document.getElementById(`observation-${firstErrorId}`);
                if (errorElement) {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            
            toast.error('Ada field wajib yang belum diisi. Mohon lengkapi data yang ditandai.', {
                position: "top-right",
                autoClose: 5000,
                theme: "colored"
            });
        }
    };

    // Fungsi validasi taksonomi
    const validateTaxonomy = (observation) => {
        // Cek jika species sudah diisi
        if (observation.species?.trim()) {
            return; // Langsung return jika species sudah diisi
        }

        // Jika scientific_name adalah "Unknown", terima sebagai valid
        if (observation.scientific_name?.trim() === "Unknown") {
            return; // Valid untuk Unknown
        }

        // Jika species kosong, cek tingkat taksa lainnya
        const taxaLevels = ['genus', 'family', 'order', 'class', 'kingdom'];
        const hasAnyTaxa = taxaLevels.some(level => observation[level]?.trim());

        if (!hasAnyTaxa) {
            throw new Error(
                'Taksa tidak tersedia. Silakan gunakan taksa yang lebih tinggi (Genus/Family/Order/Class/Kingdom) atau gunakan "Unknown"'
            );
        }
    };

    // Fungsi validasi media
    const validateMedia = (file) => {
        const maxSize = 150 * 1024 * 1024; // 150MB
        const supportedFormats = {
            audio: ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/mp4', 'audio/x-aac', 'audio/webm'],
            photo: ['image/jpeg', 'image/png', 'image/jpg', 'image/heic']
        };

        // Validasi ukuran file
        if (file.size > maxSize) {
            throw new Error(`File ${file.name} melebihi batas maksimal 150MB`);
        }

        // Ekstrak ekstensi file
        const fileName = file.name.toLowerCase();
        const fileExt = fileName.split('.').pop();
        
        // Deteksi tipe berdasarkan ekstensi jika MIME type tidak terdeteksi dengan benar
        const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4'].includes(fileExt);
        const isPhotoExt = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExt);
        
        // Deteksi khusus untuk file WhatsApp
        const isWhatsAppAudio = 
            fileName.includes('whatsapp audio') || 
            fileName.includes('ptt-') || 
            (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
        
        // Deteksi tipe berdasarkan MIME type dan nama file
        const isAudio = file.type.startsWith('audio/') || isAudioExt || isWhatsAppAudio;
        const isPhoto = file.type.startsWith('image/') || isPhotoExt;
        
        // Penanganan khusus untuk file HEIC
        const isHeic = fileName.endsWith('.heic') || file.type === 'image/heic';
        
        // Penanganan khusus untuk file AAC
        const isAac = fileName.endsWith('.aac') || file.type === 'audio/aac' || file.type === 'audio/x-aac' || isWhatsAppAudio;
        
        // Log untuk debugging
        console.log('File validation:', {
            name: file.name,
            type: file.type,
            extension: fileExt,
            isAudio,
            isPhoto,
            isHeic,
            isAac,
            isWhatsAppAudio
        });
        
        // Jika file adalah WhatsApp Audio, selalu izinkan
        if (isWhatsAppAudio) {
            return; // File WhatsApp Audio valid
        }
        
        if (!isAudio && !isPhoto && !isHeic && !isAac) {
            throw new Error(`Format file ${file.name} tidak didukung. Hanya file foto dan audio yang diperbolehkan`);
        }
        
        // Izinkan file berdasarkan ekstensi, meskipun MIME type mungkin tidak terdeteksi
        if (isAudioExt || isPhotoExt || isHeic || isAac) {
            return; // File valid berdasarkan ekstensi
        }
        
        // Jika kita sampai di sini, cek berdasarkan MIME type
        const validFormats = isAudio ? supportedFormats.audio : supportedFormats.photo;
        
        if (!validFormats.includes(file.type)) {
            let formatInfo = '';
            if (isAudio || isAudioExt) {
                formatInfo = 'MP3/WAV/AAC/M4A';
            } else {
                formatInfo = 'JPG/PNG/HEIC';
            }
            
            throw new Error(
                `Format file ${file.name} tidak didukung. Gunakan ${formatInfo}`
            );
        }
        
        // Validasi keamanan: Periksa ekstensi file yang berbahaya
        const dangerousExtensions = ['.sh', '.exe', '.cmd', '.bat', '.php', '.js', '.pl', '.py', '.rb'];
        
        if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
            throw new Error(`File ${file.name} tidak diperbolehkan karena alasan keamanan`);
        }
    };

    // Fungsi validasi data umum
    const validateGeneralData = (observation) => {
        if (!observation.latitude || !observation.longitude) {
            throw new Error('Lokasi observasi harus ditentukan');
        }

        if (!observation.date) {
            throw new Error('Tanggal observasi harus diisi');
        }
    };

    // Validasi semua observasi sebelum submit
    const validateAllObservations = () => {
        const errors = {};
        let hasErrors = false;

        observations.forEach(observation => {
            const obsErrors = {};
            
            // Validasi taksa
            const hasTaxaError = !(
                observation.scientific_name === "Unknown" ||
                observation.scientific_name?.trim() ||
                observation.species?.trim() ||
                observation.genus?.trim() ||
                observation.family?.trim() ||
                observation.order?.trim() ||
                observation.class?.trim() ||
                observation.kingdom?.trim()
            );
            
            if (hasTaxaError) {
                obsErrors.taxa = true;
                hasErrors = true;
            }
            
            // Validasi tanggal
            if (!observation.date) {
                obsErrors.date = true;
                hasErrors = true;
            }
            
            // Validasi lokasi
            if (!(observation.locationName || (observation.latitude && observation.longitude))) {
                obsErrors.location = true;
                hasErrors = true;
            }
            
            // Validasi tipe suara untuk audio
            if (observation.type === 'audio' && !observation.type_sound?.trim()) {
                obsErrors.type_sound = true;
                hasErrors = true;
            }
            
            if (Object.keys(obsErrors).length > 0) {
                errors[observation.id] = obsErrors;
            }
        });
        
        setValidationErrors(errors);
        return !hasErrors;
    };

    const handleSubmit = async (skipValidation = false, validatedObservations = null) => {
        // Use provided observations or current observations
        const observationsToProcess = validatedObservations || observations;
        
        if (!skipValidation) {
            // Tandai bahwa user telah mencoba submit
            setAttemptedSubmit(true);
            
            // Validasi lagi untuk memastikan
            const isValid = validateAllObservations();
            if (!isValid) {
                setShowValidationErrors(true);
                toast.error('Ada field wajib yang belum diisi. Mohon lengkapi data yang ditandai.', {
                    position: "top-right",
                    autoClose: 5000,
                    theme: "colored"
                });
                return;
            }

            setLoading(true);
            setLoadingMessage('Memvalidasi taksa...');

            // Pre-submission taxa validation
            const taxaErrorObservations = [];
            
            for (const observation of observationsToProcess) {
                // Skip validation for "Unknown" taxa
                if (observation.scientific_name?.trim() === "Unknown") {
                    continue;
                }
                
                const scientificName = observation.scientific_name?.trim();
                if (scientificName) {
                    try {
                        // Check if taxa exists in database
                        const response = await apiFetch(`/taxa/validate?scientific_name=${encodeURIComponent(scientificName)}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                            }
                        });
                        
                        const validationResult = await response.json();
                        
                        if (!response.ok || !validationResult.exists) {
                            taxaErrorObservations.push({
                                observation,
                                scientificName,
                                taxonomic_status: 'NOT_FOUND',
                                synonym_fallback: validationResult.synonym_fallback || null
                            });
                        }
                    } catch (error) {
                        console.error('Taxa validation error:', error);
                        // If validation fails, assume taxa might not exist
                        taxaErrorObservations.push({
                            observation,
                            scientificName,
                            taxonomic_status: 'NOT_FOUND',
                            synonym_fallback: null
                        });
                    }
                }
            }

            // If there are taxa not found, show confirmation modal
            if (taxaErrorObservations.length > 0) {
                setTaxaErrorDetails(taxaErrorObservations);
                setShowTaxaErrorModal(true);
                setLoading(false);
                setLoadingMessage('');
                return;
            }
        }

        setLoading(true);
        setLoadingMessage('Mengunggah observasi...');

        // Track successful and failed uploads
        const uploadResults = {
            successful: [],
            failed: []
        };

        try {
            for (let i = 0; i < observationsToProcess.length; i++) {
                const observation = observationsToProcess[i];
                
                try {
                    setLoadingMessage(`Mengunggah observasi ${i + 1} dari ${observationsToProcess.length}...`);
                    
                    // Validasi dasar sebelum upload
                    // Jika scientific_name adalah "Unknown", skip validasi taksa lain
                    if (observation.scientific_name?.trim() !== "Unknown" && 
                        !observation.species?.trim() && 
                        !observation.genus?.trim() && 
                        !observation.family?.trim() && 
                        !observation.order?.trim() && 
                        !observation.class?.trim() &&
                        !observation.kingdom?.trim()) {
                        throw new Error('Mohon isi minimal satu tingkat taksa atau gunakan "Unknown"');
                    }

                    // Validasi media
                    if (observation.isCombined) {
                        observation.files.forEach(file => {
                            validateMedia(file);
                        });
                    } else {
                        validateMedia(observation.file);
                    }

                    // Validasi data wajib
                    if (!observation.date) {
                        throw new Error('Tanggal observasi harus diisi');
                    }
                    if (!observation.latitude || !observation.longitude) {
                        throw new Error('Lokasi observasi harus ditentukan');
                    }
                    if (observation.type === 'audio' && !observation.type_sound?.trim()) {
                        throw new Error('Tipe suara harus diisi untuk rekaman audio');
                    }

                    const formData = new FormData();

                    // Tambahkan data dasar
                    formData.append('upload_session_id', uploadSessionId);

                    // Handle file tunggal atau kombinasi
                    if (observation.isCombined) {
                        // Untuk observasi yang digabungkan
                        observation.files.forEach((file, index) => {
                            formData.append('media[]', file);
                        });
                        formData.append('is_combined', 'true');

                        // Tambahkan informasi tipe untuk setiap file
                        const mediaTypes = observation.files.map(file => {
                            return file.type.startsWith('audio/') ? 'audio' : 'photo';
                        });
                        formData.append('media_types', JSON.stringify(mediaTypes));

                        // Tambahkan license untuk setiap media pada kombinasi (urut sesuai media_types)
                        // Gunakan fileLicenseMapping jika tersedia, atau fallback ke license umum
                        try {
                            let mediaLicenses;
                            if (observation.fileLicenseMapping && observation.fileLicenseMapping.length === observation.files.length) {
                                // Gunakan mapping license per file yang sudah disimpan
                                mediaLicenses = observation.fileLicenseMapping;
                            } else {
                                // Fallback: gunakan license umum berdasarkan tipe file
                                mediaLicenses = observation.files.map(file => {
                                    const fileType = file.type.startsWith('audio/') ? 'audio' : 'photo';
                                    if (fileType === 'audio') {
                                        return observation.license_audio || user?.license_audio || localStorage.getItem('license_audio') || 'CC BY-NC';
                                    } else {
                                        return observation.license_photo || user?.license_photo || localStorage.getItem('license_photo') || 'CC BY-NC';
                                    }
                                });
                            }
                            formData.append('media_licenses', JSON.stringify(mediaLicenses));
                            console.log('Combined media licenses (per file):', mediaLicenses);
                            console.log('Media types (per file):', mediaTypes);
                            console.log('File license mapping available:', !!observation.fileLicenseMapping);
                        } catch (e) {
                            console.warn('Gagal menambahkan media_licenses:', e);
                        }

                        // Tambahkan spectrogram URLs jika ada
                        if (observation.spectrogramUrls && observation.spectrogramUrls.length > 0) {
                            formData.append('spectrogram_urls', JSON.stringify(observation.spectrogramUrls));
                        }
                    } else {
                        // Untuk observasi tunggal
                        formData.append('media', observation.file);
                        formData.append('is_combined', 'false');
                        formData.append('type', observation.type === 'audio' ? 'audio' : 'photo');
                        if (observation.type === 'audio' && observation.spectrogramUrl) {
                            formData.append('spectrogram_url', observation.spectrogramUrl);
                        }
                        // Tambahkan license per media tunggal
                        if (observation.type === 'audio') {
                            if (observation.license_audio) formData.append('license_audio', observation.license_audio);
                        } else {
                            if (observation.license_photo) formData.append('license_photo', observation.license_photo);
                        }
                    }

                    // Tambahkan data EXIF
                    if (observation.date) formData.append('date', observation.date);
                    if (observation.latitude && observation.longitude) {
                        formData.append('latitude', observation.latitude);
                        formData.append('longitude', observation.longitude);
                    }
                    if (observation.deviceInfo) {
                        formData.append('device_info', JSON.stringify(observation.deviceInfo));
                    }

                    // Tambahkan data taksonomi dan deskriptif
                    formData.append('scientific_name', observation.scientific_name || '');
                    formData.append('class', observation.class || '');
                    formData.append('order', observation.order || '');
                    formData.append('family', observation.family || '');
                    formData.append('genus', observation.genus || '');
                    formData.append('species', observation.species || '');
                    formData.append('description', observation.description || '');
                    formData.append('habitat', observation.habitat || '');
                    formData.append('type_sound', observation.type_sound || '');
                    formData.append('locationName', observation.locationName || '');

                    // Tambahkan lisensi observasi (data)
                    if (observation.license_observation) {
                        formData.append('license_observation', observation.license_observation);
                    }

                    // Log untuk debugging
                    console.log('Submitting observation:', {
                        isCombined: observation.isCombined,
                        filesCount: observation.isCombined ? observation.files.length : 1,
                        type: observation.type,
                        scientific_name: observation.scientific_name,
                        hasSpectrogram: !!observation.spectrogramUrl || observation.spectrogramUrls?.length > 0
                    });

                    const response = await apiFetch('/observations', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Upload error for observation:', observation.scientific_name, errorData);
                        
                        // Handle taxa not found - backend should handle synonym fallback automatically
                        if (errorData.error_details?.type === 'taxa_not_found') {
                            throw new Error(`Taxa "${errorData.error_details.scientific_name}" tidak ditemukan dalam database`);
                        }
                        
                        // Jika error terkait taksa lainnya, berikan saran yang lebih spesifik
                        if (observation.species?.trim() && 
                            (errorData.error?.toLowerCase().includes('taxa') || 
                             errorData.error?.toLowerCase().includes('taksa') ||
                             errorData.message?.toLowerCase().includes('taxa') ||
                             errorData.message?.toLowerCase().includes('taksa'))) {
                            throw new Error('Taksa tidak tersedia. Silakan gunakan taksa yang lebih tinggi (Genus/Family/Order/Class)');
                        }
                        
                        // Throw error message dari backend
                        throw new Error(errorData.error || errorData.message || 'Terjadi kesalahan saat menyimpan data');
                    }

                    const responseData = await response.json();
                    console.log('Upload success:', responseData);
                    
                    // Check if synonym fallback was used
                    if (responseData.synonym_fallback && responseData.synonym_fallback.used) {
                        // Track successful upload with synonym fallback info
                        uploadResults.successful.push({
                            observation,
                            response: responseData,
                            usedSynonymFallback: true,
                            originalName: responseData.synonym_fallback.original_name,
                            synonymName: responseData.synonym_fallback.synonym_name
                        });
                    } else {
                        // Track regular successful upload
                        uploadResults.successful.push({
                            observation,
                            response: responseData
                        });
                    }
                    
                } catch (observationError) {
                    // Track failed upload
                    console.error(`Failed to upload observation ${i + 1}:`, observationError);
                    uploadResults.failed.push({
                        observation,
                        error: observationError.message,
                        index: i + 1
                    });
                }
            }

            // Handle upload results
            if (uploadResults.successful.length > 0 && uploadResults.failed.length === 0) {
                // All uploads successful
                const synonymCount = uploadResults.successful.filter(s => s.usedSynonymFallback).length;
                
                if (synonymCount > 0) {
                    toast.success(`Berhasil mengunggah semua ${uploadResults.successful.length} observasi (${synonymCount} menggunakan synonym fallback)`);
                    
                    // Prepare synonym fallback data for modal
                    const synonymData = uploadResults.successful
                        .filter(s => s.usedSynonymFallback)
                        .map(s => ({
                            originalName: s.originalName,
                            synonymName: s.synonymName,
                            synonymTaxaId: s.response.synonym_fallback?.synonym_taxa_id || null
                        }));
                    
                    // Show synonym fallback modal
                    setSynonymFallbackData(synonymData);
                    setShowSynonymFallbackModal(true);
                } else {
                    toast.success(`Berhasil mengunggah semua ${uploadResults.successful.length} observasi`);
                }
                
                setShowSuccessPopup(true);
                
                // Clear all observations from the list
                setObservations([]);
                
                // Update total observasi
                if (user && user.id) {
                    await updateTotalObservations();
                }
            } else if (uploadResults.successful.length > 0 && uploadResults.failed.length > 0) {
                // Partial success
                const synonymCount = uploadResults.successful.filter(s => s.usedSynonymFallback).length;
                
                if (synonymCount > 0) {
                    toast.success(`Berhasil mengunggah ${uploadResults.successful.length} observasi (${synonymCount} menggunakan synonym fallback)`);
                    
                    // Prepare synonym fallback data for modal
                    const synonymData = uploadResults.successful
                        .filter(s => s.usedSynonymFallback)
                        .map(s => ({
                            originalName: s.originalName,
                            synonymName: s.synonymName,
                            synonymTaxaId: s.response.synonym_fallback?.synonym_taxa_id || null
                        }));
                    
                    // Show synonym fallback modal
                    setSynonymFallbackData(synonymData);
                    setShowSynonymFallbackModal(true);
                } else {
                    toast.success(`Berhasil mengunggah ${uploadResults.successful.length} observasi`);
                }
                
                toast.error(`Gagal mengunggah ${uploadResults.failed.length} observasi. Silakan periksa data yang gagal.`);
                
                // Remove successful observations from the list, keep failed ones
                const failedObservationIds = uploadResults.failed.map(f => f.observation.id);
                setObservations(prev => prev.filter(obs => failedObservationIds.includes(obs.id)));
                
                // Update total observasi for successful uploads
                if (user && user.id) {
                    await updateTotalObservations();
                }
                
                // Show detailed error information
                const errorDetails = uploadResults.failed.map(f => 
                    `Observasi ${f.index}: ${f.error}`
                ).join('\n');
                
                setTimeout(() => {
                    toast.error(`Detail error:\n${errorDetails}`, {
                        position: "top-right",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        theme: "colored",
                        style: {
                            backgroundColor: '#EF4444',
                            fontSize: '12px',
                            whiteSpace: 'pre-line'
                        }
                    });
                }, 3000);
            } else {
                // All uploads failed
                toast.error(`Gagal mengunggah semua observasi. Silakan periksa data Anda.`);
                
                // Show detailed error information
                const errorDetails = uploadResults.failed.map(f => 
                    `Observasi ${f.index}: ${f.error}`
                ).join('\n');
                
                setTimeout(() => {
                    toast.error(`Detail error:\n${errorDetails}`, {
                        position: "top-right",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        theme: "colored",
                        style: {
                            backgroundColor: '#EF4444',
                            fontSize: '12px',
                            whiteSpace: 'pre-line'
                        }
                    });
                }, 1000);
            }

        } catch (error) {
            // Log error untuk debugging
            console.error('Caught general error:', error);
        
            // For other errors, show toast
            toast.error(error.message || 'Terjadi kesalahan saat mengunggah observasi', {
                position: "top-right",
                autoClose: false,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
                onClick: () => toast.dismiss(),
                style: {
                    backgroundColor: '#EF4444',
                    fontSize: '14px',
                }
            });
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }        
    };

    // Handle taxa error confirmation modal
    const handleTaxaErrorConfirm = async (useSynonymFallback) => {
        setShowTaxaErrorModal(false);
        
        if (!useSynonymFallback) {
            // User chose to cancel upload
            setTaxaErrorDetails(null);
            return;
        }
        
        // User chose to continue - separate problematic observations from valid ones
        try {
            setLoading(true);
            setLoadingMessage('Memproses observasi dengan masalah taksa...');
            
            // Get observations with taxa errors
            const problematicObservationIds = taxaErrorDetails.map(error => error.observation.id);
            
            // Separate observations into problematic and valid
            const problematicObservations = observations.filter(obs => 
                problematicObservationIds.includes(obs.id)
            );
            const validObservations = observations.filter(obs => 
                !problematicObservationIds.includes(obs.id)
            );
            
            // Process problematic observations with "Unknown" fallback
            const processedObservations = problematicObservations.map(obs => ({
                ...obs,
                scientific_name: "Unknown",
                species: "",
                genus: "",
                family: "",
                order: "",
                class: "",
                kingdom: "",
                taxon_rank: ""
            }));
            
            // Clear taxa error details
            setTaxaErrorDetails(null);
            
            // Combine processed observations with valid ones
            const allObservationsToUpload = [...processedObservations, ...validObservations];
            
            // Remove problematic observations from the main list temporarily
            setObservations(validObservations);
            
            // Continue with upload using the processed observations, skip validation
            await handleSubmit(true, allObservationsToUpload);
            
        } catch (error) {
            console.error('Error processing taxa errors:', error);
            toast.error('Gagal memproses observasi dengan masalah taksa: ' + error.message);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    // Search for taxa ID for flagging - prioritize finding the exact synonym taxa
    const searchTaxaIdForFlag = async (scientificName) => {
        try {
            // First, try to find exact match including synonyms
            const response = await apiFetch(`/taxa/search?q=${encodeURIComponent(scientificName)}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.length > 0) {
                    // Look for exact match first (including synonyms)
                    const exactMatch = data.data.find(taxa => 
                        taxa.scientific_name === scientificName ||
                        taxa.scientific_name === scientificName.trim()
                    );
                    
                    if (exactMatch) {
                        console.log('Found exact taxa match for flagging:', exactMatch);
                        return exactMatch.id;
                    }
                    
                    // If no exact match, look for partial match (for cases with author citations)
                    const partialMatch = data.data.find(taxa => 
                        scientificName.includes(taxa.scientific_name) ||
                        taxa.scientific_name.includes(scientificName.split(' ').slice(0, 2).join(' '))
                    );
                    
                    if (partialMatch) {
                        console.log('Found partial taxa match for flagging:', partialMatch);
                        return partialMatch.id;
                    }
                    
                    // Return first result as fallback
                    console.log('Using first result as fallback for flagging:', data.data[0]);
                    return data.data[0].id;
                }
            }

            return null;
        } catch (error) {
            console.error('Error searching taxa ID:', error);
            return null;
        }
    };

    // Handle taxa flagging
    const handleTaxaFlag = (taxaData) => {
        // Show modal immediately with provided data
        setFlagTaxaData(taxaData);
        setShowTaxaFlagModal(true);
        
        // Search for taxa ID in background and update modal data
        searchTaxaIdForFlag(taxaData.taxaName).then(foundTaxaId => {
            if (foundTaxaId) {
                console.log('Found taxa ID for flagging:', foundTaxaId);
                setFlagTaxaData(prevData => ({
                    ...prevData,
                    taxaId: foundTaxaId
                }));
            } else {
                console.log('No taxa ID found, keeping provided taxaId or null');
            }
        }).catch(error => {
            console.error('Error searching taxa ID for flagging:', error);
        });
    };

    // Taxa Error Confirmation Modal Component
    const TaxaErrorModal = () => {
        if (!showTaxaErrorModal || !taxaErrorDetails) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-black rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white-400">Taksa Bermasalah Ditemukan</h3>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-white-400 mb-3">
                            Taksa berikut belum ada di database atau mengalami masalah:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                            {taxaErrorDetails.map((error, index) => (
                                <div key={index} className="text-sm font-mono text-gray-800 mb-1">
                                    • {error.scientificName}
                                </div>
                            ))}
                        </div>
                        <p className="text-white-400 mt-3">
                            Kami menemukan nama taksa ini bermasalah dalam struktur database kami. Kami akan menandai taksa ini untuk tindakan perbaikan. Selanjutnya observasi ini akan otomatis menggunakan taksa synonym sebagai penggantinya. Kami akan beritahu anda jika kami sudah menyelesaikan masalah ini.
                        </p>
                        
                        {/* Show synonym fallback info if available */}
                        {taxaErrorDetails.some(error => error.synonym_fallback) && (
                            <div className="mt-3 p-3 bg-blue-900 rounded-lg">
                                <p className="text-blue-200 text-sm font-semibold mb-2">Synonym fallback tersedia:</p>
                                {taxaErrorDetails.filter(error => error.synonym_fallback).map((error, index) => (
                                    <div key={index} className="text-sm text-blue-100">
                                        • {error.scientificName} → {error.synonym_fallback.scientific_name} (SYNONYM)
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between space-x-3">
                        <button
                            onClick={() => {
                                // Show flag modal for the first problematic taxa
                                const firstError = taxaErrorDetails[0];
                                handleTaxaFlag({
                                    taxaId: firstError.synonym_fallback?.id || firstError.observation?.taxa_id || null,
                                    taxaName: firstError.scientificName,
                                    commonName: null,
                                    flagType: '' // Let user choose flag type
                                });
                            }}
                            className="px-4 py-2 text-yellow-400 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            <span>Laporkan Masalah</span>
                        </button>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleTaxaErrorConfirm(false)}
                                className="px-4 py-2 text-white-400 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Batal Upload
                            </button>
                            <button
                                onClick={() => handleTaxaErrorConfirm(true)}
                                className="px-4 py-2 bg-[#17a34a] text-white rounded-lg hover:bg-[#158540] transition-colors"
                            >
                                Lanjut Upload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    const fetchTaxonomyInfo = async (scientificName) => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/taxonomy?scientific_name=${encodeURIComponent(scientificName)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mendapatkan informasi taksonomi');
            }

            const data = await response.json();

            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    ...data.data
                }));
            }
        } catch (error) {
            console.error('Error fetching taxonomy:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const QualityAssessmentModal = ({ isOpen, onClose, assessments }) => {
        if (!isOpen) return null;

        const getGradeColor = (grade) => {
            switch (grade.toLowerCase()) {
                case 'research grade':
                    return 'bg-green-900 text-green-300';
                case 'needs id':
                    return 'bg-yellow-900 text-yellow-300';
                default:
                    return 'bg-[#2c2c2c] text-gray-300';
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[#444]">
                    <h2 className="text-xl font-semibold mb-4 text-white">Hasil Penilaian Kualitas</h2>

                    {Object.entries(assessments).map(([obsId, assessment]) => (
                        <div key={obsId} className="mb-4 p-4 border border-[#444] rounded bg-[#2c2c2c]">
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getGradeColor(assessment.grade)}`}>
                                {assessment.grade}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center">
                                    <span className={assessment.has_date ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_date ? '✓' : '✗'} Tanggal
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_location ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_location ? '✓' : '✗'} Lokasi
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_media ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_media ? '✓' : '✗'} Media
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.is_wild ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.is_wild ? '✓' : '✗'} Liar
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.location_accurate ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.location_accurate ? '✓' : '✗'} Lokasi Akurat
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.recent_evidence ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.recent_evidence ? '✓' : '✗'} Bukti Terbaru
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-[#1a73e8] text-white px-4 py-2 rounded hover:bg-[#1565c0] transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            setSelectedCards([]);
            setIsSelectAll(false);
            // Delay cleanup to prevent data leakage to subsequently selected cards
            setTimeout(() => {
                setBulkFormData(null);
            }, 50);
        } else {
            setSelectedCards(observations.map(obs => obs.id));
            setIsSelectAll(true);
            // Jangan mengubah bulkFormData saat memilih semua item
            // Biarkan data yang sudah diinput oleh pengguna tetap ada
        }
    };

    const handleDeleteAll = () => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedCards.length} item yang dipilih?`)) {
            setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));
            
            // Reset selected cards dan bulkFormData
            setSelectedCards([]);
            setIsSelectAll(false);
            setBulkFormData(null);
            
            toast.success(`${selectedCards.length} item berhasil dihapus`, {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
        }
    };

    const handleCombine = () => {
        if (selectedCards.length < 2) {
            toast.error('Pilih minimal 2 observasi untuk digabungkan');
            return;
        }
        // Tampilkan modal konfirmasi
        setShowCombineConfirm(true);
    };

    const executeCombine = () => {
        // Ambil observasi yang dipilih
        const selectedObs = observations.filter(obs => selectedCards.includes(obs.id));

        // Cek tipe file dengan lebih akurat
        const checkFileType = (obs) => {
            // Cek ekstensi file
            const fileName = obs.file.name.toLowerCase();
            const fileExt = fileName.split('.').pop();
            const isAudioExt = ['mp3', 'wav', 'aac', 'm4a', 'mpeg', 'mp4'].includes(fileExt);
            const isWhatsAppAudio = 
                fileName.includes('whatsapp audio') || 
                fileName.includes('ptt-') || 
                (fileName.match(/audio.*\d{4}-\d{2}-\d{2}.*\d{2}\.\d{2}\.\d{2}/) && fileExt === 'aac');
            
            // Gabungan pengecekan MIME type dan ekstensi
            return (obs.type === 'audio' || isAudioExt || isWhatsAppAudio) ? 'audio' : 'image';
        };

        // Hitung jumlah audio dan gambar dengan lebih akurat
        const audioCount = selectedObs.filter(obs => checkFileType(obs) === 'audio').length;
        const imageCount = selectedObs.filter(obs => checkFileType(obs) === 'image').length;

        // Validasi kombinasi yang diizinkan
        if (audioCount === 0 && imageCount === 0) {
            toast.error('Tidak ada media yang valid untuk digabungkan');
            return;
        }

        // Gunakan data dari observasi pertama
        const firstObs = selectedObs[0];
        const combinedObs = {
            ...firstObs,
            id: uuidv4(),
            files: [], // Akan diisi dengan file-file yang digabung
            isCombined: true,
            combinedOrder: selectedObs.map((_, index) => index),
            type: 'mixed', // Tipe baru untuk kombinasi audio dan gambar
            audioFiles: [], // Khusus untuk file audio
            imageFiles: [], // Khusus untuk file gambar
            spectrogramUrls: [], // Untuk spectrogram dari file audio
            // Initialize license fields with user defaults
            license_observation: firstObs.license_observation || user?.license_observation || localStorage.getItem('license_observation') || 'CC BY-NC',
            license_photo: firstObs.license_photo || user?.license_photo || localStorage.getItem('license_photo') || 'CC BY-NC',
            license_audio: firstObs.license_audio || user?.license_audio || localStorage.getItem('license_audio') || 'CC BY-NC'
        };

        // Pisahkan file berdasarkan tipenya dengan pengecekan yang lebih akurat
        // Juga kumpulkan license yang berbeda untuk setiap tipe media
        const audioLicenses = [];
        const photoLicenses = [];
        const audioFilesWithLicenses = []; // Array untuk menyimpan file audio dengan license
        const imageFilesWithLicenses = []; // Array untuk menyimpan file image dengan license
        
        selectedObs.forEach(obs => {
            const fileType = checkFileType(obs);
            
            if (fileType === 'audio') {
                const audioLicense = obs.license_audio || user?.license_audio || localStorage.getItem('license_audio') || 'CC BY-NC';
                audioLicenses.push(audioLicense);
                audioFilesWithLicenses.push({ file: obs.file, license: audioLicense });
                combinedObs.audioFiles.push(obs.file);
                if (obs.spectrogramUrl) {
                    combinedObs.spectrogramUrls.push(obs.spectrogramUrl);
                }
            } else if (fileType === 'image') {
                const photoLicense = obs.license_photo || user?.license_photo || localStorage.getItem('license_photo') || 'CC BY-NC';
                photoLicenses.push(photoLicense);
                imageFilesWithLicenses.push({ file: obs.file, license: photoLicense });
                combinedObs.imageFiles.push(obs.file);
            }
        });
        
        // Gunakan license yang paling umum atau license dari observasi pertama jika semua berbeda
        if (audioLicenses.length > 0) {
            const mostCommonAudioLicense = audioLicenses.reduce((a, b, _, arr) => 
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            );
            combinedObs.license_audio = mostCommonAudioLicense;
        }
        
        if (photoLicenses.length > 0) {
            const mostCommonPhotoLicense = photoLicenses.reduce((a, b, _, arr) => 
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            );
            combinedObs.license_photo = mostCommonPhotoLicense;
        }
        
        // Buat mapping license per file sesuai urutan final files array [...audioFiles, ...imageFiles]
        const fileLicenseMapping = [
            ...audioFilesWithLicenses.map(item => item.license),
            ...imageFilesWithLicenses.map(item => item.license)
        ];
        combinedObs.fileLicenseMapping = fileLicenseMapping;

        // Gabungkan semua file ke array files untuk kompatibilitas
        combinedObs.files = [...combinedObs.audioFiles, ...combinedObs.imageFiles];

        // Hapus observasi yang digabungkan
        setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));

        // Tambahkan observasi gabungan
        setObservations(prev => [...prev, combinedObs]);

        // Reset selected cards
        setSelectedCards([]);
        setIsSelectAll(false);
        setBulkFormData(null);
        
        setShowCombineConfirm(false);

        toast.success(
            `Berhasil menggabungkan ${audioCount} audio dan ${imageCount} gambar`,
            {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            }
        );
    };

    useEffect(() => {
        if (error) {
            toast.error(error, {
                position: "top-right",
                autoClose: false, // Menghilangkan timeout
                hideProgressBar: true, // Menghilangkan progress bar
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
                onClick: () => toast.dismiss(), // Close ketika klik di area manapun
                style: {
                    backgroundColor: '#EF4444',
                    fontSize: '14px',
                }
            });
        }
    }, [error]);
    
    const SuccessPopup = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-sm w-full mx-4 border border-[#444]">
                <div className="text-center">
                    <div className="mb-4">
                        <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-green-500 text-4xl"
                        />
                    </div>
                    <h3 className="text-lg font-medium mb-4 text-white">Data Berhasil Diunggah!</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setShowSuccessPopup(false);
                                window.location.reload();
                            }}
                            className="w-full py-2 px-4 bg-[#17a34a] text-white rounded-lg hover:bg-[#158540] transition-colors"
                        >
                            Upload Lagi
                        </button>
                        <button
                            onClick={() => {
                                if (user && user.id) {
                                    window.location.href = `/profile/${user.id}/observasi`;
                                }
                            }}
                            className="w-full py-2 px-4 border border-[#17a34a] text-[#17a34a] rounded-lg hover:bg-[#17a34a] hover:text-white transition-colors"
                        >
                            Lihat Observasi Saya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Add scroll event listener to show/hide floating drop zone
    useEffect(() => {
        const handleScroll = () => {
            // Show floating drop zone when scrolled down more than 300px
            if (window.scrollY > 300) {
                setShowFloatingDropZone(true);
            } else {
                setShowFloatingDropZone(false);
            }
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Fungsi untuk menangani klik tombol crop pada gambar yang digabungan
    const handleCombinedImageCrop = (observationId, fileIndex) => {
        // Fungsi ini dinonaktifkan untuk mencegah bug
        toast.warning('Fitur crop tidak tersedia untuk media gabungan. Mohon crop gambar sebelum digabungkan.', {
            position: "top-right",
            autoClose: 5000,
            theme: "colored"
        });
        return;
        
        /* Kode lama yang dinonaktifkan
        // Temukan observasi yang sesuai dengan ID
        const observation = observations.find(obs => obs.id === observationId);
        
        if (observation && observation.imageFiles && observation.imageFiles[fileIndex]) {
            // Simpan ID observasi dan indeks file untuk digunakan nanti
            setCropObservationId(observationId);
            setCropFileIndex(fileIndex);
            
            // Buat URL untuk file yang akan di-crop
            const url = URL.createObjectURL(observation.imageFiles[fileIndex]);
            setCropImageUrl(url);
            setIsCropModalOpen(true);
        }
        */
    };

    // Fungsi untuk menangani hasil crop
    const handleCropSave = (croppedFile) => {
        // Pastikan kita memiliki ID observasi dan indeks file yang valid
        if (cropObservationId && cropFileIndex !== null) {
            // Temukan observasi yang sesuai
            const observationIndex = observations.findIndex(obs => obs.id === cropObservationId);
            
            if (observationIndex !== -1) {
                // Buat salinan array observations
                const updatedObservations = [...observations];
                
                // Buat salinan array imageFiles dari observasi
                const updatedImageFiles = [...updatedObservations[observationIndex].imageFiles];
                
                // Ganti file yang sesuai dengan file yang sudah di-crop
                updatedImageFiles[cropFileIndex] = croppedFile;
                
                // Update observasi dengan array imageFiles yang baru
                updatedObservations[observationIndex] = {
                    ...updatedObservations[observationIndex],
                    imageFiles: updatedImageFiles
                };
                
                // Update files array juga untuk memastikan konsistensi saat upload
                const updatedFiles = [...updatedObservations[observationIndex].files];
                // Cari index yang sesuai di files array
                const filesIndex = updatedObservations[observationIndex].audioFiles 
                    ? updatedObservations[observationIndex].audioFiles.length + cropFileIndex 
                    : cropFileIndex;
                
                // Update file di array files
                updatedFiles[filesIndex] = croppedFile;
                
                // Update kembali observasi dengan files yang diperbarui
                updatedObservations[observationIndex] = {
                    ...updatedObservations[observationIndex],
                    imageFiles: updatedImageFiles,
                    files: updatedFiles
                };
                
                // Update state observations
                setObservations(updatedObservations);
                
                // Reset state crop
                setCropObservationId(null);
                setCropFileIndex(null);
                
                // Tutup modal
                setIsCropModalOpen(false);
                
                // Revoke URL untuk mencegah memory leak
                if (cropImageUrl) {
                    URL.revokeObjectURL(cropImageUrl);
                    setCropImageUrl('');
                }
                
                toast.success('Gambar berhasil dipotong', {
                    position: "top-right",
                    autoClose: 3000,
                    theme: "colored"
                });
            }
        }
    };

    // Tambahkan useEffect untuk cleanup URL
    useEffect(() => {
        return () => {
            if (cropImageUrl) {
                URL.revokeObjectURL(cropImageUrl);
            }
        };
    }, [cropImageUrl]);

    return (
        <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
            <Header userData={{
                uname: localStorage.getItem('username'),
                totalObservations: localStorage.getItem('totalObservations')
            }} />

            <div className="container mx-auto px-4 py-0 mt-2">
                {/* Main File Drop Zone */}
                <div
                    className="border-2 border-dashed border-[#444] rounded-lg mb-6 mt-20 bg-[#1e1e1e] relative overflow-hidden transition-all duration-300 hover:border-[#1a73e8]"
                    onDrop={(e) => {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-[#1a73e8]');
                        e.currentTarget.classList.add('bg-[#1a365d]');
                        e.currentTarget.classList.add('bg-opacity-10');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-[#1a73e8]');
                        e.currentTarget.classList.remove('bg-[#1a365d]');
                        e.currentTarget.classList.remove('bg-opacity-10');
                    }}
                >
                    <div className="p-8 md:p-20 lg:p-32 text-center flex flex-col items-center justify-center">
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/jpg,image/heic,.heic,audio/mp3,audio/wav,audio/mpeg,audio/aac,audio/x-m4a,audio/mp4,.mp3,.wav,.aac,.m4a,.mp4"
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                            id="fileInput"
                        />
                        <svg className="w-16 h-16 mb-4 text-[#1a73e8] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <label
                            htmlFor="fileInput"
                            className="cursor-pointer text-[#1a73e8] text-lg mb-2 hover:text-[#4285f4] transition-colors font-medium"
                        >
                            Klik untuk memilih file
                        </label>
                        <p className="text-gray-400 text-sm">atau seret file ke sini</p>
                        <p className="mt-4 text-xs text-gray-500 max-w-md mx-auto">
                            Format yang didukung: JPG, PNG, HEIC (foto) dan MP3, WAV, AAC, M4A (audio)
                        </p>
                    </div>
                </div>

                {/* Floating File Drop Zone */}
                {showFloatingDropZone && (
                    <div
                        className="fixed bottom-20 right-4 md:bottom-24 md:right-6 w-16 h-16 md:w-20 md:h-20 border-2 border-dashed border-[#444] rounded-full bg-[#1e1e1e] shadow-lg overflow-hidden transition-all duration-300 hover:border-[#1a73e8] hover:scale-110 flex items-center justify-center z-50 cursor-pointer"
                        onDrop={(e) => {
                            e.preventDefault();
                            handleFiles(e.dataTransfer.files);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-[#1a73e8]');
                            e.currentTarget.classList.add('bg-[#1a365d]');
                            e.currentTarget.classList.add('bg-opacity-10');
                            e.currentTarget.classList.add('scale-110');
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-[#1a73e8]');
                            e.currentTarget.classList.remove('bg-[#1a365d]');
                            e.currentTarget.classList.remove('bg-opacity-10');
                            e.currentTarget.classList.remove('scale-110');
                        }}
                        onClick={() => document.getElementById('fileInput').click()}
                    >
                        <div className="relative group">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-[#1a73e8] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-32 bg-[#2c2c2c] text-white text-xs rounded p-2 text-center">
                                Tambah file
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Actions Floating Buttons */}
                {observations.length > 0 && (
                    <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 flex flex-col gap-2" style={{ zIndex: 49 }}>
                        {/* Select All Button */}
                        <div className="group relative">
                            <button
                                onClick={handleSelectAll}
                                className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#4287f5] text-white rounded-full shadow-lg hover:bg-[#3a76d6] transition-colors flex items-center justify-center"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelectAll}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-[#1a73e8] rounded border-[#444] focus:ring-[#1a73e8] bg-[#2c2c2c] md:mr-2"
                                />
                                <span className="hidden md:inline text-sm text-gray-300">
                                    Pilih Semua ({observations.length})
                                </span>
                            </button>
                            <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                Pilih semua observasi
                            </div>
                        </div>

                        {/* Edit Button */}
                        {selectedCards.length > 0 && (
                            <div className="group relative">
                                <button
                                    onClick={() => setIsBulkEditOpen(true)}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#673ab7] text-white rounded-full shadow-lg hover:bg-[#5e35b1] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faPencil} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Edit ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Edit {selectedCards.length} item sekaligus
                                </div>
                            </div>
                        )}

                        {/* Delete Button */}
                        {selectedCards.length > 0 && (
                            <div className="group relative">
                                <button
                                    onClick={handleDeleteAll}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#d13434] text-white rounded-full shadow-lg hover:bg-[#b02a2a] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Hapus ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Hapus {selectedCards.length} item
                                </div>
                            </div>
                        )}

                        {/* Combine Button */}
                        {selectedCards.length >= 2 && (
                            <div className="group relative">
                                <button
                                    onClick={handleCombine}
                                    className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 bg-[#1a73e8] text-white rounded-full shadow-lg hover:bg-[#1565c0] transition-colors flex items-center justify-center"
                                >
                                    <FontAwesomeIcon icon={faObjectGroup} className="md:mr-2" />
                                    <span className="hidden md:inline text-sm">
                                        Gabung ({selectedCards.length})
                                    </span>
                                </button>
                                <div className="invisible group-hover:visible absolute left-12 top-1/2 -translate-y-1/2 w-48 bg-[#2c2c2c] text-white text-xs rounded p-2 z-50 border border-[#444] md:hidden">
                                    Gabung {selectedCards.length} item
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Per-upload Observation License Selector */}
                {observations.length > 0 && (
                    <div className="bg-[#1e1e1e] border border-[#444] rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300 text-sm w-56">Lisensi Observasi (default unggahan ini)</span>
                            <select
                                className="flex-1 bg-[#2c2c2c] border border-[#444] rounded px-3 py-2 text-sm text-[#e0e0e0] focus:outline-none hover:border-[#1a73e8]"
                                value={uploadObservationLicense}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setUploadObservationLicense(val);
                                    // Apply to all current observations (users can still override per item afterwards)
                                    setObservations(prev => prev.map(obs => ({ ...obs, license_observation: val })));
                                }}
                            >
                                {LICENSE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Media Cards Grid - responsive updates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                    {observations.map(obs => (
                        <MediaCard
                            key={obs.id}
                            id={`observation-${obs.id}`}
                            observation={obs}
                            isSelected={selectedCards.includes(obs.id)}
                            onSelect={() => handleCardSelect(obs.id)}
                            onUpdate={(data) => handleObservationUpdate(obs.id, data)}
                            onDelete={() => handleObservationDelete(obs.id)}
                            bulkFormData={bulkFormData}
                            uploadProgress={uploadProgress[obs.id] || 0}
                            uploadSessionId={uploadSessionId}
                            validationErrors={attemptedSubmit && showValidationErrors ? validationErrors[obs.id] : null}
                            handleCombinedImageCrop={obs.type !== 'mixed' ? handleCombinedImageCrop : null}
                            userLicenseDefaults={{
                                license_observation: user?.license_observation || localStorage.getItem('license_observation'),
                                license_photo: user?.license_photo || localStorage.getItem('license_photo'),
                                license_audio: user?.license_audio || localStorage.getItem('license_audio')
                            }}
                        />
                    ))}
                </div>

                {/* Upload Button - mobile friendly updates */}
                {observations.length > 0 && (
                    <button
                        onClick={handleConfirmSubmit}
                        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 inline-flex items-center justify-center space-x-2 px-4 py-3 md:px-6 md:py-3 bg-[#17a34a] text-white rounded-full shadow-lg hover:bg-[#158540] transition-colors"
                        style={{ zIndex: 49 }} // Ensure it's below modals but above content
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        <span className="hidden md:inline">Upload {observations.length} Observasi</span>
                        <span className="md:hidden">Upload {observations.length}</span>
                    </button>
                )}

                {/* Info Panel - mobile friendly updates */}
                <div className="bg-[#1a365d] bg-opacity-30 p-3 md:p-4 rounded-lg mb-4 border border-[#2c5282] text-sm md:text-base">
                    <h3 className="font-medium text-blue-300 mb-2">Panduan Penggunaan:</h3>
                    <ul className="list-disc list-inside text-xs md:text-sm text-blue-200 space-y-1">
                        <li>Seret atau pilih file foto/audio untuk diunggah</li>
                        <li>Pilih satu atau beberapa file untuk mengedit data sekaligus</li>
                        <li>Pastikan mengisi nama spesies dengan benar (contoh: Gallus gallus)</li>
                        <li>Jika tidak tahu nama spesies, bisa di input dengan nama Unknown (contoh: Unknown keywords: Tidak tahu, Tidak diketahui)</li>
                        <li>Jika Taksa belum teridentifikasi, bisa di input dengan nama Unknown (contoh: Unknown keywords: Belum teridentifikasi) atau Jika masih dalam kingdom yang diketahui, bisa di input dengan nama Kingdom (contoh: Kingdom: Animalia)</li>
                        <li>Untuk file audio, pilih tipe suara yang sesuai</li>
                        <li>Lokasi dapat diatur untuk satu atau beberapa file sekaligus</li>
                        <li>Jika ingin menggabungkan file, klik checkbox atau tombol pilih semua kemudian klik tombol "Gabung" dan ikuti instruksi yang diberikan</li>
                        <li>Jika ingin menghapus file, klik tombol"Hapus" dan ikuti instruksi yang diberikan</li>
                        <li>Jika ingin mengedit data, klik checkbox atau tombol pilih semua kemudian klik tombol "Edit" dan ikuti instruksi yang diberikan</li>
                        <li>Jika ingin mengupload file, klik tombol "Upload" dan ikuti instruksi yang diberikan</li>
                    </ul>
                </div>

                {/* Modals */}
                <Modal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    className="bg-[#1e1e1e] text-white border border-[#444] shadow-xl"
                >
                    <LocationPicker
                        onSave={handleLocationSave}
                        onClose={() => setIsLocationModalOpen(false)}
                    />
                </Modal>

                <BulkEditModal
                    isOpen={isBulkEditOpen}
                    onClose={() => setIsBulkEditOpen(false)}
                    onSave={handleBulkEdit}
                    selectedItems={selectedCards.map(id => observations.find(obs => obs.id === id))}
                />

                {/* Confirm Modal */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full mx-4 border border-[#444]">
                            <h2 className="text-xl font-semibold mb-4 text-white">Konfirmasi Upload</h2>
                            <p className="text-gray-300 mb-6">
                                Apakah Anda yakin ingin mengupload {observations.length} observasi ini? <br />
                                <span className="text-red-400">⚠️ Peringatan: Data yang kosong otomatis akan menjadi "Unknown".</span>
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded transition-colors hover:bg-[#2c2c2c]"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-[#17a34a] text-white rounded-lg hover:bg-[#158540] transition-colors"
                                >
                                    Ya, Upload
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded-lg text-center border border-[#444]">
                            <div className="mb-4 text-lg font-medium text-white">{loadingMessage}</div>
                            <div className="w-80 h-3 bg-[#2c2c2c] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#1a73e8] rounded-full transition-all duration-300 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        transition: 'width 0.3s ease-out'
                                    }}
                                />
                            </div>
                            <div className="mt-2 text-sm text-gray-300">
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Quality Assessment Modal */}
                <QualityAssessmentModal
                    isOpen={showQualityModal}
                    onClose={() => {
                        setShowQualityModal(false);
                        // Reset form setelah menutup modal
                        setObservations([]);
                        setSelectedCards([]);
                        setFormData({
                            tujuan_pengamatan: 1,
                            observer: '',
                            scientific_name: '',
                            date: '',
                            latitude: '',
                            longitude: '',
                            locationName: '',
                            habitat: '',
                            description: '',
                            type_sound: '',
                            kingdom: '',
                            phylum: '',
                            class: '',
                            order: '',
                            family: '',
                            genus: '',
                            species: '',
                            common_name: '',
                            taxon_rank: ''
                        });
                    }}
                    assessments={qualityAssessments}
                />

                {/* Taxa Error Confirmation Modal */}
                <TaxaErrorModal />

                {/* Tambahkan ToastContainer */}
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    limit={3}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />

                {showSuccessPopup && <SuccessPopup />}

                {/* Combine Confirmation Modal */}
                {showCombineConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-md w-full mx-4 border border-[#444]">
                            <div className="text-center mb-6">
                                <FontAwesomeIcon 
                                    icon={faObjectGroup} 
                                    className="text-[#1a73e8] text-4xl mb-4"
                                />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    Konfirmasi Penggabungan Media
                                </h3>
                                <p className="text-gray-300 text-sm mb-2">
                                    Anda akan menggabungkan {selectedCards.length} media menjadi satu observasi.
                                </p>
                                <div className="bg-[#2c2c2c] p-4 rounded-lg mb-4">
                                    <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Peringatan</p>
                                    <p className="text-gray-400 text-sm mb-2">
                                        Setelah media digabungkan, Anda tidak dapat memisahkannya kembali. 
                                        Jika ingin memisahkan, Anda harus menghapus observasi gabungan dan mengunggah ulang medianya secara terpisah.
                                    </p>
                                    <p className="text-yellow-400 text-sm font-medium mt-3 mb-1">⚠️ Penting</p>
                                    <p className="text-gray-400 text-sm">
                                        Fungsi crop <span className="text-red-400">tidak tersedia</span> untuk media gabungan. 
                                        Pastikan semua gambar sudah di-crop sebelum digabungkan.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowCombineConfirm(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded transition-colors hover:bg-[#2c2c2c]"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={executeCombine}
                                    className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors"
                                >
                                    Gabungkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tambahkan modal crop image */}
                <ImageCropModal
                    isOpen={isCropModalOpen}
                    onClose={() => {
                        setIsCropModalOpen(false);
                        if (cropImageUrl) {
                            URL.revokeObjectURL(cropImageUrl);
                            setCropImageUrl('');
                        }
                        setCropObservationId(null);
                        setCropFileIndex(null);
                    }}
                    imageUrl={cropImageUrl}
                    onSave={handleCropSave}
                />

                {/* Taxa Flag Report Modal */}
                <TaxaFlagReport
                    open={showTaxaFlagModal}
                    onClose={() => {
                        setShowTaxaFlagModal(false);
                        setFlagTaxaData(null);
                    }}
                    taxaId={flagTaxaData?.taxaId}
                    taxaName={flagTaxaData?.taxaName}
                    commonName={flagTaxaData?.commonName}
                    flagType={flagTaxaData?.flagType}
                />

                {/* Synonym Fallback Modal */}
                <SynonymFallbackModal
                    isOpen={showSynonymFallbackModal}
                    onClose={() => {
                        setShowSynonymFallbackModal(false);
                        setSynonymFallbackData([]);
                    }}
                    synonymData={synonymFallbackData}
                />
            </div>
        </div>
    );
}

export default MediaUpload;
