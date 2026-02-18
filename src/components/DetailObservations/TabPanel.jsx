import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faSearch,
    faCheckCircle,
    faMapMarkerAlt,
    faPaw,
    faXmark,
    faQuoteLeft,
    faAt,
    faChevronDown,
    faChevronUp,
    faInfoCircle,
    faSpinner,
    faTimes,
    faAward,
    faUsers,
    faPercent,
    faSitemap,
    faCheck,
    faTimesCircle,
    
} from '@fortawesome/free-solid-svg-icons';
import 'react-quill/dist/quill.snow.css';
import { apiFetch } from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import './quill-dark.css';

const getSourceFromId = (id) => {
    if (!id) return 'fobi';
    return typeof id === 'string' && (
        id.startsWith('BN') ? 'burungnesia' :
        id.startsWith('KP') ? 'kupunesia' :
        'fobi'
    );
};
const getProfileImageUrl = (profilePic, fallbackName) => {
    if (!profilePic) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'User')}&background=2c2c2c&color=fff`;
    }
    if (profilePic.startsWith('http://') || profilePic.startsWith('https://')) {
        return profilePic;
    }
    const cleanPath = profilePic
        .replace(/^\/storage\//, '')
        .replace(/^\/api\/storage\//, '')
        .replace(/^storage\//, '')
        .replace(/^api\/storage\//, '');
    return `https://api.amaturalist.com/storage/${cleanPath}`;
};

function TabPanel({
    id,
    activeTab,
    setActiveTab,
    comments,
    setComments,
    identifications,
    setIdentifications,
    newComment,
    setNewComment,
    addComment,
    handleIdentificationSubmit,
    searchTaxa,
    searchResults,
    selectedTaxon,
    setSelectedTaxon,
    identificationForm,
    setIdentificationForm,
    handleAgreeWithIdentification,
    handleWithdrawIdentification,
    handleCancelAgreement,
    handleDisagreeWithIdentification,
    user,
    checklist,
    qualityAssessment
}) {
    console.log('TabPanel rendered with user:', user);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [identificationPhoto, setIdentificationPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cachedConfidencePercentage, setCachedConfidencePercentage] = useState(null);
    useEffect(() => {
        if (qualityAssessment?.confidence_percentage !== undefined && qualityAssessment.confidence_percentage !== null) {
            setCachedConfidencePercentage({
                percentage: qualityAssessment.confidence_percentage,
                taxon_name: qualityAssessment.confidence_taxon_name
            });
        }
    }, [qualityAssessment?.confidence_percentage, qualityAssessment?.confidence_taxon_name, identifications.length]);
    const [showIdentifierTooltip, setShowIdentifierTooltip] = useState(false);
    const [activeIdentifierId, setActiveIdentifierId] = useState(null);
    const [showAgreementTooltip, setShowAgreementTooltip] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [selectedUsername, setSelectedUsername] = useState(null);
    const source = getSourceFromId(id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsRef] = useState(React.createRef());
    const [modalSuggestionsRef] = useState(React.createRef());
    const [wsConnected, setWsConnected] = useState(false);
    const ws = useRef(null);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState('');
    const [selectedCommentId, setSelectedCommentId] = useState(null);
    const [showIdentificationHelpModal, setShowIdentificationHelpModal] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const [expandedIdentifications, setExpandedIdentifications] = useState({});
    const [loadingStates, setLoadingStates] = useState({
        agree: false,
        disagree: false,
        cancelAgreement: false,
        withdraw: false,
        comment: false,
        flag: false,
        search: false, // tambahkan loading state untuk search
        synonymRedirect: false // loading saat resolve sinonim ke accepted
    });
    const [combinedContent, setCombinedContent] = useState([]);
    const [iucnStatus, setIucnStatus] = useState(null);
    const [loadingIucn, setLoadingIucn] = useState(false);
    const [confidenceData, setConfidenceData] = useState(null);
    const [currentGrade, setCurrentGrade] = useState(null);
    const [showModalConfirmation, setShowModalConfirmation] = useState(false);
    const [modalConfirmationData, setModalConfirmationData] = useState(null);
    const fetchConfidenceData = async () => {
        try {
            const actualId = id.startsWith('BN') ? id.substring(2) : 
                           id.startsWith('KP') ? id.substring(2) : id;
            const response = await apiFetch(`/observations/${actualId}/confidence`, {
                method: 'GET',
                headers: {
                    'X-Source': source
                }
            });
            
            if (response.success) {
                setConfidenceData(response.data.confidence);
                setCurrentGrade(response.data.grade);
            }
        } catch (error) {
            console.error('Error fetching confidence data:', error);
        }
    };
    useEffect(() => {
        if (identifications && identifications.length > 0) {
            fetchConfidenceData();
        }
    }, [identifications]);
    const combineAndSortContent = useCallback(() => {
        const identArray = Array.isArray(identifications) ? identifications : [];
        const commArray = Array.isArray(comments) ? comments : [];
        let combined = [];
        identArray.forEach(ident => {
            combined.push({
                ...ident,
                type: 'identification',
                timestamp: new Date(ident.created_at)
            });
        });
        commArray.forEach(comment => {
            combined.push({
                ...comment,
                type: 'comment',
                timestamp: new Date(comment.created_at)
            });
        });
        combined = combined.filter(item => !isNaN(item.timestamp.getTime()));
        combined.sort((a, b) => a.timestamp - b.timestamp);
        combined.forEach(item => {
            item.dateStr = item.timestamp.toISOString().split('T')[0];
        });
        const groupedByDate = {};
        combined.forEach(item => {
            if (!groupedByDate[item.dateStr]) {
                groupedByDate[item.dateStr] = [];
            }
            groupedByDate[item.dateStr].push(item);
        });
        const result = [];
        Object.keys(groupedByDate).sort().forEach(dateStr => {
            result.push({
                type: 'date_divider', 
                date: dateStr
            });
            result.push(...groupedByDate[dateStr]);
        });
        
        console.log('Combined content:', result);
        return result;
    }, [identifications, comments]);
    useEffect(() => {
        setCombinedContent(combineAndSortContent());
    }, [identifications, comments, combineAndSortContent]);

    useEffect(() => {
        if (!identifications || identifications.length === 0) return;
        const initialExpandedState = {};
        identifications.forEach(ident => {
            if (ident.is_withdrawn === 1) {
                initialExpandedState[ident.id] = false;
            }
        });
        
        setExpandedIdentifications(initialExpandedState);
    }, [identifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (modalSuggestionsRef.current && !modalSuggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchLatestData = async () => {
            try {
                const commentsResponse = await apiFetch(`/observations/${id}/comments`);
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.data);
                }
            } catch (error) {
                console.error('Error fetching latest data:', error);
            }
        };
        const intervalId = setInterval(fetchLatestData, 120000); // 120000 ms = 2 menit
        fetchLatestData();
        return () => clearInterval(intervalId);
    }, [id]);

    const tabs = [
        { id: 'identification', label: 'Identifikasi', icon: faSearch },
        { id: 'comments', label: 'Komentar', icon: faComments }
    ];
    const searchTimeoutRef = useRef(null);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        if (query.length >= 3) {
            setLoadingStates(prev => ({ ...prev, search: true }));
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    await searchTaxa(query);
                } catch (error) {
                    console.error('Search error:', error);
                    toast.error('Gagal mencari takson. Silakan coba lagi.', {
                        duration: 3000,
                        position: 'bottom-center'
                    });
                } finally {
                    setLoadingStates(prev => ({ ...prev, search: false }));
                }
            }, 500);
        } else {
            setLoadingStates(prev => ({ ...prev, search: false }));
        }
    };
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const renderTaxonSuggestions = (searchResults) => {
        if (!searchResults || searchResults.length === 0) return [];
        const renderedItemsMap = new Map();
        const uniqueResults = searchResults.filter(taxon => {
            const key = `${taxon.scientific_name}-${taxon.rank}`;
            if (renderedItemsMap.has(key)) return false;
            renderedItemsMap.set(key, true);
            return true;
        });
        const rankOrder = {
            family: 100,
            subfamily: 90,
            tribe: 85,
            subtribe: 80,
            genus: 70,
            subgenus: 60,
            species: 50,
            subspecies: 40,
            variety: 30,
            form: 20
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
        const query = searchQuery.trim().toLowerCase();
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
        let prioritizedList = hierarchicalResults;

        if (query && hierarchicalResults.length) {
            const nameContains = (t) => {
                const vals = getSearchableStrings(t);
                return vals.some(v => v.includes(query));
            };
            const containingMatches = hierarchicalResults.filter(nameContains);
            const nonMatches = hierarchicalResults.filter(t => !nameContains(t));
            
            if (containingMatches.length > 0) {
                const rankOrderPriority = {
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
                    const currentRank = rankOrderPriority[current.rank] || 0;
                    const highestRank = rankOrderPriority[highest.rank] || 0;
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
                                const rankA = rankOrderPriority[a.rank] || 0;
                                const rankB = rankOrderPriority[b.rank] || 0;
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
                        const rankA = rankOrderPriority[a.rank] || 0;
                        const rankB = rankOrderPriority[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    remainingNonContaining.sort((a, b) => {
                        const rankA = rankOrderPriority[a.rank] || 0;
                        const rankB = rankOrderPriority[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    prioritizedList = [...collected, ...remainingContaining, ...remainingNonContaining];
                } else {
                    containingMatches.sort((a, b) => {
                        const rankA = rankOrderPriority[a.rank] || 0;
                        const rankB = rankOrderPriority[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    nonMatches.sort((a, b) => {
                        const rankA = rankOrderPriority[a.rank] || 0;
                        const rankB = rankOrderPriority[b.rank] || 0;
                        if (rankA !== rankB) return rankB - rankA;
                        return (a.scientific_name || '').toLowerCase().localeCompare((b.scientific_name || '').toLowerCase());
                    });
                    
                    prioritizedList = [...containingMatches, ...nonMatches];
                }
            }
        }
        try {
            console.groupCollapsed('[TabPanel] Suggestions (hierarchical)', hierarchicalResults.length, 'items');
            console.table(hierarchicalResults.map(s => ({
                id: s.full_data?.id || s.id || '-',
                name: s.scientific_name,
                common: s.common_name || '',
                rank: s.rank,
                status: s.full_data?.taxonomic_status || s.taxonomic_status || '',
                accepted: s.full_data?.accepted_scientific_name || s.accepted_scientific_name || ''
            })));
            console.groupEnd();
            if (query) {
                console.groupCollapsed('[TabPanel] Final prioritized results for query:', query);
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

        return prioritizedList;
    };

    const handleTaxonSelect = async (taxon) => {
        try {
            const isSynonym = (taxon?.full_data?.taxonomic_status || taxon?.taxonomic_status) === 'SYNONYM';
            const acceptedName = taxon?.full_data?.accepted_scientific_name || taxon?.accepted_scientific_name;

            let finalTaxon = taxon;

            if (isSynonym && acceptedName) {
                let toastId;
                try {
                    setLoading('synonymRedirect', true);
                    try { toastId = toast.loading('Mencari taksa diterima...', { position: 'bottom-center' }); } catch (_) {}
                    const resp = await apiFetch(`/species-suggestions?query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true`);
                    const respJson = await resp.json();
                    const list = Array.isArray(respJson?.data) ? respJson.data : [];
                    const acceptedMatch = list.find(item =>
                        (item.scientific_name === acceptedName) &&
                        ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
                    );

                    if (acceptedMatch) {
                        finalTaxon = acceptedMatch;
                        try {
                            console.log('[TabPanel] Redirected synonym', taxon?.scientific_name, '=> accepted', acceptedMatch?.scientific_name);
                        } catch (_) { /* no-op */ }
                    }
                } catch (err) {
                    try { console.warn('[TabPanel] Failed to resolve accepted taxon for synonym:', err); } catch (_) {}
                } finally {
                    setLoading('synonymRedirect', false);
                    try { if (toastId) toast.dismiss(toastId); } catch (_) {}
                }
            }
            const isStillSynonym = (finalTaxon?.full_data?.taxonomic_status || finalTaxon?.taxonomic_status) === 'SYNONYM';
            const finalScientificName = (isStillSynonym && acceptedName) ? acceptedName : (finalTaxon.scientific_name || taxon.scientific_name);
            const resolvedId = finalTaxon?.full_data?.id || finalTaxon?.id || taxon?.full_data?.id || taxon?.id;
            const updatedSelected = {
                ...finalTaxon,
                scientific_name: finalScientificName,
                full_data: {
                    ...(finalTaxon?.full_data || taxon?.full_data || {}),
                    ...(resolvedId ? { id: resolvedId } : {})
                }
            };
            setSelectedTaxon(updatedSelected);

            setIdentificationForm(prev => ({
                ...prev,
                taxon_id: resolvedId,
                identification_level: finalTaxon?.rank || taxon?.rank
            }));
        } finally {
            setSearchQuery('');
            setShowSuggestions(false);
        }
    };

    const handleDisagreeSubmit = async (identificationId) => {
        try {
            if (!selectedTaxon || !selectedTaxon.full_data || !selectedTaxon.full_data.id) {
                toast.error('Silakan pilih takson terlebih dahulu');
                return;
            }
            if (!disagreeComment || disagreeComment.trim() === '') {
                toast.error('Berikan alasan penolakan');
                return;
            }
            const existingUserIdentification = identifications.find(
                ident => ident.user_id === user?.id && 
                         !ident.agrees_with_id && // Penting: hanya identifikasi langsung
                         ident.is_withdrawn !== 1
            );
            const userAgreements = identifications.filter(
                ident => ident.user_id === user?.id && 
                         ident.agrees_with_id && 
                         ident.is_withdrawn !== 1
            );
            
            const hasExistingAgreement = userAgreements.length > 0;

            const requestBody = {
                taxon_id: selectedTaxon.full_data.id,
                comment: disagreeComment,
                identification_level: selectedTaxon.rank || 'species',
                force_new_identification: hasExistingAgreement // Selalu buat identifikasi baru jika sebelumnya punya agreement
            };
            if (existingUserIdentification && !existingUserIdentification.agrees_with_id) {
                requestBody.existing_identification_id = existingUserIdentification.id;
                console.log('Existing direct identification found:', existingUserIdentification.id);
            } else {
                console.log('No direct identification found, will create new one');
            }

            console.log('Sending disagreement request:', requestBody);

            const response = await apiFetch(`/observations/${id}/identifications/${identificationId}/disagree`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.success) {
                if (hasExistingAgreement) {
                    setIdentifications(prevIdentifications =>
                        prevIdentifications.map(ident => {
                            if (ident.user_id === user?.id && 
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
                if (data.disagreement) {
                    const existingIndex = identifications.findIndex(
                        ident => ident.id === data.disagreement.id
                    );
                    
                    if (existingIndex >= 0) {
                        setIdentifications(prevIdentifications => 
                            prevIdentifications.map(ident => 
                                ident.id === data.disagreement.id
                                    ? { ...data.disagreement, disagrees_with_id: identificationId } 
                                    : ident
                            )
                        );
                        console.log('Updated existing identification to disagreement:', data.disagreement);
                    } else {
                        setIdentifications(prevIdentifications => [
                            ...prevIdentifications, 
                            { ...data.disagreement, disagrees_with_id: identificationId }
                        ]);
                        console.log('Added new disagreement identification:', data.disagreement);
                    }
                }
                if (typeof handleDisagreeWithIdentification === 'function') {
                    await handleDisagreeWithIdentification(identificationId, disagreeComment, selectedTaxon);
                }
                setIdentifications(prevIdentifications =>
                    prevIdentifications.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, user_disagreed: true }
                            : ident
                    )
                );
                setShowDisagreeModal(false);
                setSelectedTaxon(null);
                setDisagreeComment('');
                setSearchQuery('');
                
                toast.success('Berhasil menolak identifikasi');
            } else {
                console.error('Gagal menolak identifikasi:', data.message);
                toast.error(`Gagal menolak identifikasi: ${data.message || 'Silakan coba lagi'}`);
            }
        } catch (error) {
            console.error('Error saat menolak identifikasi:', error);
            toast.error('Terjadi kesalahan saat menolak identifikasi. Silakan coba lagi.');
        }
    };

    const handleDisagreeButton = (identificationId) => {
        setSelectedIdentificationId(identificationId);
        setShowDisagreeModal(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdentificationPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleUsernameClick = (comment, e) => {
        e.preventDefault();
        setSelectedUsername(comment.user_name);
        setSelectedCommentId(comment.id);
        setShowUserMenu(true);
    };

    const formatLink = (url) => {
        if (!url.match(/^https?:\/\//i)) {
            return `https://${url}`;
        }
        return url;
    };

    const quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false
        },
        keyboard: {
            bindings: {
                tab: false
            }
        }
    };

    const handleLinkClick = useCallback((e) => {
        const target = e.target;
        if (target.tagName === 'A') {
            e.preventDefault();
            const href = target.getAttribute('href');
            if (href) {
                if (href.includes('/profile/')) {
                    const url = new URL(href, window.location.origin);
                    const path = url.pathname;
                    navigate(path);
                } else {
                    window.open(formatLink(href), '_blank', 'noopener,noreferrer');
                }
            }
        }
    }, [navigate]);

    const getTaxonomyLevel = (taxon) => {
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
            'division', // Jangan prioritaskan division untuk plantae
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];
        if (taxon.species && taxon.kingdom === 'Plantae') {
            if (taxon.species) return `${taxon.species} (Species)`;
            if (taxon.genus) return `${taxon.genus} (Genus)`;
            if (taxon.family) return `${taxon.family} (Family)`;
            if (taxon.order) return `${taxon.order} (Order)`;
            if (taxon.class) return `${taxon.class} (Class)`;
            if (taxon.phylum) return `${taxon.phylum} (Phylum)`;
            if (taxon.division) return `${taxon.division} (Division)`;
        }
        for (const level of taxonomyLevels) {
            if (taxon[level]) {
                const displayName = level.charAt(0).toUpperCase() + level.slice(1);
                if (level === 'division' && taxon.kingdom === 'Plantae') {
                    return `${taxon[level]} (Division)`;
                }
                return `${taxon[level]} (${displayName})`;
            }
        }
        return null;
    };
    const cleanScientificName = (name) => {
        if (!name) return '';
        return name.split(' ').filter(part => {
            return !(/\d/.test(part) || /[\(\)]/.test(part));
        }).join(' ');
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
        const getBestTaxonomyLevel = () => {
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
            if (!taxon?.phylum && taxon?.division) {
                return {
                    level: 'phylum',
                    name: taxon.division,
                    commonName: taxon.cname_division
                };
            }
            for (const level of taxonomyLevels) {
                if (taxon?.[level]) {
                    const commonNameField = `cname_${level}`;
                    return {
                        level,
                        name: taxon[level],
                        commonName: taxon[commonNameField]
                    };
                }
            }

            return null;
        };

        const bestTaxonomy = getBestTaxonomyLevel();
        
        if (bestTaxonomy) {
            const { level, name, commonName } = bestTaxonomy;
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

        return 'Nama tidak tersedia';
    };

    const renderSuggestionsList = (results, containerRef, onClose) => (
        <div
            ref={containerRef}
            className="relative mt-2 border rounded max-h-48 overflow-y-auto bg-white"
        >
            <button
                onClick={onClose}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 z-10"
            >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
            {loadingStates.synonymRedirect && (
                <div className="sticky top-0 z-10 bg-yellow-50 text-yellow-800 text-xs px-3 py-2 border-b border-yellow-200 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSpinner} spin className="w-3 h-3" />
                    Mengarahkan ke taksa diterima...
                </div>
            )}
            {results.map((taxon) => (
                <div
                    key={taxon.id}
                    onClick={() => handleTaxonSelect(taxon)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''}`}>
                        {taxon.scientific_name}
                        {taxon.common_name && ` | ${taxon.common_name}`}
                        <span className="text-gray-500 text-sm"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                    </div>
                    {taxon.family_context && (
                        <div className="text-sm text-gray-600">
                            {taxon.family_context}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
    const getCurrentIdentification = () => {
        if (!identifications || identifications.length === 0) {
            return null;
        }
        const activeIdentifications = identifications.filter(id => 
            id.is_withdrawn !== 1 && !id.agrees_with_id);
        
        console.log('Active identifications:', activeIdentifications);
        
        if (activeIdentifications.length === 0) {
            return null;
        }
        if (activeIdentifications.length === 1) {
            console.log('Hanya satu identifikasi aktif:', activeIdentifications[0]);
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
    const addLinkEventListeners = useCallback((containerId, handleLinkFn) => {
        const container = document.getElementById(containerId);
        if (container) {
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', handleLinkFn);
            });
            return () => {
                links.forEach(link => {
                    link.removeEventListener('click', handleLinkFn);
                });
            };
        }
        return () => {};
    }, []);
    const toggleIdentificationExpand = (identificationId) => {
        setExpandedIdentifications(prev => ({
            ...prev,
            [identificationId]: !prev[identificationId]
        }));
    };
    useEffect(() => {
        if (!identifications || identifications.length === 0) return;
        const timeoutId = setTimeout(() => {
            const commentContainers = document.querySelectorAll('[id^="identification-comment-"]');
            const cleanupFunctions = [];
            
            commentContainers.forEach(container => {
                const cleanupFn = addLinkEventListeners(container.id, handleLinkClick);
                cleanupFunctions.push(cleanupFn);
            });
            return () => {
                cleanupFunctions.forEach(fn => fn());
            };
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [identifications, addLinkEventListeners, handleLinkClick]);

    const renderIdentifications = () => {
        console.log('Identifications in TabPanel:', identifications);
        if (identifications && identifications.length > 0) {
            identifications.forEach((ident, index) => {
                console.log(`Identification ${index}:`, {
                    id: ident.id,
                    user_id: ident.user_id,
                    user_id_type: typeof ident.user_id,
                    is_withdrawn: ident.is_withdrawn,
                    identifier_name: ident.identifier_name
                });
            });
        }
        
        if (!identifications || identifications.length === 0) {
            return (
                <div className="text-gray-400 text-center py-4">
                    Belum ada identifikasi
                </div>
            );
        }
        const groupedIdentifications = identifications.reduce((acc, identification) => {
            if (identification.agrees_with_id) {
                if (!acc[identification.agrees_with_id]) {
                    acc[identification.agrees_with_id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.agrees_with_id].agreements.push(identification);
            } else {
                if (!acc[identification.id]) {
                    acc[identification.id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.id].main = identification;
            }
            return acc;
        }, {});
        const sortedIdentifications = Object.values(groupedIdentifications)
            .filter(group => group.main !== null)
            .sort((a, b) => {
                if (a.main.is_first) return -1;
                if (b.main.is_first) return 1;
                return new Date(a.main.created_at) - new Date(b.main.created_at);
            });
        const flatIdentificationList = [];
        
        sortedIdentifications.forEach(({ main, agreements }) => {
            flatIdentificationList.push({
                ...main,
                isMainIdentification: true,
                agreements: agreements
            });
            agreements.forEach(agreement => {
                flatIdentificationList.push({
                    ...agreement,
                    isAgreement: true,
                    mainIdentification: main
                });
            });
        });
        flatIdentificationList.sort((a, b) => {
            try {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
                    return 0; // Keduanya invalid, anggap sama
                } else if (isNaN(dateA.getTime())) {
                    return 1; // A invalid, B valid, B lebih awal
                } else if (isNaN(dateB.getTime())) {
                    return -1; // A valid, B invalid, A lebih awal
                }
                
                return dateA - dateB;
            } catch (error) {
                console.error('Error sorting dates:', error);
                return 0;
            }
        });
        const dateGroups = {};
        flatIdentificationList.forEach(item => {
            try {
                const createdAt = item.created_at ? new Date(item.created_at) : new Date();
                if (isNaN(createdAt.getTime())) {
                    console.warn('Invalid date detected:', item.created_at);
                    item.created_at = new Date().toISOString();
                }
                
                const dateStr = new Date(item.created_at).toISOString().split('T')[0];
                if (!dateGroups[dateStr]) {
                    dateGroups[dateStr] = [];
                }
                dateGroups[dateStr].push(item);
            } catch (error) {
                console.error('Error processing date:', error, item);
                const today = new Date().toISOString().split('T')[0];
                if (!dateGroups[today]) {
                    dateGroups[today] = [];
                }
                dateGroups[today].push(item);
            }
        });
        const enhancedList = [];
        Object.keys(dateGroups).sort().forEach(dateStr => {
            enhancedList.push({
                isDateDivider: true,
                date: dateStr
            });
            enhancedList.push(...dateGroups[dateStr]);
        });

        return (
            <div className="identification-tree">
                {enhancedList.map((item, index) => {
                    if (item.isDateDivider) {
                        try {
                            const date = new Date(item.date);
                            if (isNaN(date.getTime())) {
                                console.warn('Invalid date in date divider:', item.date);
                                const today = new Date();
                                return (
                                    <div key={`date-invalid-${index}`} className="flex items-center my-2 sm:my-3">
                                        <div className="grow border-t border-[#444]"></div>
                                        <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                            {today.toLocaleDateString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="grow border-t border-[#444]"></div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={`date-${item.date}-${index}`} className="flex items-center my-2 sm:my-3">
                                    <div className="grow border-t border-[#444]"></div>
                                    <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                        {date.toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="grow border-t border-[#444]"></div>
                                </div>
                            );
                        } catch (error) {
                            console.error('Error rendering date divider:', error);
                            return null;
                        }
                    }
                    if (item.type === 'identification') {
                        const singleIdent = [item];
                        return (
                            <div key={`ident-${item.id}-${index}`} className="mb-2">
                                {renderSingleIdentification(item, index)}
                            </div>
                        );
                    }
                    if (item.type === 'comment') {
                        return (
                            <div key={`comment-${item.id}-${index}`} className="mb-2 bg-[#2c2c2c] rounded-lg">
                                {renderComment(item)}
                            </div>
                        );
                    }
                    
                    return null;
                })}
            </div>
        );
    };
    const renderSingleIdentification = (item, index) => {
                    const currentUsername = localStorage.getItem('username');
                    const currentUserId = user ? user.id : null;
                    const isOwnIdentification = user && String(item.user_id) === String(user.id);
                    const photoUrl = item.photo_path
            ? `https://api.amaturalist.com/storage/${item.photo_path}`
                        : item.photo_url;
                    
        if (item.isAgreement || item.agrees_with_id) {
                        return (
                <div className="relative">
                                <div className="flex items-start">
                                    {/* User profile image */}
                                    <div className="mr-2 sm:mr-3 flex-shrink-0">
                                        <img 
                                            src={getProfileImageUrl(item.profile_pic, item.identifier_name)} 
                                            alt={item.identifier_name}
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444] object-cover"
                                        />
                                    </div>
                                    
                                    <div className="bg-[#2c2c2c] rounded-lg border border-[#444] shadow p-3 sm:p-4 relative flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow">
                                                <div className="mb-2 sm:mb-3">
                                                    <div className="flex items-center">
                                                        <span className="text-base sm:text-xl font-semibold text-white">
                                                            {getTaxaDisplayWithCommonName(item)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                                        {item.family || item.genus || item.species || getTaxonomyLevel(item)}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center text-xs sm:text-sm text-gray-400 flex-wrap">
                                                    <span className="bg-blue-900/30 text-blue-200 px-2 py-1 rounded-full mr-2 text-xs border border-blue-500/30">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                        Disetujui
                                                    </span>
                                                    <Link 
                                                        to={`/profile/${item.user_id}`} 
                                                        className="text-[#1a73e8] hover:underline font-medium mx-1"
                                                    >
                                                        {item.identifier_name}
                                                    </Link>
                                        <span>menyetujui identifikasi</span>
                                                    <span className="mx-1">·</span>
                                                    <span>{
                                                        (() => {
                                                            try {
                                                                const date = new Date(item.created_at);
                                                                if (isNaN(date.getTime())) {
                                                                    return 'Tanggal tidak tersedia';
                                                                }
                                                                return date.toLocaleDateString('id-ID');
                                                            } catch (error) {
                                                                console.error('Error formatting date:', error, item.created_at);
                                                                return 'Tanggal tidak tersedia';
                                                            }
                                                        })()
                                                    }</span>
                                                </div>
                                            </div>
                                            
                                            {isOwnIdentification && (
                                                <button
                                                    onClick={() => handleCancelButton(item.agrees_with_id)}
                                                    className="px-2 sm:px-3 py-1 rounded-full bg-[#444] text-gray-300 hover:bg-[#555] text-xs ml-2"
                                                >
                                                    {loadingStates.cancelAgreement ? (
                                                        <span className="flex items-center">
                                                            <span className="mr-1 h-3 w-3 rounded-full border-[1.5px] border-t-transparent border-gray-300 animate-spin"></span>
                                                            <span>Proses...</span>
                                                        </span>
                                                    ) : (
                                                        <span>Batal Setuju</span>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                <div className="relative identification-node">
                                {item.is_withdrawn === 1 && !expandedIdentifications[item.id] ? (
                                    <div 
                                        className="flex items-center bg-[#2c2c2c] hover:bg-[#333] rounded-lg border border-red-900/50 shadow px-3 sm:px-4 py-2 sm:py-3 relative cursor-pointer transition-colors duration-200"
                                        onClick={() => toggleIdentificationExpand(item.id)}
                                        title="Klik untuk melihat detail lengkap"
                                    >
                                        <div className="flex-grow flex flex-wrap items-center gap-2">
                                            <img 
                                                src={getProfileImageUrl(item.profile_pic, item.identifier_name)}
                                                alt={item.identifier_name}
                                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#444] object-cover flex-shrink-0"
                                            />
                                            <div className="line-through text-gray-400 font-medium text-xs sm:text-sm">
                                                {getTaxaDisplayWithCommonName(item)}
                                            </div>
                                            <div className="bg-red-900 text-red-200 text-xs px-2 py-1 rounded flex-shrink-0">
                                                Ditarik
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                                                oleh <Link to={`/profile/${item.user_id}`} className="text-[#1a73e8] hover:underline">{item.identifier_name}</Link>
                                                <span className="mx-1">·</span>
                                                {(() => {
                                                    try {
                                                        const date = new Date(item.created_at);
                                                        if (isNaN(date.getTime())) {
                                                            return 'Tanggal tidak tersedia';
                                                        }
                                                        return date.toLocaleDateString('id-ID');
                                                    } catch (error) {
                                                        console.error('Error formatting date for withdrawn item:', error, item.created_at);
                                                        return 'Tanggal tidak tersedia';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center text-gray-500 text-xs ml-2">
                                            <span className="mr-1 hidden sm:inline">Lihat detail</span>
                                            <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start">
                                        {/* User profile image */}
                                        <div className="mr-2 sm:mr-3 flex-shrink-0 z-10">
                                            <img 
                                                src={getProfileImageUrl(item.profile_pic, item.identifier_name)} 
                                                alt={item.identifier_name}
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444] object-cover"
                                            />
                                        </div>
                                        
                                        <div className={`bg-[#2c2c2c] rounded-lg border ${item.is_withdrawn === 1 ? 'border-red-900/50' : 'border-[#444]'} shadow p-3 sm:p-4 relative z-10 flex-grow`}>
                                            {/* Label jika identifikasi ditarik */}
                                            {item.is_withdrawn === 1 && (
                                                <div className="flex justify-between items-center absolute top-0 right-0">
                                                    <div className="bg-red-900 text-red-200 text-xs px-2 py-1 rounded-bl rounded-tr flex items-center cursor-pointer"
                                                        onClick={() => toggleIdentificationExpand(item.id)}
                                                    >
                                                        <span>Ditarik</span>
                                                        <FontAwesomeIcon icon={faChevronUp} className="ml-1 w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                                                <div className={`flex-grow ${item.is_withdrawn === 1 ? 'cursor-pointer' : ''}`}
                                                     onClick={item.is_withdrawn === 1 ? () => toggleIdentificationExpand(item.id) : undefined}
                                                >
                                                    {/* Takson dan Informasi Level */}
                                                    <div className="mb-2 sm:mb-3">
                                                        <div className="flex items-center">
                                                            <span className={`${item.is_withdrawn === 1 ? 'line-through text-gray-400' : 'text-base sm:text-xl font-semibold text-white'}`}>
                                                                {getTaxaDisplayWithCommonName(item)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                                            {item.family || item.genus || item.species || getTaxonomyLevel(item)}
                                                        </div>
                                                    </div>

                                                    {/* Informasi Identifikasi */}
                                                    <div className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-gray-400">
                                                        <span>diidentifikasi oleh</span>
                                                        <Link 
                                                            to={`/profile/${item.user_id}`} 
                                                            className="text-[#1a73e8] hover:underline font-medium"
                                                            onMouseEnter={() => {
                                                                setShowIdentifierTooltip(true);
                                                                setActiveIdentifierId(item.id);
                                                            }}
                                                            onMouseLeave={() => {
                                                                setShowIdentifierTooltip(false);
                                                                setActiveIdentifierId(null);
                                                            }}
                                                        >
                                                            {item.identifier_name}
                                                        </Link>
                                                        <span>·</span>
                                                        <span>{
                                                            (() => {
                                                                try {
                                                                    const date = new Date(item.created_at);
                                                                    if (isNaN(date.getTime())) {
                                                                        return 'Tanggal tidak tersedia';
                                                                    }
                                                                    return date.toLocaleDateString('id-ID');
                                                                } catch (error) {
                                                                    console.error('Error formatting date:', error, item.created_at);
                                                                    return 'Tanggal tidak tersedia';
                                                                }
                                                            })()
                                                        }</span>
                                                    </div>
                                                    
                                                    {/* Tampilkan jumlah persetujuan */}
                                                    {item.agreements && item.agreements.length > 0 && (
                                                        <div className="mt-2 flex items-center">
                                                            <span className="text-xs bg-[#1a73e8]/10 text-[#1a73e8] px-2 py-1 rounded-full border border-[#1a73e8]/30">
                                                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                                Disetujui {item.agreements.length} pengamat
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Tooltips untuk informasi identifier */}
                                                    {showIdentifierTooltip && activeIdentifierId === item.id && (
                                                        <div className="absolute z-20 bg-[#333] border border-[#444] rounded-lg shadow-lg p-3 mt-1 left-0 w-60">
                                                            <div className="text-sm">
                                                                <div className="font-medium text-white">{item.identifier_name}</div>
                                                                {item.identifier_joined_date && (
                                                                    <div className="text-gray-400">
                                                                        Bergabung sejak: {new Date(item.identifier_joined_date).toLocaleDateString('id-ID')}
                                                                    </div>
                                                                )}
                                                                {item.identifier_identification_count && (
                                                                    <div className="text-gray-400">
                                                                        Total Identifikasi: {item.identifier_identification_count}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tombol Aksi */}
                                                {!item.is_withdrawn && (
                                                    <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
                                                        {/* Tombol Aksi Identifikasi */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {isOwnIdentification ? (
                                                                <button
                                                                    onClick={() => handleWithdrawButton(item.id)}
                                                                    disabled={loadingStates.withdraw}
                                                                    className="px-3 py-1 rounded-full bg-yellow-900/70 text-yellow-200 hover:bg-yellow-800 ring-1 ring-yellow-600/40 text-xs sm:text-sm flex items-center"
                                                                    title="Menarik identifikasi ini akan menghapus semua persetujuan terkait"
                                                                >
                                                                    {loadingStates.withdraw ? (
                                                                        <>
                                                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                            <span>Proses...</span>
                                                                        </>
                                                                    ) : (
                                                                        <span>Tarik Identifikasi</span>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <>
                                                        {/* Periksa apakah ini identifikasi hasil konversi atau penolakan */}
                                                        {!item.user_agreed ? (
                                                                        <>
                                                                            {/* Sembunyikan tombol setuju/tolak untuk identifikasi ragu-ragu */}
                                                                            {/* Cek berdasarkan excluded_from_quorum atau confidence_level untuk identifikasi ragu-ragu */}
                                                                            {!(item.excluded_from_quorum === 1 || item.confidence_level === 0) && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleAgreeButton(item.id)}
                                                                                        className="px-3 py-1 rounded-full bg-green-900 text-green-200 hover:bg-green-800 ring-1 ring-green-600/40 flex items-center text-xs sm:text-sm"
                                                                                        title="Setuju dengan identifikasi ini"
                                                                                    >
                                                                                        {loadingStates.agree ? (
                                                                                            <>
                                                                                                <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                                                <span>Proses...</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                                                                <span>Setuju</span>
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDisagreeButton(item.id)}
                                                                                        className="px-3 py-1 rounded-full bg-red-900 text-red-200 hover:bg-red-800 ring-1 ring-red-600/40 text-xs sm:text-sm flex items-center"
                                                                                    >
                                                                                        <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                                                        Tolak
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </>
                                                        ) : item.user_agreed && (
                                                                        <button
                                                                            onClick={() => handleCancelButton(item.id)}
                                                                            className="px-3 py-1 rounded-full bg-blue-900 text-blue-200 hover:bg-blue-800 ring-1 ring-blue-600/40 flex items-center text-xs sm:text-sm"
                                                                            title="Batalkan persetujuan untuk identifikasi ini"
                                                                        >
                                                                            {loadingStates.cancelAgreement ? (
                                                                                <>
                                                                                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                                                                    <span>Proses...</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                                                                    <span>Batal Setuju</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Keterangan untuk identifikasi ragu-ragu - visible untuk semua user */}
                                            {(item.excluded_from_quorum === 1 || item.confidence_level === 0) && (
                                                <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-600/30">
                                                    <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                                    {item.identifier_name} tidak setuju ini {getTaxaDisplayWithCommonName(item)}
                                                </div>
                                            )}

                                            {/* Catatan Identifikasi */}
                                            {item.comment && !(item.comment.includes("Dikonversi dari persetujuan karena identifikasi utama ditarik")) && (
                                                <div className="mt-3 text-gray-300 bg-[#333] p-3 rounded-lg border border-[#444]">
                                                    <div className="text-xs sm:text-sm font-medium mb-1">Catatan:</div>
                                        <ExpandableComment text={item.comment} id={`identification-comment-${item.id}`} />
                                                </div>
                                            )}

                                            {/* Indikator untuk identifikasi yang dikonversi dari persetujuan */}
                                            {item.comment && item.comment.includes("Dikonversi dari persetujuan karena identifikasi utama ditarik") && (
                                                <div className="mt-2 flex items-center">
                                                    <span className="text-xs bg-blue-900/30 text-blue-200 px-2 py-1 rounded-full flex items-center gap-1 border border-blue-500/30">
                                            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                            Bekas persetujuan identifikasi yang ditarik
                                                    </span>
                                                </div>
                                            )}

                                {/* Indikator untuk identifikasi penolakan */}
                                {/* {item.disagrees_with_id && (
                                    <div className="mt-2 flex items-center">
                                        <span className="text-xs bg-red-900/30 text-red-200 px-2 py-1 rounded-full flex items-center gap-1 border border-red-500/30">
                                            <FontAwesomeIcon icon={faXmark} className="mr-1" />
                                            Menolak identifikasi lain
                                        </span>
                                    </div>
                                )} */}

                                            {/* Foto Identifikasi */}
                                            {(item.photo_path || item.photo_url) && (
                                                <div className="mt-3">
                                                    <img
                                                        src={photoUrl}
                                                        alt="Foto identifikasi"
                                                        className="max-h-36 sm:max-h-48 w-auto rounded-lg"
                                                        onError={(e) => {
                                                            console.error('Error loading image:', e);
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }
    };
    const toastStyles = {
        success: {
            style: {
                background: '#10B981',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#10B981',
            },
        },
        error: {
            style: {
                background: '#EF4444',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#EF4444',
            },
        }
    };
    const handleAddComment = async (comment) => {
        if (!comment.trim()) {
            toast.error('Komentar tidak boleh kosong', toastStyles.error);
            return;
        }

        try {
            setLoading('comment', true);
            const mentions = [];
            const mentionRegex = /@(\w+)/g;
            let match;
            
            while ((match = mentionRegex.exec(comment)) !== null) {
                mentions.push(match[1]);
            }

            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    comment: comment,
                    observation_id: id,
                    user_name: user?.uname,
                    user_id: user?.id,
                    mentions: mentions.join(',') // Kirim mentions ke server
                })
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error('Terjadi kesalahan saat menambahkan komentar');
            }
            const newComment = {
                id: responseData.data.id,
                comment: comment,
                user_name: user?.uname || responseData.data.user_name,
                user_id: user?.id || responseData.data.user_id,
                profile_pic: user?.profile_pic || responseData.data.profile_pic,
                created_at: responseData.data.created_at || new Date().toISOString()
            };
            setComments(prev => [...prev, newComment]);
            setNewComment('');
            
            toast.success('Komentar berhasil ditambahkan', toastStyles.success);
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Gagal menambahkan komentar. Silakan coba lagi.', toastStyles.error);
        } finally {
            setLoading('comment', false);
        }
    };
    const parseComment = (text) => {
        if (!text) return '';
        let processedText = DOMPurify.sanitize(text);
        processedText = processedText.replace(/@(\w+)/g, (match, username) => {
            let userId = null;
            const commentUser = comments.find(c => c.user_name === username);
            if (commentUser) {
                userId = commentUser.user_id;
            } else {
                const identUser = identifications.find(i => i.identifier_name === username);
                if (identUser) {
                    userId = identUser.user_id;
                }
            }
            if (userId) {
                return `<a href="/profile/${userId}" class="text-[#1a73e8] hover:underline">@${username}</a>`;
            } else {
                return `<a href="/profile/username/${username}" class="text-[#1a73e8] hover:underline">@${username}</a>`;
            }
        });
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        processedText = processedText.replace(urlRegex, (url) => {
            if (url.match(/<a\s+href/i)) return url; // Skip jika sudah dalam tag <a>
            return `<a href="${url}" class="text-[#1a73e8] hover:underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        return processedText;
    };
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await apiFetch(`/observations/${id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal menghapus komentar');
            }
            setComments(prev => prev.filter(comment => comment.id !== commentId));

            toast.success('Komentar berhasil dihapus');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error(error.message || 'Gagal menghapus komentar');
            setShowUserMenu(false);
        }
    };
    const handleFlagComment = async () => {
        if (!flagReason.trim()) {
            toast.error('Alasan laporan harus diisi');
            return;
        }

        try {
            setLoading('flag', true);
            const response = await apiFetch(`/observations/${id}/comments/${selectedCommentId}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: flagReason })
            });

            if (!response.ok) {
                throw new Error('Gagal melaporkan komentar');
            }

            toast.success('Komentar berhasil dilaporkan');
            setShowFlagModal(false);
            setFlagReason('');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error flagging comment:', error);
            toast.error('Gagal melaporkan komentar');
        } finally {
            setLoading('flag', false);
        }
    };
    useEffect(() => {
        if (!comments || comments.length === 0) return;
        const timeoutId = setTimeout(() => {
            const commentContainers = document.querySelectorAll('[id^="comment-"]');
            const cleanupFunctions = [];
            
            commentContainers.forEach(container => {
                const cleanupFn = addLinkEventListeners(container.id, handleLinkClick);
                cleanupFunctions.push(cleanupFn);
            });
            return () => {
                cleanupFunctions.forEach(fn => fn());
            };
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [comments, addLinkEventListeners, handleLinkClick]);
    const ExpandableComment = ({ text, id }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const commentRef = useRef(null);
        const [isOverflowing, setIsOverflowing] = useState(false);

        useEffect(() => {
            if (commentRef.current) {
                setIsOverflowing(commentRef.current.scrollHeight > commentRef.current.clientHeight && !isExpanded);
            }
        }, [text, isExpanded]);
        const formatLongText = (text) => {
            if (text.length <= 100) return text;
            if (!isExpanded) {
                return text;
            }
            
            return text;
        };
        const cleanText = DOMPurify.sanitize(formatLongText(text));

        return (
            <div>
                <div
                    id={id}
                    ref={commentRef}
                    className={`[&_a]:text-[#1a73e8] [&_a]:hover:text-[#4285f4] [&_a]:underline text-xs sm:text-sm
                     ${!isExpanded ? 'max-h-24 overflow-hidden' : 'overflow-visible break-words whitespace-pre-wrap'}
                     ${isExpanded ? 'pt-2 pb-2' : ''} word-break-word w-full`}
                    dangerouslySetInnerHTML={{ __html: cleanText }}
                />
                {isOverflowing && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="text-xs text-[#1a73e8] hover:underline mt-1 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Lihat lebih banyak
                    </button>
                )}
                {isExpanded && (
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="text-xs text-[#1a73e8] hover:underline mt-1 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Sembunyikan
                    </button>
                )}
            </div>
        );
    };
    const setLoading = (action, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [action]: isLoading
        }));
    };
    const handleAgreeButton = async (identificationId) => {
        try {
            setLoading('agree', true);
            await handleAgreeWithIdentification(identificationId);
        } catch (error) {
            console.error('Error agreeing with identification:', error);
            toast.error('Gagal menyetujui identifikasi');
        } finally {
            setLoading('agree', false);
        }
    };
    const handleCancelButton = async (identificationId) => {
        try {
            setLoading('cancelAgreement', true);
            await handleCancelAgreement(identificationId);
        } catch (error) {
            console.error('Error canceling agreement:', error);
            toast.error('Gagal membatalkan persetujuan');
        } finally {
            setLoading('cancelAgreement', false);
        }
    };
    const handleWithdrawButton = async (identificationId) => {
        try {
            setLoading('withdraw', true);
            await handleWithdrawIdentification(identificationId);
        } catch (error) {
            console.error('Error withdrawing identification:', error);
            toast.error('Gagal menarik identifikasi');
        } finally {
            setLoading('withdraw', false);
        }
    };
    const CommentItem = ({ comment, canDelete, handleDeleteComment, handleUsernameClick, showUserMenu, selectedCommentId, setShowUserMenu, setSelectedCommentId, setShowFlagModal, setNewComment, dropdownRef }) => {
        const processedComment = typeof comment.comment === 'string' 
            ? parseComment(comment.comment)
            : JSON.stringify(comment.comment);

        return (
            <div className="p-3 sm:p-4 hover:bg-[#333] transition-colors border-b border-[#444] last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start space-x-2 relative flex-grow mr-2" ref={dropdownRef}>
                        <img 
                            src={getProfileImageUrl(comment.profile_pic, comment.user_name)} 
                            alt={comment.user_name}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#444] mr-2 flex-shrink-0"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-grow">
                            <span
                                className="font-medium cursor-pointer hover:text-[#1a73e8] text-white flex items-center gap-2"
                                onClick={(e) => handleUsernameClick(comment, e)}
                            >
                                {comment.user_name || 'Anonymous'}
                            </span>
                            
                            <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleString('id-ID', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        
                        {showUserMenu && selectedCommentId === comment.id && (
                            <div className="absolute z-10 mt-8 w-48 bg-[#2c2c2c] rounded-lg shadow-lg py-1 border border-[#444]">
                                <Link
                                    to={`/profile/${comment.user_id}`}
                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    Lihat Profil
                                </Link>
                                {canDelete && (
                                    <button
                                        onClick={() => {
                                            handleDeleteComment(comment.id);
                                            setShowUserMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333]"
                                    >
                                        Hapus Komentar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        const content = typeof comment.comment === 'string' ? comment.comment : JSON.stringify(comment.comment);
                                        const plainText = content.replace(/<[^>]*>/g, ''); // Hapus HTML tags untuk plain text
                                        const quoteText = `<blockquote class="border-l-4 border-gray-500 pl-4 py-1 my-2 bg-[#333] text-white italic">
                                            <div class="text-sm text-gray-400 mb-1">@${comment.user_name} mengatakan:</div>
                                            ${plainText.substring(0, 100)}${plainText.length > 100 ? '...' : ''}
                                        </blockquote><p>@${comment.user_name} </p>`;
                                        
                                        setNewComment(quoteText);
                                        setShowUserMenu(false);
                                        
                                        toast.info(`Anda membalas komentar dari @${comment.user_name}`, {
                                            duration: 2000,
                                            position: 'bottom-center'
                                        });
                                        const commentForm = document.querySelector('.mb-6.bg-\\[\\#2c2c2c\\].rounded-lg');
                                        if (commentForm) commentForm.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faQuoteLeft} className="mr-2" />
                                        Balas
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        const mentionText = `@${comment.user_name} `;
                                        setNewComment(prev => prev + mentionText);
                                        setShowUserMenu(false);
                                        
                                        toast.info(`Anda telah menyebutkan @${comment.user_name}`, {
                                            duration: 2000,
                                            position: 'bottom-center'
                                        });
                                        const commentForm = document.querySelector('.mb-6.bg-\\[\\#2c2c2c\\].rounded-lg');
                                        if (commentForm) commentForm.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faAt} className="mr-2" />
                                        Mention
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedCommentId(comment.id);
                                        setShowFlagModal(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    Laporkan
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex">
                        {canDelete && (
                            <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-500 hover:text-red-400"
                                title="Hapus komentar"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="mt-1 text-gray-300 text-sm sm:text-base pl-8 sm:pl-10">
                    <ExpandableComment text={processedComment} id={`comment-${comment.id}`} />
                </div>
            </div>
        );
    };
    const renderComment = (comment) => {
        if (!comment || !comment.id || comment.deleted_at) return null;
        const canDelete = user && (
            String(comment.user_id) === String(user.id) || // Pemilik komentar
            user.level >= 3 || // Admin/moderator
            String(checklist?.user_id) === String(user.id) // Pemilik checklist
        );

        return (
            <CommentItem
                key={comment.id}
                comment={comment}
                canDelete={canDelete}
                handleDeleteComment={handleDeleteComment}
                handleUsernameClick={handleUsernameClick}
                showUserMenu={showUserMenu}
                selectedCommentId={selectedCommentId}
                setShowUserMenu={setShowUserMenu}
                setSelectedCommentId={setSelectedCommentId}
                setShowFlagModal={setShowFlagModal}
                setNewComment={setNewComment}
                dropdownRef={dropdownRef}
            />
        );
    };
    const renderCombinedContent = () => {
        if (combinedContent.length === 0) {
            return (
                <div className="flex items-center justify-center p-4 sm:p-6 bg-[#2c2c2c] rounded-lg text-gray-400 italic">
                    <FontAwesomeIcon icon={faComments} className="mr-2" />
                    Belum ada aktivitas diskusi
                </div>
            );
        }

        return (
            <div className="space-y-1">
                {combinedContent.map((item, index) => {
                    if (item.type === 'date_divider') {
                        try {
                            const date = new Date(item.date);
                            if (isNaN(date.getTime())) {
                                console.warn('Invalid date in date divider:', item.date);
                                const today = new Date();
                                return (
                                    <div key={`date-invalid-${index}`} className="flex items-center my-2 sm:my-3">
                                        <div className="grow border-t border-[#444]"></div>
                                        <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                            {today.toLocaleDateString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="grow border-t border-[#444]"></div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={`date-${item.date}-${index}`} className="flex items-center my-2 sm:my-3">
                                    <div className="grow border-t border-[#444]"></div>
                                    <div className="mx-2 sm:mx-4 text-xs text-gray-400 px-2 py-1 rounded-full bg-[#333]/70">
                                        {date.toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="grow border-t border-[#444]"></div>
                                </div>
                            );
        } catch (error) {
                            console.error('Error rendering date divider:', error);
                            return null;
                        }
                    }
                    if (item.type === 'identification') {
                        const singleIdent = [item];
                        return (
                            <div key={`ident-${item.id}-${index}`} className="mb-2">
                                {renderSingleIdentification(item, index)}
                            </div>
                        );
                    }
                    if (item.type === 'comment') {
                        return (
                            <div key={`comment-${item.id}-${index}`} className="mb-2 bg-[#2c2c2c] rounded-lg">
                                {renderComment(item)}
                            </div>
                        );
                    }
                    
                    return null;
                })}
            </div>
        );
    };
    const fetchIUCNStatus = useCallback(async (scientificName) => {
        if (!scientificName) return null;
        if (checklist?.grade !== 'research grade') {
            console.log('Skipping IUCN status fetch: Not research grade');
            return null;
        }
        
        try {
            setLoadingIucn(true);
            const response = await apiFetch(`/observations/iucn-status?scientific_name=${encodeURIComponent(scientificName)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
            }
            const responseText = await response.text();
            if (!responseText || responseText.trim() === '') {
                console.warn('Empty response from IUCN API');
                return null;
            }
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Response text:', responseText.substring(0, 100));
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
            if (!data || typeof data !== 'object') {
                console.warn('Invalid data structure from IUCN API', data);
                return null;
            }
            
            if (data.success && data.data && data.data.iucn_status) {
                setIucnStatus(data.data.iucn_status);
                return data.data.iucn_status;
            }
            
            setIucnStatus(null);
            return null;
        } catch (error) {
            console.error('Error fetching IUCN status:', error);
            toast.error(`Gagal mengambil status IUCN: ${error.message}`, {
                duration: 3000,
                position: 'bottom-center'
            });
            setIucnStatus(null);
            return null;
        } finally {
            setLoadingIucn(false);
        }
    }, [checklist?.grade]);
    useEffect(() => {
        const currentId = getCurrentIdentification();
        if (currentId && currentId.scientific_name && checklist?.grade === 'research grade') {
            if (checklist?.iucn_status) {
                setIucnStatus(checklist.iucn_status);
            } else {
                fetchIUCNStatus(currentId.scientific_name);
            }
        }
    }, [identifications, checklist, fetchIUCNStatus]);
    const getIUCNStatusDisplay = (status) => {
        if (!status) return null;
        
        const statusLower = status.toLowerCase();
        let bgColor = 'bg-green-900';
        let textColor = 'text-green-200';
        let ringColor = 'ring-green-600/40';
        
        if (statusLower.includes('extinct')) {
            bgColor = 'bg-black';
            textColor = 'text-gray-200';
            ringColor = 'ring-gray-600/40';
        } else if (statusLower.includes('critically') || statusLower.includes('endangered')) {
            bgColor = 'bg-red-900';
            textColor = 'text-red-200';
            ringColor = 'ring-red-600/40';
        } else if (statusLower.includes('vulnerable')) {
            bgColor = 'bg-orange-900';
            textColor = 'text-orange-200';
            ringColor = 'ring-orange-600/40';
        } else if (statusLower.includes('near') || statusLower.includes('threatened')) {
            bgColor = 'bg-yellow-900';
            textColor = 'text-yellow-200';
            ringColor = 'ring-yellow-600/40';
        }
        
        return {
            bgColor,
            textColor,
            ringColor,
            label: status
        };
    };

    return (
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <div className="border-b border-[#444] mb-4">
                <div className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 px-2 sm:px-4 flex items-center space-x-2 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                {/* Identifikasi Saat Ini - Dipindahkan ke TaxaDisplay di ChecklistDetail */}

                {/* Timeline Aktivitas (Gabungan Identifikasi dan Komentar) */}
                <div className="mb-6">
                    <h5 className="font-medium text-base sm:text-lg text-white mb-3">Aktivitas</h5>
                    <div className="space-y-1">
                        {renderCombinedContent()}
                            </div>
                </div>

                {/* Form Input - Berganti sesuai tab aktif */}
                {activeTab === 'identification' && (
                    <div>
                        {/* Form Menambahkan Identifikasi / Add Identification Form */}
                        <div className="mt-6 bg-[#2c2c2c] rounded-lg border border-[#444] p-3 sm:p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-medium text-base sm:text-lg text-white">Tambahkan Identifikasi</h3>
                                <button 
                                    onClick={() => setActiveTab('comments')}
                                    className="text-xs sm:text-sm text-[#1a73e8] hover:underline flex items-center"
                                >
                                    <FontAwesomeIcon icon={faComments} className="mr-1" />
                                    Tambah Komentar
                                </button>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-4">
                                Bantu pengamat memastikan identifikasinya dengan memberi komentar, foto pembanding atau usul nama.
                            </div>
                            
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Cari takson..."
                                    className="w-full p-2 sm:p-3 pr-10 border border-[#444] rounded-lg bg-[#333] text-white placeholder-gray-500 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none text-sm"
                                />
                                {loadingStates.search && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin h-4 w-4 border-2 border-[#1a73e8] border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                                {!loadingStates.search && searchQuery.length >= 3 && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            {searchQuery.length >= 3 && (loadingStates.search || searchResults.length > 0) && (
                                <div
                                    ref={suggestionsRef}
                                    className="relative mt-2 border border-[#444] rounded-lg max-h-40 sm:max-h-60 overflow-y-auto bg-[#333] shadow-lg"
                                >
                                    <button
                                        onClick={() => {
                                            setShowSuggestions(false);
                                            setSearchQuery('');
                                        }}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-300 z-10"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                                    </button>
                                    {loadingStates.search ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="flex flex-col items-center space-y-3">
                                                <div className="animate-spin h-8 w-8 border-3 border-[#1a73e8] border-t-transparent rounded-full"></div>
                                                <div className="text-sm text-gray-400">Mencari takson...</div>
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
                                                className="p-2 sm:p-3 hover:bg-[#444] cursor-pointer border-b border-[#444] last:border-b-0"
                                            >
                                                <div className={`text-white text-sm ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                                    {taxon.scientific_name}
                                                    {taxon.common_name && (
                                                        <span className="ml-1 text-gray-300">| {taxon.common_name}</span>
                                                    )}
                                                    <span className="text-gray-400 text-xs ml-2 bg-[#444] px-2 py-0.5 rounded">
                                                        {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}
                                                    </span>
                                                    {taxon.full_data?.taxonomic_status === 'SYNONYM' && (
                                                        <span className="text-orange-400 text-xs ml-2 bg-orange-900/30 px-2 py-0.5 rounded">
                                                            Sinonim
                                                        </span>
                                                    )}
                                                </div>
                                                {familyContext && (
                                                    <div className="text-xs sm:text-sm text-gray-400 mt-1">
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
                                    }))}
                                </div>
                            )}
                        </div>

                        {selectedTaxon && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                    await handleIdentificationSubmit(e, identificationPhoto);
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                    setSelectedTaxon(null);
                                    setSearchQuery('');
                                    setIdentificationForm(prev => ({
                                        ...prev,
                                        comment: '',
                                        taxon_id: null,
                                        identification_level: null
                                    }));
                                } catch (error) {
                                    console.error('Error submitting identification:', error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }} className="space-y-4">
                                <div className="p-3 sm:p-4 border border-[#1a73e8]/30 rounded-lg bg-[#1a73e8]/10">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Takson Terpilih
                                    </label>
                                    <div className="p-2 sm:p-3 border border-[#444] rounded-lg bg-[#333]">
                                        <div className="text-sm sm:text-lg font-medium text-white">
                                            {getTaxaDisplayWithCommonName(selectedTaxon)}
                                        </div>
                                        <div className="text-xs sm:text-sm italic text-gray-400 mt-1">
                                            {selectedTaxon.family || selectedTaxon.genus || selectedTaxon.species || getTaxonomyLevel(selectedTaxon)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Foto Pendukung (Opsional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="mt-1 block w-full text-sm text-gray-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-xs sm:file:text-sm file:font-semibold
                                        file:bg-[#1a73e8] file:text-white
                                        hover:file:bg-[#0d47a1]"
                                    />
                                    {photoPreview && (
                                        <div className="mt-2">
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="h-20 sm:h-32 w-auto object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIdentificationPhoto(null);
                                                    setPhotoPreview(null);
                                                }}
                                                className="mt-1 text-xs sm:text-sm text-red-400 hover:text-red-300"
                                            >
                                                Hapus foto
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                        Komentar (Opsional)
                                    </label>
                                    <ReactQuill
                                        value={identificationForm.comment}
                                        onChange={(value) => setIdentificationForm(prev => ({
                                            ...prev,
                                            comment: value
                                        }))}
                                        className="mt-1 bg-[#333] text-white border border-[#444] rounded-lg text-sm"
                                        modules={quillModules}
                                        formats={[
                                            'bold', 'italic', 'underline',
                                            'list', 'bullet',
                                            'link'
                                        ]}
                                        placeholder="Tulis komentar..."
                                        onBlur={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.addEventListener('click', handleLinkClick);
                                        }}
                                        onUnmount={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.removeEventListener('click', handleLinkClick);
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-2 sm:py-3 px-4 rounded-lg ${
                                        isSubmitting
                                            ? 'bg-[#1a73e8]/60 cursor-not-allowed'
                                            : 'bg-[#1a73e8] hover:bg-[#0d47a1] transition-colors'
                                    } text-white font-medium text-sm`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mengirim...
                                        </span>
                                    ) : (
                                        'Kirim Identifikasi'
                                    )}
                                </button>
                            </form>
                        )}

                        {!selectedTaxon && (
                            <div className="flex items-center justify-center py-6 sm:py-8 text-gray-400 italic text-sm">
                                Cari takson untuk menambahkan identifikasi
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div>
                        {/* Form Tambah Komentar dengan fitur tag identifikasi */}
                        <div className="mb-6 bg-[#2c2c2c] rounded-lg border border-[#444] p-3 sm:p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-base sm:text-lg text-white">Tambahkan Komentar</h4>
                                <button 
                                    onClick={() => setActiveTab('identification')}
                                    className="text-xs sm:text-sm text-[#1a73e8] hover:underline flex items-center"
                                >
                                    <FontAwesomeIcon icon={faSearch} className="mr-1" />
                                    Tambah Identifikasi
                                </button>
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                                    Referensi Identifikasi (Opsional)
                                </label>
                                <select 
                                    className="w-full p-2 border border-[#444] rounded mb-2 bg-[#2c2c2c] text-white text-sm"
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        if (selectedId) {
                                            const ident = identifications.find(i => i.id === parseInt(selectedId));
                                            if (ident) {
                                                const quoteText = `<blockquote class="border-l-4 border-[#1a73e8] pl-4 py-1 my-2 bg-[#1a73e8]/10 text-white italic">
                                                    <div class="text-sm font-medium mb-1">Membahas identifikasi:</div>
                                                    <div class="text-white font-medium">${getTaxaDisplayWithCommonName(ident)}</div>
                                                    <div class="text-xs text-gray-400 mt-1">Diidentifikasi oleh ${ident.identifier_name} pada ${new Date(ident.created_at).toLocaleDateString('id-ID')}</div>
                                                </blockquote><p></p>`;
                                                
                                                setNewComment(prev => quoteText + prev);
                                            }
                                        }
                                    }}
                                >
                                    <option value="">-- Pilih Identifikasi untuk Direferensikan --</option>
                                    {identifications
                                        .filter(ident => !ident.agrees_with_id && ident.is_withdrawn !== 1)
                                        .map(ident => (
                                            <option key={ident.id} value={ident.id}>
                                                {getTaxaDisplayWithCommonName(ident)} oleh {ident.identifier_name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    className="px-3 py-1 text-xs sm:text-sm bg-[#333] hover:bg-[#444] rounded text-gray-300 flex items-center"
                                    onClick={() => {
                                        if (user) {
                                            setNewComment(prev => prev + '@');
                                            toast.info('Ketik username pengguna setelah @ untuk mention', {
                                                duration: 3000,
                                                position: 'bottom-center',
                                                icon: '💡'
                                            });
                                        } else {
                                            toast.error('Silakan login untuk menggunakan fitur mention', toastStyles.error);
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon={faAt} className="mr-1" />
                                    Mention
                                </button>
                                
                                <button
                                    className="px-3 py-1 text-xs sm:text-sm bg-[#333] hover:bg-[#444] rounded text-gray-300 flex items-center"
                                    onClick={() => {
                                        const quoteText = `<blockquote class="border-l-4 border-gray-500 pl-4 py-1 my-2 bg-[#333] text-white italic">
                                            Teks kutipan di sini
                                        </blockquote><p></p>`;
                                        setNewComment(prev => prev + quoteText);
                                        
                                        toast.info('Ganti "Teks kutipan di sini" dengan kutipan yang ingin ditambahkan', {
                                            duration: 3000,
                                            position: 'bottom-center',
                                            icon: '💡'
                                        });
                                    }}
                                >
                                    <FontAwesomeIcon icon={faQuoteLeft} className="mr-1" />
                                    Quote
                                </button>
                            </div>
                            
                            <ReactQuill
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Tulis komentar atau pertanyaan..."
                                className="bg-[#333] text-white border border-[#444] rounded-lg text-sm"
                                modules={quillModules}
                                formats={[
                                    'bold', 'italic', 'underline',
                                    'list', 'bullet',
                                    'link'
                                ]}
                            />
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-2">
                                <div className="text-xs text-gray-400 w-full sm:w-auto text-center sm:text-left">
                                    <span>Untuk mention pengguna, gunakan @username</span>
                                </div>
                                <button
                                    onClick={() => handleAddComment(newComment)}
                                    disabled={!newComment.trim() || loadingStates.comment}
                                    className="w-full sm:w-auto bg-[#1a73e8] text-white py-2 px-4 rounded-lg hover:bg-[#0d47a1] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {loadingStates.comment ? (
                                        <span className="flex items-center justify-center">
                                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                            <span>Mengirim...</span>
                                        </span>
                                    ) : (
                                        <span>Kirim Komentar</span>
                                    )}
                                </button>
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
                            <div className="animate-spin h-4 w-4 border-2 border-[#1a73e8] border-t-transparent rounded-full"></div>
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
                        <button
                            onClick={() => {
                                setShowSuggestions(false);
                                setSearchQuery('');
                            }}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-300 z-10"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                        </button>
                        {loadingStates.search ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="animate-spin h-6 w-6 border-2 border-[#1a73e8] border-t-transparent rounded-full"></div>
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
                        }))}
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
                    }}
                    className="px-4 py-2 bg-[#2c2c2c] text-gray-300 rounded hover:bg-[#333] border border-[#444] text-sm mt-2 sm:mt-0"
                >
                    Batal
                </button>
                <button
                    onClick={() => {
                        try {
                            if (!selectedTaxon) {
                                toast.error('Pilih takson terlebih dahulu');
                                return;
                            }
                            if (!disagreeComment.trim()) {
                                toast.error('Berikan alasan penolakan');
                                return;
                            }
                            
                            setLoading('disagree', true);
                            handleDisagreeSubmit(selectedIdentificationId)
                                .finally(() => {
                                    setLoading('disagree', false);
                                });
                        } catch (error) {
                            console.error('Error saat mengirim ketidaksetujuan:', error);
                            toast.error('Terjadi kesalahan saat mengirim ketidaksetujuan');
                            setLoading('disagree', false);
                        }
                    }}
                    disabled={loadingStates.disagree}
                    className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {loadingStates.disagree ? (
                        <span className="flex items-center justify-center">
                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
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

            {/* Modal Flag */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6 w-full max-w-[350px] sm:max-w-md border border-[#444]">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 text-white">Laporkan Komentar</h3>
                        <textarea
                            value={flagReason}
                            onChange={(e) => setFlagReason(e.target.value)}
                            placeholder="Berikan alasan pelaporan..."
                            className="w-full p-2 border rounded mb-4 border-[#444] bg-[#2c2c2c] text-white text-sm"
                            rows="4"
                        />
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                            <button
                                onClick={() => {
                                    setShowFlagModal(false);
                                    setFlagReason('');
                                }}
                                className="px-4 py-2 text-gray-300 hover:text-gray-200 bg-[#2c2c2c] rounded border border-[#444] text-sm mt-2 sm:mt-0"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleFlagComment}
                                disabled={loadingStates.flag}
                                className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loadingStates.flag ? (
                                    <span className="flex items-center justify-center">
                                        <span className="mr-2 h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                                        <span>Proses...</span>
                                    </span>
                                ) : (
                                    'Laporkan'
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
                                            {/* <li className="flex items-start">
                                                <span className="text-cyan-400 mr-2">•</span>
                                                Genus consensus dilindungi selama 5 menit dari perubahan
                                            </li> */}
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
}

export default TabPanel;
