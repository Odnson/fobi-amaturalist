import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDna,
    faTree,
    faNoteSticky,
    faMusic,
    faXmark,
    faInfoCircle,
    faLocationDot,
    faCalendar,
    faBalanceScale
} from '@fortawesome/free-solid-svg-icons';
import Modal from '../Observations/LPModal';
import LocationPicker from '../Observations/LocationPicker';
import { toast } from 'react-hot-toast';
import LocationLabelInput from '../Observations/LocationLabelInput';
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

function BulkEditModal({ isOpen, onClose, onSave, selectedItems }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [tempFormData, setTempFormData] = useState({
        scientific_name: '',
        habitat: '',
        description: '',
        type_sound: '',
        source: 'live',
        status: 'pristine',
        latitude: '',
        longitude: '',
        locationName: '',
        date: '',
        license_observation: '',
        license_photo: '',
        license_audio: ''
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const suggestionsRef = useRef(null);
    const [hasMore, setHasMore] = useState(true);
    const [errors, setErrors] = useState({});
    const [showTooltip, setShowTooltip] = useState('');
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const tempDataRef = useRef(null);

    const tooltipContent = {
        scientific_name: "Nama ilmiah spesies (contoh: Gallus gallus). Wajib diisi dengan benar untuk identifikasi spesies.",
        habitat: "Lingkungan tempat spesies ditemukan (contoh: Hutan Primer, Kebun).",
        description: "Catatan tambahan tentang pengamatan.",
        type_sound: "Jenis suara yang direkam (khusus untuk file audio)."
    };
    const hasAudioFiles = selectedItems.some(item => 
        item.type === 'audio' || 
        (item.isCombined && item.audioFiles && item.audioFiles.length > 0) ||
        (item.isCombined && item.files && item.files.some(file => file.type?.startsWith('audio/')))
    );
    const hasImageFiles = selectedItems.some(item => 
        item.type === 'image' || 
        (item.isCombined && item.imageFiles && item.imageFiles.length > 0) ||
        (item.isCombined && item.files && item.files.some(file => file.type?.startsWith('image/')))
    );
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    const fetchSuggestions = async (searchTerm, pageNum = 1) => {
        if (searchTerm.length > 2) {
            try {
                console.log(`Starting fetchSuggestions for "${searchTerm}", page ${pageNum}`);
                if (pageNum > 1) {
                    setIsLoadingMore(true);
                }
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                abortControllerRef.current = new AbortController();
                const apiUrl = `${import.meta.env.VITE_API_URL}/taxonomy/search`;
                const fullUrl = `${apiUrl}?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&per_page=100`;
                
                console.log(`API Request URL: ${fullUrl}`);
                const token = localStorage.getItem('jwt_token');
                if (!token) {
                    console.error('No JWT token found in localStorage');
                    throw new Error('Token autentikasi tidak ditemukan. Silakan login kembali.');
                }
                console.log(`Auth token available: ${token ? 'Yes, length: ' + token.length : 'No'}`);

                const requestOptions = {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest' // Helps with some CORS issues
                    },
                    signal: abortControllerRef.current.signal,
                    credentials: 'same-origin' // Pastikan credentials dikirim
                };

                const response = await fetch(fullUrl, requestOptions);

                console.log(`Response status: ${response.status} ${response.statusText}`);
                if (response.status === 401) {
                    throw new Error('Token autentikasi tidak valid atau kedaluwarsa. Silakan login kembali.');
                } else if (response.status === 403) {
                    throw new Error('Anda tidak memiliki izin untuk mengakses data ini.');
                } else if (response.status === 429) {
                    throw new Error('Terlalu banyak permintaan. Silakan coba lagi nanti.');
                } else if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Unexpected content type:', contentType);
                    throw new Error('Server mengembalikan respons yang tidak valid.');
                }

                const data = await response.json();
                console.log('API Response:', data);
                if (!data.success) {
                    console.error('API returned success=false:', data.message || 'No error message provided');
                    setSuggestions([]);
                    setShowSuggestions(true); // Tetap tampilkan dropdown dengan status error
                    setHasMore(false);
                    return;
                }
                
                if (!Array.isArray(data.data)) {
                    console.error('Expected data.data to be an array, got:', typeof data.data);
                    setSuggestions([]);
                    setShowSuggestions(true);
                    setHasMore(false);
                    return;
                }

                console.log(`Received ${data.data.length} items from API`);
                if (data.data.length > 0) {
                    console.log('First item structure:', JSON.stringify(data.data[0], null, 2));
                }
                const pagination = data.pagination || {};
                if (!pagination.total_pages) {
                    console.warn('Pagination data incomplete:', pagination);
                }
                
                const totalPages = pagination.total_pages || 1;
                const currentPage = pagination.current_page || pageNum;
                const totalItems = pagination.total || data.data.length;
                const hasMorePages = pagination.has_more || currentPage < totalPages;
                
                console.log('Pagination info:', { 
                    totalPages, 
                    currentPage, 
                    totalItems,
                    hasMore: hasMorePages
                });

                if (pageNum === 1) {
                    console.log('Setting initial suggestions:', data.data.length);
                    setSuggestions(data.data);
                    setShowSuggestions(true);
                    setHasMore(hasMorePages);
                    setPage(currentPage);
                } else {
                    const newSuggestions = data.data;
                    console.log('Received new suggestions:', newSuggestions.length);
                    const existingIdsMap = new Map();
                    suggestions.forEach(item => {
                        const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                        existingIdsMap.set(idKey, true);
                    });
                    const uniqueNewSuggestions = newSuggestions.filter(item => {
                        const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                        return !existingIdsMap.has(idKey);
                    });
                    
                    console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                    
                    if (uniqueNewSuggestions.length > 0) {
                        setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
                        setHasMore(hasMorePages);
                        setPage(currentPage);
                    } else {
                        console.log('No new unique suggestions found');
                        setHasMore(false);
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                    setShowSuggestions(true); // Tetap tampilkan dropdown dengan state error
                    setHasMore(false);
                    if (error.message.includes('token')) {
                        toast?.error && toast.error('Kesalahan autentikasi. Coba login kembali.', {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored"
                        });
                    } else {
                        toast?.error && toast.error(`Gagal mengambil data: ${error.message}`, {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored"
                        });
                    }
                } else {
                    console.log('Request aborted');
                }
            } finally {
                if (pageNum > 1) {
                    setIsLoadingMore(false);
                }
                console.log('Finished fetchSuggestions');
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setHasMore(false);
            console.log('Search term too short');
        }
    };
    const loadMoreSuggestions = async () => {
        if (!hasMore) {
            console.log('No more suggestions to load. hasMore:', hasMore);
            return;
        }
        
        if (isLoadingMore) {
            console.log('Already loading suggestions.');
            return;
        }
        
        console.log('Starting to load more suggestions');
        
        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const value = tempFormData.scientific_name;
            const apiUrl = `${import.meta.env.VITE_API_URL}/taxonomy/search`;
            const fullUrl = `${apiUrl}?q=${encodeURIComponent(value)}&page=${nextPage}&per_page=100`;
            
            console.log(`API Request URL for loadMore: ${fullUrl}`);
            console.log('Loading more suggestions, page:', nextPage, 'for term:', value);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
            
            const response = await fetch(
                fullUrl,
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

            console.log(`Response status for loadMore: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response for loadMore page', nextPage, ':', data);
            if (!data.success) {
                console.error('API returned success=false in loadMore:', data.message || 'No error message provided');
                setHasMore(false);
                return;
            }
            
            if (!Array.isArray(data.data)) {
                console.error('Expected data.data to be an array in loadMore, got:', typeof data.data);
                setHasMore(false);
                return;
            }

            console.log(`Received ${data.data.length} items from API in loadMore`);

            if (data.success) {
                const newSuggestions = data.data;
                console.log('Received new suggestions:', newSuggestions.length);
                const existingIdsMap = new Map();
                suggestions.forEach(item => {
                    const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                    existingIdsMap.set(idKey, true);
                });
                const uniqueNewSuggestions = newSuggestions.filter(item => {
                    const idKey = item.full_data?.id || `${item.rank}-${item.scientific_name}`;
                    return !existingIdsMap.has(idKey);
                });
                
                console.log('Unique new suggestions:', uniqueNewSuggestions.length);
                
                if (uniqueNewSuggestions.length > 0) {
                    setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
                    setPage(nextPage);
                    const pagination = data.pagination || {};
                    const totalPages = pagination.total_pages || nextPage;
                    const currentPage = pagination.current_page || nextPage;
                    const totalItems = pagination.total || data.data.length;
                    
                    console.log('Pagination info in loadMore:', { 
                        totalPages, 
                        currentPage, 
                        totalItems,
                        hasMore: totalPages > currentPage
                    });
                    
                    setHasMore(totalPages > nextPage);
                } else {
                    console.log('No new unique suggestions found in loadMore');
                    setHasMore(false);
                }
            } else {
                console.log('API returned error status in loadMore');
                setHasMore(false);
                if (data.message) {
                    console.warn('API warning in loadMore:', data.message);
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading more suggestions:', error);
                setHasMore(false);
            } else {
                console.log('Request aborted in loadMore');
            }
        } finally {
            setIsLoadingMore(false);
            console.log('Finished loading more suggestions');
        }
    };
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === 'scientific_name') {
            setTempFormData(prev => ({
                ...prev,
                [name]: value,
                displayName: value
            }));
            if (!value) {
                setTempFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
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
                setHasMore(false);
                return;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (value.length > 2) {
                    setPage(1);
                    setIsLoadingMore(true);
                    setSuggestions([]); // Reset suggestions while loading
                    setShowSuggestions(true); // Show loading indicator
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    
                    console.log('Searching for:', value);
                    fetchSuggestions(value, 1)
                        .finally(() => {
                            console.log('Search complete');
                            setIsLoadingMore(false);
                        });
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setHasMore(false);
                }
            }, 300); // Tunggu 300ms sebelum melakukan fetch
        } else {
            setTempFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };
    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
        console.log('Scroll position:', scrollPosition);
        
        if (scrollPosition < 30 && !isLoadingMore && hasMore) {
            console.log('Triggering loadMoreSuggestions from scroll');
            loadMoreSuggestions();
        }
    };

    const renderTaxonSuggestions = (searchResults) => {
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
        const renderedItemsMap = new Map();
        const uniqueResults = searchResults.filter(taxon => {
            const key = `${taxon.scientific_name}-${taxon.rank}`;
            if (renderedItemsMap.has(key)) return false;
            renderedItemsMap.set(key, true);
            return true;
        });
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
                    if (hasSpecies) return;
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
        const query = (tempFormData?.displayName || tempFormData?.scientific_name || '').trim().toLowerCase();
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
            console.groupCollapsed('[BulkEditModal] Suggestions (hierarchical)', hierarchicalResults.length, 'items');
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
                console.groupCollapsed('[BulkEditModal] Final prioritized results for query:', query);
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
            const isSynonym = taxon.full_data?.taxonomic_status === 'SYNONYM';
            const acceptedName = taxon.full_data?.accepted_scientific_name;
            
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
        const isSynonym = suggestion.full_data?.taxonomic_status === 'SYNONYM';
        const acceptedName = suggestion.full_data?.accepted_scientific_name;
        const finalScientificName = isSynonym && acceptedName ? acceptedName : suggestion.scientific_name;
        tempDataRef.current = { ...tempFormData };
        const resetData = {
            ...tempFormData,
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
        setTempFormData({
            ...resetData, // Gunakan data yang sudah direset
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
        });
        setSuggestions([]);
        setShowSuggestions(false);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                const inputField = document.querySelector('input[name="scientific_name"]');
                if (inputField && !inputField.contains(event.target)) {
                    console.log('Click outside suggestions container, hiding suggestions');
                    setShowSuggestions(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        if (!isOpen) {
            setTempFormData({
                scientific_name: '',
                habitat: '',
                description: '',
                type_sound: '',
                source: 'live',
                status: 'pristine',
                latitude: '',
                longitude: '',
                locationName: '',
                date: ''
            });
            localStorage.removeItem('bulk_edit_temp_data');
            tempDataRef.current = null;
        } else if (isOpen && selectedItems.length > 0) {
            setTempFormData({
                scientific_name: '',
                habitat: '',
                description: '',
                type_sound: '',
                source: 'live',
                status: 'pristine',
                latitude: '',
                longitude: '',
                locationName: '',
                date: '',
                license_observation: '',
                license_photo: '',
                license_audio: ''
            });
        }
    }, [isOpen, selectedItems]);
    const handleOpenLocationModal = () => {
        tempDataRef.current = { ...tempFormData };
        setIsLocationModalOpen(true);
    };

    const validateForm = () => {
        const newErrors = {};

        if (hasAudioFiles && !tempFormData.type_sound) {
            newErrors.type_sound = "Tipe suara wajib dipilih untuk file audio";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            const dataToSave = {
                ...tempFormData,
                latitude: tempFormData.latitude,
                longitude: tempFormData.longitude,
                locationName: tempFormData.locationName
            };
            localStorage.removeItem('bulk_edit_temp_data');
            const finalData = {
                ...dataToSave,
                __isBulkEdit: true
            };
            
            onSave(finalData);
            onClose();
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        const currentData = tempDataRef.current || tempFormData;
        
        setTempFormData({
            ...currentData,
            latitude: lat,
            longitude: lng,
            locationName: name
        });
        
        setIsLocationModalOpen(false);
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
    const handleInputFocus = () => {
        if (tempFormData.scientific_name && tempFormData.scientific_name.length > 2) {
            console.log('Input focused, showing suggestions');
            setShowSuggestions(true);
            
            if (suggestions.length === 0) {
                console.log('No suggestions available, fetching again');
                fetchSuggestions(tempFormData.scientific_name, 1);
            }
        }
    };
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            localStorage.removeItem('bulk_edit_temp_data');
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-800 overflow-y-auto mt-10">
            <div
                className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl transform rounded-xl bg-[#1e1e1e] text-[#e0e0e0] shadow-2xl transition-all border border-[#444]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#444] px-6 py-4">
                        <h3 className="text-xl font-semibold text-white">
                            Isi Form Sekaligus ({selectedItems.length} item)
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 hover:bg-[#2c2c2c] text-gray-400 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4">
                        {/* Form Fields untuk Semua Tipe */}
                        <div className="space-y-4">
                            {/* Nama Taksa */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nama Spesies
                                    <FontAwesomeIcon
                                        icon={faInfoCircle}
                                        className="ml-2 text-gray-400 cursor-help"
                                        onMouseEnter={() => setShowTooltip('scientific_name')}
                                        onMouseLeave={() => setShowTooltip('')}
                                    />
                                </label>
                                {showTooltip === 'scientific_name' && (
                                    <div className="absolute z-50 bg-[#2c2c2c] text-white p-2 rounded text-sm -mt-1 ml-8 border border-[#444]">
                                        {tooltipContent.scientific_name}
                                    </div>
                                )}
                                <div className={`relative flex items-center space-x-3 rounded-lg border p-3 transition-colors bg-[#2c2c2c] ${
                                    errors.scientific_name ? 'border-red-500' : 'border-[#444] hover:border-[#1a73e8]'
                                }`}>
                                    <FontAwesomeIcon icon={faDna} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="scientific_name"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.displayName || tempFormData.common_name || tempFormData.species || tempFormData.scientific_name}
                                        onChange={handleChange}
                                        placeholder="Masukkan nama taksa"
                                        onFocus={handleInputFocus}
                                    />
                                </div>
                                {errors.scientific_name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.scientific_name}</p>
                                )}
                                
                                {/* Tampilkan hierarki taksonomi jika kingdom tersedia */}
                                {tempFormData.kingdom && (
                                    <div className="mt-3 text-sm text-gray-300">
                                        <div className="grid grid-cols-1 gap-1 border border-[#444] p-3 rounded-lg bg-[#2c2c2c]">
                                            <div className="font-medium text-[#e0e0e0] border-b border-[#444] pb-1 mb-1">Hierarki Taksonomi:</div>
                                            
                                            {tempFormData.kingdom && (
                                                <div className="flex justify-between">
                                                    <span>Kingdom:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.kingdom}
                                                        {tempFormData.cname_kingdom && <span className="text-gray-400"> ({tempFormData.cname_kingdom})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.phylum && (
                                                <div className="flex justify-between">
                                                    <span>Phylum:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.phylum}
                                                        {tempFormData.cname_phylum && <span className="text-gray-400"> ({tempFormData.cname_phylum})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.class && (
                                                <div className="flex justify-between">
                                                    <span>Class:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.class}
                                                        {tempFormData.cname_class && <span className="text-gray-400"> ({tempFormData.cname_class})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.order && (
                                                <div className="flex justify-between">
                                                    <span>Order:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.order}
                                                        {tempFormData.cname_order && <span className="text-gray-400"> ({tempFormData.cname_order})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.family && (
                                                <div className="flex justify-between">
                                                    <span>Family:</span> 
                                                    <span className="text-[#e0e0e0]">{tempFormData.family}
                                                        {tempFormData.cname_family && <span className="text-gray-400"> ({tempFormData.cname_family})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.genus && (
                                                <div className="flex justify-between">
                                                    <span>Genus:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.genus}
                                                        {tempFormData.cname_genus && <span className="text-gray-400 not-italic"> ({tempFormData.cname_genus})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.species && (
                                                <div className="flex justify-between">
                                                    <span>Species:</span> 
                                                    <span className="text-[#e0e0e0] italic">{extractScientificName(tempFormData.species)}
                                                        {tempFormData.common_name && <span className="text-gray-400 not-italic"> ({tempFormData.common_name})</span>}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.subspecies && (
                                                <div className="flex justify-between">
                                                    <span>Subspecies:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.subspecies}</span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.variety && (
                                                <div className="flex justify-between">
                                                    <span>Variety:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.variety}</span>
                                                </div>
                                            )}
                                            
                                            {tempFormData.form && (
                                                <div className="flex justify-between">
                                                    <span>Form:</span> 
                                                    <span className="text-[#e0e0e0] italic">{tempFormData.form}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {showSuggestions && (
                                    <div
                                        ref={suggestionsRef}
                                        className="absolute z-[500] w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-xl overflow-auto"
                                        style={{
                                            maxHeight: '350px',
                                            minHeight: '100px',
                                            left: 0,
                                            right: 0,
                                            top: 'calc(100% + 5px)'
                                        }}
                                        onScroll={handleSuggestionsScroll}
                                    >
                                        {suggestions.length > 0 ? (
                                            <>
                                                {renderTaxonSuggestions(suggestions)}
                                                
                                                {isLoadingMore && (
                                                    <div className="p-3 text-center text-gray-400">
                                                        <div className="inline-block w-5 h-5 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                                        <span>Memuat data...</span>
                                                    </div>
                                                )}
                                                
                                                {hasMore && !isLoadingMore && (
                                                    <div 
                                                        className="p-3 text-center text-[#1a73e8] cursor-pointer hover:bg-[#3c3c3c] font-medium"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            loadMoreSuggestions();
                                                        }}
                                                    >
                                                        Lihat lebih banyak
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            isLoadingMore ? (
                                                <div className="p-3 text-center text-gray-400">
                                                    <div className="inline-block w-5 h-5 border-2 border-t-[#1a73e8] border-r-[#1a73e8] border-b-[#1a73e8] border-l-transparent rounded-full animate-spin mr-2"></div>
                                                    <span>Memuat data...</span>
                                                </div>
                                            ) : (
                                                <div className="p-3 text-center text-gray-400">
                                                    Tidak ada hasil yang ditemukan
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Lokasi */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Lokasi
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-gray-400" />
                                    <button
                                        onClick={handleOpenLocationModal}
                                        className="w-full text-left text-[#e0e0e0] hover:text-white"
                                    >
                                        {tempFormData.locationName || 'Pilih lokasi'}
                                    </button>
                                </div>
                                {/* Input Nama Lokasi Editable */}
                                {tempFormData.latitude && tempFormData.longitude && (
                                    <div className="mt-2">
                                        <label className="block text-xs text-gray-400 mb-1">Nama Lokasi</label>
                                        <LocationLabelInput
                                            value={tempFormData.locationName || ''}
                                            onChange={(val) => {
                                                const currentData = tempDataRef.current || tempFormData;
                                                setTempFormData({ ...currentData, locationName: val });
                                            }}
                                            latitude={tempFormData.latitude}
                                            longitude={tempFormData.longitude}
                                            osmName={tempFormData.locationName || ''}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Tanggal */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Tanggal
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faCalendar} className="text-gray-400" />
                                    <input
                                        type="date"
                                        name="date"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Habitat */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Habitat
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faTree} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="habitat"
                                        className="w-full focus:outline-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.habitat}
                                        onChange={handleChange}
                                        placeholder="Masukkan habitat"
                                    />
                                </div>
                            </div>

                            {/* Keterangan */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Keterangan
                                </label>
                                <div className="flex space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faNoteSticky} className="text-gray-400 mt-1" />
                                    <textarea
                                        name="description"
                                        rows="3"
                                        className="w-full focus:outline-none resize-none bg-transparent text-[#e0e0e0]"
                                        value={tempFormData.description}
                                        onChange={handleChange}
                                        placeholder="Masukkan keterangan"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* License Settings */}
                        <div className="space-y-4 border-t border-[#444] pt-4">
                            <h4 className="font-medium text-white">Pengaturan Lisensi</h4>

                            {/* License Observation */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Lisensi Observasi
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                    <FontAwesomeIcon icon={faBalanceScale} className="text-gray-400" />
                                    <select
                                        name="license_observation"
                                        className="w-full focus:outline-none bg-[#2c2c2c] text-[#e0e0e0]"
                                        value={tempFormData.license_observation}
                                        onChange={handleChange}
                                    >
                                        <option value="" className="bg-[#2c2c2c]">Tidak mengubah lisensi observasi</option>
                                        {LICENSE_OPTIONS.map(license => (
                                            <option key={license} value={license} className="bg-[#2c2c2c]">
                                                {license}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* License Photo - only show if there are image files */}
                            {hasImageFiles && (
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Lisensi Foto
                                    </label>
                                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                        <FontAwesomeIcon icon={faBalanceScale} className="text-gray-400" />
                                        <select
                                            name="license_photo"
                                            className="w-full focus:outline-none bg-[#2c2c2c] text-[#e0e0e0]"
                                            value={tempFormData.license_photo}
                                            onChange={handleChange}
                                        >
                                            <option value="" className="bg-[#2c2c2c]">Tidak mengubah lisensi foto</option>
                                            {LICENSE_OPTIONS.map(license => (
                                                <option key={license} value={license} className="bg-[#2c2c2c]">
                                                    {license}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* License Audio - only show if there are audio files */}
                            {hasAudioFiles && (
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Lisensi Audio
                                    </label>
                                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                        <FontAwesomeIcon icon={faBalanceScale} className="text-gray-400" />
                                        <select
                                            name="license_audio"
                                            className="w-full focus:outline-none bg-[#2c2c2c] text-[#e0e0e0]"
                                            value={tempFormData.license_audio}
                                            onChange={handleChange}
                                        >
                                            <option value="" className="bg-[#2c2c2c]">Tidak mengubah lisensi audio</option>
                                            {LICENSE_OPTIONS.map(license => (
                                                <option key={license} value={license} className="bg-[#2c2c2c]">
                                                    {license}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Fields khusus Audio */}
                        {hasAudioFiles && (
                            <div className="space-y-4 border-t border-[#444] pt-4">
                                <h4 className="font-medium text-white">Pengaturan Audio</h4>

                                {/* Tipe Suara */}
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Tipe Suara
                                    </label>
                                    <div className="flex items-center space-x-3 rounded-lg border border-[#444] p-3 hover:border-[#1a73e8] bg-[#2c2c2c] transition-colors">
                                        <FontAwesomeIcon icon={faMusic} className="text-gray-400" />
                                        <select
                                            name="type_sound"
                                            className="w-full focus:outline-none bg-[#2c2c2c] text-[#e0e0e0]"
                                            value={tempFormData.type_sound}
                                            onChange={handleChange}
                                        >
                                            <option value="" className="bg-[#2c2c2c]">Pilih tipe suara</option>
                                            <option value="song" className="bg-[#2c2c2c]">Song</option>
                                            <option value="call" className="bg-[#2c2c2c]">Call</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Radio Groups */}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#444] px-6 py-4 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-300 hover:text-white border border-[#444] rounded hover:bg-[#2c2c2c] transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => handleSave()}
                            className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors"
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>

            {/* Tambahkan Modal Lokasi */}
            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker
                    onSave={handleLocationSave}
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={tempFormData.latitude && tempFormData.longitude ? [tempFormData.latitude, tempFormData.longitude] : null}
                    initialLocationName={tempFormData.locationName}
                />
            </Modal>

            {tempFormData.is_combined && (
                <div className="mt-4">
                    <h4 className="font-medium text-white mb-2">Gambar Gabungan</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {tempFormData.files.map((file, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Combined image ${index + 1}`}
                                    className="w-full h-24 object-cover rounded"
                                />
                                <div className="absolute top-1 right-1 bg-black/50 text-white px-2 rounded-full text-sm">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BulkEditModal;
