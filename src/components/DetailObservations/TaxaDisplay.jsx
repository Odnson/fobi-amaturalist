import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheckCircle, 
    faInfoCircle, 
    faXmark, 
    faSpinner,
    faSearch,
    faTimes,
    faAward,
    faUsers,
    faPercent,
    faSitemap
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const TaxaDisplay = ({ 
    identifications, 
    checklist, 
    qualityAssessment, 
    user, 
    loadingStates,
    cachedConfidencePercentage,
    onWithdraw,
    onAgree,
    onDisagree,
    onCancel,
    onShowIdentificationHelp,
    onFetchIUCNStatus,
    iucnStatus,
    loadingIucn,
    onSearchTaxa,
    onDisagreeSubmit
}) => {
    const [showIdentificationHelpModal, setShowIdentificationHelpModal] = useState(false);
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const modalSuggestionsRef = useRef(null);
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 3) {
            setShowSuggestions(true);
            try {
                const results = await onSearchTaxa(query);
                setSearchResults(results || []);
            } catch (error) {
                console.error('Error searching taxa:', error);
                setSearchResults([]);
            }
        } else {
            setShowSuggestions(false);
            setSearchResults([]);
        }
    };
    const handleTaxonSelect = (taxon) => {
        setSelectedTaxon({
            ...taxon,
            family_context: taxon.full_data ? [
                taxon.full_data.family && `Family: ${taxon.full_data.family}${taxon.full_data.cname_family ? ` (${taxon.full_data.cname_family})` : ''}`,
                taxon.full_data.order && `Order: ${taxon.full_data.order}${taxon.full_data.cname_order ? ` (${taxon.full_data.cname_order})` : ''}`,
                taxon.full_data.class && `Class: ${taxon.full_data.class}${taxon.full_data.cname_class ? ` (${taxon.full_data.cname_class})` : ''}`,
                taxon.full_data.phylum && `Phylum: ${taxon.full_data.phylum}${taxon.full_data.cname_phylum ? ` (${taxon.full_data.cname_phylum})` : ''}`,
                taxon.full_data.kingdom && `Kingdom: ${taxon.full_data.kingdom}${taxon.full_data.cname_kingdom ? ` (${taxon.full_data.cname_kingdom})` : ''}`
            ].filter(Boolean).join(' | ') : ''
        });
        setSearchQuery('');
        setShowSuggestions(false);
    };
    const renderTaxonSuggestions = (results) => {
        return results.map((result) => {
            if (result.type === 'group') {
                return result.items.map(item => ({
                    ...item,
                    scientific_name: item.scientific_name || item.name,
                    rank: item.rank || 'unknown'
                }));
            } else {
                return [{
                    ...result,
                    scientific_name: result.scientific_name || result.name,
                    rank: result.rank || 'unknown'
                }];
            }
        }).flat();
    };
    const handleDisagreeSubmit = async (identificationId) => {
        try {
            if (!selectedTaxon) {
                toast.error('Pilih takson terlebih dahulu');
                return;
            }
            if (!disagreeComment.trim()) {
                toast.error('Berikan alasan penolakan');
                return;
            }
            
            await onDisagreeSubmit(identificationId, selectedTaxon, disagreeComment);
            setShowDisagreeModal(false);
            setDisagreeComment('');
            setSearchQuery('');
            setSelectedTaxon(null);
            setSelectedIdentificationId(null);
        } catch (error) {
            console.error('Error saat mengirim ketidaksetujuan:', error);
            toast.error('Terjadi kesalahan saat mengirim ketidaksetujuan');
        }
    };
    const handleDisagreeClick = (identificationId) => {
        setSelectedIdentificationId(identificationId);
        setShowDisagreeModal(true);
    };
    const cleanScientificName = (name) => {
        if (!name) return '';
        return name.split(' ').filter(part => {
            return !(/\d/.test(part) || /[\(\)]/.test(part));
        }).join(' ');
    };
    const getCommonName = (level, data) => {
        const commonNameField = `cname_${level}`;
        return data?.[commonNameField];
    };
    const getBestTaxonomyLevel = (data) => {
        const taxonomyLevels = [
            'subform',
            'form',
            'variety',
            'subspecies',
            'species',
            'subgenus',
            'genus',
            'subtribe',
            'tribe',
            'supertribe',
            'subfamily',
            'family',
            'superfamily',
            'infraorder',
            'suborder',
            'order',
            'superorder',
            'infraclass',
            'subclass',
            'class',
            'superclass',
            'subdivision',
            'division',
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];
        if (!data?.phylum && data?.division) {
            return {
                level: 'phylum',
                name: data.division,
                id: data?.taxa_id
            };
        }
        for (const level of taxonomyLevels) {
            if (data?.[level]) {
                return {
                    level,
                    name: data[level],
                    id: data?.taxa_id
                };
            }
        }

        return null;
    };
    const getTaxaDisplayWithCommonName = (taxon) => {
        if (taxon.isCommonAncestor) {
            const level = taxon.commonAncestorLevel;
            const levelName = level.charAt(0).toUpperCase() + level.slice(1);
            const commonKey = `cname_${level}`;
            
            return (
                <React.Fragment>
                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <span className="font-semibold">{taxon[level]}</span>
                            {taxon[commonKey] && (
                                <span className="text-xs text-gray-400 font-normal ml-2">({taxon[commonKey]})</span>
                            )}
                            <span className="text-xs text-yellow-400 ml-2 px-2 py-0.5 bg-yellow-900/30 border border-yellow-500/30 rounded-full">
                                Taksonomi induk yang sama ({levelName})
                            </span>
                        </div>
                        
                        {taxon.differentSpecies && taxon.differentSpecies.length > 0 && (
                            <div className="mt-2 text-xs text-gray-300">
                                <div className="mb-1">Identifikasi yang berbeda:</div>
                                <div className="ml-2 space-y-1">
                                    {taxon.differentSpecies.map((species, index) => (
                                        <div key={species.id} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="italic">{species.scientific_name || species.species}</span>
                                                {species.common_name && (
                                                    <span className="text-gray-400 ml-1">({species.common_name})</span>
                                                )}
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-gray-400 mr-1">oleh</span>
                                                <span className="text-blue-400">{species.identifier_name}</span>
                                                {species.agreement_count && parseInt(species.agreement_count) > 0 && (
                                                    <span className="ml-1 bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded-full text-[10px]">
                                                        +{species.agreement_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {taxon.total_agreements > 0 && (
                                    <div className="mt-2 text-xs text-gray-300">
                                        <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded-full">
                                            Total {taxon.total_agreements} persetujuan
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </React.Fragment>
            );
        }
        const bestTaxonomy = getBestTaxonomyLevel(checklist);
        
        if (bestTaxonomy) {
            const { level, name } = bestTaxonomy;
            const commonName = getCommonName(level, checklist);
            const needsItalic = ['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'subform'].includes(level);
            
            return (
                <React.Fragment>
                    <span className={needsItalic ? 'italic' : ''}>
                        {cleanScientificName(name)}
                    </span>
                    {commonName && (
                        <span className="text-xs text-gray-400 font-normal ml-2">({commonName})</span>
                    )}
                </React.Fragment>
            );
        }
        if (taxon.scientific_name) {
            const needsItalic = taxon.scientific_name.split(' ').length > 1;
            const commonName = taxon.common_name || taxon.cname_species;
            
            return (
                <React.Fragment>
                    <span className={needsItalic ? 'italic' : ''}>
                        {cleanScientificName(taxon.scientific_name)}
                    </span>
                    {commonName && (
                        <span className="text-xs text-gray-400 font-normal ml-2">({commonName})</span>
                    )}
                </React.Fragment>
            );
        }

        return 'Belum teridentifikasi';
    };
    const getTaxonomyLevel = (taxon) => {
        const levels = [
            { key: 'subform', displayName: 'Subform' },
            { key: 'form', displayName: 'Form' },
            { key: 'variety', displayName: 'Variety' },
            { key: 'subspecies', displayName: 'Subspecies' },
            { key: 'species', displayName: 'Species' },
            { key: 'subgenus', displayName: 'Subgenus' },
            { key: 'genus', displayName: 'Genus' },
            { key: 'subtribe', displayName: 'Subtribe' },
            { key: 'tribe', displayName: 'Tribe' },
            { key: 'supertribe', displayName: 'Supertribe' },
            { key: 'subfamily', displayName: 'Subfamily' },
            { key: 'family', displayName: 'Family' },
            { key: 'superfamily', displayName: 'Superfamily' },
            { key: 'infraorder', displayName: 'Infraorder' },
            { key: 'suborder', displayName: 'Suborder' },
            { key: 'order', displayName: 'Order' },
            { key: 'superorder', displayName: 'Superorder' },
            { key: 'infraclass', displayName: 'Infraclass' },
            { key: 'subclass', displayName: 'Subclass' },
            { key: 'class', displayName: 'Class' },
            { key: 'superclass', displayName: 'Superclass' },
            { key: 'subdivision', displayName: 'Subdivision' },
            { key: 'division', displayName: 'Division' },
            { key: 'superdivision', displayName: 'Superdivision' },
            { key: 'subphylum', displayName: 'Subphylum' },
            { key: 'phylum', displayName: 'Phylum' },
            { key: 'superphylum', displayName: 'Superphylum' },
            { key: 'subkingdom', displayName: 'Subkingdom' },
            { key: 'kingdom', displayName: 'Kingdom' },
            { key: 'superkingdom', displayName: 'Superkingdom' },
            { key: 'domain', displayName: 'Domain' }
        ];

        for (const level of levels) {
            if (taxon[level.key]) {
                const displayName = level.displayName.charAt(0).toUpperCase() + level.displayName.slice(1);
                if (level.key === 'division' && taxon.kingdom === 'Plantae') {
                    return `${taxon[level.key]} (Division)`;
                }
                return `${taxon[level.key]} (${displayName})`;
            }
        }
        return null;
    };
    const getCurrentIdentification = () => {
        if (!identifications || identifications.length === 0) {
            return null;
        }
        const activeIdentifications = identifications.filter(ident => !ident.withdrawn);
        
        if (activeIdentifications.length === 0) {
            return null;
        }
        if (activeIdentifications.length === 1) {
            return {
                ...activeIdentifications[0],
                isSystemIdentification: false
            };
        }
        const sortedByAgreements = [...activeIdentifications].sort((a, b) => {
            const countA = parseInt(a.agreement_count) || 0;
            const countB = parseInt(b.agreement_count) || 0;
            return countB - countA;
        });
        
        return {
            ...sortedByAgreements[0],
            isSystemIdentification: false
        };
    };
    const getIUCNStatusDisplay = (status) => {
        if (!status) return null;
        
        const statusLower = status.toLowerCase();
        
        if (statusLower.includes('extinct')) {
            return {
                label: status,
                bgColor: 'bg-black',
                textColor: 'text-white',
                ringColor: 'ring-gray-600/40'
            };
        } else if (statusLower.includes('critically endangered')) {
            return {
                label: status,
                bgColor: 'bg-red-900',
                textColor: 'text-red-200',
                ringColor: 'ring-red-600/40'
            };
        } else if (statusLower.includes('endangered')) {
            return {
                label: status,
                bgColor: 'bg-orange-900',
                textColor: 'text-orange-200',
                ringColor: 'ring-orange-600/40'
            };
        } else if (statusLower.includes('vulnerable')) {
            return {
                label: status,
                bgColor: 'bg-yellow-900',
                textColor: 'text-yellow-200',
                ringColor: 'ring-yellow-600/40'
            };
        } else if (statusLower.includes('near threatened')) {
            return {
                label: status,
                bgColor: 'bg-blue-900',
                textColor: 'text-blue-200',
                ringColor: 'ring-blue-600/40'
            };
        } else if (statusLower.includes('least concern')) {
            return {
                label: status,
                bgColor: 'bg-green-900',
                textColor: 'text-green-200',
                ringColor: 'ring-green-600/40'
            };
        } else {
            return {
                label: status,
                bgColor: 'bg-gray-900',
                textColor: 'text-gray-200',
                ringColor: 'ring-gray-600/40'
            };
        }
    };

    const currentId = getCurrentIdentification();

    if (!currentId) {
        return (
            <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] rounded-xl p-6 text-center border border-gray-700/50 shadow-lg">
                <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-lg" />
                    </div>
                    <div className="text-gray-300 font-medium">Belum ada identifikasi</div>
                    <div className="text-sm text-gray-500">Observasi ini belum memiliki identifikasi yang aktif</div>
                </div>
            </div>
        );
    }
    const getGradeGradient = (grade) => {
        switch (grade) {
            case 'research grade':
                return {
                    gradient: 'from-[#1a73e8]/20 to-[#1a73e8]/10',
                    border: 'border-[#1a73e8]',
                    accent: '#1a73e8'
                };
            case 'confirmed id':
                return {
                    gradient: 'from-green-600/20 to-green-600/10',
                    border: 'border-green-600',
                    accent: '#16a34a'
                };
            case 'needs ID':
                return {
                    gradient: 'from-yellow-600/20 to-yellow-600/10',
                    border: 'border-yellow-600',
                    accent: '#ca8a04'
                };
            case 'low quality ID':
                return {
                    gradient: 'from-orange-600/20 to-orange-600/10',
                    border: 'border-orange-600',
                    accent: '#ea580c'
                };
            default:
                return {
                    gradient: 'from-gray-600/20 to-gray-600/10',
                    border: 'border-gray-600',
                    accent: '#6b7280'
                };
        }
    };

    const gradeStyle = getGradeGradient(checklist?.grade);

    return (
        <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
            {/* Header dengan gradient accent sesuai grade */}
            <div className={`bg-gradient-to-r ${gradeStyle.gradient} border-l-4 ${gradeStyle.border} p-4 sm:p-6`}>
                <div className="mb-3">
                    <span className="text-sm font-medium text-gray-300">Identifikasi Saat Ini</span>
                </div>
                <div className="space-y-4">
                    {/* Nama taksa dan info dasar */}
                    <div className="space-y-2">
                        <div className="text-lg sm:text-2xl font-bold text-white leading-tight">
                            {getTaxaDisplayWithCommonName(currentId)}
                        </div>
                        <div className="text-sm text-gray-300 italic hidden">
                            {currentId.family || currentId.genus || currentId.species || getTaxonomyLevel(currentId)}
                        </div>
                    </div>

                    {/* Info identifier */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#1a73e8] flex-shrink-0 hidden" />
                        {currentId.isSystemIdentification ? (
                            <span className="font-medium">Identifikasi sistem berdasarkan konsensus</span>
                        ) : (
                            <div className="flex flex-wrap items-center gap-1 hidden">
                                <span>Diidentifikasi oleh</span>
                                <Link 
                                    to={`/profile/${currentId.user_id}`} 
                                    className="text-[#1a73e8] hover:text-[#4285f4] font-medium transition-colors duration-200 hover:underline"
                                >
                                    {currentId.identifier_name}
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    {/* Grade dan confidence badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                            checklist?.grade === 'research grade' 
                                ? 'bg-blue-900/40 text-blue-200 border-blue-500/40 shadow-blue-500/20 shadow-sm' 
                                : checklist?.grade === 'needs ID'
                                    ? 'bg-yellow-900/40 text-yellow-200 border-yellow-500/40 shadow-yellow-500/20 shadow-sm'
                                    : checklist?.grade === 'confirmed id'
                                        ? 'bg-green-900/40 text-green-200 border-green-500/40 shadow-green-500/20 shadow-sm'
                                        : checklist?.grade === 'low quality ID'
                                            ? 'bg-red-900/40 text-red-200 border-red-500/40 shadow-red-500/20 shadow-sm'
                                            : 'bg-gray-900/40 text-gray-200 border-gray-500/40'
                        }`}>
                            {checklist?.grade === 'research grade' 
                                ? 'ID Lengkap' 
                                : checklist?.grade === 'confirmed id'
                                ? 'ID Terkonfirmasi'
                                : checklist?.grade === 'needs ID'
                                ? 'Bantu Ident'
                                : checklist?.grade === 'low quality ID'
                                ? 'ID Kurang'
                                : 'Tidak diketahui'}
                        </span>
                        
                        {/* IUCN Status Badge */}
                        {checklist?.iucn_status && 
                         checklist.iucn_status !== 'error' && 
                         checklist.iucn_status !== 'not_found' && 
                         checklist.iucn_status !== 'loading' && 
                         checklist.iucn_status.trim() !== '' && (
                            (() => {
                                const getConservationColor = (status) => {
                                    switch (status) {
                                        case "CR":
                                            return "#dc2626"
                                        case "EN":
                                            return "#ea580c"
                                        case "VU":
                                            return "#ca8a04"
                                        case "NT":
                                            return "#16a34a"
                                        case "LC":
                                            return "#059669"
                                        default:
                                            return "#6b7280"
                                    }
                                };
                                
                                const color = getConservationColor(checklist.iucn_status);
                                return (
                                    <div 
                                        className="px-3 py-1.5 rounded-full text-xs font-medium shadow-sm text-white"
                                        style={{ backgroundColor: color }}
                                    >
                                        {checklist.iucn_status}
                                    </div>
                                );
                            })()
                        )}
                        
                        {/* Confidence percentage */}
                        {identifications.length > 1 && checklist?.grade !== 'needs ID' && (cachedConfidencePercentage !== null || (qualityAssessment?.confidence_percentage !== undefined && qualityAssessment.confidence_percentage !== null)) && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/60 text-gray-200 border border-gray-600/40 shadow-sm">
                                {(() => {
                                    const percentage = cachedConfidencePercentage?.percentage !== undefined ? cachedConfidencePercentage.percentage : qualityAssessment.confidence_percentage;
                                    const taxonName = cachedConfidencePercentage?.taxon_name || qualityAssessment?.confidence_taxon_name;
                                    
                                    if (taxonName) {
                                        return `${percentage}% keyakinan pada ${taxonName}`;
                                    } else {
                                        return `${percentage}% yakin`;
                                    }
                                })()}
                            </span>
                        )}
                        
                        {/* Info button */}
                        <button
                            onClick={() => setShowIdentificationHelpModal(true)}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-all duration-200"
                            title="Informasi cara kerja identifikasi"
                        >
                            <FontAwesomeIcon icon={faInfoCircle} className="text-sm" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quorum section - tampilan hitungan kuorum */}
            <div className="p-4 sm:p-6">
                {/* Quorum Stats */}
                <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-600/40 mb-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">Status Kuorum</span>
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faUsers} className="text-gray-400 text-xs" />
                                <span className="text-xs text-gray-300">
                                    {(() => {
                                        const activeIdentifications = identifications?.filter(id => 
                                            !id.withdrawn && 
                                            !id.is_withdrawn && 
                                            !id.deleted_at
                                        ) || [];
                                        const totalParticipants = activeIdentifications.length;
                                        const requiredQuorum = Math.ceil(totalParticipants * 2/3); // 2/3 kuorum
                                        const currentAgreements = parseInt(currentId?.agreement_count || 0);
                                        
                                        return `${currentAgreements}/${totalParticipants}`;
                                    })()}
                                </span>
                            </div>
                        </div>
                        
                        {/* Breakdown identifikasi per taksa */}
                        <div className="space-y-2">
                            <div className="text-xs text-gray-400 mb-2">Breakdown Identifikasi:</div>
                            {(() => {
                                const activeIdentifications = identifications?.filter(id => 
                                    !id.withdrawn && 
                                    !id.is_withdrawn && 
                                    !id.deleted_at
                                ) || [];
                                const taxaGroups = {};
                                
                                activeIdentifications.forEach(id => {
                                    const taxaName = id.scientific_name || id.species || id.genus || 'Unknown';
                                    if (!taxaGroups[taxaName]) {
                                        taxaGroups[taxaName] = {
                                            count: 0,
                                            identifications: []
                                        };
                                    }
                                    taxaGroups[taxaName].count++;
                                    taxaGroups[taxaName].identifications.push(id);
                                });
                                const sortedTaxa = Object.entries(taxaGroups).sort((a, b) => {
                                    const aAgreements = parseInt(a[1].identifications[0]?.agreement_count || 0);
                                    const bAgreements = parseInt(b[1].identifications[0]?.agreement_count || 0);
                                    return bAgreements - aAgreements;
                                });
                                
                                return sortedTaxa.map(([taxaName, group], index) => {
                                    const totalSupport = parseInt(group.identifications[0]?.agreement_count || 0);
                                    const isCurrentTaxa = group.identifications.some(id => id.id === currentId?.id);
                                    
                                    return (
                                        <div key={index} className={`flex items-center justify-between p-2 rounded text-xs ${
                                            isCurrentTaxa ? 'bg-blue-900/30 border border-blue-600/30' : 'bg-gray-700/30'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {isCurrentTaxa && (
                                                    <FontAwesomeIcon icon={faAward} className="text-blue-400 text-xs" />
                                                )}
                                                <span className={`italic ${isCurrentTaxa ? 'text-blue-200 font-medium' : 'text-gray-300'}`}>
                                                    {taxaName}
                                                </span>
                                            </div>
                                            <span className={`font-medium ${isCurrentTaxa ? 'text-blue-200' : 'text-gray-400'}`}>
                                                +{totalSupport}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        
                        {/* Progress bar kuorum */}
                        <div className="mt-3 hidden">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>Progress Kuorum</span>
                                <span>
                                    {(() => {
                                        const activeIdentifications = identifications?.filter(id => !id.withdrawn) || [];
                                        const totalParticipants = activeIdentifications.length;
                                        const currentAgreements = parseInt(currentId?.agreement_count || 0) + 1;
                                        const percentage = totalParticipants > 0 ? Math.round((currentAgreements / totalParticipants) * 100) : 0;
                                        return `${percentage}%`;
                                    })()}
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        checklist?.grade === 'research grade' ? 'bg-blue-500' :
                                        checklist?.grade === 'confirmed id' ? 'bg-green-500' :
                                        checklist?.grade === 'needs ID' ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                    }`}
                                    style={{ 
                                        width: `${(() => {
                                            const activeIdentifications = identifications?.filter(id => !id.withdrawn) || [];
                                            const totalParticipants = activeIdentifications.length;
                                            const currentAgreements = parseInt(currentId?.agreement_count || 0) + 1;
                                            return totalParticipants > 0 ? Math.min((currentAgreements / totalParticipants) * 100, 100) : 0;
                                        })()}%` 
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* IUCN Status Display */}
                {checklist?.iucn_status && 
                 checklist.iucn_status !== 'error' && 
                 checklist.iucn_status !== 'not_found' && 
                 checklist.iucn_status !== 'loading' && 
                 checklist.iucn_status.trim() !== '' && (
                    <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-600/40 hidden">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-white">Status Konservasi IUCN:</span>
                            <div 
                                className="px-3 py-1.5 rounded-full text-xs font-medium shadow-sm text-white"
                                style={{ backgroundColor: (() => {
                                    const getConservationColor = (status) => {
                                        switch (status) {
                                            case "CR": return "#dc2626"
                                            case "EN": return "#ea580c"
                                            case "VU": return "#ca8a04"
                                            case "NT": return "#16a34a"
                                            case "LC": return "#059669"
                                            default: return "#6b7280"
                                        }
                                    };
                                    return getConservationColor(checklist.iucn_status);
                                })() }}
                            >
                                {checklist.iucn_status}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal untuk menolak identifikasi */}
            {showDisagreeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6 w-full max-w-[350px] sm:max-w-md border border-[#444]">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 text-white">Tolak Identifikasi</h3>

                        <div className="mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                Pilih Takson
                            </label>
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Cari takson..."
                                    className="w-full p-2 pr-10 border border-[#444] rounded bg-[#2c2c2c] text-white text-sm"
                                />
                                {loadingStates.search && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4 text-[#1a73e8]" />
                                    </div>
                                )}
                                {!loadingStates.search && searchQuery.length >= 3 && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {(loadingStates.search || searchResults.length > 0) && (
                                <div
                                    ref={modalSuggestionsRef}
                                    className="mt-2 border border-[#444] rounded max-h-40 overflow-y-auto bg-[#2c2c2c]"
                                >
                                    {loadingStates.search ? (
                                        <div className="flex items-center justify-center py-6">
                                            <div className="flex flex-col items-center space-y-2">
                                                <FontAwesomeIcon icon={faSpinner} spin className="h-6 w-6 text-[#1a73e8]" />
                                                <div className="text-xs text-gray-400">Mencari takson...</div>
                                            </div>
                                        </div>
                                    ) : (
                                        renderTaxonSuggestions(searchResults).map((taxon, index) => {
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
                                                    ranks.push(`Phylum: ${taxon.full_data.phylum}${taxon.full_data.cname_phylum ? ` (${taxon.full_data.cname_phylum})` : ''}`);
                                                }
                                                
                                                if (taxon.full_data.kingdom) {
                                                    ranks.push(`Kingdom: ${taxon.full_data.kingdom}${taxon.full_data.cname_kingdom ? ` (${taxon.full_data.cname_kingdom})` : ''}`);
                                                }
                                                
                                                familyContext = ranks.join(' | ');
                                            }

                                            return (
                                                <div
                                                    key={uniqueKey}
                                                    onClick={() => handleTaxonSelect(taxon)}
                                                    className="p-2 hover:bg-[#333] cursor-pointer text-sm"
                                                >
                                                    <div className={`text-white ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                                        {taxon.scientific_name}
                                                        {taxon.common_name && ` | ${taxon.common_name}`}
                                                        <span className="text-gray-400 text-xs"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                                                        {taxon.full_data?.taxonomic_status === 'SYNONYM' && (
                                                            <span className="text-orange-400 text-xs ml-2 bg-orange-900/30 px-1 py-0.5 rounded">
                                                                Sinonim
                                                            </span>
                                                        )}
                                                    </div>
                                                    {familyContext && (
                                                        <div className="text-xs text-gray-400">
                                                            {familyContext}
                                                        </div>
                                                    )}
                                                    {taxon.full_data?.taxonomic_status === 'SYNONYM' && taxon.full_data?.accepted_scientific_name && (
                                                        <div className="text-xs text-orange-300 mt-1">
                                                            Nama yang diterima: {taxon.full_data.accepted_scientific_name}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {selectedTaxon && (
                                <div className="mt-2 p-2 bg-[#333] rounded border border-[#444] text-sm">
                                    <div className={`text-white ${selectedTaxon.rank === 'species' ? 'italic' : ''}`}>
                                        {selectedTaxon.scientific_name}
                                        {selectedTaxon.common_name && ` | ${selectedTaxon.common_name}`}
                                        <span className="text-gray-400 text-xs"> – {selectedTaxon.rank.charAt(0).toUpperCase() + selectedTaxon.rank.slice(1)}</span>
                                    </div>
                                    {selectedTaxon.family_context && (
                                        <div className="text-xs text-gray-400">
                                            {selectedTaxon.family_context}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                Alasan Penolakan
                            </label>
                            <textarea
                                value={disagreeComment}
                                onChange={(e) => setDisagreeComment(e.target.value)}
                                placeholder="Berikan alasan penolakan..."
                                className="w-full p-2 border rounded border-[#444] bg-[#2c2c2c] text-white text-sm"
                                rows={4}
                            />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                            <button
                                onClick={() => {
                                    setShowDisagreeModal(false);
                                    setDisagreeComment('');
                                    setSearchQuery('');
                                    setSelectedTaxon(null);
                                    setSelectedIdentificationId(null);
                                }}
                                className="px-4 py-2 bg-[#2c2c2c] text-gray-300 rounded hover:bg-[#333] border border-[#444] text-sm mt-2 sm:mt-0"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleDisagreeSubmit(selectedIdentificationId)}
                                disabled={loadingStates.disagree}
                                className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loadingStates.disagree ? (
                                    <span className="flex items-center justify-center">
                                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                        <span>Mengirim...</span>
                                    </span>
                                ) : (
                                    <span>Kirim</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Informasi Sistem Identifikasi */}
            {showIdentificationHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-100 p-4">
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
                                            Pengguna lain dapat menyetujui atau tidak setuju dengan identifikasi
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-400 mr-2">•</span>
                                            Sistem menghitung consensus berdasarkan persetujuan komunitas
                                        </li>
                                    </ul>
                                </div>

                                {/* Bagian 2: Grade Observasi */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faAward} className="mr-2 text-blue-400" />
                                        Grade Observasi
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center">
                                            <span className="bg-blue-900/30 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-full text-xs mr-3">ID Lengkap</span>
                                            <span>Species dengan kuorum ≥2 dan ≥67% persetujuan</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-green-900/30 text-green-300 border border-green-500/30 px-2 py-1 rounded-full text-xs mr-3">ID Terkonfirmasi</span>
                                            <span>Genus/Family dengan kuorum ≥2 dan ≥67% persetujuan</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-red-900/30 text-red-300 border border-red-500/30 px-2 py-1 rounded-full text-xs mr-3">ID Kurang</span>
                                            <span>Masih ada konflik/perdebatan atau ada taksa menyebrang</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded-full text-xs mr-3">Bantu Ident</span>
                                            <span>Belum mencapai kuorum</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bagian 3: Kuorum */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faUsers} className="mr-2 text-purple-400" />
                                        Sistem Kuorum
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong className="text-white">Kuorum:</strong> Minimum 2 persetujuan DAN ≥67% dari total partisipan</p>
                                        <div className="bg-[#333] rounded p-3 mt-3">
                                            <p className="text-white font-medium mb-2">Contoh Perhitungan:</p>
                                            <ul className="space-y-1">
                                                <li>• 2 dari 3 partisipan = 67% ✓ (Kuorum tercapai)</li>
                                                <li>• 3 dari 4 partisipan = 75% ✓ (Kuorum tercapai)</li>
                                                <li>• 4 dari 5 partisipan = 80% ✓ (Kuorum tercapai)</li>
                                                <li>• 1 dari 3 partisipan = 33% ✗ (Kuorum tidak tercapai)</li>
                                            </ul>
                                        </div>
                                    </div>
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

                                        <div className="bg-[#333] rounded p-3">
                                            <p className="text-white font-medium mb-2">Contoh:</p>
                                            <div className="text-xs space-y-1">
                                                <p>• Tachyspiza trinotata (2 setuju) + Tachyspiza (1 setuju) = 67% keyakinan pada Tachyspiza trinotata</p>
                                                <p>• Gallus gallus (1 setuju) + Gallus varius (1 setuju) = 100% keyakinan pada Gallus (genus consensus)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bagian 5: Hierarchical Consensus */}
                                <div className="bg-[#2c2c2c] rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                                        <FontAwesomeIcon icon={faSitemap} className="mr-2 text-cyan-400" />
                                        Hierarchical Consensus
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <p>Sistem melindungi consensus yang sudah terbentuk dari perubahan mendadak:</p>
                                        <ul className="space-y-1 mt-2">
                                            <li className="flex items-start">
                                                <span className="text-cyan-400 mr-2">•</span>
                                                Jika species mencapai kuorum, dapat override genus consensus
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-cyan-400 mr-2">•</span>
                                                Withdrawal identification dapat memicu revert ke most agreed
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowIdentificationHelpModal(false)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
};

export default TaxaDisplay;
