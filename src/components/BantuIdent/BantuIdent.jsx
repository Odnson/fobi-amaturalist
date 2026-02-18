import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faUsers, faPause, faPlay, faSearch, faFilter, faTimes, faChevronLeft, faChevronRight, faChevronDown, faChevronUp, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import ChecklistDetail from '../DetailObservations/ChecklistDetail';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import defaultFobiLogo from '../../assets/icon/FOBI.png';
import './BantuIdent.css';
import SearchWithSuggestions from './SearchWithSuggestions';
import Footer from '../Footer';
const getDefaultImage = (type) => {
  return defaultFobiLogo;
};
const getImageUrl = (item) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
        if (imageUrl) return imageUrl;
    }
    return getDefaultImage(item.type);
};
const getGradeDisplay = (grade) => {
    if (!grade) return '-';
    
    switch (grade.toLowerCase()) {
        case 'research grade':
            return 'ID Lengkap';
        case 'needs id':
            return 'Bantu Iden';
        case 'low quality id':
            return 'ID Kurang';
        case 'confirmed id':
            return 'ID Terkonfirmasi';
        case 'casual':
            return 'Checklist';
        default:
            return grade;
    }
};
const formatLocation = (lat, long) => {
    if (!lat || !long) return '-';
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(long).toFixed(6)}`;
};
const TAXONOMIC_RANKS = [
    { key: 'domain', label: 'Domain', field: 'domain' },
    { key: 'superkingdom', label: 'Superkingdom', field: 'superkingdom' },
    { key: 'kingdom', label: 'Kingdom', field: 'kingdom' },
    { key: 'subkingdom', label: 'Subkingdom', field: 'subkingdom' },
    { key: 'superphylum', label: 'Superphylum', field: 'superphylum' },
    { key: 'phylum', label: 'Phylum', field: 'phylum' },
    { key: 'subphylum', label: 'Subphylum', field: 'subphylum' },
    { key: 'superclass', label: 'Superclass', field: 'superclass' },
    { key: 'class', label: 'Class', field: 'class' },
    { key: 'subclass', label: 'Subclass', field: 'subclass' },
    { key: 'infraclass', label: 'Infraclass', field: 'infraclass' },
    { key: 'superorder', label: 'Superorder', field: 'superorder' },
    { key: 'order', label: 'Order', field: 'order' },
    { key: 'suborder', label: 'Suborder', field: 'suborder' },
    { key: 'infraorder', label: 'Infraorder', field: 'infraorder' },
    { key: 'superfamily', label: 'Superfamily', field: 'superfamily' },
    { key: 'family', label: 'Family', field: 'family' },
    { key: 'subfamily', label: 'Subfamily', field: 'subfamily' },
    { key: 'supertribe', label: 'Supertribe', field: 'supertribe' },
    { key: 'tribe', label: 'Tribe', field: 'tribe' },
    { key: 'subtribe', label: 'Subtribe', field: 'subtribe' },
    { key: 'genus', label: 'Genus', field: 'genus' },
    { key: 'subgenus', label: 'Subgenus', field: 'subgenus' },
    { key: 'species', label: 'Species', field: 'species' },
    { key: 'subspecies', label: 'Subspecies', field: 'subspecies' },
    { key: 'variety', label: 'Variety', field: 'variety' },
    { key: 'form', label: 'Form', field: 'form' },
    { key: 'subform', label: 'Subform', field: 'subform' }
];
const FilterDropdown = ({ filters, setFilters, observations }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});
    const [searchInputs, setSearchInputs] = useState({});
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const getUniqueValues = (field, searchTerm = '') => {
        if (!observations) return [];
        
        const values = new Set();
        observations.forEach(obs => {
            const originalData = obs.originalData;
            if (originalData && originalData[field]) {
                values.add(originalData[field]);
            }
        });
        
        let sortedValues = Array.from(values).sort();
        if (searchTerm) {
            sortedValues = sortedValues.filter(value => 
                value.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return sortedValues;
    };
    const applyFilter = (rank, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [rank]: value
        }));
        
        setFilters(prev => ({
            ...prev,
            taxonomicFilters: {
                ...prev.taxonomicFilters,
                [rank]: value
            }
        }));
    };
    useEffect(() => {
        if (filters.taxonomicFilters) {
            setActiveFilters(filters.taxonomicFilters);
        }
    }, [filters.taxonomicFilters]);
    const clearFilter = (rank) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[rank];
            return newFilters;
        });
        
        setFilters(prev => ({
            ...prev,
            taxonomicFilters: {
                ...prev.taxonomicFilters,
                [rank]: ''
            }
        }));
    };
    const clearAllFilters = () => {
        setActiveFilters({});
        setSearchInputs({});
        setFilters(prev => ({
            ...prev,
            taxonomicFilters: {}
        }));
    };
    const handleDropdownToggle = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            setSearchInputs({});
            setIsOpen(true);
        }
    };
    const activeFilterCount = Object.keys(activeFilters).filter(key => activeFilters[key]).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleDropdownToggle}
                className={`flex items-center gap-2 px-3 py-2 md:px-4 rounded-lg border transition-colors text-sm ${
                    activeFilterCount > 0 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-[#2c2c2c] border-[#444] text-gray-300 hover:bg-[#333]'
                }`}
                title="Filter berdasarkan hierarki taksa. Jika taksa tidak ditemukan, mungkin sudah teridentifikasi lengkap atau belum ada observasi."
            >
                <FontAwesomeIcon icon={faFilter} />
                <span className="hidden sm:inline">Filter Taksa</span>
                {activeFilterCount > 0 && (
                    <span className="bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                        {activeFilterCount}
                    </span>
                )}
                <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="text-sm" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed md:absolute bottom-0 md:bottom-auto md:top-full left-0 right-0 md:left-0 md:right-auto mt-0 md:mt-2 w-full md:w-[600px] md:max-w-[90vw] bg-[#1e1e1e] border border-[#444] rounded-t-2xl md:rounded-lg shadow-xl z-50 max-h-[70vh] md:max-h-[500px] overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-medium">Filter Hierarki Taksa</h3>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-red-400 hover:text-red-300 text-sm"
                                >
                                    Hapus Semua
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                            {TAXONOMIC_RANKS.map(rank => {
                                const searchTerm = searchInputs[rank.key] || '';
                                const uniqueValues = getUniqueValues(rank.field, searchTerm);
                                const allValues = getUniqueValues(rank.field);
                                if (allValues.length === 0) return null;

                                return (
                                    <div key={rank.key} className="space-y-2 bg-[#2a2a2a] p-3 rounded-lg">
                                        <label className="text-gray-300 text-sm font-medium flex items-center justify-between">
                                            <span>{rank.label}</span>
                                            <span className="text-xs text-gray-500">({allValues.length} total)</span>
                                        </label>
                                        
                                        {/* Search Input */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder={`Cari ${rank.label.toLowerCase()}...`}
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchInputs(prev => ({
                                                        ...prev,
                                                        [rank.key]: e.target.value
                                                    }));
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setSearchInputs(prev => ({
                                                            ...prev,
                                                            [rank.key]: ''
                                                        }));
                                                    }
                                                }}
                                                className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#444] rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                                            />
                                            <FontAwesomeIcon 
                                                icon={faSearch} 
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => {
                                                        setSearchInputs(prev => ({
                                                            ...prev,
                                                            [rank.key]: ''
                                                        }));
                                                    }}
                                                    className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                                                    title="Hapus pencarian"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown Select */}
                                        <div className="flex gap-2">
                                            {uniqueValues.length > 0 ? (
                                                <select
                                                    value={activeFilters[rank.key] || ''}
                                                    onChange={(e) => applyFilter(rank.key, e.target.value)}
                                                    className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#444] rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    size={Math.min(uniqueValues.length + 1, 6)}
                                                >
                                                    <option value="">Semua {rank.label}</option>
                                                    {uniqueValues.map(value => (
                                                        <option key={value} value={value}>
                                                            {value}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex-1 px-3 py-2 bg-[#1e1e1e] border border-[#444] rounded text-gray-500 text-sm">
                                                    <div className="text-center mb-2">
                                                        Tidak ada hasil untuk "{searchTerm}"
                                                    </div>
                                                    <div className="text-xs text-gray-400 leading-relaxed">
                                                        <div className="mb-1">Kemungkinan penyebab:</div>
                                                        <div>• Taksa tidak termasuk kategori halaman ini</div>
                                                        <div>• Taksa sudah memiliki ID lengkap</div>
                                                        <div>• Belum ada yang mengobservasi taksa ini</div>
                                                    </div>
                                                </div>
                                            )}
                                            {activeFilters[rank.key] && (
                                                <button
                                                    onClick={() => clearFilter(rank.key)}
                                                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors self-start"
                                                    title="Hapus filter"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Show filtered count */}
                                        {searchTerm && (
                                            <div className="text-xs text-gray-400">
                                                Menampilkan {uniqueValues.length} dari {allValues.length} opsi
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {TAXONOMIC_RANKS.every(rank => getUniqueValues(rank.field).length === 0) && (
                                <div className="col-span-2 text-center text-gray-500 py-8">
                                    <FontAwesomeIcon icon={faFilter} className="text-2xl mb-4" />
                                    <div className="text-lg mb-3">Tidak ada data taksa untuk difilter</div>
                                    <div className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                                        <div className="mb-2">Kemungkinan penyebab:</div>
                                        <div className="text-left space-y-1">
                                            <div>• Semua observasi sudah memiliki identifikasi lengkap</div>
                                            <div>• Data taksa belum tersedia untuk halaman ini</div>
                                            <div>• Filter grade yang dipilih tidak memiliki data</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#444]">
                                <div className="text-gray-300 text-sm">
                                    <strong>Filter Aktif:</strong>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {Object.entries(activeFilters).map(([key, value]) => {
                                            if (!value) return null;
                                            const rank = TAXONOMIC_RANKS.find(r => r.key === key);
                                            return (
                                                <span
                                                    key={key}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                                                >
                                                    {rank?.label}: {value}
                                                    <button
                                                        onClick={() => clearFilter(key)}
                                                        className="hover:text-red-200"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}
        </div>
    );
};
const getSourceAndCleanId = (id) => {
    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);
    return { source: 'fobi', cleanId: idString };
};
const MediaSlider = ({ images, spectrogram, audioUrl, type, isEager }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const mediaItems = [];
    if (images && Array.isArray(images) && images.length > 0) {
        images.forEach(img => {
            let imageUrl;
            if (typeof img === 'string') {
                imageUrl = img;
            } else if (img && typeof img === 'object') {
                imageUrl = img.url;
            }
            
            if (imageUrl) {
                mediaItems.push({ type: 'image', url: imageUrl });
            }
        });
    }
    if (spectrogram) {
        mediaItems.push({ type: 'spectrogram', url: spectrogram, audioUrl });
    }
    if (mediaItems.length === 0) {
        mediaItems.push({ 
            type: 'image', 
            url: getDefaultImage(type)
        });
    }

    const safeActiveIndex = Math.min(activeIndex, mediaItems.length - 1);

    return (
        <div className="relative w-full h-full">
            <div className="w-full h-full overflow-hidden bg-[#2c2c2c]">
                {mediaItems[safeActiveIndex]?.type === 'spectrogram' ? (
                    <SpectrogramPlayer
                        spectrogramUrl={mediaItems[safeActiveIndex].url}
                        audioUrl={mediaItems[safeActiveIndex].audioUrl}
                    />
                ) : (
                    <img
                        src={mediaItems[safeActiveIndex]?.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading={isEager ? "eager" : "lazy"}
                        onError={(e) => {
                            e.target.src = getDefaultImage(type);
                        }}
                    />
                )}
            </div>

            {mediaItems.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                    <div className="flex gap-1 px-2 py-1 rounded-full bg-black/30">
                        {mediaItems.map((_, idx) => (
                            <button
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    idx === safeActiveIndex ? 'bg-white' : 'bg-gray-400 hover:bg-gray-300'
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(idx);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
const ObservationCard = ({ observation, onClick, isEager = false }) => {
    const getTaxonomyTitle = () => {
        if (!observation.taxonomyLevel) return '';
        return `${observation.taxonomyLevel.charAt(0).toUpperCase() + observation.taxonomyLevel.slice(1)}: ${observation.title}`;
    };

    const imagesCount = observation.images && Array.isArray(observation.images) ? observation.images.length : 0;

    return (
        <div 
            className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] hover:border-[#444] transition-all duration-200 cursor-pointer group hover:shadow-lg hover:scale-[1.02] hover:bg-[#252525]"
            onClick={onClick}
        >
            {/* Image / Spectrogram */}
            <div className="relative h-40 bg-[#2c2c2c]">
                <MediaSlider
                    images={observation.images || [observation.image]}
                    spectrogram={observation.spectrogram}
                    audioUrl={observation.audioUrl}
                    type={observation.type}
                    isEager={isEager}
                />
                
                {/* Images count badge */}
                {imagesCount > 1 && (
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
                        <FontAwesomeIcon icon={faImage} className="text-xs" />
                        <span>{imagesCount}</span>
                    </div>
                )}
            </div>
            
            {/* Content */}
            <div className="p-3 flex flex-col h-32">
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <div className="text-xs text-gray-400 truncate">
                        <Link 
                            to={`/profile/${observation.observer_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-400 transition-colors"
                        >
                            {observation.observer}
                        </Link>
                    </div>
                    {/* Grade Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${
                        observation.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-700/70' :
                        observation.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-700/70' :
                        observation.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-700/70' :
                        observation.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-700/70' :
                        'bg-gray-700/70'
                    }`}>
                        {getGradeDisplay(observation.quality.grade)}
                    </span>
                </div>
                <div className="mb-1">
                    {/* Sistem dinamis untuk menampilkan nama dari tabel taxas - sama seperti GridView */}
                    {(() => {
                        const commonNameField = `cname_${observation.taxonomyLevel}`;
                        const latinNameField = observation.taxonomyLevel;
                        const commonName = observation[commonNameField];
                        const latinName = observation[latinNameField];
                        if (commonName && latinName && commonName !== latinName) {
                            return (
                                <>
                                    {/* Common name - tidak italic */}
                                    <h3 
                                        className={`font-medium text-white text-sm truncate ${observation.taxonomyLevel ? 'cursor-help' : ''}`}
                                        title={getTaxonomyTitle()}
                                    >
                                        {commonName}
                                    </h3>
                                    {/* Nama latin - italic hanya untuk species ke bawah */}
                                    <div 
                                        className={`text-xs text-gray-300 truncate ${['species', 'subspecies', 'form', 'variety'].includes(observation.taxonomyLevel?.toLowerCase()) ? 'italic' : ''}`}
                                        title={`${observation.taxonomyLevel}: ${latinName}`}
                                    >
                                        {latinName}
                                    </div>
                                </>
                            );
                        }
                        const displayName = commonName || latinName || observation.title || '-';
                        const isLatinOnly = !commonName && latinName;
                        
                        return (
                            <h3 
                                className={`font-medium text-white text-sm truncate ${isLatinOnly && ['species', 'subspecies', 'form', 'variety'].includes(observation.taxonomyLevel?.toLowerCase()) ? 'italic' : ''} ${observation.taxonomyLevel ? 'cursor-help' : ''}`}
                                title={getTaxonomyTitle()}
                            >
                                {displayName}
                            </h3>
                        );
                    })()}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faCalendar} className="text-[10px]" />
                        <span className="truncate">
                            {observation.observation_date 
                                ? new Date(observation.observation_date).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short'
                                })
                                : '-'
                            }
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                        <span className="truncate">{observation.location || '-'}</span>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="footer-tooltip px-3 py-1 bg-[#161616] border-t border-[#333] h-10 flex items-center hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                        <span>{observation.identifications_count || 0} Identifikasi</span>
                    </div>
                    
                    <div className="relative">
                        <div className="text-xs text-green-700 font-medium cursor-help">
                            {observation.fobi_count || 0}
                        </div>
                        
                        {/* Tooltip */}
                        <div className="footer-tooltip-content absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-30 min-w-[150px] whitespace-nowrap opacity-0 invisible transition-all duration-200">
                            <div className="font-medium mb-1 border-b border-gray-600 pb-1">Total Checklist:</div>
                            <div className="flex justify-between items-center py-0.5">
                                <span>Amaturalist:</span>
                                <span className="text-green-700 font-medium">{observation.fobi_count || 0}</span>
                            </div>
                            <div className="absolute bottom-[-6px] right-2 w-3 h-3 bg-gray-800 transform rotate-45"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ObservationModal = ({ isOpen, onClose, observation, onPrev, onNext, hasPrev, hasNext }) => {
    const queryClient = useQueryClient();
    const formattedId = observation ? observation.id : null;
    const [navLoading, setNavLoading] = useState(false);
    const [checklistKey, setChecklistKey] = useState(0);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    useEffect(() => {
        if (observation) {
            setChecklistKey(prev => prev + 1);
        }
    }, [observation?.id]);

    const handlePrevClick = (e) => {
        e.stopPropagation();
        if (navLoading || !onPrev) return;
        setNavLoading(true);
        setTimeout(() => {
            onPrev();
            setNavLoading(false);
        }, 300);
    };

    const handleNextClick = (e) => {
        e.stopPropagation();
        if (navLoading || !onNext) return;
        setNavLoading(true);
        setTimeout(() => {
            onNext();
            setNavLoading(false);
        }, 300);
    };
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const updateMutation = useMutation({
        mutationFn: async (updatedData) => {
            const { source, cleanId } = getSourceAndCleanId(updatedData.id);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/${cleanId}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['observations']);
            onClose();
        },
        onError: (error) => {
            console.error('Update error:', error);
        }
    });

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[100]"
                onClose={() => {}} // Disable auto close
                static
            >
                {/* Backdrop - klik untuk close */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-75" 
                        aria-hidden="true"
                        onClick={handleBackdropClick}
                    />
                </Transition.Child>

                {/* Loading overlay */}
                {navLoading && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center pointer-events-none">
                        <div className="bg-black/30 absolute inset-0" />
                        <div className="relative z-[1101] w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Desktop Only: Tombol Close - fixed di pojok kanan atas */}
                <button
                    type="button"
                    aria-label="Tutup"
                    onClick={onClose}
                    className="hidden sm:flex fixed top-4 right-4 z-[102] w-11 h-11 items-center justify-center rounded-full bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 hover:text-white border border-[#444] shadow-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Desktop Nav Arrows - fixed di tepi layar */}
                {hasPrev && (
                    <button
                        type="button"
                        aria-label="Sebelumnya"
                        onClick={handlePrevClick}
                        disabled={navLoading}
                        className={`hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 z-[102] bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 hover:text-white w-11 h-11 rounded-full items-center justify-center shadow-xl border border-[#444] transition-all hover:scale-110 ${navLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                {hasNext && (
                    <button
                        type="button"
                        aria-label="Berikutnya"
                        onClick={handleNextClick}
                        disabled={navLoading}
                        className={`hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 z-[102] bg-[#2c2c2c] hover:bg-[#3c3c3c] text-gray-300 hover:text-white w-11 h-11 rounded-full items-center justify-center shadow-xl border border-[#444] transition-all hover:scale-110 ${navLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Mobile Nav Arrows - fixed di tepi layar */}
                {hasPrev && (
                    <button
                        type="button"
                        aria-label="Sebelumnya"
                        onClick={handlePrevClick}
                        disabled={navLoading}
                        className={`sm:hidden fixed left-2 top-1/2 -translate-y-1/2 z-[102] bg-black/80 backdrop-blur-sm text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all ${navLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                {hasNext && (
                    <button
                        type="button"
                        aria-label="Berikutnya"
                        onClick={handleNextClick}
                        disabled={navLoading}
                        className={`sm:hidden fixed right-2 top-1/2 -translate-y-1/2 z-[102] bg-black/80 backdrop-blur-sm text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all ${navLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Container untuk modal panel */}
                <div className="fixed inset-0 overflow-y-auto" onClick={handleBackdropClick}>
                    <div className="flex min-h-full items-center justify-center p-0 sm:px-20 sm:py-4" onClick={handleBackdropClick}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel 
                                className="relative w-full sm:max-w-5xl lg:max-w-6xl transform overflow-hidden sm:rounded-2xl bg-[#1e1e1e] shadow-xl transition-all min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Mobile Only: Close Button */}
                                <button
                                    type="button"
                                    aria-label="Tutup"
                                    onClick={onClose}
                                    className="sm:hidden fixed top-3 right-3 z-[110] w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white shadow-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {observation && (
                                    <ChecklistDetail 
                                        key={`checklist-${formattedId}-${checklistKey}`}
                                        id={formattedId}
                                        isModal={true}
                                        onClose={onClose}
                                        onUpdate={(data) => updateMutation.mutate(data)}
                                    />
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', () => {
                const duration = audioRef.current.duration;
                const currentTime = audioRef.current.currentTime;
                const progress = (currentTime / duration) * 100;
                setProgress(progress);
            });

            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setProgress(0);
            });
        }
    }, []);

    return (
        <div className="relative w-full h-full bg-black flex flex-col">
            <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden">
                <img
                    src={spectrogramUrl}
                    alt="Spectrogram"
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                {audioUrl && (
                    <>
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
                            <div
                                className="h-full bg-emerald-500 transition-width duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                            className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            <FontAwesomeIcon
                                icon={isPlaying ? faPause : faPlay}
                                className="text-xs"
                            />
                        </button>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            className="hidden"
                            preload="metadata"
                        />
                    </>
                )}
            </div>
        </div>
    );
};
const generateUniqueKey = (observation) => {
    const timestamp = Date.parse(observation.created_at);
    const randomSuffix = Math.random().toString(36).substring(7);
    return `${observation.type}-${observation.id}-${timestamp}-${randomSuffix}`;
};
const BantuIdent = () => {
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const queryClient = useQueryClient();
    const [displayedItems, setDisplayedItems] = useState(12);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [visibleIndex, setVisibleIndex] = useState(null);
    const [filters, setFilters] = useState({
        grades: ['needs id', 'low quality id', 'confirmed id'],
        searchQuery: '',
        searchType: 'all_taxa',
        taxonomicFilters: {}
    });

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });

    const formatGeneralData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => {
            let title = 'Belum teridentifikasi';
            let taxonomyLevel = '';
            if (item?.rank) {
                taxonomyLevel = item.rank;
                if (item[`cname_${item.rank}`]) {
                    title = item[`cname_${item.rank}`];
                } 
                else if (item[item.rank]) {
                    title = item[item.rank];
                }
            } 
            else {
                const taxonomyLevels = [
                    'subform', 'form', 'variety', 'subspecies', 'species', 'subgenus', 'genus',
                    'subtribe', 'tribe', 'supertribe', 'subfamily', 'family', 'superfamily',
                    'infraorder', 'suborder', 'order', 'superorder', 'infraclass', 'subclass',
                    'class', 'superclass', 'subdivision', 'division', 'superdivision', 'subphylum',
                    'phylum', 'superphylum', 'subkingdom', 'kingdom', 'superkingdom', 'domain'
                ];
                let foundLevel = null;
                let foundValue = null;
                
                for (const level of taxonomyLevels) {
                    if (item[`cname_${level}`]) {
                        foundLevel = level;
                        foundValue = item[`cname_${level}`];
                        break;
                    }
                    else if (item[level]) {
                        foundLevel = level;
                        foundValue = item[level];
                        break;
                    }
                }
                if (foundLevel && foundValue) {
                    taxonomyLevel = foundLevel;
                    title = foundValue;
                }
            }
            let images = [];
            if (item?.images && Array.isArray(item.images)) {
                images = item.images;
            } else if (item?.image) {
                images = [{ url: item.image }];
            }
            
            return {
                id: `${item?.id || ''}`,
                taxa_id: item?.taxa_id || '',
                media_id: item?.media_id || '',
                image: item?.images?.[0]?.url || item?.image || null,
                images: images,
                title: title,
                taxonomyLevel: taxonomyLevel,
                description: `Family: ${item?.family || '-'}
                Genus: ${item?.genus || '-'}
                Species: ${item?.species || '-'}`,
                observer: item?.observer_name || 'Anonymous',
                observer_id: item?.observer_id || '',
                quality: {
                    grade: item?.grade || 'casual',
                    has_media: Boolean(item?.has_media),
                    is_wild: Boolean(item?.is_wild),
                    location_accurate: Boolean(item?.location_accurate),
                    recent_evidence: Boolean(item?.recent_evidence),
                    related_evidence: Boolean(item?.related_evidence),
                    needs_id: Boolean(item?.needs_id),
                    community_id_level: item?.community_id_level || null
                },
                observation_date: item?.observation_date || '',
                created_at: item?.created_at || new Date(0).toISOString(),
                updated_at: item?.updated_at || '',
                type: 'general',
                source: item?.source || 'fobi',
                spectrogram: item?.spectrogram || null,
                audioUrl: item?.audio_url || null,
                kingdom: item?.kingdom,
                subkingdom: item?.subkingdom,
                superkingdom: item?.superkingdom,
                phylum: item?.phylum,
                subphylum: item?.subphylum,
                superphylum: item?.superphylum,
                division: item?.division,
                superdivision: item?.superdivision,
                class: item?.class,
                subclass: item?.subclass,
                infraclass: item?.infraclass,
                order: item?.order,
                suborder: item?.suborder,
                superorder: item?.superorder,
                infraorder: item?.infraorder,
                superfamily: item?.superfamily,
                family: item?.family,
                subfamily: item?.subfamily,
                tribe: item?.tribe,
                subtribe: item?.subtribe,
                genus: item?.genus,
                species: item?.species,
                form: item?.form,
                variety: item?.variety,
                subspecies: item?.subspecies,
                cname_kingdom: item?.cname_kingdom,
                cname_subkingdom: item?.cname_subkingdom,
                cname_superkingdom: item?.cname_superkingdom,
                cname_phylum: item?.cname_phylum,
                cname_subphylum: item?.cname_subphylum,
                cname_superphylum: item?.cname_superphylum,
                cname_division: item?.cname_division,
                cname_superdivision: item?.cname_superdivision,
                cname_class: item?.cname_class,
                cname_subclass: item?.cname_subclass,
                cname_infraclass: item?.cname_infraclass,
                cname_order: item?.cname_order,
                cname_suborder: item?.cname_suborder,
                cname_superorder: item?.cname_superorder,
                cname_infraorder: item?.cname_infraorder,
                cname_superfamily: item?.cname_superfamily,
                cname_family: item?.cname_family,
                cname_subfamily: item?.cname_subfamily,
                cname_tribe: item?.cname_tribe,
                cname_subtribe: item?.cname_subtribe,
                cname_genus: item?.cname_genus,
                cname_species: item?.cname_species,
                cname_form: item?.cname_form,
                cname_variety: item?.cname_variety,
                cname_subspecies: item?.cname_subspecies,
                
                identifications_count: item?.total_identifications || item?.identifications_count || 0,
                fobi_count: item?.fobi_count || 0,
                location: formatLocation(item?.latitude, item?.longitude),
                locationData: {
                    latitude: parseFloat(item?.latitude),
                    longitude: parseFloat(item?.longitude)
                },
                rank: item?.rank || '',
                originalData: item
            };
        });
    };

    const fetchObservations = async () => {
        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        
        try {
            let allData = [];
            let currentPage = 1;
            let hasMorePages = true;
            
            console.log(' Memulai fetch semua data observasi...');
            
            while (hasMorePages) {
                const queryParams = new URLSearchParams();
                queryParams.append('grade[]', 'needs id');
                queryParams.append('grade[]', 'low quality id');
                queryParams.append('grade[]', 'confirmed id');
                queryParams.append('per_page', '500'); // Ambil 500 per request
                queryParams.append('page', currentPage.toString());
                
                const queryString = queryParams.toString();
                
                console.log(` Fetching page ${currentPage}...`);
                
                const response = await fetch(`${baseUrl}/general-observations?${queryString}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch general observations');
                }
                
                const json = await response.json();
                
                if (!json.success) {
                    console.error('Error in general observations response:', json);
                    break;
                }
                
                const pageData = json.data || [];
                
                if (pageData.length === 0) {
                    hasMorePages = false;
                    console.log(' Tidak ada data lagi, selesai fetching');
                } else {
                    allData = [...allData, ...pageData];
                    console.log(` Page ${currentPage} loaded: ${pageData.length} items (Total: ${allData.length})`);
                    if (pageData.length < 500) {
                        hasMorePages = false;
                        console.log(' Halaman terakhir tercapai');
                    } else {
                        currentPage++;
                    }
                }
            }
            
            console.log(` Selesai! Total data yang diambil: ${allData.length} observasi`);
            
            const formattedData = formatGeneralData(allData);
            const filtered = formattedData.filter(item => 
                item.quality.grade.toLowerCase() === 'needs id' || 
                item.quality.grade.toLowerCase() === 'low quality id' ||
                item.quality.grade.toLowerCase() === 'confirmed id'
            );
            
            console.log(` Data setelah filter grade: ${filtered.length} observasi`);
            
            return filtered;
        } catch (err) {
            console.error(' Error fetching general observations:', err);
            return [];
        }
    };
    const { data: observations, isLoading, error } = useQuery({
        queryKey: ['observations'],
        queryFn: fetchObservations,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30000, // Data dianggap stale setelah 30 detik
        cacheTime: 5 * 60 * 1000, // Cache bertahan 5 menit
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    const handleCardClick = (observation) => {
        setSelectedObservation(observation);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
    };
    const [lastViewedId, setLastViewedId] = useState(null);
    useEffect(() => {
        if (selectedObservation?.id) {
            setLastViewedId(selectedObservation.id);
        }
    }, [selectedObservation?.id]);
    const loadMore = () => {
        if (loadingMore) return;
        
        setLoadingMore(true);
        setTimeout(() => {
            const increment = 12; // Tambah 12 item setiap kali (sesuai dengan 6 kolom x 2 baris)
            const nextItems = displayedItems + increment;
            setDisplayedItems(nextItems);
            const currentFiltered = filteredData;
            if (nextItems >= (currentFiltered?.length || 0)) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            
            setLoadingMore(false);
        }, 300);
    };
    useEffect(() => {
        const hasActiveFilters = filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key]);
        if (!hasActiveFilters && inView && hasMore && !loadingMore) {
            loadMore();
        }
    }, [inView, hasMore, loadingMore, filters.searchQuery, filters.taxonomicFilters]);
    useEffect(() => {
        setDisplayedItems(12);
        setHasMore(true);
    }, [filters]);

    const toggleDescription = (index) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };
    const filterObservations = (data) => {
        if (!data) return [];
        
        return data.filter(item => {
            if (!filters.grades.includes(item.quality.grade.toLowerCase())) {
                return false;
            }
            if (filters.taxonomicFilters && Object.keys(filters.taxonomicFilters).length > 0) {
                const originalData = item.originalData;
                if (!originalData) return false;

                for (const [rankKey, filterValue] of Object.entries(filters.taxonomicFilters)) {
                    if (filterValue) {
                        const rank = TAXONOMIC_RANKS.find(r => r.key === rankKey);
                        if (rank) {
                            const itemValue = originalData[rank.field];
                            if (!itemValue || itemValue !== filterValue) {
                                return false;
                            }
                        }
                    }
                }
            }
            if (filters.searchType === 'unknown') {
                const unknownData = item.originalData;
                if (!unknownData) return true; // Jika tidak ada data, anggap unknown
                const rank = unknownData.rank || unknownData.taxon_rank;
                if (!rank || 
                    rank.toLowerCase() === 'unknown' || 
                    rank.toLowerCase() === 'tidak diketahui' ||
                    rank.toLowerCase() === 'unidentified' ||
                    rank.toLowerCase() === 'life') {
                    return true;
                }
                const hasAnyTaxonomy = unknownData.species || unknownData.genus || 
                                      unknownData.family || unknownData.order || 
                                      unknownData.class || unknownData.phylum || 
                                      unknownData.kingdom;

                if (!hasAnyTaxonomy) {
                    return true;
                }
                if (item.title === 'Belum teridentifikasi' || 
                    item.title?.toLowerCase() === 'unknown' ||
                    item.title?.toLowerCase() === 'life') {
                    return true;
                }
                
                return false;
            }
            if (filters.searchQuery) {
                const searchTerm = filters.searchQuery.toLowerCase();
                const originalData = item.originalData;
                const allTaxonomicFields = [
                    'domain', 'kingdom', 'subkingdom', 'superkingdom',
                    'phylum', 'subphylum', 'infraphylum', 'superphylum',
                    'class', 'subclass', 'infraclass', 'superclass',
                    'order', 'suborder', 'infraorder', 'superorder',
                    'family', 'subfamily', 'superfamily',
                    'tribe', 'subtribe', 'supertribe',
                    'genus', 'subgenus',
                    'species', 'subspecies', 'variety', 'form',
                    'cname_domain', 'cname_kingdom',
                    'cname_phylum', 'cname_subphylum', 'cname_infraphylum',
                    'cname_class', 'cname_subclass', 'cname_infraclass', 'cname_superclass',
                    'cname_order', 'cname_suborder', 'cname_infraorder', 'cname_superorder',
                    'cname_family', 'cname_subfamily', 'cname_superfamily',
                    'cname_tribe', 'cname_subtribe', 'cname_supertribe',
                    'cname_genus', 'cname_subgenus',
                    'cname_species', 'cname_subspecies', 'cname_variety', 'cname_form'
                ];
                
                switch (filters.searchType) {
                    case 'species':
                        if (item.title.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                        if (originalData) {
                            const speciesFields = ['species', 'subspecies', 'variety', 'form', 
                                                   'cname_species', 'cname_subspecies', 'cname_variety', 'cname_form'];
                            for (const field of speciesFields) {
                                const fieldValue = originalData[field];
                                if (fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    
                    case 'all_taxa':
                        if (item.title.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                        if (item.observer && item.observer.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                        if (originalData) {
                            for (const field of allTaxonomicFields) {
                                const fieldValue = originalData[field];
                                if (fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                        
                    case 'date':
                        const itemDate = new Date(item.created_at).toLocaleDateString();
                        const searchDate = new Date(filters.searchQuery).toLocaleDateString();
                        return itemDate === searchDate;
                        
                    default:
                        return true;
                }
            }

            return true;
        });
    };
    const filteredData = useMemo(() => filterObservations(observations), [observations, filters]);
    const currentList = useMemo(() => {
        if (filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key])) {
            return (observations || []).filter(item => {
                if (filters.taxonomicFilters && Object.keys(filters.taxonomicFilters).length > 0) {
                    const originalData = item.originalData;
                    if (!originalData) return false;

                    for (const [rankKey, filterValue] of Object.entries(filters.taxonomicFilters)) {
                        if (filterValue) {
                            const rank = TAXONOMIC_RANKS.find(r => r.key === rankKey);
                            if (rank) {
                                const itemValue = originalData[rank.field];
                                if (!itemValue || itemValue !== filterValue) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                if (filters.searchQuery) {
                    const searchTerm = filters.searchQuery.toLowerCase();
                    
                    if (filters.searchType === 'date') {
                        const itemDate = new Date(item.created_at).toLocaleDateString();
                        const searchDate = new Date(filters.searchQuery).toLocaleDateString();
                        return itemDate === searchDate;
                    }
                    if (item.title.toLowerCase().includes(searchTerm)) return true;
                    if (item.observer && item.observer.toLowerCase().includes(searchTerm)) return true;
                    const taxonomicFields = [
                        'species', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom',
                        'subspecies', 'variety', 'form', 'subgenus', 'subfamily', 'superfamily',
                        'cname_species', 'cname_genus', 'cname_family', 'cname_order', 'cname_class'
                    ];
                    
                    const originalData = item.originalData;
                    if (originalData) {
                        for (const field of taxonomicFields) {
                            const fieldValue = originalData[field];
                            if (fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm)) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                }

                return true;
            });
        }
        return observations || [];
    }, [observations, filters.searchQuery, filters.searchType, filters.taxonomicFilters]);
    const sortedNavList = useMemo(() => {
        const copy = [...(currentList || [])];
        const safeNum = (v) => {
            const n = Number(v);
            return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
        };
        copy.sort((a, b) => safeNum(b.id) - safeNum(a.id));
        return copy;
    }, [currentList]);
    const currentIndex = useMemo(() => {
        if (!selectedObservation && !lastViewedId) return -1;
        
        const searchId = selectedObservation?.id || lastViewedId;
        const idx = sortedNavList.findIndex(it => String(it.id) === String(searchId));
        if (idx !== -1) return idx;
        const currentId = Number(searchId);
        if (Number.isNaN(currentId)) return -1;
        for (let i = 0; i < sortedNavList.length; i++) {
            const itemId = Number(sortedNavList[i].id);
            if (currentId > itemId) {
                return i - 0.5; // Return nilai desimal untuk menandakan "antara"
            }
        }
        return sortedNavList.length - 0.5;
    }, [sortedNavList, selectedObservation, lastViewedId]);
    const hasPrevItem = useMemo(() => {
        if (sortedNavList.length === 0) return false;
        if (currentIndex < 0) return false;
        if (!Number.isInteger(currentIndex)) {
            return Math.floor(currentIndex) >= 0;
        }
        
        return currentIndex > 0;
    }, [currentIndex, sortedNavList.length]);
    
    const hasNextItem = useMemo(() => {
        if (sortedNavList.length === 0) return false;
        if (currentIndex < 0) return false;
        if (!Number.isInteger(currentIndex)) {
            return Math.ceil(currentIndex) < sortedNavList.length;
        }
        
        return currentIndex < sortedNavList.length - 1;
    }, [currentIndex, sortedNavList.length]);

    const handlePrev = () => {
        if (sortedNavList.length === 0 || !hasPrevItem) return;
        const targetIndex = Number.isInteger(currentIndex) 
            ? currentIndex - 1 
            : Math.floor(currentIndex);
        
        if (targetIndex >= 0 && targetIndex < sortedNavList.length) {
            const prevItem = sortedNavList[targetIndex];
            if (prevItem) {
                setSelectedObservation(prevItem);
                setLastViewedId(prevItem.id);
            }
        }
    };

    const handleNext = () => {
        if (sortedNavList.length === 0 || !hasNextItem) return;
        const targetIndex = Number.isInteger(currentIndex) 
            ? currentIndex + 1 
            : Math.ceil(currentIndex);
        
        if (targetIndex >= 0 && targetIndex < sortedNavList.length) {
            const nextItem = sortedNavList[targetIndex];
            if (nextItem) {
                setSelectedObservation(nextItem);
                setLastViewedId(nextItem.id);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
                <div className="text-red-500">Gagal memuat data: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] text-white">
            <div className="container mx-auto px-4 py-8 overflow-hidden mb-2">
                <h1 className="text-2xl font-bold mb-6">Bantu Identifikasi</h1>

            {/* Filter dan Search Section */}
            <div className="mb-6 space-y-3">
                {/* Grade Filters - Scrollable horizontal di mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id', 'low quality id', 'confirmed id']
                        }))}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                            filters.grades.length === 3 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        Semua
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id']
                        }))}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                            filters.grades.length === 1 && filters.grades[0] === 'needs id'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        Bantu Ident
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['low quality id']
                        }))}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                            filters.grades.length === 1 && filters.grades[0] === 'low quality id'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        ID Kurang
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['confirmed id']
                        }))}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                            filters.grades.length === 1 && filters.grades[0] === 'confirmed id'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#333]'
                        }`}
                    >
                        ID Terkonfirmasi
                    </button>
                </div>

                {/* Filter Taksa dan Search Section - Stack di mobile, row di desktop */}
                <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                    {/* Filter Dropdown */}
                    <FilterDropdown 
                        filters={filters} 
                        setFilters={setFilters} 
                        observations={observations} 
                    />
                    
                    {/* Search dengan Suggestions */}
                    <SearchWithSuggestions
                        observations={observations}
                        searchType={filters.searchType}
                        onSearchTypeChange={(type) => {
                            setFilters(prev => ({
                                ...prev,
                                searchQuery: '',
                                searchType: type
                            }));
                        }}
                        onSearch={(query) => {
                            setFilters(prev => ({
                                ...prev,
                                searchQuery: query
                            }));
                        }}
                        placeholder={filters.searchType === 'all_taxa' ? "Cari semua taksa..." : "Cari species..."}
                    />
                </div>

                {/* Active Filters Display */}
                {filters.taxonomicFilters && Object.keys(filters.taxonomicFilters).some(key => filters.taxonomicFilters[key]) && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 border-t border-[#444]">
                        <span className="text-gray-400 text-xs md:text-sm w-full md:w-auto">Filter aktif:</span>
                        {Object.entries(filters.taxonomicFilters).map(([key, value]) => {
                            if (!value) return null;
                            const rank = TAXONOMIC_RANKS.find(r => r.key === key);
                            return (
                                <span
                                    key={key}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 md:py-1 bg-blue-600 text-white text-[10px] md:text-xs rounded-full"
                                >
                                    <span className="truncate max-w-[100px] md:max-w-none">{rank?.label}: {value}</span>
                                    <button
                                        onClick={() => {
                                            setFilters(prev => ({
                                                ...prev,
                                                taxonomicFilters: {
                                                    ...prev.taxonomicFilters,
                                                    [key]: ''
                                                }
                                            }));
                                        }}
                                        className="hover:text-red-200 flex-shrink-0"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Hasil Filter Info */}
            {filteredData && (
                <div className="mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm text-gray-400">
                    <div className="truncate">
                        Menampilkan {filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key]) 
                            ? filteredData.length 
                            : Math.min(displayedItems, filteredData.length)} 
                        dari {filteredData.length} observasi
                        {(filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key])) && 
                            <span className="hidden sm:inline"> (difilter dari {observations?.length || 0} total)</span>}
                    </div>
                    {filteredData.length === 0 && (filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key])) && (
                        <button
                            onClick={() => {
                                setFilters(prev => ({
                                    ...prev,
                                    searchQuery: '',
                                    taxonomicFilters: {}
                                }));
                            }}
                            className="text-blue-400 hover:text-blue-300 text-xs md:text-sm flex-shrink-0"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
            )}

            {/* Tampilan Desktop - Update untuk menggunakan filtered data */}
            <div className="hidden md:grid gap-3 px-4 mx-auto mb-16
                md:grid-cols-3 md:max-w-4xl 
                lg:grid-cols-4 lg:max-w-6xl 
                xl:grid-cols-5 xl:max-w-7xl
                2xl:grid-cols-6 2xl:max-w-[90rem]">
                {(filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key]) 
                    ? filteredData 
                    : filteredData?.slice(0, displayedItems)).map((observation, index) => (
                    <ObservationCard 
                        key={generateUniqueKey(observation)}
                        observation={observation}
                        onClick={() => handleCardClick(observation)}
                        isEager={index < 12}
                    />
                ))}
            </div>

            {/* Tampilan Mobile - Update untuk menggunakan filtered data */}
            <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 md:hidden">
                {(filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key]) 
                    ? filteredData 
                    : filteredData?.slice(0, displayedItems)).map((observation, index) => (
                    <div 
                        key={generateUniqueKey(observation)}
                        className="card relative rounded-md overflow-hidden"
                    >
                        <div
                            className="cursor-pointer aspect-square relative"
                            onClick={() => handleCardClick(observation)}
                        >
                            {observation.spectrogram ? (
                                <div className="w-full h-full">
                                    <SpectrogramPlayer
                                        spectrogramUrl={observation.spectrogram}
                                        audioUrl={observation.audioUrl}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-[#121212]">
                                    {/* Indikator jumlah media untuk mobile */}
                                    {observation.images && Array.isArray(observation.images) && observation.images.length > 1 && (
                                        <div className="absolute top-0 right-2 text-white text-xs px-1 py-1 rounded-full flex items-center gap-1 z-20">
                                            <FontAwesomeIcon icon={faImage} className="text-xs" />
                                            <span>{observation.images.length}</span>
                                        </div>
                                    )}
                                    <img 
                                        src={getImageUrl(observation)} 
                                        alt={observation.title} 
                                        className={`w-full h-full ${
                                            getImageUrl(observation).includes('/assets/icon/') 
                                                ? 'object-contain p-4' 
                                                : 'object-cover'
                                        }`}
                                        loading={index < 10 ? "eager" : "lazy"}
                                        onError={(e) => {
                                            e.target.src = getDefaultImage(observation.type);
                                        }}
                                    />
                                </div>
                            )}
                            
                            <div className="absolute top-1 left-1 right-1">
                                <span className="text-[10px] line-clamp-2 text-white font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                    {observation.title}
                                </span>
                            </div>
                        </div>

                        <div className="absolute bottom-1 left-1">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                                observation.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                                observation.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                                observation.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-500/70' :
                                'bg-gray-500/70'
                            }`}>
                                {getGradeDisplay(observation.quality.grade)}
                            </span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleDescription(observation.id);
                            }}
                            className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                        >
                            <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                        </button>

                        {visibleIndex === observation.id && (
                            <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium">{observation.title}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleIndex(null);
                                            }}
                                            className="text-white/80 hover:text-white"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                        </button>
                                    </div>
                                    <p className="whitespace-pre-line text-gray-300">{observation.description}</p>
                                    <p className="text-gray-300">Observer: {observation.observer}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Infinite Scroll Loading Indicator - sama seperti GridView */}
            {!(filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key])) && 
             hasMore && observations?.length > 0 && (
                <div ref={ref} className="mt-8 flex justify-center py-4">
                    {loadingMore && (
                        <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Memuat lebih banyak...</span>
                        </div>
                    )}
                </div>
            )}

            {/* No Results Messages */}
            {filteredData?.length === 0 && !isLoading && (
                <div className="text-center text-gray-400 mt-8 bg-[#1e1e1e] p-8 rounded-lg border border-[#444]">
                    <FontAwesomeIcon icon={faSearch} className="text-3xl mb-4" />
                    {filters.searchQuery || Object.keys(filters.taxonomicFilters || {}).some(key => filters.taxonomicFilters[key]) ? (
                        <div>
                            <p className="text-lg mb-4">Tidak ada observasi yang sesuai dengan filter yang dipilih</p>
                            <div className="text-sm text-gray-400 mb-6 max-w-lg mx-auto leading-relaxed">
                                <div className="mb-3">Kemungkinan penyebab taksa tidak ditemukan:</div>
                                <div className="text-left space-y-2 bg-[#2a2a2a] p-4 rounded-lg">
                                    <div>• <strong>Taksa tidak termasuk kategori halaman ini</strong> - Mungkin taksa yang dicari berada di kategori grade lain</div>
                                    <div>• <strong>Taksa sudah memiliki ID lengkap</strong> - Observasi sudah teridentifikasi dengan baik dan tidak perlu bantuan</div>
                                    <div>• <strong>Belum ada yang mengobservasi taksa ini</strong> - Taksa belum pernah diamati atau dilaporkan di sistem</div>
                                    <div>• <strong>Kombinasi filter terlalu spesifik</strong> - Coba kurangi atau ubah kriteria pencarian</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setFilters(prev => ({
                                        ...prev,
                                        searchQuery: '',
                                        taxonomicFilters: {}
                                    }));
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Reset Semua Filter
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg mb-4">Tidak ada data yang perlu diidentifikasi</p>
                            <div className="text-sm text-gray-400 max-w-md mx-auto">
                                Semua observasi mungkin sudah memiliki identifikasi yang lengkap atau belum ada data yang tersedia untuk kategori ini.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {observations?.length === 0 && !isLoading && (
                <div className="text-center text-gray-400 mt-8 bg-[#1e1e1e] p-8 rounded-lg border border-[#444]">
                    <FontAwesomeIcon icon={faSearch} className="text-3xl mb-2" />
                    <p>Tidak ada data yang perlu diidentifikasi</p>
                </div>
            )}

            <ObservationModal 
                isOpen={showModal}
                onClose={handleModalClose}
                observation={selectedObservation}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={hasPrevItem}
                hasNext={hasNextItem}
            />

            {/* Footer - tampil ketika semua data sudah dimuat */}
            {/* {!hasMore && !isLoading && observations?.length > 0 && (
                <div className="mt-8">
                    <Footer />
                </div>
            )} */}
        </div>
    </div>
);
};

export default BantuIdent;