import React, { useState, useRef, useEffect } from 'react';
import LocationPicker from '../Observations/LocationPicker';
import Modal from '../Observations/LPModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDna,
    faCalendar,
    faLocationDot,
    faTree,
    faNoteSticky,
    faMusic,
    faPlay,
    faPause,
    faChevronLeft,
    faChevronRight,
    faInfo,
    faExclamationCircle,
    faCrop,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import './MediaCard.css';
import SpectrogramModal from '../SpectrogramModal';
import ImageCropModal from '../Modals/ImageCropModal';
import QualityBadge from '../QualityBadge';
import PropTypes from 'prop-types';
import { apiFetch } from '../../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
const LICENSE_OPTIONS = [
    'CC BY',
    'CC BY-SA',
    'CC BY-NC',
    'CC BY-NC-SA',
    'CC BY-ND',
    'CC BY-NC-ND',
    'CC0',
    'All Rights Reserved'
];
const SUGGESTIONS_STORAGE_KEY = 'fobi_suggestions_data';
const SUGGESTIONS_QUERY_KEY = 'fobi_suggestions_query';
const SUGGESTIONS_PAGE_KEY = 'fobi_suggestions_page';
const SUGGESTIONS_HASMORE_KEY = 'fobi_suggestions_hasmore';

function MediaCard({ observation, isSelected, onSelect, onUpdate, onDelete, bulkFormData, qualityGrade, uploadSessionId, validationErrors, id, handleCombinedImageCrop, userLicenseDefaults }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(null);
    const [isSpectrogramModalOpen, setIsSpectrogramModalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showLicenseTooltip, setShowLicenseTooltip] = useState(null);

    const audioRef = useRef(null);
    const spectrogramRef = useRef(null);
    const progressRef = useRef(null);
    const audioUrlRef = useRef(null);
    const spectrogramContainerRef = useRef(null);
    const [spectrogramWidth, setSpectrogramWidth] = useState(0);
    const swiperRef = useRef(null);

    const [formData, setFormData] = useState({
        ...observation,
        scientific_name: observation.scientific_name || '',
        date: observation.date || '',
        latitude: observation.latitude || '',
        longitude: observation.longitude || '',
        locationName: observation.locationName || '',
        habitat: observation.habitat || '',
        description: observation.description || '',
        type_sound: observation.type_sound || '',
        kingdom: observation.kingdom || '',
        phylum: observation.phylum || '',
        class: observation.class || '',
        order: observation.order || '',
        family: observation.family || '',
        genus: observation.genus || '',
        species: observation.species || '',
        common_name: observation.common_name || '',
        taxon_rank: observation.taxon_rank || '',
        license_observation: observation.license_observation || userLicenseDefaults?.license_observation || 'CC BY-NC',
        license_photo: observation.license_photo || userLicenseDefaults?.license_photo || 'CC BY-NC',
        license_audio: observation.license_audio || userLicenseDefaults?.license_audio || 'CC BY-NC'
    });

    useEffect(() => {
        if (isSelected && bulkFormData && Object.keys(bulkFormData).length > 0 && bulkFormData.__isBulkEdit) {
            const mediaFields = [
                'file', 'files', 'audioFiles', 'imageFiles', 'spectrogramUrl', 'spectrogramUrls',
                'isCombined', 'combinedOrder', 'type', 'id'
            ];
            if (bulkFormData.scientific_name) {
                setFormData(prev => {
                    const resetData = {
                        ...prev,
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
                        displayName: '',
                        cname_kingdom: '',
                        cname_phylum: '',
                        cname_class: '',
                        cname_order: '',
                        cname_family: '',
                        cname_genus: '',
                        cname_species: ''
                    };
                    return {
                        ...resetData,
                        ...Object.fromEntries(
                            Object.entries(bulkFormData)
                                .filter(([key, value]) => 
                                    value !== undefined && 
                                    value !== null &&
                                    !mediaFields.includes(key) // EXCLUDE media fields
                                )
                                .map(([key, value]) => [key, value || resetData[key] || ''])
                        )
                    };
                });
            } else {
                setFormData(prev => ({
                    ...prev,
                    ...Object.fromEntries(
                        Object.entries(bulkFormData)
                            .filter(([key, value]) => 
                                !['scientific_name', 'species', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'taxon_rank'].includes(key) &&
                                !mediaFields.includes(key) && // EXCLUDE media fields
                                value !== undefined && 
                                value !== null
                            )
                            .map(([key, value]) => [key, value || prev[key] || ''])
                    )
                }));
            }
        }
    }, [bulkFormData, isSelected]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            upload_session_id: uploadSessionId
        }));
    }, [uploadSessionId]);

    const getAudioUrl = () => {
        if (!observation?.file) return '';
        return URL.createObjectURL(observation.file);
    };

    const [audioUrl, setAudioUrl] = useState('');

    useEffect(() => {
        const url = getAudioUrl();
        setAudioUrl(url);

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [observation.file]);

    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        const handlePlay = () => {
            setIsPlaying(true);
            setError(null);
        };

        const handlePause = () => setIsPlaying(false);

        const handleEnded = () => {
            setIsPlaying(false);
            if (progressRef.current) {
                progressRef.current.style.width = '0%';
            }
            if (swiperRef.current?.swiper) {
                swiperRef.current.swiper.setTranslate(0);
            }
        };

        const handleWaiting = () => setIsBuffering(true);

        const handleCanPlay = () => setIsBuffering(false);

        const handleError = (e) => {
            console.error('Audio error:', e);
            setError('Terjadi kesalahan saat memutar audio');
            setIsPlaying(false);
            setIsBuffering(false);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    useEffect(() => {
        if (spectrogramRef.current) {
            const updateWidth = () => {
                setSpectrogramWidth(spectrogramRef.current.scrollWidth);
            };
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, [observation.spectrogramUrl]);

    useEffect(() => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const audio = audioRef.current;
            const swiper = swiperRef.current.swiper;

            const handleTimeUpdate = () => {
                const progress = audio.currentTime / audio.duration;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;

                swiper.translateTo(-totalWidth * progress, 300, true);
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
        }
    }, []);
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;

            if (isNaN(duration)) return;

            setAudioTime(currentTime);

            if (progressRef.current) {
                const progress = (currentTime / duration) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }

            if (swiperRef.current?.swiper) {
                const swiper = swiperRef.current.swiper;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;
                const progress = currentTime / duration;

                requestAnimationFrame(() => {
                    swiper.translateTo(-totalWidth * progress, 300, true);
                });
            }
        }
    };

    const handleLoadedMetadata = () => {
        try {
            if (audioRef.current) {
                const duration = audioRef.current.duration;
                if (!isNaN(duration)) {
                    setAudioDuration(duration);
                }
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    };

    const handleSpectrogramClick = (e) => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const swiper = swiperRef.current.swiper;
            const rect = swiper.el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const clickPosition = x / width;

            const newTime = audioRef.current.duration * clickPosition;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;

                const totalWidth = swiper.virtualSize - swiper.size;
                swiper.setTranslate(-totalWidth * clickPosition);

                if (!isPlaying) {
                    audioRef.current.play()
                        .catch(error => {
                            console.error('Error playing audio:', error);
                            setError('Gagal memutar audio');
                        });
                }
            }
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        const updatedData = {
            ...formData,
            latitude: lat,
            longitude: lng,
            locationName: name
        };

        setFormData(updatedData);
        onUpdate(updatedData);
        setIsLocationModalOpen(false);
    };

    const handleOpenLocationModal = () => {
        setIsLocationModalOpen(true);
    };

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const suggestionsRef = useRef(null);

    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    useEffect(() => {
        try {
            const storedSuggestions = sessionStorage.getItem(SUGGESTIONS_STORAGE_KEY);
            const storedQuery = sessionStorage.getItem(SUGGESTIONS_QUERY_KEY);
            const storedPage = sessionStorage.getItem(SUGGESTIONS_PAGE_KEY);
            const storedHasMore = sessionStorage.getItem(SUGGESTIONS_HASMORE_KEY);
            
            if (storedSuggestions && storedQuery) {
                if (storedQuery === formData.scientific_name) {
                    const parsedSuggestions = JSON.parse(storedSuggestions);
                    setSuggestions(parsedSuggestions);
                    setPage(storedPage ? parseInt(storedPage) : 1);
                    setHasMore(storedHasMore === 'true');
                    if (parsedSuggestions.length > 0 && formData.scientific_name.length > 2) {
                        setShowSuggestions(true);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading suggestions from sessionStorage:', error);
        }
    }, [formData.scientific_name]);
    useEffect(() => {
        if (suggestions.length > 0 && formData.scientific_name) {
            try {
                sessionStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(suggestions));
                sessionStorage.setItem(SUGGESTIONS_QUERY_KEY, formData.scientific_name);
                sessionStorage.setItem(SUGGESTIONS_PAGE_KEY, page.toString());
                sessionStorage.setItem(SUGGESTIONS_HASMORE_KEY, hasMore.toString());
            } catch (error) {
                console.error('Error saving suggestions to sessionStorage:', error);
            }
        }
    }, [suggestions, formData.scientific_name, page, hasMore]);
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && formData.scientific_name.length > 2) {
                try {
                    const storedSuggestions = sessionStorage.getItem(SUGGESTIONS_STORAGE_KEY);
                    const storedQuery = sessionStorage.getItem(SUGGESTIONS_QUERY_KEY);
                    
                    if (storedSuggestions && storedQuery === formData.scientific_name) {
                        const parsedSuggestions = JSON.parse(storedSuggestions);
                        if (parsedSuggestions.length > 0) {
                            setSuggestions(parsedSuggestions);
                            setShowSuggestions(true);
                        }
                    }
                } catch (error) {
                    console.error('Error handling visibility change:', error);
                }
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [formData.scientific_name]);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;

        let updatedData = {
            ...formData,
            [name]: value,
            displayName: name === 'scientific_name' ? value : formData.displayName
        };
        if (name.startsWith('license_') && observation?.isCombined) {
            const nextLicensePhoto = name === 'license_photo' ? value : (updatedData.license_photo || formData.license_photo);
            const nextLicenseAudio = name === 'license_audio' ? value : (updatedData.license_audio || formData.license_audio);
            const audioCount = (observation.audioFiles?.length ?? 0) || (observation.files?.filter(f => f?.type?.startsWith('audio/')).length ?? 0) || 0;
            const imageCount = (observation.imageFiles?.length ?? 0) || (observation.files?.filter(f => f?.type?.startsWith('image/')).length ?? 0) || 0;

            const newMapping = [
                ...Array(audioCount).fill(nextLicenseAudio || nextLicensePhoto || 'CC BY-NC'),
                ...Array(imageCount).fill(nextLicensePhoto || nextLicenseAudio || 'CC BY-NC')
            ];

            updatedData = {
                ...updatedData,
                fileLicenseMapping: newMapping
            };
        }

        setFormData(updatedData);
        if (name.startsWith('license_') && onUpdate) {
            onUpdate(updatedData);
        }

        if (name === 'scientific_name') {
            if (value.toLowerCase() === 'unknown') {
                setFormData(prev => ({
                    ...prev,
                    scientific_name: 'Unknown',
                    taxon_rank: 'UNKNOWN',
                    displayName: 'Unknown'
                }));
                setSuggestions([]);
                setShowSuggestions(false);
                try {
                    sessionStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_QUERY_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_PAGE_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_HASMORE_KEY);
                } catch (error) {
                    console.error('Error removing suggestions from sessionStorage:', error);
                }
                
                return;
            }

            if (!value) {
                setFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
                    common_name: '',
                    kingdom: '',
                    phylum: '',
                    class: '',
                    order: '',
                    family: '',
                    genus: '',
                    taxon_rank: '',
                    displayName: ''
                }));
                setSuggestions([]);
                setShowSuggestions(false);
                try {
                    sessionStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_QUERY_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_PAGE_KEY);
                    sessionStorage.removeItem(SUGGESTIONS_HASMORE_KEY);
                } catch (error) {
                    console.error('Error removing suggestions from sessionStorage:', error);
                }
                
                return;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            try {
                const storedSuggestions = sessionStorage.getItem(SUGGESTIONS_STORAGE_KEY);
                const storedQuery = sessionStorage.getItem(SUGGESTIONS_QUERY_KEY);
                
                if (storedSuggestions && storedQuery === value) {
                    const parsedSuggestions = JSON.parse(storedSuggestions);
                    if (parsedSuggestions.length > 0 && value.length > 2) {
                        setSuggestions(parsedSuggestions);
                        setShowSuggestions(true);
                        return; // Gunakan saran yang tersimpan, jangan fetch lagi
                    }
                }
            } catch (error) {
                console.error('Error checking stored suggestions:', error);
            }

            timeoutRef.current = setTimeout(async () => {
                if (value.length > 2) {
                    try {
                        if (abortControllerRef.current) {
                            abortControllerRef.current.abort();
                        }

                        abortControllerRef.current = new AbortController();
                        
                        setIsLoadingMore(true);
                        setSuggestions([]); // Reset suggestions while loading

                        const response = await apiFetch(
                            `/taxonomy/search?q=${encodeURIComponent(value)}&page=${1}&per_page=100`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                signal: abortControllerRef.current.signal
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();

                        if (data.success) {
                            setSuggestions(data.data);
                            setShowSuggestions(true);
                            const totalPages = data.pagination?.total_pages || 1;
                            console.log('Total pages:', totalPages);
                            setHasMore(totalPages > 1);
                            setPage(1);
                            try {
                                sessionStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(data.data));
                                sessionStorage.setItem(SUGGESTIONS_QUERY_KEY, value);
                                sessionStorage.setItem(SUGGESTIONS_PAGE_KEY, '1');
                                sessionStorage.setItem(SUGGESTIONS_HASMORE_KEY, (totalPages > 1).toString());
                            } catch (error) {
                                console.error('Error saving suggestions to sessionStorage:', error);
                            }
                        } else {
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                            try {
                                sessionStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
                                sessionStorage.removeItem(SUGGESTIONS_QUERY_KEY);
                                sessionStorage.removeItem(SUGGESTIONS_PAGE_KEY);
                                sessionStorage.removeItem(SUGGESTIONS_HASMORE_KEY);
                            } catch (error) {
                                console.error('Error removing suggestions from sessionStorage:', error);
                            }
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error('Error fetching suggestions:', error);
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                        }
                    } finally {
                        setIsLoadingMore(false);
                    }
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setHasMore(false);
                }
            }, 300);
        }
    };

    const loadMoreSuggestions = async () => {
        if (!hasMore || isLoadingMore) return;

        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const value = formData.scientific_name;

            console.log('Loading more suggestions, page:', nextPage);

            const response = await apiFetch(`/taxonomy/search?q=${encodeURIComponent(value)}&page=${nextPage}&per_page=100`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const newSuggestions = data.data;
                console.log('Received new suggestions:', newSuggestions.length);
                const existingIdsMap = new Map();
                const existingNamesMap = new Map();
                
                suggestions.forEach(item => {
                    if (item.id) existingIdsMap.set(item.id, true);
                    if (item.full_data?.id) existingIdsMap.set(item.full_data.id, true);
                    const nameRankKey = `${item.scientific_name}-${item.rank}`;
                    existingNamesMap.set(nameRankKey, true);
                });
                const uniqueNewSuggestions = newSuggestions.filter(item => {
                    if (item.id && existingIdsMap.has(item.id)) return false;
                    if (item.full_data?.id && existingIdsMap.has(item.full_data.id)) return false;
                    const nameRankKey = `${item.scientific_name}-${item.rank}`;
                    if (existingNamesMap.has(nameRankKey)) return false;
                    
                    return true;
                });
                
                console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                
                if (uniqueNewSuggestions.length > 0) {
                    const updatedSuggestions = [...suggestions, ...uniqueNewSuggestions];
                    setSuggestions(updatedSuggestions);
                    setPage(nextPage);
                    const totalPages = data.pagination?.total_pages || nextPage;
                    console.log('Total pages:', totalPages, 'Current page:', nextPage);
                    setHasMore(totalPages > nextPage);
                    try {
                        sessionStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(updatedSuggestions));
                        sessionStorage.setItem(SUGGESTIONS_PAGE_KEY, nextPage.toString());
                        sessionStorage.setItem(SUGGESTIONS_HASMORE_KEY, (totalPages > nextPage).toString());
                    } catch (error) {
                        console.error('Error updating suggestions in sessionStorage:', error);
                    }
                } else {
                    console.log('No new unique suggestions found');
                    setHasMore(false);
                    try {
                        sessionStorage.setItem(SUGGESTIONS_HASMORE_KEY, 'false');
                    } catch (error) {
                        console.error('Error updating hasMore in sessionStorage:', error);
                    }
                }
            } else {
                console.log('API returned error status');
                setHasMore(false);
                if (data.message) {
                    console.warn('API warning:', data.message);
                }
                try {
                    sessionStorage.setItem(SUGGESTIONS_HASMORE_KEY, 'false');
                } catch (error) {
                    console.error('Error updating hasMore in sessionStorage:', error);
                }
            }
        } catch (error) {
            console.error('Error loading more suggestions:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        if (element.scrollHeight - element.scrollTop - element.clientHeight < 30) {
            loadMoreSuggestions();
        }
    };

    const extractScientificName = (fullName) => {
        if (!fullName) return '';

        const parts = fullName.split(' ');
        const scientificNameParts = parts.filter(part => {
            if (part.includes('(') || part.includes(')')) return false;
            if (/\d/.test(part)) return false;
            if (parts.indexOf(part) > 1 && /^[A-Z]/.test(part)) return false;
            return true;
        });

        return scientificNameParts.join(' ');
    };

    const displayName = extractScientificName(formData.scientific_name);
    const normalizeScientificName = (scientificName) => {
        if (!scientificName) return scientificName;
        let normalized = scientificName
            .replace(/\s*\([^)]*\d{4}[^)]*\)/g, '')
            .replace(/\s+[A-Z][a-zA-Z]*(?:\s*,\s*[A-Z][a-zA-Z]*)*(?:\s*&\s*[A-Z][a-zA-Z]*)?\s*,\s*\d{4}.*$/g, '')
            .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s+[A-Z][a-zA-Z]*(?:\s*,\s*\d{4}.*)?$/g, '')
            .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*(?:\s*,\s*\d{4}.*)?$/g, '')
            .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*,\s*$/g, '')
            .replace(/\s+[A-Z][a-z]*\.\s*$/g, '')
            .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s*$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        return normalized;
    };

    const renderTaxonSuggestions = (searchResults) => {
        const currentQuery = (formData?.displayName || formData?.scientific_name || '').trim().toLowerCase();
        const shouldPreserveBackendOrder = currentQuery.includes('accipiter') || 
                                          currentQuery.includes('elang-alap') || 
                                          currentQuery.includes('elang alap') ||
                                          currentQuery.includes('unknown') ||
                                          currentQuery.includes('tidak') ||
                                          currentQuery.includes('belum');
        
        let processedResults;
        if (shouldPreserveBackendOrder) {
            processedResults = [...(searchResults || [])];
        } else {
            processedResults = [...(searchResults || [])].sort((a, b) => {
                const an = normalizeScientificName(a?.scientific_name || '').toLowerCase();
                const bn = normalizeScientificName(b?.scientific_name || '').toLowerCase();
                return an.localeCompare(bn);
            });
        }
        const renderedItemsMap = new Map();
        const uniqueResults = processedResults.filter(taxon => {
            const key = `${taxon.scientific_name}-${taxon.rank}`;
            
            if (renderedItemsMap.has(key)) {
                return false; // Item duplikat, lewati
            }
            
            renderedItemsMap.set(key, true);
            return true;
        });
        const rankOrder = {
            'form': 1,
            'variety': 2,
            'subspecies': 3,
            'species': 4,
            'subgenus': 5,
            'genus': 6,
            'subtribe': 7,
            'tribe': 8,
            'supertribe': 9,
            'subfamily': 10,
            'family': 11,
            'superfamily': 12,
            'infraorder': 13,
            'suborder': 14,
            'order': 15,
            'superorder': 16,
            'infraclass': 17,
            'subclass': 18,
            'class': 19,
            'superclass': 20,
            'subphylum': 21,
            'phylum': 22,
            'superphylum': 23,
            'subkingdom': 24,
            'kingdom': 25,
            'superkingdom': 26,
            'domain': 27
        };

        const getName = (t) => (t.scientific_name || '').toLowerCase();
        const getBinomial = (name) => {
            if (!name) return '';
            const parts = name.trim().split(/\s+/);
            let genus = '';
            let species = '';
            for (let i = 0; i < parts.length; i++) {
                const token = parts[i];
                if (!genus) {
                    if (/^[A-Z][a-zA-Z-]*$/.test(token)) {
                        genus = token;
                    }
                } else {
                    if (/^[a-z-]+$/.test(token)) {
                        species = token;
                        break;
                    }
                }
            }
            return genus && species ? `${genus} ${species}`.toLowerCase() : name.toLowerCase();
        };

        const isParentOf = (parentTaxon, childTaxon) => {
            const pr = parentTaxon.rank;
            const cr = childTaxon.rank;
            const prVal = rankOrder[pr] ?? 0;
            const crVal = rankOrder[cr] ?? 0;
            if (prVal <= crVal) return false; // parent must be higher rank

            const p = parentTaxon.full_data || {};
            const c = childTaxon.full_data || {};
            if (pr === 'family') {
                return p.family && c.family && p.family === c.family;
            }
            if (pr === 'subfamily') {
                return p.subfamily && c.subfamily && p.subfamily === c.subfamily;
            }
            if (pr === 'tribe') {
                return p.tribe && c.tribe && p.tribe === c.tribe;
            }
            if (pr === 'subtribe') {
                return p.subtribe && c.subtribe && p.subtribe === c.subtribe;
            }
            if (pr === 'genus') {
                return p.genus && ((c.genus && p.genus === c.genus) || (c.subgenus_parent && p.genus === c.subgenus_parent));
            }
            if (pr === 'subgenus') {
                return p.subgenus && c.subgenus && p.subgenus === c.subgenus;
            }
            if (pr === 'species') {
                if (c.rank !== 'subspecies') return false;
                const pMatch = p.genus && p.species ? `${p.genus} ${p.species}`.toLowerCase() : getBinomial(parentTaxon.scientific_name);
                const cMatch = c.genus && c.species ? `${c.genus} ${c.species}`.toLowerCase() : getBinomial(childTaxon.scientific_name);
                return !!pMatch && !!cMatch && pMatch === cMatch;
            }
            return false;
        };

        const nodes = uniqueResults.map(item => ({ ...item, children: [], _processed: false }));
        nodes.forEach(parent => {
            nodes.forEach(child => {
                if (parent === child) return;
                if (!isParentOf(parent, child)) return;
                if (parent.rank === 'genus' && child.rank === 'subspecies') {
                    const childBinomial = getBinomial(child.scientific_name);
                    const hasSpecies = nodes.some(n => n.rank === 'species' && getBinomial(n.scientific_name) === childBinomial);
                    if (hasSpecies) return; // let species be the direct parent
                }
                const hasIntermediate = nodes.some(mid => (
                    mid !== parent && mid !== child && isParentOf(parent, mid) && isParentOf(mid, child)
                ));
                if (!hasIntermediate) {
                    parent.children.push(child);
                    child._processed = true;
                }
            });
        });
        const speciesIndex = new Map(); // binomial -> species node
        nodes.forEach(n => {
            if (n.rank === 'species') {
                speciesIndex.set(getBinomial(n.scientific_name), n);
            }
        });
        const detachFromCurrentParent = (childNode) => {
            nodes.forEach(p => {
                if (p.children && p.children.length) {
                    const idx = p.children.indexOf(childNode);
                    if (idx !== -1) p.children.splice(idx, 1);
                }
            });
        };

        nodes.forEach(n => {
            if (n.rank === 'subspecies') {
                const bn = getBinomial(n.scientific_name);
                const sp = speciesIndex.get(bn);
                if (sp) {
                    detachFromCurrentParent(n);
                    sp.children = sp.children || [];
                    if (!sp.children.includes(n)) sp.children.push(n);
                    n._processed = true;
                }
            }
        });

        const sortByRankThenName = (arr) => arr.sort((a, b) => {
            const ra = rankOrder[a.rank] ?? 0;
            const rb = rankOrder[b.rank] ?? 0;
            if (ra !== rb) return rb - ra; // older first
            return getName(a).localeCompare(getName(b));
        });
        nodes.forEach(n => {
            if (n.children && n.children.length) sortByRankThenName(n.children);
        });
        const roots = nodes.filter(n => !n._processed);
        sortByRankThenName(roots);
        const flatten = (arr, out = []) => {
            arr.forEach(n => {
                out.push(n);
                if (n.children && n.children.length) flatten(n.children, out);
            });
            return out;
        };

        const hierarchicalResults = flatten(roots);
        const query = (formData?.displayName || formData?.scientific_name || '').trim().toLowerCase();
        let prioritizedList = hierarchicalResults;

        if (query && hierarchicalResults.length) {
            const getSearchableStrings = (t) => {
                const vals = [];
                const push = (v) => { if (typeof v === 'string' && v) vals.push(v.toLowerCase()); };
                push(t.scientific_name);
                push(t.common_name);
                const fd = t.full_data || {};
                const keys = [
                    'cname_order','cname_class','cname_phylum','cname_kingdom','cname_family','cname_subfamily',
                    'cname_superfamily','cname_genus','cname_species','cname_subspecies','cname_tribe','cname_subtribe',
                    'order','class','phylum','kingdom','family','subfamily','superfamily','genus','species','subspecies','tribe','subtribe',
                    'accepted_scientific_name','accepted_name','basionym'
                ];
                keys.forEach(k => push(fd[k]));
                return vals;
            };
            const nameEquals = (t) => {
                const vals = getSearchableStrings(t);
                return vals.some(v => v === query);
            };
            const nameContains = (t) => {
                const vals = getSearchableStrings(t);
                return vals.some(v => v.includes(query));
            };
            const containingMatches = hierarchicalResults.filter(nameContains);
            const nonMatches = hierarchicalResults.filter(t => !nameContains(t));
            
            if (containingMatches.length > 0) {
                const rankOrder = {
                    domain: 1000, superkingdom: 950, kingdom: 900, subkingdom: 850,
                    superphylum: 800, phylum: 750, subphylum: 700,
                    superclass: 650, class: 600, subclass: 550, infraclass: 500,
                    superorder: 450, order: 400, suborder: 350, infraorder: 300,
                    superfamily: 250, family: 200, subfamily: 150,
                    supertribe: 140, tribe: 130, subtribe: 120,
                    genus: 100, subgenus: 90,
                    species: 80, subspecies: 70, variety: 60, form: 50, subform: 40
                };
                const highestRankMatch = containingMatches.reduce((highest, current) => {
                    const currentRank = rankOrder[current.rank] || 0;
                    const highestRank = rankOrder[highest.rank] || 0;
                    if (currentRank > highestRank) return current;
                    if (currentRank === highestRank) {
                        return (current.scientific_name || '').toLowerCase() < (highest.scientific_name || '').toLowerCase() ? current : highest;
                    }
                    return highest;
                });
                const highestMatchNode = nodes.find(n => 
                    n.scientific_name === highestRankMatch.scientific_name && n.rank === highestRankMatch.rank
                );
                
                if (highestMatchNode) {
                    const collected = [];
                    const collect = (n) => {
                        if (!n) return;
                        collected.push(n);
                        if (n.children && n.children.length) {
                            const sortedChildren = [...n.children].sort((a, b) => {
                                const rankA = rankOrder[a.rank] || 0;
                                const rankB = rankOrder[b.rank] || 0;
                                if (rankA !== rankB) return rankB - rankA;
                                return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                            });
                            sortedChildren.forEach(ch => collect(ch));
                        }
                    };
                    collect(highestMatchNode);
                    const collectedSet = new Set(collected.map(x => `${x.rank}|${x.scientific_name}`));
                    const remainder = hierarchicalResults.filter(x => !collectedSet.has(`${x.rank}|${x.scientific_name}`));
                    const remainingContaining = remainder.filter(nameContains);
                    const remainingNonContaining = remainder.filter(t => !nameContains(t));
                    
                    remainingContaining.sort((a, b) => {
                        const rankA = rankOrder[a.rank] || 0;
                        const rankB = rankOrder[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    remainingNonContaining.sort((a, b) => {
                        const rankA = rankOrder[a.rank] || 0;
                        const rankB = rankOrder[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    prioritizedList = [...collected, ...remainingContaining, ...remainingNonContaining];
                } else {
                    containingMatches.sort((a, b) => {
                        const rankA = rankOrder[a.rank] || 0;
                        const rankB = rankOrder[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    nonMatches.sort((a, b) => {
                        const rankA = rankOrder[a.rank] || 0;
                        const rankB = rankOrder[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    prioritizedList = [...containingMatches, ...nonMatches];
                }
            }
        }
        try {
            console.groupCollapsed('[MediaCard] Suggestions (hierarchical)', hierarchicalResults.length, 'items');
            console.table(hierarchicalResults.map(s => ({
                id: s.full_data?.id || s.id || '-',
                name: s.scientific_name,
                common: s.common_name || '',
                rank: s.rank,
                status: s.taxonomic_status || s.full_data?.taxonomic_status || '',
                accepted: s.accepted_scientific_name || s.full_data?.accepted_scientific_name || ''
            })));
            console.groupEnd();
            if (query) {
                console.groupCollapsed('[MediaCard] Final prioritized results for query:', query);
                console.table(prioritizedList.slice(0, 10).map((s, i) => ({
                    index: i,
                    id: s.full_data?.id || s.id || '-',
                    name: s.scientific_name,
                    common: s.common_name || '',
                    rank: s.rank,
                    exact_match: getSearchableStrings(s).some(v => v === query),
                    contains_query: getSearchableStrings(s).some(v => v.includes(query))
                })));
                console.groupEnd();
            }
        } catch (e) {
        }

        return prioritizedList.map((taxon, index) => {
            const uniqueKey = taxon.full_data?.id || `${taxon.rank}-${taxon.scientific_name}-${index}`;
            
            let familyContext = '';
            if (taxon.full_data) {
                const ranks = [];
                
                if (taxon.full_data.family) {
                    ranks.push(`Family: ${taxon.full_data.family}${taxon.full_data.cname_family ? ` (${taxon.full_data.cname_family})` : ''}`);
                }
                
                if (taxon.full_data.order) {
                    ranks.push(`Order: ${taxon.full_data.order}${taxon.full_data.cname_order ? ` (${taxon.full_data.cname_order})` : ''}`);
                }
                
                if (taxon.full_data.class) {
                    ranks.push(`Class: ${taxon.full_data.class}${taxon.full_data.cname_class ? ` (${taxon.full_data.cname_class})` : ''}`);
                }
                
                if (taxon.full_data.phylum) {
                    ranks.push(`Phylum: ${taxon.full_data.phylum}`);
                }
                
                if (taxon.full_data.kingdom) {
                    ranks.push(`Kingdom: ${taxon.full_data.kingdom}`);
                }
                
                familyContext = ranks.join(' | ');
            }
            const isSynonym = taxon.taxonomic_status === 'SYNONYM' || taxon.full_data?.taxonomic_status === 'SYNONYM';
            const acceptedName = taxon.accepted_scientific_name || taxon.full_data?.accepted_scientific_name;
            
            return (
                <div
                    key={uniqueKey}
                    onClick={() => handleSuggestionClick(taxon)}
                    className="p-2 hover:bg-[#3c3c3c] cursor-pointer border-b border-[#444]"
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''} text-[#e0e0e0] font-medium`}>
                        {taxon.scientific_name}
                        {taxon.common_name && <span className="not-italic"> | {taxon.common_name}</span>}
                        <span className="text-gray-400 text-sm not-italic"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                        {isSynonym && (
                            <span className="text-orange-400 text-xs not-italic ml-2">(Synonym)</span>
                        )}
                    </div>
                    
                    {isSynonym && acceptedName && (
                        <div className="text-sm text-blue-400 ml-2 mt-1">
                            → Accepted: <span className="italic">{acceptedName}</span>
                        </div>
                    )}
                    
                    {familyContext && (
                        <div className="text-sm text-gray-400 ml-2 mt-1">
                            {familyContext}
                        </div>
                    )}
                </div>
            );
        });
    };

    const handleSuggestionClick = (suggestion) => {
        const isSynonym = suggestion.taxonomic_status === 'SYNONYM' || suggestion.full_data?.taxonomic_status === 'SYNONYM';
        const acceptedName = suggestion.accepted_scientific_name || suggestion.full_data?.accepted_scientific_name;
        const finalScientificName = isSynonym && acceptedName ? acceptedName : suggestion.scientific_name;
        const resetData = {
            ...formData,
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
            displayName: '',
            cname_kingdom: '',
            cname_phylum: '',
            cname_class: '',
            cname_order: '',
            cname_family: '',
            cname_genus: '',
            cname_species: ''
        };
        const updatedData = {
            ...resetData,
            taxon_id: suggestion.full_data?.id || '',
            species: suggestion.full_data?.species || '',
            subspecies: suggestion.full_data?.subspecies || '',
            variety: suggestion.full_data?.variety || '',
            form: suggestion.full_data?.form || '',
            common_name: suggestion.full_data?.cname_species || suggestion.common_name || '',
            scientific_name: finalScientificName || '',
            kingdom: suggestion.full_data?.kingdom || '',
            phylum: suggestion.full_data?.phylum || '',
            class: suggestion.full_data?.class || '',
            order: suggestion.full_data?.order || '',
            family: suggestion.full_data?.family || '',
            genus: suggestion.full_data?.genus || '',
            taxon_rank: suggestion.rank || suggestion.full_data?.taxon_rank || '',
            displayName: extractScientificName(finalScientificName || suggestion.full_data?.species || ''),
            cname_kingdom: suggestion.full_data?.cname_kingdom || '',
            cname_phylum: suggestion.full_data?.cname_phylum || '',
            cname_class: suggestion.full_data?.cname_class || '',
            cname_order: suggestion.full_data?.cname_order || '',
            cname_family: suggestion.full_data?.cname_family || '',
            cname_genus: suggestion.full_data?.cname_genus || '',
            cname_species: suggestion.full_data?.cname_species || suggestion.common_name || '',
        };
        console.log("Suggestion selected:", suggestion);
        console.log("Updated formData with taxon_rank:", updatedData);

        setFormData(updatedData);
        onUpdate(updatedData);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    const handleSave = () => {
        if (!observation.locationName) {
            toast.error('Lokasi harus diisi!', {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
            return;
        }
        const updatedFormData = { ...formData };
        if (!updatedFormData.scientific_name) {
            updatedFormData.scientific_name = "Unknown";
            updatedFormData.taxon_rank = "UNKNOWN";
            updatedFormData.displayName = "Unknown";
        }

        onUpdate({
            ...updatedFormData,
            upload_session_id: uploadSessionId
        });
        setIsEditing(false);
    };

    const handleSpectrogramModalOpen = () => {
        setIsSpectrogramModalOpen(true);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        setError(null);
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        setError('Gagal memutar audio');
                    });
            }
        }
    };

    const formatCoordinate = (coord) => {
        if (typeof coord === 'number') {
            return coord.toFixed(6);
        }
        return '';
    };

    const analyzeAudio = async (audioUrl) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            const nyquistFrequency = audioContext.sampleRate / 2;
            const binSize = nyquistFrequency / bufferLength;

            let maxFreq = 0;
            for (let i = 0; i < bufferLength; i++) {
                const amplitude = dataArray[i];
                const frequency = i * binSize;

                if (amplitude > -100 && frequency > maxFreq) {
                    maxFreq = frequency;
                }
            }

            maxFreq = Math.ceil(maxFreq / 1000) * 1000;

            const labels = [];
            const steps = [1, 0.5, 0.25, 0];

            steps.forEach(step => {
                const freq = maxFreq * step;
                if (freq === 0) {
                    labels.push('0 Hz');
                } else if (freq >= 1000) {
                    labels.push(`${Math.round(freq/1000)} kHz`);
                } else {
                    labels.push(`${Math.round(freq)} Hz`);
                }
            });

            return labels;
        } catch (error) {
            console.error('Error analyzing audio:', error);
            return ['20 kHz', '10 kHz', '5 kHz', '0 Hz'];
        }
    };

    const [frequencyLabels, setFrequencyLabels] = useState(['20 kHz', '10 kHz', '5 kHz', '0 Hz']);

    useEffect(() => {
        if (observation.audioUrl) {
            analyzeAudio(observation.audioUrl)
                .then(labels => {
                    setFrequencyLabels(labels);
                })
                .catch(error => {
                    console.error('Error setting frequency labels:', error);
                });
        }
    }, [observation.audioUrl]);

    useEffect(() => {
        if (onUpdate) {
            onUpdate({
                ...formData,
                common_name: formData.common_name || '',
                species: formData.species || '',
                scientific_name: formData.scientific_name || '',
                taxon_rank: formData.taxon_rank || '',
                upload_session_id: uploadSessionId
            });
        }
    }, [formData, uploadSessionId]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleCropClick = (id, index) => {
        if (id && index !== undefined) {
            if (handleCombinedImageCrop) {
                handleCombinedImageCrop(id, index);
            }
        } else {
            if (observation.type === 'image' || observation.type === 'photo') {
                const url = URL.createObjectURL(observation.file);
                setImageUrl(url);
                setIsCropModalOpen(true);
            }
        }
    };

    const handleCropSave = (croppedFile) => {
        const updatedObservation = {
            ...observation,
            file: croppedFile
        };
        setFormData(prevFormData => ({
            ...prevFormData,
            file: croppedFile
        }));
        
        onUpdate(updatedObservation);
        setIsCropModalOpen(false);
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
            setImageUrl('');
        }
        
        toast.success('Gambar berhasil dipotong', {
            position: "top-right",
            autoClose: 3000,
            theme: "colored"
        });
    };

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    return (
        <div 
            id={id}
            className={`relative border rounded-lg p-4 ${
                validationErrors ? 'border-red-500' : isSelected ? 'border-blue-500' : 'border-[#444]'
            } bg-[#1e1e1e] text-[#e0e0e0]`}
        >
            {validationErrors && (
                <div className="absolute top-2 right-2 text-red-500 z-10">
                    <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
                    <span className="text-xs">Wajib diisi</span>
                </div>
            )}
            
            <div className="absolute top-2 left-2 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(observation.id)}
                    className="w-5 h-5 bg-[#2c2c2c] border-[#444] text-[#1a73e8]"
                />
            </div>

            <div className="relative">
                {observation.type === 'mixed' ? (
                    <div className="combined-media-container">
                        {observation.audioFiles.length > 0 && (
                            <div className="audio-section mb-4">
                                <h3 className="text-sm font-medium mb-2 text-[#e0e0e0]">Audio Files ({observation.audioFiles.length})</h3>
                                {observation.audioFiles.map((file, index) => (
                                    <div key={index} className="audio-container mb-2 bg-[#2c2c2c] rounded-lg">
                                        <audio
                                            ref={index === 0 ? audioRef : null}
                                            src={URL.createObjectURL(file)}
                                            preload="auto"
                                            onTimeUpdate={handleTimeUpdate}
                                            onLoadedMetadata={handleLoadedMetadata}
                                            className="w-full"
                                            controls
                                        />
                                        {observation.spectrogramUrls[index] && (
                                            <img
                                                src={observation.spectrogramUrls[index]}
                                                alt={`Spectrogram ${index + 1}`}
                                                className="w-full h-24 object-cover mt-2"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {observation.imageFiles.length > 0 && (
                            <div className="image-section">
                                <h3 className="text-sm font-medium mb-2">Images ({observation.imageFiles.length})</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {observation.imageFiles.map((file, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Combined image ${index + 1}`}
                                                className="w-full h-40 object-cover rounded-lg"
                                            />
                                            {/* Tampilkan tombol crop hanya jika handleCombinedImageCrop tersedia */}
                                            {handleCombinedImageCrop && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleCropClick(observation.id, index)}
                                                        className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                                                        title="Potong gambar"
                                                    >
                                                        <FontAwesomeIcon icon={faCrop} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    observation.type === 'audio' ? (
                        <div className="audio-container">
                            {audioUrl && (
                                <audio
                                    ref={audioRef}
                                    src={audioUrl}
                                    preload="auto"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            )}

                            <div className="spectrogram-wrapper relative">
                                {observation.spectrogramUrl ? (
                                    <>
                                        <button
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                                      bg-black/50 hover:bg-black/70 text-white rounded-full p-4 z-10
                                                      transition-opacity duration-300 group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay();
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={isPlaying ? faPause : faPlay}
                                                className="w-6 h-6"
                                            />
                                        </button>

                                        <Swiper
                                            ref={swiperRef}
                                            className="spectrogram-swiper"
                                            modules={[FreeMode]}
                                            freeMode={{
                                                enabled: true,
                                                momentum: true,
                                                momentumRatio: 0.8,
                                                momentumVelocityRatio: 0.6
                                            }}
                                            slidesPerView="auto"
                                            resistance={true}
                                            resistanceRatio={0}
                                            touchRatio={1.5}
                                            speed={300}
                                            cssMode={false}
                                        >
                                            <SwiperSlide>
                                                <div className="spectrogram-container z-2">
                                                    <img
                                                        src={observation.spectrogramUrl}
                                                        alt="Spectrogram"
                                                        className="spectrogram-image cursor-pointer z-2"
                                                        onClick={(e) => {
                                                            handleSpectrogramClick(e);
                                                            handleSpectrogramModalOpen();
                                                        }}
                                                    />
                                                    <div
                                                        ref={progressRef}
                                                        className="progress-overlay"
                                                    />
                                                </div>
                                            </SwiperSlide>
                                        </Swiper>
                                    </>
                                ) : (
                                    <div className="spectrogram-loading bg-[#2c2c2c] text-[#e0e0e0]">
                                        <div className="loading-spinner border-t-[#1a73e8]" />
                                        <span>Generating spectrogram...</span>
                                    </div>
                                )}
                            </div>

                            <div className="audio-controls flex items-center justify-between px-4 py-2 bg-[#2c2c2c] rounded-b-lg">
                                <button
                                    className="play-pause-btn flex items-center space-x-2 text-[#e0e0e0]"
                                    onClick={togglePlay}
                                >
                                    <FontAwesomeIcon
                                        icon={isPlaying ? faPause : faPlay}
                                        className="w-4 h-4"
                                    />
                                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                </button>

                                <div className="time-info text-sm text-[#e0e0e0]">
                                    <span>{formatTime(audioTime)} / {formatTime(audioDuration)}</span>
                                </div>

                                <span className="format-info text-sm text-[#e0e0e0]">
                                    {observation?.file?.type?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                                </span>
                            </div>

                            {error && <div className="error-message text-red-500 text-sm mt-2">{error}</div>}
                            {isBuffering && (
                                <div className="buffering-message text-gray-300 text-sm mt-2">
                                    <div className="loading-spinner border-t-[#1a73e8]" />
                                    <span>Buffering...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        observation.isCombined ? (
                            <div className="relative">
                                <div className="aspect-w-16 aspect-h-9">
                                    {observation.files.map((file, index) => (
                                        <div key={index} className={`relative ${index === currentSlide ? 'block' : 'hidden'}`}>
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Combined image ${index + 1}`}
                                                className="object-cover w-full h-full rounded-lg"
                                            />
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCropClick(observation.id, index)}
                                                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                                                    title="Potong gambar"
                                                >
                                                    <FontAwesomeIcon icon={faCrop} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {observation.files.length > 1 && (
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                                        {observation.files.map((_, index) => (
                                            <button
                                                key={index}
                                                className={`w-2 h-2 rounded-full ${
                                                    index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                                onClick={() => setCurrentSlide(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative group">
                                <img
                                    src={URL.createObjectURL(observation.file)}
                                    alt="Observation"
                                    className="object-cover w-full h-full rounded-lg"
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={handleCropClick}
                                        className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                                        title="Potong gambar"
                                    >
                                        <FontAwesomeIcon icon={faCrop} />
                                    </button>
                                </div>
                            </div>
                        )
                    )
                )}
            </div>

            <div className="form-container mt-4">
                <div className="form-group space-y-4">
                    <div className="relative">
                        <div className={`flex items-center space-x-3 rounded-lg border ${
                            validationErrors?.taxa ? 'border-red-500' : 'border-[#444]'
                        } p-3 hover:border-[#1a73e8] bg-[#2c2c2c]`}>
                            <FontAwesomeIcon icon={faDna} className={`${
                                validationErrors?.taxa ? 'text-red-500' : 'text-gray-400'
                            } w-5 h-5`} />
                            <input
                                type="text"
                                name="scientific_name"
                                placeholder="Nama Spesies"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                className={`w-full focus:outline-none ${
                                    validationErrors?.taxa ? 'text-red-500' : 'text-[#e0e0e0]'
                                } bg-transparent`}
                                value={formData.displayName || formData.scientific_name}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                            />
                            
                            {/* Loading indicator */}
                            {isLoadingMore ? (
                               <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                               <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                             </div>
                            ) : (
                                <span className="text-red-500 text-sm">*</span>
                            )}
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                className="absolute z-50 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-lg overflow-y-auto"
                                ref={suggestionsRef}
                                onScroll={handleSuggestionsScroll}
                                style={{
                                    maxHeight: '350px',
                                    minHeight: '100px'
                                }}
                            >
                                {renderTaxonSuggestions(suggestions)}
                                
                                {isLoadingMore && (
                                    <div className="p-2 text-center text-gray-400">
                                        <div className="inline-block w-4 h-4 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                        Memuat data...
                                    </div>
                                )}
                                
                                {hasMore && !isLoadingMore && (
                                    <div 
                                        className="p-2 text-center text-[#1a73e8] cursor-pointer hover:bg-[#3c3c3c]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            loadMoreSuggestions();
                                        }}
                                    >
                                        Lihat lebih banyak
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {formData.kingdom && (
                        <div className="mt-2 text-sm text-gray-300">
                            <div className="grid grid-cols-1 gap-1 border border-[#444] p-3 rounded-lg bg-[#2c2c2c]">
                                <div className="font-medium text-[#e0e0e0] border-b border-[#444] pb-1 mb-1">
                                    <FontAwesomeIcon icon={faInfo} className="w-4 h-4 mr-2" />
                                </div>
                                
                                {formData.kingdom && (
                                    <div className="flex justify-between">
                                        <span>Kingdom:</span> 
                                        <span className="text-[#e0e0e0]">{formData.kingdom}
                                            {formData.cname_kingdom && <span className="text-gray-400"> ({formData.cname_kingdom})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.phylum && (
                                    <div className="flex justify-between">
                                        <span>Phylum:</span> 
                                        <span className="text-[#e0e0e0]">{formData.phylum}
                                            {formData.cname_phylum && <span className="text-gray-400"> ({formData.cname_phylum})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.class && (
                                    <div className="flex justify-between">
                                        <span>Class:</span> 
                                        <span className="text-[#e0e0e0]">{formData.class}
                                            {formData.cname_class && <span className="text-gray-400"> ({formData.cname_class})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.order && (
                                    <div className="flex justify-between">
                                        <span>Order:</span> 
                                        <span className="text-[#e0e0e0]">{formData.order}
                                            {formData.cname_order && <span className="text-gray-400"> ({formData.cname_order})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.family && (
                                    <div className="flex justify-between">
                                        <span>Family:</span> 
                                        <span className="text-[#e0e0e0]">{formData.family}
                                            {formData.cname_family && <span className="text-gray-400"> ({formData.cname_family})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.genus && (
                                    <div className="flex justify-between">
                                        <span>Genus:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.genus}
                                            {formData.cname_genus && <span className="text-gray-400 not-italic"> ({formData.cname_genus})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.species && (
                                    <div className="flex justify-between">
                                        <span>Species:</span> 
                                        <span className="text-[#e0e0e0] italic">{extractScientificName(formData.species)}
                                            {formData.common_name && <span className="text-gray-400 not-italic"> ({formData.common_name})</span>}
                                        </span>
                                    </div>
                                )}
                                
                                {formData.subspecies && (
                                    <div className="flex justify-between">
                                        <span>Subspecies:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.subspecies}</span>
                                    </div>
                                )}
                                
                                {formData.variety && (
                                    <div className="flex justify-between">
                                        <span>Variety:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.variety}</span>
                                    </div>
                                )}
                                
                                {formData.form && (
                                    <div className="flex justify-between">
                                        <span>Form:</span> 
                                        <span className="text-[#e0e0e0] italic">{formData.form}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`flex items-center space-x-3 rounded-lg border ${
                        validationErrors?.date ? 'border-red-500' : 'border-[#444]'
                    } p-3 hover:border-[#1a73e8] bg-[#2c2c2c]`}>
                        <FontAwesomeIcon icon={faCalendar} className={`${
                            validationErrors?.date ? 'text-red-500' : 'text-gray-400'
                        } w-5 h-5`} />
                        <input
                            type="date"
                            name="date"
                            className={`w-full focus:outline-none ${
                                validationErrors?.date ? 'text-red-500' : 'text-[#e0e0e0]'
                            } bg-transparent`}
                            value={formData.date}
                            onChange={handleInputChange}
                        />
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className={`flex items-center space-x-3 rounded-lg border ${
                        validationErrors?.location ? 'border-red-500' : 'border-[#444]'
                    } p-3 hover:border-[#1a73e8] bg-[#2c2c2c]`}>
                        <FontAwesomeIcon icon={faLocationDot} className={`${
                            validationErrors?.location ? 'text-red-500' : 'text-gray-400'
                        } w-5 h-5`} />
                        <button
                            onClick={handleOpenLocationModal}
                            className={`w-full text-left ${
                                validationErrors?.location ? 'text-red-500' : 'text-[#e0e0e0]'
                            }`}
                        >
                            {formData.locationName || formData.latitude && formData.longitude ? (
                                <div>
                                    <div className={`${
                                        validationErrors?.location ? 'text-red-500' : 'text-[#e0e0e0]'
                                    }`}>
                                        {formData.locationName || `${formData.latitude}, ${formData.longitude}`}
                                    </div>
                                    {formData.latitude && formData.longitude && (
                                        <div className="text-xs text-gray-400">
                                            {`${formatCoordinate(formData.latitude)}, ${formatCoordinate(formData.longitude)}`}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className={`${
                                    validationErrors?.location ? 'text-red-500' : 'text-gray-400'
                                }`}>Pilih lokasi</span>
                            )}
                        </button>
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faTree} className="text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            name="habitat"
                            placeholder="Habitat"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                            value={formData.habitat}
                            onChange={handleInputChange}
                        />
                        {/* <span className="text-red-500 text-sm">*</span> */}
                    </div>

                    <div className="flex space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <FontAwesomeIcon icon={faNoteSticky} className="text-gray-400 w-5 h-5 mt-1" />
                        <textarea
                            name="description"
                            placeholder="Keterangan"
                            rows="3"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent resize-none"
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Observation data license selector */}
                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-400 text-sm w-40">Lisensi Data</span>
                            <div className="relative">
                                <FontAwesomeIcon 
                                    icon={faInfoCircle} 
                                    className="text-gray-500 text-xs cursor-help"
                                    onMouseEnter={() => setShowLicenseTooltip('observation')}
                                    onMouseLeave={() => setShowLicenseTooltip(null)}
                                />
                                {showLicenseTooltip === 'observation' && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 w-64">
                                        <div className="text-center">
                                            Default dari profil pengguna. Dapat diubah per item.
                                        </div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <select
                            name="license_observation"
                            className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                            value={formData.license_observation}
                            onChange={handleInputChange}
                        >
                            {LICENSE_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Media license selector(s) */}
                    {observation.type === 'audio' && (
                        <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400 text-sm w-40">Lisensi Audio</span>
                                <div className="relative">
                                    <FontAwesomeIcon 
                                        icon={faInfoCircle} 
                                        className="text-gray-500 text-xs cursor-help"
                                        onMouseEnter={() => setShowLicenseTooltip('audio')}
                                        onMouseLeave={() => setShowLicenseTooltip(null)}
                                    />
                                    {showLicenseTooltip === 'audio' && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 w-64">
                                            <div className="text-center">
                                                Default dari profil pengguna. Dapat diubah per item.
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <select
                                name="license_audio"
                                className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                                value={formData.license_audio}
                                onChange={handleInputChange}
                            >
                                {LICENSE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(observation.type === 'image' || observation.type === 'photo') && !observation.isCombined && (
                        <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400 text-sm w-40">Lisensi Foto</span>
                                <div className="relative">
                                    <FontAwesomeIcon 
                                        icon={faInfoCircle} 
                                        className="text-gray-500 text-xs cursor-help"
                                        onMouseEnter={() => setShowLicenseTooltip('photo')}
                                        onMouseLeave={() => setShowLicenseTooltip(null)}
                                    />
                                    {showLicenseTooltip === 'photo' && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 w-64">
                                            <div className="text-center">
                                                Default dari profil pengguna. Dapat diubah per item.
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <select
                                name="license_photo"
                                className="w-full focus:outline-none text-[#e0e0e0] bg-transparent"
                                value={formData.license_photo}
                                onChange={handleInputChange}
                            >
                                {LICENSE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {observation.isCombined && (
                        <div className="space-y-3">
                            {/* Tampilkan lisensi foto hanya jika ada file gambar */}
                            {((observation.imageFiles && observation.imageFiles.length > 0) || 
                              (observation.files && observation.files.some(file => file.type?.startsWith('image/')))) && (
                                <div className="rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <span className="text-gray-400 text-sm min-w-[100px]">Lisensi Foto</span>
                                            <div className="relative">
                                                <FontAwesomeIcon 
                                                    icon={faInfoCircle} 
                                                    className="text-gray-500 text-xs cursor-help pointer-events-auto"
                                                    onMouseEnter={() => setShowLicenseTooltip('photo-combined')}
                                                    onMouseLeave={() => setShowLicenseTooltip(null)}
                                                />
                                                {showLicenseTooltip === 'photo-combined' && (
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 w-64 pointer-events-none">
                                                        <div className="text-center">
                                                            Default dari profil pengguna. Dapat diubah per item.
                                                        </div>
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <select
                                            name="license_photo"
                                            className="flex-1 focus:outline-none text-[#e0e0e0] bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 relative z-10"
                                            value={formData.license_photo || 'CC BY-NC'}
                                            onChange={handleInputChange}
                                        >
                                            {LICENSE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {/* Tampilkan lisensi audio hanya jika ada file audio */}
                            {((observation.audioFiles && observation.audioFiles.length > 0) || 
                              (observation.files && observation.files.some(file => file.type?.startsWith('audio/')))) && (
                                <div className="rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c]">
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <span className="text-gray-400 text-sm min-w-[100px]">Lisensi Audio</span>
                                            <div className="relative">
                                                <FontAwesomeIcon 
                                                    icon={faInfoCircle} 
                                                    className="text-gray-500 text-xs cursor-help pointer-events-auto"
                                                    onMouseEnter={() => setShowLicenseTooltip('audio-combined')}
                                                    onMouseLeave={() => setShowLicenseTooltip(null)}
                                                />
                                                {showLicenseTooltip === 'audio-combined' && (
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 w-64 pointer-events-none">
                                                        <div className="text-center">
                                                            Default dari profil pengguna. Dapat diubah per item.
                                                        </div>
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <select
                                            name="license_audio"
                                            className="flex-1 focus:outline-none text-[#e0e0e0] bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 relative z-10"
                                            value={formData.license_audio || 'CC BY-NC'}
                                            onChange={handleInputChange}
                                        >
                                            {LICENSE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt} className="bg-[#2c2c2c]">{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {observation.type === 'audio' && (
                        <div className={`flex items-center space-x-3 rounded-lg border ${
                            validationErrors?.type_sound ? 'border-red-500' : 'border-[#444]'
                        } p-3 hover:border-[#1a73e8] bg-[#2c2c2c]`}>
                            <FontAwesomeIcon icon={faMusic} className={`${
                                validationErrors?.type_sound ? 'text-red-500' : 'text-gray-400'
                            } w-5 h-5`} />
                            <select
                                name="type_sound"
                                className={`w-full focus:outline-none ${
                                    validationErrors?.type_sound ? 'text-red-500' : 'text-[#e0e0e0]'
                                } bg-transparent`}
                                value={formData.type_sound}
                                onChange={handleInputChange}
                            >
                                <option value="" className="bg-[#2c2c2c]">Pilih tipe suara</option>
                                <option value="song" className="bg-[#2c2c2c]">Song</option>
                                <option value="call" className="bg-[#2c2c2c]">Call</option>
                                <option value="alarm" className="bg-[#2c2c2c]">Alarm</option>
                                <option value="unknown" className="bg-[#2c2c2c]">Tidak tahu</option>
                            </select>
                            {observation.type === 'audio' && <span className="text-red-500 text-sm">*</span>}
                        </div>
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-400">
                    <span className="text-red-500">*</span> Wajib diisi
                </div>

                <div className="action-buttons mt-4">
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-[#d13434] text-white rounded hover:bg-[#b02a2a] transition-colors"
                    >
                        Hapus
                    </button>
                </div>
            </div>

            <input
                type="hidden"
                name="upload_session_id"
                value={uploadSessionId}
            />

            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker
                    onSave={handleLocationSave}
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    initialLocationName={formData.locationName}
                />
            </Modal>

            <ImageCropModal
                isOpen={isCropModalOpen}
                onClose={() => {
                    setIsCropModalOpen(false);
                    if (imageUrl) {
                        URL.revokeObjectURL(imageUrl);
                        setImageUrl('');
                    }
                }}
                imageUrl={imageUrl}
                onSave={handleCropSave}
            />
        </div>
    );
}

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

MediaCard.propTypes = {
    uploadSessionId: PropTypes.string.isRequired,
    validationErrors: PropTypes.object,
    id: PropTypes.string,
    handleCombinedImageCrop: PropTypes.func,
    userLicenseDefaults: PropTypes.shape({
        license_observation: PropTypes.string,
        license_photo: PropTypes.string,
        license_audio: PropTypes.string
    })
};

export default MediaCard;
