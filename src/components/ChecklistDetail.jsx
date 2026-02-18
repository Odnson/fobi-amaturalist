import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import MediaViewer from './MediaViewer';
import ChecklistMap from './ChecklistMap';
import QualityAssessment from './QualityAssessment';
import TabPanel from './TabPanel';
import TaxaDisplay from './TaxaDisplay';
import TaxonomyHeader from './TaxonomyHeader';
import TaxonomyInfo from './TaxonomyInfo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag, faTimes, faExclamationTriangle, faPen, faChevronDown, faInfoCircle, faPercent, faSearch, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TreeView from 'react-treeview';
import "react-treeview/react-treeview.css";
import { toast } from 'react-hot-toast';
import LicenseLogo from '../LicenseLogo';
const getSourceAndCleanId = (id) => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');

    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);
    if (sourceParam) {
        const cleanId = idString.replace(/^(BN|KP)/, '');
        return { source: sourceParam, cleanId };
    }
    if (idString.startsWith('BN')) {
        return { source: 'burungnesia', cleanId: idString.substring(2) };
    }
    if (idString.startsWith('KP')) {
        return { source: 'kupunesia', cleanId: idString.substring(2) };
    }
    return { source: 'fobi', cleanId: idString };
};
const cleanScientificName = (name) => {
    if (!name) return '';
    return name.split(' ').filter(part => {
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};
const FlagModal = React.memo(({
    showFlagModal,
    setShowFlagModal,
    flagForm,
    setFlagForm,
    handleFlagSubmit,
    isSubmittingFlag
}) => (
    <Transition appear show={showFlagModal} as={Fragment}>
        <Dialog
            as="div"
            className="relative z-[9999]"
            onClose={() => setShowFlagModal(false)}
        >
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-black bg-opacity-50" />
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
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex justify-between items-center">
                                <span>Laporkan</span>
                                <button
                                    onClick={() => setShowFlagModal(false)}
                                    className="text-gray-400 hover:text-gray-300"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </Dialog.Title>

                            <form onSubmit={handleFlagSubmit} className="mt-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Jenis Masalah
                                    </label>
                                    <select
                                        value={flagForm.flag_type}
                                        onChange={(e) => setFlagForm(prev => ({...prev, flag_type: e.target.value}))}
                                        className="w-full p-2 border rounded bg-[#2c2c2c] text-white border-[#444] focus:border-[#1a73e8] focus:ring-[#1a73e8]"
                                        required
                                    >
                                        <option value="">Pilih jenis masalah</option>
                                        <option value="identification">Masalah Identifikasi</option>
                                        <option value="location">Masalah Lokasi</option>
                                        <option value="media">Masalah Media</option>
                                        <option value="date">Masalah Tanggal</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Alasan
                                    </label>
                                    <textarea
                                        value={flagForm.reason}
                                        onChange={(e) => setFlagForm(prev => ({...prev, reason: e.target.value}))}
                                        className="w-full p-2 border rounded bg-[#2c2c2c] text-white border-[#444] focus:border-[#1a73e8] focus:ring-[#1a73e8]"
                                        rows="4"
                                        required
                                        placeholder="Jelaskan masalah yang Anda temukan..."
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingFlag}
                                        className="inline-flex justify-center rounded-md border border-transparent bg-red-900 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                    >
                                        {isSubmittingFlag ? 'Mengirim...' : 'Kirim Flag'}
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
));
const KingdomQuorumModal = ({ isOpen, closeModal, message, onConfirm, onCancel }) => {
    const kingdomMatch = message?.match(/Kingdom telah ditetapkan berdasarkan kesepakatan quorum: ([A-Za-z]+)/);
    const existingKingdom = kingdomMatch ? kingdomMatch[1] : 'Unknown';
    
    const newKingdomMatch = message?.match(/Usulan ([A-Za-z]+) tidak dapat diterima/);
    const newKingdom = newKingdomMatch ? newKingdomMatch[1] : 'berbeda';

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={closeModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center gap-2">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />
                                    <span>Identifikasi Ditolak</span>
                                </Dialog.Title>
                                
                                <div className="mt-4">
                                    <p className="text-sm text-gray-300">
                                        {message || `Usulan Kingdom ${newKingdom} tidak dapat diterima karena Kingdom telah ditetapkan berdasarkan kesepakatan quorum: ${existingKingdom}`}
                                    </p>
                                </div>

                                <div className="mt-6">
                                    <p className="text-sm text-gray-400">
                                        Jika Anda tetap ingin mengirimkan identifikasi ini, identifikasi akan otomatis ditandai sebagai ditarik.
                                    </p>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none"
                                        onClick={onCancel}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-900 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800 focus:outline-none"
                                        onClick={onConfirm}
                                    >
                                        Lanjut
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

function ChecklistDetail({ id: propId, isModal = false, onClose = null }) {
    const { id: paramId } = useParams();
    const id = isModal ? propId : paramId;
    const { source, cleanId } = getSourceAndCleanId(id);
    const queryClient = useQueryClient();
    const {
        data: checklistData,
        isLoading: isLoadingChecklist
    } = useQuery({
        queryKey: ['checklist', cleanId, source],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${cleanId}?source=${source}`);
            return response.json();
        }
    });

    const {
        data: commentsData,
        isLoading: isLoadingComments
    } = useQuery({
        queryKey: ['comments', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/comments`);
            return response.json();
        }
    });

    const {
        data: flagsData,
        isLoading: isLoadingFlags
    } = useQuery({
        queryKey: ['flags', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/flags`);
            return response.json();
        }
    });
    const addIdentificationMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const addCommentMutation = useMutation({
        mutationFn: async (comment) => {
            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['comments', id]);
            setNewComment('');
        }
    });

    const agreeWithIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/agree?source=${source}`,
                { method: 'POST' }
            );
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const withdrawIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/withdraw?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fauna_id: checklist?.fauna_id,
                        identification_id: identificationId
                    })
                }
            );
            if (!response.ok) {
                throw new Error('Gagal menarik identifikasi');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id, source]);
        },
        onError: (error) => {
            console.error('Error withdrawing identification:', error);
            alert('Gagal menarik identifikasi. Silakan coba lagi.');
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [locationVerifications, setLocationVerifications] = useState([]);
    const [wildStatusVotes, setWildStatusVotes] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        taxon_id: '',
        identification_level: 'species',
        comment: ''
    });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [qualityAssessment, setQualityAssessment] = useState({
        has_date: false,
        has_location: false,
        has_media: false,
        is_wild: true,
        location_accurate: true,
        recent_evidence: true,
        related_evidence: true,
        community_id_level: '',
        can_be_improved: null
    });
    const [activeTab, setActiveTab] = useState('identification');
    const [showIdentificationHelpModal, setShowIdentificationHelpModal] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const swiperRef = useRef(null);
    const [spectrogramSwiper, setSpectrogramSwiper] = useState(null);
    const [activeAudioIndex, setActiveAudioIndex] = useState(0);
    const audioRefs = useRef([]);
    const progressRefs = useRef([]);
    const spectrogramSwipers = useRef([]);
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagForm, setFlagForm] = useState({
        flag_type: '',
        reason: ''
    });
    const [flags, setFlags] = useState([]);
    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
    const [media, setMedia] = useState({ images: [], sounds: [] });
    const [showLicenseDropdown, setShowLicenseDropdown] = useState(false);
    const [isUpdatingLicense, setIsUpdatingLicense] = useState(false);
    const [licenseEditTarget, setLicenseEditTarget] = useState(null); // { type: 'observation'|'photo'|'audio', mediaId?: number }
    const [pendingLicenseValue, setPendingLicenseValue] = useState(null); // string|null
    const [showLicenseConfirm, setShowLicenseConfirm] = useState(false);
    const [showKingdomQuorumModal, setShowKingdomQuorumModal] = useState(false);
    const [kingdomQuorumMessage, setKingdomQuorumMessage] = useState('');
    const [pendingIdentificationData, setPendingIdentificationData] = useState(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationData, setConfirmationData] = useState(null);

    const { user } = useUser();
    useEffect(() => {
        if (checklistData?.success) {
            console.log('Identifications data:', checklistData.data.identifications);
            setIdentifications(checklistData.data.identifications || []);
            setChecklist(checklistData.data.checklist);
            setMedia(checklistData.data.media || { images: [], sounds: [] });
            if (checklistData.data.quality_assessment) {
                setQualityAssessment(checklistData.data.quality_assessment);
            }
        }
    }, [checklistData]);

    useEffect(() => {
        if (commentsData?.success) {
            setComments(commentsData.data);
        }
    }, [commentsData]);

    useEffect(() => {
        if (flagsData?.success) {
            setFlags(flagsData.data);
        }
    }, [flagsData]);
    useEffect(() => {
        const fetchLatestData = async () => {
            try {
                const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                const checklistData = await checklistResponse.json();
                if (checklistData.success) {
                    setChecklist(checklistData.data.checklist);
                    setIdentifications(checklistData.data.identifications || []);
                    setMedia(checklistData.data.media || { images: [], sounds: [] });
                    if (checklistData.data.quality_assessment) {
                        setQualityAssessment(checklistData.data.quality_assessment);
                    }
                }
                const commentsResponse = await apiFetch(`/observations/${id}/comments`);
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.data);
                }
                const flagsResponse = await apiFetch(`/observations/${id}/flags`);
                const flagsData = await flagsResponse.json();
                if (flagsData.success) {
                    setFlags(flagsData.data);
                }
            } catch (error) {
                console.error('Error fetching latest data:', error);
            }
        };
        const intervalId = setInterval(fetchLatestData, 120000); // 120000 ms = 2 menit
        fetchLatestData();
        return () => clearInterval(intervalId);
    }, [id, cleanId, source]);
    const canEditObservationLicense = (() => {
        if (source !== 'fobi') return false;
        const userId = Number(user?.id);
        const ownerId1 = checklist?.fobi_user_id != null ? Number(checklist.fobi_user_id) : null;
        const ownerId2 = checklist?.user_id != null ? Number(checklist.user_id) : null;
        const isOwner = !!userId && (userId === ownerId1 || userId === ownerId2);
        const isAdmin = [3, 4].includes(Number(user?.level));
        return Boolean(isOwner || isAdmin);
    })();

    const allowedLicenses = [
        'CC0',
        'CC BY',
        'CC BY-SA',
        'CC BY-NC',
        'CC BY-NC-SA',
        'CC BY-ND',
        'CC BY-NC-ND',
        'All rights reserved'
    ];
    useEffect(() => {
        const debug = {
            rawId: id,
            source,
            cleanId,
            userContext: user || null,
            userId_raw: user?.id,
            userId_num: Number(user?.id),
            userLevel_raw: user?.level,
            userLevel_num: Number(user?.level),
            checklistOwnerIds: {
                fobi_user_id: checklist?.fobi_user_id ?? null,
                user_id: checklist?.user_id ?? null,
            },
            checklistOwnerIds_num: {
                fobi_user_id: checklist?.fobi_user_id != null ? Number(checklist?.fobi_user_id) : null,
                user_id: checklist?.user_id != null ? Number(checklist?.user_id) : null,
            },
            canEditObservationLicense
        };
        if (checklist || user) {
            console.log('[ChecklistDetail][LicenseEdit] Debug =>', debug);
        }
    }, [user, checklist, source, cleanId, id, canEditObservationLicense]);

    const updateObservationLicense = async (newLicense) => {
        try {
            setIsUpdatingLicense(true);
            const response = await apiFetch(`/observations/${cleanId}/license`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ license: newLicense ?? '' })
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Gagal memperbarui lisensi observasi');
            }
            setChecklist((prev) => ({ ...prev, license_observation: newLicense || null }));
            await queryClient.invalidateQueries(['checklist', cleanId, source]);
            toast.success('Lisensi observasi diperbarui');
        } catch (err) {
            console.error('Update license failed:', err);
            toast.error(err.message || 'Gagal memperbarui lisensi');
        } finally {
            setIsUpdatingLicense(false);
            setShowLicenseDropdown(false);
        }
    };
    const updateMediaLicense = async (mediaId, newLicense) => {
        try {
            setIsUpdatingLicense(true);
            const response = await apiFetch(`/observations/media/${mediaId}/license`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ license: newLicense ?? '' })
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Gagal memperbarui lisensi media');
            }
            setMedia((prev) => ({
                images: (prev.images || []).map((img) => img.id === mediaId ? { ...img, license: newLicense || null } : img),
                sounds: (prev.sounds || []).map((snd) => snd.id === mediaId ? { ...snd, license: newLicense || null } : snd)
            }));

            await queryClient.invalidateQueries(['checklist', cleanId, source]);
            toast.success('Lisensi media diperbarui');
        } catch (err) {
            console.error('Update media license failed:', err);
            toast.error(err.message || 'Gagal memperbarui lisensi media');
        } finally {
            setIsUpdatingLicense(false);
            setShowLicenseDropdown(false);
        }
    };
    const handleSelectLicenseTarget = (target) => {
        setLicenseEditTarget(target);
    };
    const handleChooseLicenseValue = (value) => {
        setPendingLicenseValue(value);
        setShowLicenseConfirm(true);
    };
    const confirmApplyLicense = async () => {
        if (!licenseEditTarget) return;
        const value = pendingLicenseValue;
        setShowLicenseConfirm(false);
        if (licenseEditTarget.type === 'observation') {
            await updateObservationLicense(value);
        } else if (licenseEditTarget.type === 'photo' || licenseEditTarget.type === 'audio') {
            await updateMediaLicense(licenseEditTarget.mediaId, value);
        }
        setLicenseEditTarget(null);
        setPendingLicenseValue(null);
    };

    const cancelApplyLicense = () => {
        setShowLicenseConfirm(false);
    };
    const getCurrentLicenseForTarget = (target) => {
        if (!target) return null;
        if (target.type === 'observation') {
            return checklist?.license_observation || null;
        }
        if (target.type === 'photo') {
            const img = (media?.images || []).find((i) => i.id === target.mediaId);
            return img?.license || null;
        }
        if (target.type === 'audio') {
            const snd = (media?.sounds || []).find((s) => s.id === target.mediaId);
            return snd?.license || null;
        }
        return null;
    };

    const searchTaxa = async (query) => {
        if (query.length < 3) return;

        try {
            const response = await apiFetch(`/taxa/search?q=${query}&source=${source}`);

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            } else {
                setSearchResults([]);
                console.error('Search failed:', data.message);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
            setSearchResults([]);
        }
    };

    const handleIdentificationSubmit = async (e, photo) => {
        try {
            e.preventDefault();
            const formData = new FormData();
            formData.append('taxon_id', selectedTaxon.id);
            formData.append('identification_level', selectedTaxon.taxon_rank);
            if (identificationForm.comment) {
                formData.append('comment', identificationForm.comment);
            }
            if (photo) {
                formData.append('photo', photo);
            }
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.modal_confirmation_needed) {
                setShowConfirmationModal(true);
                setConfirmationData({
                    taxon_id: selectedTaxon.id,
                    identification_level: selectedTaxon.taxon_rank,
                    comment: identificationForm.comment,
                    photo: photo,
                    current_grade: data.current_grade
                });
                return;
            }
            
            if (data.success) {
                try {
                    const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                    const checklistData = await checklistResponse.json();
                    if (checklistData.success) {
                        setChecklist(checklistData.data.checklist);
                        setIdentifications(checklistData.data.identifications || []);
                        setMedia(checklistData.data.media || { images: [], sounds: [] });
                        if (checklistData.data.quality_assessment) {
                            setQualityAssessment(checklistData.data.quality_assessment);
                        }
                    }
                } catch (fetchError) {
                    console.error('Error fetching updated data:', fetchError);
                    queryClient.invalidateQueries(['checklist', id]);
                }
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
                
                toast.success('Identifikasi berhasil ditambahkan', {
                    position: "top-center",
                    autoClose: 3000,
                });
            } else {
                toast.error(data.message || 'Gagal menambahkan identifikasi', {
                    position: "top-center",
                    autoClose: 5000,
                });
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
            if (error.status === 409 && error.data?.code === 'KINGDOM_QUORUM_LOCKED') {
                setKingdomQuorumMessage(error.data.message);
                setPendingIdentificationData({
                    taxon_id: selectedTaxon.id,
                    identification_level: selectedTaxon.taxon_rank,
                    comment: identificationForm.comment,
                    photo: photo,
                    force_submit: true
                });
                setShowKingdomQuorumModal(true);
            } else {
                toast.error(error.message || 'Terjadi kesalahan saat menambahkan identifikasi', {
                    position: "top-center",
                    autoClose: 5000,
                });
            }
        }
    };
    const handleConfirmationSubmit = async (confidenceLevel) => {
        try {
            if (!confirmationData) return;

            let response, data;
            if (confirmationData.action_type === 'agree') {
                const formData = new FormData();
                formData.append('confidence_level', confidenceLevel);
                
                if (confirmationData.comment) {
                    formData.append('comment', confirmationData.comment);
                }
                if (confirmationData.photo) {
                    formData.append('photo', confirmationData.photo);
                }

                response = await apiFetch(`/observations/${id}/identifications/${confirmationData.identification_id}/agree?source=${source}`, {
                    method: 'POST',
                    body: formData
                });
                
                data = await response.json();
                
                if (data.success) {
                    setIdentifications(prevIdentifications =>
                        prevIdentifications.map(ident => {
                            if (ident.id === confirmationData.identification_id) {
                                return {
                                    ...ident,
                                    agreement_count: Number(ident.agreement_count || 0) + 1,
                                    user_agreed: true
                                };
                            }
                            return ident;
                        })
                    );
                }
            } else {
                const formData = new FormData();
                formData.append('taxon_id', confirmationData.taxon_id);
                formData.append('identification_level', confirmationData.identification_level);
                formData.append('confidence_level', confidenceLevel);
                if (confidenceLevel === 1) {
                    formData.append('force_conflict', 1);
                }
                
                if (confirmationData.comment) {
                    formData.append('comment', confirmationData.comment);
                }
                if (confirmationData.photo) {
                    formData.append('photo', confirmationData.photo);
                }

                response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                    method: 'POST',
                    body: formData
                });
                
                data = await response.json();
            }
            
            if (data.success) {
                const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                const checklistData = await checklistResponse.json();
                if (checklistData.success) {
                    setChecklist(checklistData.data.checklist);
                    setIdentifications(checklistData.data.identifications || []);
                    setMedia(checklistData.data.media || { images: [], sounds: [] });
                    if (checklistData.data.quality_assessment) {
                        setQualityAssessment(checklistData.data.quality_assessment);
                    }
                }
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
                setSearchResults([]);
                setShowConfirmationModal(false);
                setConfirmationData(null);
                
                toast.success('Identifikasi berhasil ditambahkan');
            } else {
                toast.error(data.message || 'Gagal menambahkan identifikasi');
            }
        } catch (error) {
            console.error('Error submitting identification:', error);
            toast.error('Terjadi kesalahan saat menambahkan identifikasi');
        }
    };
    const handleForceSubmitIdentification = async () => {
        try {
            if (!pendingIdentificationData) return;
            
            const formData = new FormData();
            formData.append('taxon_id', pendingIdentificationData.taxon_id);
            formData.append('identification_level', pendingIdentificationData.identification_level);
            
            if (pendingIdentificationData.comment) {
                formData.append('comment', pendingIdentificationData.comment);
            }
            
            if (pendingIdentificationData.photo) {
                formData.append('photo', pendingIdentificationData.photo);
            }
            formData.append('force_submit', "1");
            
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                try {
                    const checklistResponse = await apiFetch(`/observations/${cleanId}?source=${source}`);
                    const checklistData = await checklistResponse.json();
                    if (checklistData.success) {
                        setChecklist(checklistData.data.checklist);
                        setIdentifications(checklistData.data.identifications || []);
                        setMedia(checklistData.data.media || { images: [], sounds: [] });
                        if (checklistData.data.quality_assessment) {
                            setQualityAssessment(checklistData.data.quality_assessment);
                        }
                    }
                } catch (fetchError) {
                    console.error('Error fetching updated data:', fetchError);
                    queryClient.invalidateQueries(['checklist', cleanId, source]);
                }
                setIdentificationForm({
                    taxon_id: '',
                    identification_level: 'species',
                    comment: ''
                });
                setSelectedTaxon(null);
                setShowKingdomQuorumModal(false);
                setPendingIdentificationData(null);
                toast.success(data.message || 'Identifikasi berhasil ditambahkan tetapi ditandai sebagai ditarik', {
                    position: "top-center",
                    autoClose: 3000,
                });
            } else {
                throw new Error(data.message || 'Gagal menambahkan identifikasi');
            }
        } catch (error) {
            console.error('Error force submitting identification:', error);
            toast.error(error.message || 'Gagal menambahkan identifikasi', {
                position: "top-center",
                autoClose: 5000,
            });
            setShowKingdomQuorumModal(false);
        }
    };
    const handleCancelIdentification = () => {
        setShowKingdomQuorumModal(false);
        setPendingIdentificationData(null);
    };

    const handleLocationVerify = async (isAccurate, comment = '') => {
        try {
            const response = await apiFetch(`/observations/${id}/verify-location`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_accurate: isAccurate, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error verifying location:', error);
        }
    };

    const handleWildStatusVote = async (isWild, comment = '') => {
        try {
            const response = await apiFetch(`/observations/${id}/vote-wild`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_wild: isWild, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error voting wild status:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await apiFetch(`/observations/${id}/comments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setComments(data.data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const addComment = async (e) => {
        e.preventDefault();
        await addCommentMutation.mutateAsync(newComment);
    };
    const rateChecklist = async (grade) => {
        try {
            const response = await apiFetch(`/observations/${id}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ grade })
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error rating checklist:', error);
        }
    };

    const fetchQualityAssessment = async () => {
        try {
            if (!checklist) return;

            const response = await apiFetch(`/observations/${id}/quality-assessment?source=${source}`);

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(data.data);
            }
        } catch (error) {
            console.error('Error fetching quality assessment:', error);
            setQualityAssessment({
                grade: 'casual',
                has_media: false,
                has_location: false,
                has_date: false,
                is_wild: true,
                location_accurate: true,
                recent_evidence: true,
                related_evidence: true,
                community_id_level: '',
                can_be_improved: null
            });
        }
    };

    const handleQualityAssessmentChange = async (criteria, value) => {
        try {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: value
            }));

            const response = await apiFetch(`/observations/${id}/quality-assessment/${criteria}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ value })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    ...data.data.assessment
                }));

                setChecklist(prev => ({
                    ...prev,
                    quality_grade: data.data.grade
                }));
            } else {
                setQualityAssessment(prev => ({
                    ...prev,
                    [criteria]: !value
                }));
            }
        } catch (error) {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: !value
            }));
            console.error('Error updating quality assessment:', error);
        }
    };

    const handleImprovementChange = async (canImprove) => {
        try {
            const response = await apiFetch(`/observations/${id}/improvement-status?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    can_be_improved: canImprove
                })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    can_be_improved: canImprove
                }));
                fetchQualityAssessment();
            }
        } catch (error) {
            console.error('Error updating improvement status:', error);
        }
    };

    const handleAgreeWithIdentification = async (identificationId) => {
        try {
            const result = await agreeWithIdentificationMutation.mutateAsync(identificationId);
            if (result.modal_confirmation_needed) {
                setShowConfirmationModal(true);
                setConfirmationData({
                    identification_id: identificationId,
                    action_type: 'agree',
                    current_grade: result.current_grade,
                    modal_data: result.modal_data
                });
                return;
            }
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            agreement_count: Number(ident.agreement_count || 0) + 1,
                            user_agreed: true
                        };
                    }
                    return ident;
                })
            );
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
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

        return parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.error('Error fetching location name:', error);
        return 'Gagal memuat nama lokasi';
    }
    };

    useEffect(() => {
        if (checklist?.latitude && checklist?.longitude) {
            getLocationName(checklist.latitude, checklist.longitude)
                .then(name => setLocationName(name));
        }
    }, [checklist]);
    const handleWithdrawIdentification = async (identificationId) => {
        if (!checklist?.fauna_id) {
            console.error('fauna_id tidak ditemukan');
            alert('Data tidak lengkap untuk menarik identifikasi');
            return;
        }

        try {
            await withdrawIdentificationMutation.mutateAsync(identificationId);
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            is_withdrawn: true,
                            agreement_count: 0 // Reset agreement count saat ditarik
                        };
                    }
                    if (ident.agrees_with_id === identificationId) {
                        return null;
                    }
                    return ident;
                }).filter(Boolean)
            );
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };

const handleCancelAgreement = async (identificationId) => {
    try {
        const response = await apiFetch(
            `/observations/${id}/identifications/${identificationId}/cancel-agreement?source=${source}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();

        if (data.success) {
            setIdentifications(prevIdentifications => 
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            agreement_count: data.data.agreement_count,
                            user_agreed: false
                        };
                    }
                    return ident;
                })
            );
            queryClient.invalidateQueries(['checklist', cleanId, source]);
        } else {
            console.error('Failed to cancel agreement:', data.message);
            alert(data.message || 'Gagal membatalkan persetujuan');
        }
    } catch (error) {
        console.error('Error canceling agreement:', error);
        alert('Terjadi kesalahan saat membatalkan persetujuan');
    }
};

    const handleDisagreeWithIdentification = async (identificationId, comment) => {
        setConfirmationData({
            title: 'Konfirmasi Penolakan Identifikasi',
            message: 'Apakah Anda yakin ingin menolak identifikasi ini? Tindakan ini akan membuat identifikasi baru yang berbeda.',
            confirmText: 'Ya, Tolak',
            cancelText: 'Batal',
            onConfirm: () => performDisagreeAction(identificationId, comment),
            type: 'disagree'
        });
        setShowConfirmationModal(true);
    };

    const performDisagreeAction = async (identificationId, comment) => {
        try {
            const existingUserIdentification = checklistData?.data?.identifications?.find(
                ident => ident.user_id === user?.data?.id && 
                        ident.is_withdrawn !== 1 && 
                        !ident.agrees_with_id // Penting: hanya identifikasi langsung, bukan persetujuan
            );
            const userAgreements = checklistData?.data?.identifications?.filter(
                ident => ident.user_id === user?.data?.id && 
                        ident.is_withdrawn !== 1 && 
                        ident.agrees_with_id // Ini adalah persetujuan
            ) || [];

            const hasExistingAgreement = userAgreements.length > 0;

            const formData = new FormData();
            formData.append('comment', comment || '');
            if (selectedTaxon) {
                formData.append('taxon_id', selectedTaxon.id);
                formData.append('identification_level', selectedTaxon.taxon_rank);
            }
            if (existingUserIdentification && !existingUserIdentification.agrees_with_id) {
                formData.append('existing_identification_id', existingUserIdentification.id);
                console.log('Using existing direct identification:', existingUserIdentification.id);
            } else {
                console.log('Creating new disagreement identification');
            }
            formData.append('force_new_identification', 'true');

            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/disagree?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: formData
                }
            );

            const data = await response.json();

            if (data.success) {
                if (hasExistingAgreement) {
                    setIdentifications(prevIdentifications =>
                        prevIdentifications.map(ident => {
                            if (ident.user_id === user?.data?.id && 
                                ident.agrees_with_id && 
                                ident.is_withdrawn !== 1) {
                                return {
                                    ...ident,
                                    is_withdrawn: 1, // Tandai sebagai withdrawn
                                    user_agreed: false // Hapus status user_agreed
                                };
                            }
                            if (userAgreements.some(agreement => agreement.agrees_with_id === ident.id)) {
                                const newCount = (parseInt(ident.agreement_count) || 1) - 1;
                                return {
                                    ...ident,
                                    agreement_count: String(Math.max(0, newCount)),
                                    user_agreed: false
                                };
                            }
                            
                            return ident;
                        })
                    );
                }
                if (data.data?.identification || data.disagreement) {
                    const newIdentification = data.data?.identification || data.disagreement;
                    const identificationExists = identifications.some(
                        ident => ident.id === newIdentification.id
                    );

                    if (!identificationExists) {
                        setIdentifications(prevIdentifications => [
                            ...prevIdentifications,
                            {
                                ...newIdentification,
                                user_disagreed: true,
                                disagrees_with_id: identificationId,
                                agreement_count: 0
                            }
                        ]);
                    } else {
                        setIdentifications(prevIdentifications =>
                            prevIdentifications.map(ident =>
                                ident.id === newIdentification.id
                                    ? {
                                        ...newIdentification,
                                        user_disagreed: true,
                                        disagrees_with_id: identificationId,
                                        agreement_count: ident.agreement_count
                                    }
                                    : ident
                            )
                        );
                    }
                }
                setIdentifications(prevIdentifications =>
                    prevIdentifications.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, user_disagreed: true }
                            : ident
                    )
                );
                await queryClient.invalidateQueries(['checklist', cleanId, source]);
                await queryClient.invalidateQueries(['comments', id]);
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
        }
    };
    const fetchFlags = async () => {
        try {
            const response = await apiFetch(`/observations/${id}/flags`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setFlags(data.data);
            }
        } catch (error) {
            console.error('Error fetching flags:', error);
        }
    };
    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingFlag(true);

        try {
            const response = await apiFetch(`/observations/${id}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flagForm)
            });

            const data = await response.json();
            if (data.success) {
                setShowFlagModal(false);
                setFlagForm({ flag_type: '', reason: '' });
                fetchFlags();
                alert('Laporan berhasil dikirim. Tim kami akan segera meninjau laporan Anda.');
            } else {
                if (data.message?.includes('sudah melaporkan')) {
                    alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses');
                } else {
                    alert(data.message || 'Gagal mengirim laporan. Silakan coba lagi nanti.');
                }
            }
        } catch (error) {
            if (error.message?.includes('sudah melaporkan')) {
                alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses peninjauan.');
            } else {
                alert('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi nanti.');
            }
            console.error('Error submitting flag:', error);
        } finally {
            setIsSubmittingFlag(false);
        }
    };
    const handleResolveFlag = async (flagId, resolutionNotes) => {
        try {
            const response = await apiFetch(`/observations/flags/${flagId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution_notes: resolutionNotes })
            });

            const data = await response.json();
            if (data.success) {
                fetchFlags(); // Refresh flags
                alert('Flag berhasil diselesaikan');
            } else {
                alert(data.message || 'Gagal menyelesaikan flag');
            }
        } catch (error) {
            console.error('Error resolving flag:', error);
            alert('Terjadi kesalahan saat menyelesaikan flag');
        }
    };

    useEffect(() => {
        if (id) {
            fetchFlags();
        }
    }, [id]);

    useEffect(() => {
        if (checklist) {
            fetchQualityAssessment();
        }
    }, [checklist, id]);

    if (isLoadingChecklist || isLoadingComments || isLoadingFlags) {
        return (
            <div className={`flex items-center justify-center ${isModal ? 'h-96' : 'min-h-screen'}`}>
                <div className="text-lg text-gray-600">Memuat...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className={`${isModal ? '' : 'max-w-7xl mx-auto'} min-h-screen bg-[#121212]`}>
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 hover:text-gray-100 z-50 bg-[#2c2c2c] hover:bg-[#444] rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Header Section */}
            <div className={`px-3 sm:px-4 py-4 sm:py-6 md:py-8 border-b border-[#444] bg-[#1e1e1e] ${isModal ? 'mt-0 pt-10 sm:pt-6' : 'mt-14 sm:mt-16'}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                        <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl text-white">
                                <TaxonomyHeader checklist={checklist} identifications={identifications} />
                            </h1>
                            <div className="text-gray-300 text-xs sm:text-sm space-y-1">
                                <TaxonomyInfo checklist={checklist} />
                            </div>
                            <div className="text-gray-300 space-y-1 text-xs sm:text-sm mt-2 sm:mt-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span>Oleh</span>
                                    <Link
                                        to={`/profile/${checklist?.fobi_user_id || checklist?.user_id}`}
                                        className="text-[#1a73e8] hover:text-[#4285f4] font-medium"
                                    >
                                        {checklist?.observer || 'Pengamat tidak diketahui'}
                                    </Link>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <span>Diobservasi:</span>
                                        <time className="font-medium">
                                            {checklist?.observation_date ?
                                                new Date(checklist.observation_date).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Tanggal tidak tersedia'}
                                        </time>
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Lisensi:</span>
                                            {checklist?.license_observation ? (
                                                <LicenseLogo license={checklist.license_observation} size="small" />
                                            ) : (
                                                <span className="text-gray-400">Tidak ada</span>
                                            )}
                                            {canEditObservationLicense && (
                                                <button
                                                    type="button"
                                                    className="ml-2 inline-flex items-center px-2 py-1 text-xs rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-60"
                                                    onClick={() => {
                                                        console.log('[ChecklistDetail][LicenseEdit] Toggle dropdown clicked', { canEditObservationLicense, isUpdatingLicense });
                                                        setShowLicenseDropdown((v) => !v);
                                                        setLicenseEditTarget(null);
                                                    }}
                                                    disabled={isUpdatingLicense}
                                                >
                                                    <FontAwesomeIcon icon={faPen} className="mr-1" />
                                                    <FontAwesomeIcon icon={faChevronDown} />
                                                </button>
                                            )}
                                        </div>
                                        {canEditObservationLicense && showLicenseDropdown && (
                                            <div className="absolute z-50 mt-2 w-64 sm:w-80 right-0 sm:right-auto rounded-md bg-[#1e1e1e] shadow-lg ring-1 ring-[#444] p-2">
                                                <div className="max-h-80 overflow-y-auto text-sm">
                                                    <div className="px-2 py-1 text-gray-400 text-xs uppercase">Pilih Target</div>
                                                    <button
                                                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 ${licenseEditTarget?.type === 'observation' ? 'bg-gray-700' : ''}`}
                                                        onClick={() => handleSelectLicenseTarget({ type: 'observation' })}
                                                        disabled={isUpdatingLicense}
                                                    >
                                                        Observasi
                                                    </button>
                                                    {(media?.images || []).length > 0 && (
                                                        <>
                                                            <div className="mt-2 px-2 py-1 text-gray-400 text-xs uppercase">Foto</div>
                                                            {(media.images || []).map((img) => (
                                                                <button
                                                                    key={`img-${img.id}`}
                                                                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-2 ${licenseEditTarget?.mediaId === img.id ? 'bg-gray-700' : ''}`}
                                                                    onClick={() => handleSelectLicenseTarget({ type: 'photo', mediaId: img.id })}
                                                                    disabled={isUpdatingLicense}
                                                                >
                                                                    <img
                                                                        src={img.thumbnail_url || img.images || img.url || img.file_path}
                                                                        alt={`Thumbnail foto ${img.id}`}
                                                                        className="w-10 h-10 object-cover rounded"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-gray-200 block truncate">Gambar #{img.id}</span>
                                                                    </div>
                                                                    <span className="ml-2 text-gray-400 shrink-0">
                                                                        {img.license ? <LicenseLogo license={img.license} size="small" /> : 'Tidak ada'}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                    {(media?.sounds || []).length > 0 && (
                                                        <>
                                                            <div className="mt-2 px-2 py-1 text-gray-400 text-xs uppercase">Audio</div>
                                                            {(media.sounds || []).map((snd, idx) => (
                                                                <button
                                                                    key={`snd-${snd.id}`}
                                                                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-2 ${licenseEditTarget?.mediaId === snd.id ? 'bg-gray-700' : ''}`}
                                                                    onClick={() => handleSelectLicenseTarget({ type: 'audio', mediaId: snd.id })}
                                                                    disabled={isUpdatingLicense}
                                                                >
                                                                    <img
                                                                        src={snd.spectrogram_url || snd.spectrogram}
                                                                        alt={`Spektrogram audio ${snd.id}`}
                                                                        className="w-16 h-10 object-contain rounded bg-black"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-gray-200 block truncate">Audio #{snd.id}</span>
                                                                    </div>
                                                                    <span className="ml-2 text-gray-400 shrink-0">
                                                                        {snd.license ? <LicenseLogo license={snd.license} size="small" /> : 'Tidak ada'}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {licenseEditTarget && (
                                                        <>
                                                            <div className="my-2 h-px bg-[#333]" />
                                                            <div className="px-2 py-1 text-gray-400 text-xs uppercase">Pilih Lisensi</div>
                                                            <button
                                                                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 ${(!getCurrentLicenseForTarget(licenseEditTarget)) ? 'bg-gray-700/30' : ''}`}
                                                                onClick={() => handleChooseLicenseValue(null)}
                                                                disabled={isUpdatingLicense}
                                                            >
                                                                Kosongkan lisensi
                                                            </button>
                                                            {allowedLicenses.map((lic) => (
                                                                <button
                                                                    key={`lic-${lic}`}
                                                                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-2 ${getCurrentLicenseForTarget(licenseEditTarget) === lic ? 'bg-gray-700' : ''}`}
                                                                    onClick={() => handleChooseLicenseValue(lic)}
                                                                    disabled={isUpdatingLicense}
                                                                >
                                                                    <LicenseLogo license={lic} size="small" />
                                                                    <span className="text-gray-200">{lic}</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-sm shrink-0 self-start sm:self-auto
                            ${checklist?.grade === 'research grade' ? 'bg-blue-900 text-blue-200 ring-1 ring-blue-600/40' :
                            checklist?.grade === 'confirmed id' ? 'bg-green-900 text-green-200 ring-1 ring-green-600/40' :
                            checklist?.grade === 'needs ID' ? 'bg-yellow-900 text-yellow-200 ring-1 ring-yellow-600/40' :
                            checklist?.grade === 'low quality ID' ? 'bg-orange-900 text-orange-200 ring-1 ring-orange-600/40' :
                            'bg-gray-800 text-gray-200 ring-1 ring-gray-600/40'}`}>
                            {checklist?.grade === 'research grade' ? 'ID Lengkap' :
                             checklist?.grade === 'confirmed id' ? 'ID Terkonfirmasi' :
                             checklist?.grade === 'needs ID' ? 'Bantu Iden' :
                             checklist?.grade === 'low quality ID' ? 'ID Kurang' :
                             'Casual'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Media Section */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-[#1e1e1e] shadow-sm ring-1 ring-[#444]">
                            <MediaViewer checklist={checklist} />
                        </div>
                    </div>

                    {/* Map Section */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-[#1e1e1e] shadow-sm ring-1 ring-[#444]">
                            <ChecklistMap checklist={checklist} />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-300 flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#1a73e8]" />
                                <span>{locationName}</span>
                    </div>
                </div>
            </div>

                {/* Details Section */}
                <div className="mt-4 sm:mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                        <div className="bg-[#1e1e1e] rounded-xl sm:rounded-2xl shadow-sm ring-1 ring-[#444] p-3 sm:p-4 md:p-6">
<TabPanel
    id={id}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    comments={comments}
    setComments={setComments}
    identifications={identifications}
    setIdentifications={setIdentifications}
    newComment={newComment}
    setNewComment={setNewComment}
    addComment={addComment}
    handleIdentificationSubmit={handleIdentificationSubmit}
    searchTaxa={searchTaxa}
    searchResults={searchResults}
    selectedTaxon={selectedTaxon}
    setSelectedTaxon={setSelectedTaxon}
    identificationForm={identificationForm}
    setIdentificationForm={setIdentificationForm}
    handleLocationVerify={handleLocationVerify}
    handleWildStatusVote={handleWildStatusVote}
    locationVerifications={locationVerifications}
    wildStatusVotes={wildStatusVotes}
    handleAgreeWithIdentification={handleAgreeWithIdentification}
    handleWithdrawIdentification={handleWithdrawIdentification}
    handleCancelAgreement={handleCancelAgreement}
    handleDisagreeWithIdentification={handleDisagreeWithIdentification}
    user={user}
    checklist={checklist}
    qualityAssessment={qualityAssessment}
/>
                        </div>
<button
                        onClick={() => setShowFlagModal(true)}
                            className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-900 text-red-200 hover:bg-red-800 
                                transition-colors ring-1 ring-red-600/40 text-xs sm:text-sm"
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-1.5 sm:mr-2" />
                        Laporkan
                    </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {/* Taxa Display - Komponen terpisah untuk menampilkan identifikasi saat ini */}
                    <TaxaDisplay
                        identifications={identifications}
                        checklist={checklist}
                        qualityAssessment={qualityAssessment}
                        user={user}
                        loadingStates={{
                            withdraw: false,
                            agree: false,
                            disagree: false,
                            cancelAgreement: false
                        }}
                        cachedConfidencePercentage={null}
                        onWithdraw={handleWithdrawIdentification}
                        onAgree={handleAgreeWithIdentification}
                        onDisagree={handleDisagreeWithIdentification}
                        onCancel={handleCancelAgreement}
                        onShowIdentificationHelp={() => setShowIdentificationHelpModal(true)}
                        onFetchIUCNStatus={() => {}}
                        iucnStatus={null}
                        loadingIucn={false}
                    />
                    
                    {/* 
                    TaxonomyTree dan QualityAssessment dihapus dari tampilan karena:
                    1. TaxonomyTree dipindah ke GenusGallery.jsx dan SpeciesGallery.jsx
                    2. QualityAssessment masih dalam tahap pengembangan
                    */}
                </div>
                </div>
            </div>

            {/* Modal untuk flag */}
            <FlagModal
                showFlagModal={showFlagModal}
                setShowFlagModal={setShowFlagModal}
                flagForm={flagForm}
                setFlagForm={setFlagForm}
                handleFlagSubmit={handleFlagSubmit}
                isSubmittingFlag={isSubmittingFlag}
            />

            {/* Modal konfirmasi Kingdom Quorum */}
            <KingdomQuorumModal
                isOpen={showKingdomQuorumModal}
                closeModal={handleCancelIdentification}
                message={kingdomQuorumMessage}
                onConfirm={handleForceSubmitIdentification}
                onCancel={handleCancelIdentification}
            />

            {/* Modal konfirmasi perubahan lisensi */}
            <Transition appear show={showLicenseConfirm} as={Fragment}>
                <Dialog as="div" className="relative z-[9999]" onClose={() => setShowLicenseConfirm(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-50" />
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center gap-2">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />
                                        <span>Konfirmasi Perubahan Lisensi</span>
                                    </Dialog.Title>

                                    <div className="mt-4 text-sm text-gray-300">
                                        <p>
                                            Anda akan mengubah lisensi untuk {licenseEditTarget?.type === 'observation' ? 'Observasi' : licenseEditTarget?.type === 'photo' ? `Foto #${licenseEditTarget?.mediaId}` : licenseEditTarget?.type === 'audio' ? `Audio #${licenseEditTarget?.mediaId}` : ''}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-gray-400">Menjadi:</span>
                                            {pendingLicenseValue ? (
                                                <LicenseLogo license={pendingLicenseValue} size="small" />
                                            ) : (
                                                <span className="text-gray-400">Tidak ada</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none"
                                            onClick={cancelApplyLicense}
                                            disabled={isUpdatingLicense}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-900 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800 focus:outline-none disabled:opacity-60"
                                            onClick={confirmApplyLicense}
                                            disabled={isUpdatingLicense}
                                        >
                                            {isUpdatingLicense ? 'Menyimpan...' : 'Ya, Terapkan'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Full-page blocking loading overlay during license update */}
            {isUpdatingLicense && (
                <div
                    className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[1px] flex items-center justify-center"
                    role="alert"
                    aria-live="assertive"
                    aria-busy="true"
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <span className="text-blue-100 text-sm">Menyimpan perubahan lisensi...</span>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Grade Tinggi */}
            <Transition appear show={showConfirmationModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowConfirmationModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-white mb-4"
                                    >
                                        Konfirmasi Identifikasi
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-300 mb-6">
                                            {(() => {
                                                const currentScientificName = checklist?.scientific_name || '';
                                                const currentCommonName = checklist?.cname_species || checklist?.cname_genus || checklist?.cname_family || '';
                                                const currentDisplayName = currentCommonName ? 
                                                    `${currentScientificName} - ${currentCommonName}` : 
                                                    currentScientificName;
                                                const hasResearchGrade = checklist?.grade === 'research grade';
                                                
                                                if (hasResearchGrade && currentDisplayName) {
                                                    return (
                                                        <>
                                                            Anda sedang mengusulkan taksa yang lebih rendah dari <strong>{currentDisplayName}</strong> dengan grade ID LENGKAP. Apa yang meyakinkan anda mengidentifikasi berbeda?
                                                        </>
                                                    );
                                                } else {
                                                    return "Seberapa yakin Anda dengan identifikasi ini?";
                                                }
                                            })()}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-start rounded-md border border-transparent bg-yellow-900 px-4 py-3 text-sm font-medium text-yellow-100 hover:bg-yellow-800 focus:outline-none text-left"
                                            onClick={() => {
                                                handleConfirmationSubmit(0);
                                            }}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold">1. Saya tidak yakin ini {(() => {
                                                    const currentScientificName = checklist?.scientific_name || '';
                                                    const currentCommonName = checklist?.cname_species || checklist?.cname_genus || checklist?.cname_family || '';
                                                    return currentCommonName ? 
                                                        `${currentScientificName} - ${currentCommonName}` : 
                                                        currentScientificName;
                                                })()} (nilai 0)</span>
                                                <span className="text-xs text-yellow-200 mt-1">Identifikasi ragu-ragu - tidak akan dihitung dalam kuorum</span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-start rounded-md border border-transparent bg-blue-900 px-4 py-3 text-sm font-medium text-blue-100 hover:bg-blue-800 focus:outline-none text-left"
                                            onClick={() => {
                                                handleConfirmationSubmit(1);
                                            }}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold">2. Saya tidak menemukan bukti kuat untuk mengidentifikasi ini sebagai {(() => {
                                                    const currentScientificName = checklist?.scientific_name || '';
                                                    const currentCommonName = checklist?.cname_species || checklist?.cname_genus || checklist?.cname_family || '';
                                                    return currentCommonName ? 
                                                        `${currentScientificName} - ${currentCommonName}` : 
                                                        currentScientificName;
                                                })()} (nilai 1)</span>
                                                <span className="text-xs text-blue-200 mt-1">Identifikasi yakin - akan dihitung dalam kuorum</span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none"
                                            onClick={() => {
                                                setShowConfirmationModal(false);
                                                setConfirmationData(null);
                                            }}
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Modal Informasi Sistem Identifikasi - Dipindahkan dari TabPanel */}
            {showIdentificationHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#1e1e1e] rounded-2xl shadow-xl ring-1 ring-[#444] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-white">
                                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-400" />
                                    Cara Kerja Sistem Identifikasi
                                </h2>
                                <button
                                    onClick={() => setShowIdentificationHelpModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTimes} className="text-lg" />
                                </button>
                            </div>

                            <div className="space-y-6 text-gray-300">
                                {/* Bagian 1: Dasar Identifikasi */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faSearch} className="mr-2 text-green-400" />
                                        Dasar Sistem Identifikasi
                                    </h3>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start">
                                            <span className="text-green-400 mr-2">•</span>
                                            Setiap pengguna dapat mengusulkan identifikasi untuk observasi
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-400 mr-2">•</span>
                                            Pengguna lain dapat menyetujui atau menolak identifikasi tersebut
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-400 mr-2">•</span>
                                            Sistem menghitung konsensus berdasarkan persetujuan komunitas
                                        </li>
                                    </ul>
                                </div>

                                {/* Bagian 2: Grade Observasi */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-blue-400" />
                                        Grade Observasi
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center">
                                            <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs mr-3">ID Lengkap</span>
                                            <span>Identifikasi telah mencapai konsensus komunitas</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-green-900/30 text-green-300 px-2 py-1 rounded text-xs mr-3">ID Terkonfirmasi</span>
                                            <span>Identifikasi dikonfirmasi oleh ahli</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded text-xs mr-3">Bantu Ident</span>
                                            <span>Membutuhkan bantuan identifikasi dari komunitas</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs mr-3">ID Kurang</span>
                                            <span>Kualitas observasi tidak memadai untuk identifikasi</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bagian 3: Sistem Persetujuan */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-yellow-400" />
                                        Sistem Persetujuan
                                    </h3>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start">
                                            <span className="text-yellow-400 mr-2">•</span>
                                            <strong>Setuju:</strong> Mendukung identifikasi yang diusulkan
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-400 mr-2">•</span>
                                            <strong>Tolak:</strong> Tidak setuju dengan identifikasi dan mengusulkan alternatif
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-400 mr-2">•</span>
                                            <strong>Ragu-ragu:</strong> Tidak yakin, tidak mempengaruhi kuorum
                                        </li>
                                    </ul>
                                </div>

                                {/* Bagian 4: Persentase Keyakinan */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faPercent} className="mr-2 text-orange-400" />
                                        Persentase Keyakinan
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <p><strong className="text-white">Formula:</strong> (Jumlah setuju dengan taksa X / Total identifikasi) × 100%</p>
                                        <div className="bg-[#333] rounded p-3">
                                            <p className="text-white font-medium mb-2">Kasus Khusus:</p>
                                            <ul className="space-y-1">
                                                <li>• <strong>100% keyakinan:</strong> Research Grade atau Confirmed ID</li>
                                                <li>• <strong>Genus Consensus:</strong> Semua identifikasi dalam genus yang sama</li>
                                                <li>• <strong>Species Degradation:</strong> Dihitung berdasarkan species awal meski ada usulan genus</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowIdentificationHelpModal(false)}
                                    className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition-colors"
                                >
                                    Mengerti
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChecklistDetail;
