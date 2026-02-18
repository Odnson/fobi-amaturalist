import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faSpinner, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * SearchWithSuggestions - Komponen pencarian dengan suggestion seperti iNaturalist
 * 
 * Props:
 * - observations: Array data observasi untuk mencari suggestions
 * - onSearch: Callback ketika user submit pencarian
 * - searchType: Tipe pencarian (all_taxa, species, unknown, date)
 * - onSearchTypeChange: Callback ketika tipe pencarian berubah
 * - placeholder: Placeholder text
 */
const SearchWithSuggestions = ({ 
    observations = [], 
    onSearch, 
    searchType = 'all_taxa',
    onSearchTypeChange,
    placeholder = "Cari taksa..."
}) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);
    const TAXONOMIC_RANKS = [
        { key: 'domain', cname: 'cname_domain' },
        { key: 'kingdom', cname: 'cname_kingdom' },
        { key: 'phylum', cname: 'cname_phylum' },
        { key: 'subphylum', cname: 'cname_subphylum' },
        { key: 'infraphylum', cname: 'cname_infraphylum' },
        { key: 'superclass', cname: 'cname_superclass' },
        { key: 'class', cname: 'cname_class' },
        { key: 'subclass', cname: 'cname_subclass' },
        { key: 'infraclass', cname: 'cname_infraclass' },
        { key: 'superorder', cname: 'cname_superorder' },
        { key: 'order', cname: 'cname_order' },
        { key: 'suborder', cname: 'cname_suborder' },
        { key: 'infraorder', cname: 'cname_infraorder' },
        { key: 'superfamily', cname: 'cname_superfamily' },
        { key: 'family', cname: 'cname_family' },
        { key: 'subfamily', cname: 'cname_subfamily' },
        { key: 'supertribe', cname: 'cname_supertribe' },
        { key: 'tribe', cname: 'cname_tribe' },
        { key: 'subtribe', cname: 'cname_subtribe' },
        { key: 'genus', cname: 'cname_genus' },
        { key: 'subgenus', cname: 'cname_subgenus' },
        { key: 'species', cname: 'cname_species' },
        { key: 'subspecies', cname: 'cname_subspecies' },
        { key: 'variety', cname: 'cname_variety' },
        { key: 'form', cname: 'cname_form' },
    ];
    const generateSuggestions = useMemo(() => {
        if (!observations || observations.length === 0) return [];
        const taxaMap = new Map();
        
        observations.forEach(obs => {
            const originalData = obs.originalData || obs;
            TAXONOMIC_RANKS.forEach(({ key, cname }) => {
                const value = originalData[key];
                if (value) {
                    const mapKey = `${key}:${value}`;
                    if (!taxaMap.has(mapKey)) {
                        taxaMap.set(mapKey, {
                            type: key,
                            value: value,
                            commonName: originalData[cname] || null,
                            count: 1,
                            rank: key
                        });
                    } else {
                        taxaMap.get(mapKey).count++;
                    }
                }
            });
        });
        return Array.from(taxaMap.values()).sort((a, b) => b.count - a.count);
    }, [observations]);
    const fetchApiSuggestions = async (searchTerm) => {
        try {
            const baseUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(
                `${baseUrl}/species-suggestions?q=${encodeURIComponent(searchTerm)}&limit=5`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (!response.ok) return [];
            
            const data = await response.json();
            if (!data.success || !data.data) return [];
            return data.data.map(item => ({
                type: item.taxon_rank || 'species',
                value: item.scientific_name || item.species || item.genus || item.family,
                commonName: item.cname_species || item.cname_genus || item.cname_family || null,
                count: 0, // API results tidak punya count
                rank: item.taxon_rank || 'species',
                isFromApi: true, // Flag untuk menandai dari API
                taxaId: item.id
            })).filter(item => item.value); // Filter yang punya value
        } catch (error) {
            console.error('Error fetching API suggestions:', error);
            return [];
        }
    };
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        
        if (!inputValue || inputValue.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        
        setIsLoading(true);
        
        debounceRef.current = setTimeout(async () => {
            const searchTerm = inputValue.toLowerCase();
            const localFiltered = generateSuggestions.filter(item => {
                const matchValue = item.value?.toLowerCase().includes(searchTerm);
                const matchCommon = item.commonName?.toLowerCase().includes(searchTerm);
                const matchScientific = item.scientificName?.toLowerCase().includes(searchTerm);
                return matchValue || matchCommon || matchScientific;
            }).slice(0, 7); // Limit local to 7
            const apiSuggestions = await fetchApiSuggestions(inputValue);
            const existingValues = new Set(localFiltered.map(s => s.value?.toLowerCase()));
            const uniqueApiSuggestions = apiSuggestions.filter(
                s => !existingValues.has(s.value?.toLowerCase())
            ).slice(0, 3); // Max 3 dari API
            
            const combined = [...localFiltered, ...uniqueApiSuggestions];
            
            setSuggestions(combined);
            setShowSuggestions(combined.length > 0);
            setIsLoading(false);
            setSelectedIndex(-1);
        }, 300);
        
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [inputValue, generateSuggestions]);
    const handleKeyDown = (e) => {
        if (!showSuggestions) {
            if (e.key === 'Enter') {
                handleSubmit();
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSelectSuggestion(suggestions[selectedIndex]);
                } else {
                    handleSubmit();
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
            default:
                break;
        }
    };
    const handleSelectSuggestion = (suggestion) => {
        setInputValue(suggestion.value);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        if (onSearch) {
            onSearch(suggestion.value);
        }
    };
    const handleSubmit = () => {
        setShowSuggestions(false);
        if (onSearch) {
            onSearch(inputValue);
        }
    };
    const handleClear = () => {
        setInputValue('');
        setSuggestions([]);
        setShowSuggestions(false);
        if (onSearch) {
            onSearch('');
        }
        inputRef.current?.focus();
    };
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                suggestionsRef.current && 
                !suggestionsRef.current.contains(e.target) &&
                inputRef.current &&
                !inputRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsRef.current) {
            const selectedElement = suggestionsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);
    const getRankBadge = (rank) => {
        const colors = {
            domain: 'bg-gray-700',
            kingdom: 'bg-gray-600',
            phylum: 'bg-slate-600',
            subphylum: 'bg-slate-500',
            infraphylum: 'bg-slate-500',
            superclass: 'bg-red-700',
            class: 'bg-red-600',
            subclass: 'bg-red-500',
            infraclass: 'bg-red-500',
            superorder: 'bg-orange-700',
            order: 'bg-orange-600',
            suborder: 'bg-orange-500',
            infraorder: 'bg-orange-500',
            superfamily: 'bg-purple-700',
            family: 'bg-purple-600',
            subfamily: 'bg-purple-500',
            supertribe: 'bg-violet-600',
            tribe: 'bg-violet-500',
            subtribe: 'bg-violet-500',
            genus: 'bg-blue-600',
            subgenus: 'bg-blue-500',
            species: 'bg-green-600',
            subspecies: 'bg-green-500',
            variety: 'bg-emerald-500',
            form: 'bg-teal-500'
        };
        
        const labels = {
            domain: 'Domain',
            kingdom: 'Kingdom',
            phylum: 'Phylum',
            subphylum: 'Subphylum',
            infraphylum: 'Infraphylum',
            superclass: 'Superclass',
            class: 'Class',
            subclass: 'Subclass',
            infraclass: 'Infraclass',
            superorder: 'Superorder',
            order: 'Order',
            suborder: 'Suborder',
            infraorder: 'Infraorder',
            superfamily: 'Superfamily',
            family: 'Family',
            subfamily: 'Subfamily',
            supertribe: 'Supertribe',
            tribe: 'Tribe',
            subtribe: 'Subtribe',
            genus: 'Genus',
            subgenus: 'Subgenus',
            species: 'Species',
            subspecies: 'Subspecies',
            variety: 'Variety',
            form: 'Form'
        };
        
        return (
            <span className={`${colors[rank] || 'bg-gray-600'} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                {labels[rank] || rank}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap w-full">
            {/* Search Type Selector */}
            <div className="flex gap-2 w-full md:w-auto">
                <select
                    value={searchType}
                    onChange={(e) => {
                        if (onSearchTypeChange) {
                            onSearchTypeChange(e.target.value);
                        }
                        if (e.target.value === 'unknown') {
                            setInputValue('');
                            if (onSearch) {
                                onSearch('');
                            }
                        }
                    }}
                    className="flex-1 md:flex-none px-3 py-2 text-sm md:px-4 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all_taxa">Semua Taksa</option>
                    <option value="species">Species</option>
                    <option value="unknown">Tidak Diketahui</option>
                    <option value="date">Tanggal</option>
                </select>
            </div>
            
            {/* Search Input */}
            <div className="flex-1 relative w-full md:w-auto md:min-w-[250px]">
                {searchType === 'date' ? (
                    <input
                        type="date"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSubmit();
                            }
                        }}
                        className="w-full px-3 py-2 text-sm md:px-4 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                ) : searchType === 'unknown' ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#444] bg-[#2c2c2c] text-gray-400">
                        <FontAwesomeIcon icon={faQuestionCircle} className="text-yellow-500" />
                        <span>Menampilkan taksa yang belum teridentifikasi</span>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={placeholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (suggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            className="w-full px-3 py-2 text-sm md:px-4 rounded-lg border border-[#444] bg-[#2c2c2c] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                        />
                        
                        {/* Loading/Clear/Search buttons */}
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                            {isLoading && (
                                <FontAwesomeIcon 
                                    icon={faSpinner} 
                                    className="text-gray-400 animate-spin"
                                />
                            )}
                            {inputValue && !isLoading && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                title="Cari (Enter)"
                            >
                                <FontAwesomeIcon icon={faSearch} />
                            </button>
                        </div>
                        
                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div 
                                ref={suggestionsRef}
                                className="absolute z-50 w-full mt-1 bg-[#2c2c2c] border border-[#444] rounded-lg shadow-xl max-h-80 overflow-y-auto"
                            >
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={`${suggestion.type}-${suggestion.value}-${suggestion.isFromApi ? 'api' : 'local'}`}
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ${
                                            index === selectedIndex 
                                                ? 'bg-blue-600 text-white' 
                                                : suggestion.isFromApi
                                                    ? 'hover:bg-[#3c3c3c] text-gray-300 bg-[#252525]'
                                                    : 'hover:bg-[#3c3c3c] text-gray-200'
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`truncate ${
                                                    suggestion.rank === 'species' || suggestion.rank === 'subspecies' ? 'italic' : ''
                                                }`}>
                                                    {suggestion.value}
                                                </span>
                                                {suggestion.isFromApi && (
                                                    <span className="text-[9px] px-1 py-0.5 bg-amber-600/30 text-amber-400 rounded whitespace-nowrap">
                                                        Database
                                                    </span>
                                                )}
                                            </div>
                                            {suggestion.commonName && (
                                                <span className="text-xs text-gray-400 truncate">
                                                    {suggestion.commonName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {getRankBadge(suggestion.rank)}
                                            {suggestion.count > 0 && (
                                                <span className="text-xs text-gray-400">
                                                    {suggestion.count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Hint untuk submit */}
                                <div className="px-3 py-2 text-xs text-gray-500 border-t border-[#444] bg-[#252525]">
                                    <div>Tekan <kbd className="px-1 py-0.5 bg-[#3c3c3c] rounded text-gray-300">Enter</kbd> untuk mencari "{inputValue}"</div>
                                    <div className="mt-1 text-gray-600">
                                        <span className="text-amber-500">Database</span> = taksa dari database (mungkin tidak ada di halaman ini)
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Submit Button - visible on mobile */}
            {searchType !== 'unknown' && (
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <FontAwesomeIcon icon={faSearch} className="mr-2" />
                    Cari
                </button>
            )}
        </div>
    );
};

export default SearchWithSuggestions;
