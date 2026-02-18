import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch, faFilter, faSlidersH, faDna, faSpinner, faCamera, faHeadphones, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

import { faUser, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

const FilterModal = ({ isOpen, onClose, onFilterChange, onSearch, initialFilters = {} }) => {
  const [filterParams, setFilterParams] = useState({
    start_date: initialFilters.start_date || '',
    end_date: initialFilters.end_date || '',
    date_type: initialFilters.date_type || 'created_at',
    grade: initialFilters.grade || [],
    has_media: initialFilters.has_media || false,
    media_type: initialFilters.media_type || '',
    data_source: initialFilters.data_source || ['fobi'],
    user_id: initialFilters.user_id || null,
    user_name: initialFilters.user_name || '',
    taxonomy_rank: initialFilters.taxonomy_rank || '',
    taxonomy_value: initialFilters.taxonomy_value || '',
    location_name: initialFilters.location_name || '',
    location_source: initialFilters.location_source || ''
  });

  const [filterTab, setFilterTab] = useState('basic');
  const [filterTaxaSearch, setFilterTaxaSearch] = useState('');
  const [filterTaxaSuggestions, setFilterTaxaSuggestions] = useState([]);
  const [isLoadingFilterTaxa, setIsLoadingFilterTaxa] = useState(false);
  const filterTaxaAbortRef = useRef(null);
  const filterTaxaRequestIdRef = useRef(0);
  const filterTaxaTimeoutRef = useRef(null);
  const filterTaxaSuggestionRef = useRef(null);
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameResults, setUsernameResults] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [advTaxaSearch, setAdvTaxaSearch] = useState('');
  const [advTaxaSuggestions, setAdvTaxaSuggestions] = useState([]);
  const [isLoadingAdvTaxa, setIsLoadingAdvTaxa] = useState(false);
  const advTaxaTimeoutRef = useRef(null);
  const [advLocationSearch, setAdvLocationSearch] = useState('');
  const [advLocationResults, setAdvLocationResults] = useState([]);
  const [isLoadingAdvLocation, setIsLoadingAdvLocation] = useState(false);
  const normalizeScientificName = (scientificName) => {
    if (!scientificName) return scientificName;
    return scientificName
      .replace(/\s*\([^)]*\d{4}[^)]*\)/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*,\s*[A-Z][a-zA-Z]*)*(?:\s*&\s*[A-Z][a-zA-Z]*)?\s*,\s*\d{4}.*$/g, '')
      .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s+[A-Z][a-zA-Z]*(?:\s*,\s*\d{4}.*)?$/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*(?:\s*,\s*\d{4}.*)?$/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*,\s*$/g, '')
      .replace(/\s+[A-Z][a-z]*\.\s*$/g, '')
      .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const groupSuggestionsHierarchically = (suggestions) => {
    if (!suggestions || suggestions.length === 0) return [];
    const validRanks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'subspecies', 'variety', 'form'];
    return suggestions
      .filter(s => s && s.scientific_name && validRanks.includes(s.rank))
      .sort((a, b) => validRanks.indexOf(a.rank) - validRanks.indexOf(b.rank));
  };
  const handleFilterTaxaSearch = async (query) => {
    if (!query || query.length < 2) {
      setFilterTaxaSuggestions([]);
      return;
    }
    if (filterTaxaAbortRef.current) filterTaxaAbortRef.current.abort();
    filterTaxaAbortRef.current = new AbortController();
    const currentReqId = ++filterTaxaRequestIdRef.current;
    setIsLoadingFilterTaxa(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=1&per_page=20&include_all_taxa=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: filterTaxaAbortRef.current.signal
        }
      );
      if (currentReqId === filterTaxaRequestIdRef.current && response.ok) {
        const data = await response.json();
        if (data.success && data.data && currentReqId === filterTaxaRequestIdRef.current) {
          const grouped = groupSuggestionsHierarchically(data.data);
          setFilterTaxaSuggestions(grouped);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error filter taxa search:', error);
    } finally {
      if (currentReqId === filterTaxaRequestIdRef.current) setIsLoadingFilterTaxa(false);
    }
  };
  const handleFilterTaxaSelect = async (suggestion) => {
    const isSynonym = (suggestion?.full_data?.taxonomic_status || suggestion?.taxonomic_status) === 'SYNONYM';
    const acceptedName = suggestion?.full_data?.accepted_scientific_name || suggestion?.accepted_scientific_name;
    if (isSynonym && acceptedName) {
      try {
        setIsLoadingFilterTaxa(true);
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true`
        );
        const respJson = await resp.json();
        if (respJson?.success && Array.isArray(respJson?.data) && respJson.data.length > 0) {
          const accepted = respJson.data.find(item =>
            item.scientific_name === acceptedName && ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
          ) || respJson.data[0];
          if (accepted) suggestion = accepted;
        }
      } catch (e) { console.error('Error fetching accepted taxon:', e); }
      finally { setIsLoadingFilterTaxa(false); }
    }

    const normalized = normalizeScientificName(suggestion.scientific_name || '');
    const rank = suggestion.rank || 'species';
    const displayName = suggestion.common_name
      ? `${suggestion.scientific_name} (${suggestion.common_name})`
      : suggestion.scientific_name;

    setFilterTaxaSearch(displayName);
    setFilterTaxaSuggestions([]);
    setFilterParams(prev => ({
      ...prev,
      taxonomy_rank: rank,
      taxonomy_value: normalized
    }));
  };
  const handleGradeChange = (grade) => {
    setFilterParams(prev => {
      const newGrades = prev.grade.includes(grade)
        ? prev.grade.filter(g => g !== grade)
        : [...prev.grade, grade];
      return { ...prev, grade: newGrades };
    });
  };
  const handleDataSourceChange = (source) => {
    setFilterParams(prev => {
      const newSources = prev.data_source.includes(source)
        ? prev.data_source.filter(s => s !== source)
        : [...prev.data_source, source];
      return { ...prev, data_source: newSources.length > 0 ? newSources : ['fobi'] };
    });
  };
  const handleSearchUsers = useCallback(async (query) => {
    setUsernameSearch(query);
    if (query.length < 2) {
      setUsernameResults([]);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/search-users?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      if (data.success) {
        setUsernameResults(data.data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);
  const handleUserSelect = (user) => {
    setFilterParams(prev => ({
      ...prev,
      user_id: user.id,
      user_name: user.uname || user.fname || 'User'
    }));
    setUsernameResults([]);
    setUsernameSearch('');
  };
  const handleAdvTaxaSearch = async (query) => {
    if (!query || query.length < 2) {
      setAdvTaxaSuggestions([]);
      setIsLoadingAdvTaxa(false);
      return;
    }
    setIsLoadingAdvTaxa(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=1&per_page=15&include_all_taxa=true`
      );
      const data = await response.json();
      if (data.success) {
        setAdvTaxaSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching advanced taxa suggestions:', error);
    } finally {
      setIsLoadingAdvTaxa(false);
    }
  };
  const handleAdvTaxaSelect = async (suggestion) => {
    const isSynonym = (suggestion?.full_data?.taxonomic_status || suggestion?.taxonomic_status) === 'SYNONYM';
    const acceptedName = suggestion?.full_data?.accepted_scientific_name || suggestion?.accepted_scientific_name;
    if (isSynonym && acceptedName) {
      try {
        setIsLoadingAdvTaxa(true);
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true`
        );
        const respJson = await resp.json();
        if (respJson?.success && Array.isArray(respJson?.data) && respJson.data.length > 0) {
          const accepted = respJson.data.find(item =>
            item.scientific_name === acceptedName && ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
          ) || respJson.data[0];
          if (accepted) suggestion = accepted;
        }
      } catch (e) { console.error('Error fetching accepted taxon:', e); }
      finally { setIsLoadingAdvTaxa(false); }
    }

    const normalized = normalizeScientificName(suggestion.scientific_name || '');
    const rank = suggestion.rank || 'species';
    const displayName = suggestion.common_name
      ? `${suggestion.scientific_name} (${suggestion.common_name})`
      : suggestion.scientific_name;

    setAdvTaxaSearch(displayName);
    setAdvTaxaSuggestions([]);
    setFilterParams(prev => ({
      ...prev,
      taxonomy_rank: rank,
      taxonomy_value: normalized
    }));
  };
  const handleSearchAdvLocations = async (query) => {
    setAdvLocationSearch(query);
    if (query.length < 2) {
      setAdvLocationResults([]);
      return;
    }
    setIsLoadingAdvLocation(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search-locations?q=${encodeURIComponent(query)}&limit=15`);
      const data = await res.json();
      if (data.success) setAdvLocationResults(data.data || []);
    } catch (e) {
      console.error('Error searching locations:', e);
    } finally {
      setIsLoadingAdvLocation(false);
    }
  };
  const handleAdvLocationSelect = (location) => {
    setFilterParams(prev => {
      let newDataSource = [...(prev.data_source || ['fobi'])];
      if (location.source === 'burungnesia' && !newDataSource.includes('burungnesia')) {
        newDataSource.push('burungnesia');
      }
      if (location.source === 'kupunesia' && !newDataSource.includes('kupunesia')) {
        newDataSource.push('kupunesia');
      }
      if (location.source === 'fobi' && !newDataSource.includes('fobi')) {
        newDataSource.push('fobi');
      }
      
      return {
        ...prev,
        location_name: location.name,
        location_source: location.source,
        data_source: newDataSource
      };
    });
    setAdvLocationResults([]);
    setAdvLocationSearch(location.name);
  };
  const handleReset = () => {
    setFilterParams({
      start_date: '',
      end_date: '',
      date_type: 'created_at',
      grade: [],
      has_media: false,
      media_type: '',
      data_source: ['fobi'],
      user_id: null,
      user_name: '',
      taxonomy_rank: '',
      taxonomy_value: '',
      location_name: '',
      location_source: ''
    });
    setFilterTaxaSearch('');
    setFilterTaxaSuggestions([]);
    setAdvTaxaSearch('');
    setAdvTaxaSuggestions([]);
    setUsernameSearch('');
    setUsernameResults([]);
    setAdvLocationSearch('');
    setAdvLocationResults([]);
  };
  const handleApply = () => {
    const filters = {
      grade: filterParams.grade,
      data_source: filterParams.data_source,
      has_media: filterParams.has_media,
      media_type: filterParams.media_type || null,
      start_date: filterParams.start_date || null,
      end_date: filterParams.end_date || null,
      date_type: filterParams.date_type || 'created_at',
      user_id: filterParams.user_id || null,
      user_name: filterParams.user_name || null,
      taxonomy_rank: filterParams.taxonomy_rank || null,
      taxonomy_value: filterParams.taxonomy_value || null,
      location_name: filterParams.location_name || null,
      location_source: filterParams.location_source || null,
      autoSubmit: true
    };

    if (onFilterChange) {
      onFilterChange(filters);
    }

    if (onSearch) {
      onSearch({ ...filterParams, autoSubmit: true });
    }

    onClose();
  };
  const hasActiveFilters = () => {
    return filterParams.grade.length > 0 ||
      filterParams.has_media ||
      filterParams.media_type ||
      filterParams.start_date ||
      filterParams.end_date ||
      filterParams.user_id ||
      filterParams.taxonomy_value ||
      filterParams.location_name ||
      (filterParams.data_source.length > 0 && 
       !(filterParams.data_source.length === 1 && filterParams.data_source[0] === 'fobi'));
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterTaxaSuggestionRef.current && !filterTaxaSuggestionRef.current.contains(event.target)) {
        setFilterTaxaSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center">
      <div className="bg-[#1e1e1e] w-full md:w-[500px] md:max-h-[80vh] max-h-[85vh] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faFilter} className="text-blue-400 text-base" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base m-0">Filter Observasi</h3>
                <p className="text-gray-500 text-xs m-0">Sesuaikan tampilan data observasi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors border-none cursor-pointer"
            >
              <FontAwesomeIcon icon={faTimes} className="text-gray-400 text-base" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 gap-1 bg-[#222] rounded-xl p-1">
          <button
            onClick={() => setFilterTab('basic')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'basic' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
            <span>Dasar</span>
          </button>
          <button
            onClick={() => setFilterTab('advanced')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'advanced' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <FontAwesomeIcon icon={faSlidersH} className="text-[10px]" />
            <span>Lanjutan</span>
            {(filterParams.user_id || filterParams.taxonomy_value) && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${filterTaxaSuggestions.length > 0 ? 'pb-[260px]' : ''}`}>
          {filterTab === 'basic' ? (
            <>
              {/* Pencarian Taksa */}
              <div>
                <label className="block text-gray-300 mb-2 text-xs font-semibold uppercase tracking-wider">Cari Taksa</label>
                <div className="relative" ref={filterTaxaSuggestionRef}>
                  {filterParams.taxonomy_value ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                      <FontAwesomeIcon icon={faSearch} className="text-blue-400 text-xs" />
                      <span className="text-xs text-blue-300 font-medium flex-1 truncate">
                        <i>{filterTaxaSearch || filterParams.taxonomy_value}</i>
                        <span className="text-gray-500 ml-1">[{filterParams.taxonomy_rank}]</span>
                      </span>
                      <button
                        onClick={() => {
                          setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''}));
                          setFilterTaxaSearch('');
                          setFilterTaxaSuggestions([]);
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Spesies/ genus/ famili..."
                        value={filterTaxaSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilterTaxaSearch(value);
                          if (filterTaxaTimeoutRef.current) clearTimeout(filterTaxaTimeoutRef.current);
                          if (value.trim().length >= 2) {
                            setIsLoadingFilterTaxa(true);
                            filterTaxaTimeoutRef.current = setTimeout(() => {
                              handleFilterTaxaSearch(value.trim());
                            }, 300);
                          } else {
                            setFilterTaxaSuggestions([]);
                            setIsLoadingFilterTaxa(false);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none placeholder-gray-600"
                      />
                      {isLoadingFilterTaxa ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm" />
                      )}
                    </>
                  )}

                  {/* Suggestion dropdown */}
                  {filterTaxaSuggestions.length > 0 && !filterParams.taxonomy_value && (
                    <div className="absolute z-50 w-full bg-[#1e1e1e] mt-1 rounded-lg shadow-lg max-h-[250px] overflow-y-auto border border-[#3a3a3a]" onMouseDown={(e) => e.stopPropagation()}>
                      {filterTaxaSuggestions.map((suggestion, index) => (
                        <div
                          key={`filter-taxa-${suggestion.id}-${index}`}
                          className="p-2.5 cursor-pointer text-gray-200 border-b border-[#333] hover:bg-[#2a2a2a] transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFilterTaxaSelect(suggestion); }}
                        >
                          <div className="text-sm">
                            <i>{suggestion.scientific_name}</i>
                            {suggestion.common_name && (
                              <span className="text-gray-400"> ({suggestion.common_name})</span>
                            )}
                            <span className="text-gray-600 text-xs ml-1.5">[{suggestion.rank}]</span>
                            {suggestion.taxonomic_status === 'SYNONYM' && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-orange-600 text-white text-[10px] rounded">SINONIM</span>
                            )}
                          </div>
                          {suggestion.full_data?.family && !['family', 'subfamily'].includes(suggestion.rank) && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Family: {suggestion.full_data.family}
                            </div>
                          )}
                          {suggestion.taxonomic_status === 'SYNONYM' && suggestion.accepted_scientific_name && (
                            <div className="text-[11px] text-orange-300 mt-0.5">
                              → <i>{suggestion.accepted_scientific_name}</i>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Sumber Data */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Sumber Data</label>
                <p className="text-gray-500 text-xs mb-3">Pilih platform sumber data observasi</p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { key: 'fobi', label: 'Amaturalist', color: 'blue' },
                    { key: 'burungnesia', label: 'Burungnesia', color: 'green' },
                    { key: 'kupunesia', label: 'Kupunesia', color: 'purple' }
                  ].map(source => {
                    const isActive = filterParams.data_source.includes(source.key);
                    const colorMap = {
                      blue: isActive ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-blue-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                      green: isActive ? 'bg-green-600/20 border-green-500/60 text-green-300 shadow-green-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                      purple: isActive ? 'bg-purple-600/20 border-purple-500/60 text-purple-300 shadow-purple-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                    };
                    return (
                      <button
                        key={source.key}
                        onClick={() => handleDataSourceChange(source.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${colorMap[source.color]}`}
                      >
                        {source.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Grade */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Kualitas Data</label>
                <p className="text-gray-500 text-xs mb-3">Saring berdasarkan tingkat verifikasi identifikasi</p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { key: 'research grade', label: 'ID Lengkap', color: 'blue', desc: 'Data terverifikasi lengkap oleh komunitas' },
                    { key: 'confirmed id', label: 'ID Terkonfirmasi', color: 'emerald', desc: 'Identifikasi terkonfirmasi secara hierarkis' },
                    { key: 'needs ID', label: 'Bantu Ident', color: 'amber', desc: 'Masih membutuhkan bantuan identifikasi' },
                    { key: 'low quality ID', label: 'ID Kurang', color: 'orange', desc: 'Data belum memenuhi standar kualitas' }
                  ].map(grade => {
                    const isActive = filterParams.grade.includes(grade.key);
                    const colorMap = {
                      emerald: isActive ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                      blue: isActive ? 'bg-blue-600/20 border-blue-500/60 text-blue-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                      amber: isActive ? 'bg-amber-600/20 border-amber-500/60 text-amber-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                      orange: isActive ? 'bg-orange-600/20 border-orange-500/60 text-orange-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                    };
                    return (
                      <button
                        key={grade.key}
                        onClick={() => handleGradeChange(grade.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${colorMap[grade.color]}`}
                        title={grade.desc}
                      >
                        {grade.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Media */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Jenis Media</label>
                <p className="text-gray-500 text-xs mb-3">Saring observasi berdasarkan jenis media yang diunggah</p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { value: '', label: 'Semua Media', icon: faLayerGroup },
                    { value: 'photo', label: 'Dengan Foto', icon: faCamera },
                    { value: 'audio', label: 'Dengan Audio', icon: faHeadphones }
                  ].map((option) => {
                    const isActive = filterParams.media_type === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterParams(prev => ({...prev, media_type: option.value, has_media: option.value !== ''}));
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                          isActive 
                            ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-blue-500/10 shadow-md' 
                            : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]'
                        }`}
                      >
                        <FontAwesomeIcon icon={option.icon} className="text-sm" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Tanggal */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Rentang Waktu</label>
                <p className="text-gray-500 text-xs mb-3">Pilih jenis tanggal yang ingin disaring</p>
                <div className="flex gap-2.5 mb-4">
                  {[
                    { value: 'created_at', label: 'Tanggal Dibuat', desc: 'Saat data diunggah ke sistem' },
                    { value: 'observation_date', label: 'Tanggal Pengamatan', desc: 'Saat pengamatan dilakukan' }
                  ].map((opt) => {
                    const isActive = filterParams.date_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFilterParams(prev => ({...prev, date_type: opt.value}))}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer text-left ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                            : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]'
                        }`}
                        title={opt.desc}
                      >
                        <span className="block text-sm font-medium">{opt.label}</span>
                        <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-blue-400/70' : 'text-gray-600'}`}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <span className="block text-gray-400 text-xs font-medium mb-1.5">Dari tanggal</span>
                    <input
                      type="date"
                      value={filterParams.start_date}
                      onChange={(e) => setFilterParams(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                  <span className="text-gray-600 text-lg pb-2.5">—</span>
                  <div className="flex-1">
                    <span className="block text-gray-400 text-xs font-medium mb-1.5">Sampai tanggal</span>
                    <input
                      type="date"
                      value={filterParams.end_date}
                      onChange={(e) => setFilterParams(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* User Filter */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faUser} className="mr-1.5" />
                  Pengguna
                </label>
                <p className="text-gray-500 text-xs mb-3">Saring observasi berdasarkan pengguna tertentu</p>

                {filterParams.user_id ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                    <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium flex-1">{filterParams.user_name}</span>
                    <button
                      onClick={() => {
                        setFilterParams(prev => ({ ...prev, user_id: null, user_name: '' }));
                        setUsernameSearch('');
                        setUsernameResults([]);
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik username pengguna..."
                        value={usernameSearch}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isLoadingUsers ? (
                          <FontAwesomeIcon icon={faSpinner} spin className="text-gray-500 text-sm" />
                        ) : (
                          <FontAwesomeIcon icon={faSearch} className="text-gray-600 text-sm" />
                        )}
                      </div>
                    </div>
                    {usernameResults.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#3a3a3a] bg-[#222]">
                        {usernameResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#333] transition-colors cursor-pointer border-none bg-transparent border-b border-[#2a2a2a] last:border-b-0"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center">
                              <FontAwesomeIcon icon={faUser} className="text-gray-500 text-xs" />
                            </div>
                            <span className="text-sm text-gray-300">{user.uname || user.fname}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Filter Taksonomi */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faDna} className="mr-1.5" />
                  Taksonomi
                </label>
                <p className="text-gray-500 text-xs mb-3">Pilih kategori atau cari nama taksa secara spesifik.</p>

                {/* Selected taxonomy chip */}
                {filterParams.taxonomy_value && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-emerald-600/10 border border-emerald-500/40 rounded-xl">
                    <FontAwesomeIcon icon={faDna} className="text-emerald-400" />
                    <div className="flex-1">
                      <span className="text-sm text-emerald-300 font-medium italic">{advTaxaSearch || filterParams.taxonomy_value}</span>
                      <span className="text-xs text-emerald-500/70 ml-2 uppercase">{filterParams.taxonomy_rank}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''}));
                        setAdvTaxaSearch('');
                        setAdvTaxaSuggestions([]);
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}

                {/* Category Grid - like iNaturalist */}
                <div className="mb-3">
                  <label className="block text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">
                    Kategori
                  </label>
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { value: 'Aves', label: 'Burung', icon: '/src/assets/icon/burung-01.png', rank: 'class', scale: 1 },
                      { value: 'Mammalia', label: 'Mamalia', icon: '/src/assets/icon/mammalia-01.png', rank: 'class', scale: 1 },
                      { value: 'Reptilia', label: 'Reptil', icon: '/src/assets/icon/reptil-01.png', rank: 'class', scale: 1 },
                      { value: 'Amphibia', label: 'Amfibi', icon: '/src/assets/icon/amphibi-01.png', rank: 'class', scale: 1 },
                      { value: 'Actinopterygii', label: 'Ikan', icon: '/src/assets/icon/ikan-01.png', rank: 'class', scale: 1 },
                      { value: 'Insecta', label: 'Serangga', icon: '/src/assets/icon/insecta-01.png', rank: 'class', scale: 1.5 },
                      { value: 'Lepidoptera', label: 'Kupu-kupu', icon: '/src/assets/icon/lepidoptera-01.png', rank: 'order', scale: 1.5 },
                      { value: 'Odonata', label: 'Capung', icon: '/src/assets/icon/capung-01.svg', rank: 'order', scale: 1 },
                      { value: 'Coleoptera', label: 'Kumbang', icon: '/src/assets/icon/kumbang-01.svg', rank: 'order', scale: 1 },
                      { value: 'Arachnida', label: 'Laba-laba', icon: '/src/assets/icon/arachnida-01.png', rank: 'class', scale: 1.5 },
                      { value: 'Fungi', label: 'Jamur', icon: '/src/assets/icon/jamur-01.png', rank: 'kingdom', scale: 1.5 },
                      { value: 'Plantae', label: 'Tumbuhan', icon: '/src/assets/icon/plants-01.png', rank: 'kingdom', scale: 1.5 },
                      { value: 'Orchidaceae', label: 'Anggrek', icon: '/src/assets/icon/anggrek-01.svg', rank: 'family', scale: 1 },
                      { value: 'Polypodiopsida', label: 'Paku', icon: '/src/assets/icon/paku-01.svg', rank: 'class', scale: 1 },
                      { value: 'Bryophyta', label: 'Lumut', icon: '/src/assets/icon/lumut-01.svg', rank: 'phylum', scale: 1 },
                      { value: 'Mollusca', label: 'Moluska', icon: '/src/assets/icon/mollusca-01.png', rank: 'phylum', scale: 1.5 },
                      { value: 'UNKNOWN', label: 'Unknown', icon: null, rank: 'UNKNOWN', scale: 1 },
                    ].map((cat) => {
                      const isActive = filterParams.taxonomy_value === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => {
                            if (isActive) {
                              setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''}));
                              setAdvTaxaSearch('');
                            } else {
                              setFilterParams(prev => ({...prev, taxonomy_rank: cat.rank, taxonomy_value: cat.value}));
                              setAdvTaxaSearch(cat.label);
                              setAdvTaxaSuggestions([]);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-md border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-[#444] hover:text-gray-200'
                          }`}
                          title={cat.label}
                        >
                          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                            {cat.icon ? (
                              <img src={cat.icon} alt={cat.label} className="object-contain" style={{ transform: `scale(${cat.scale})`, width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }} />
                            ) : (
                              <span className="text-xl font-bold text-white">?</span>
                            )}
                          </div>
                          <span className="text-[10px] mt-0.5 truncate w-full text-center font-medium">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a]"></div>

              {/* Filter Lokasi */}
              <div>
                <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1.5" />
                  Lokasi
                </label>
                <p className="text-gray-500 text-xs mb-3">Cari berdasarkan nama lokasi pengamatan.</p>

                {/* Selected location chip */}
                {filterParams.location_name && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-400" />
                    <div className="flex-1">
                      <span className="text-sm text-blue-300 font-medium">{filterParams.location_name}</span>
                      {filterParams.location_source && (
                        <span className="text-xs text-blue-500/70 ml-2 uppercase">
                          {filterParams.location_source === 'fobi' ? 'FOBi' : filterParams.location_source === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setFilterParams(prev => ({...prev, location_name: '', location_source: ''}));
                        setAdvLocationSearch('');
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}

                {/* Search box */}
                <div className="rounded-xl p-3 border bg-[#222] border-[#3a3a3a]">
                  <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">
                    Cari Lokasi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama lokasi (min. 2 karakter)..."
                      value={advLocationSearch}
                      onChange={(e) => handleSearchAdvLocations(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    {isLoadingAdvLocation && (
                      <FontAwesomeIcon icon={faSpinner} spin className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 text-[10px]" />
                    )}
                  </div>

                  {/* Location results */}
                  <div className="max-h-40 overflow-y-auto mt-1.5 space-y-0.5">
                    {advLocationResults.length > 0 && !filterParams.location_name ? (
                      advLocationResults.map((loc, index) => (
                        <button
                          key={`loc-${index}`}
                          onClick={() => handleAdvLocationSelect(loc)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border-none text-gray-400 hover:bg-[#333] hover:text-gray-200 bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-500 text-[10px]" />
                            <span className="text-gray-300">{loc.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              loc.source === 'fobi' ? 'bg-emerald-600/30 text-emerald-300' :
                              loc.source === 'burungnesia' ? 'bg-blue-600/30 text-blue-300' :
                              'bg-purple-600/30 text-purple-300'
                            }`}>
                              {loc.source === 'fobi' ? 'FOBi' : loc.source === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : !isLoadingAdvLocation && advLocationSearch.length >= 2 && advLocationResults.length === 0 && !filterParams.location_name ? (
                      <p className="text-gray-600 text-[10px] px-2.5 py-1">Tidak ditemukan</p>
                    ) : !filterParams.location_name && advLocationSearch.length < 2 ? (
                      <p className="text-gray-600 text-[10px] px-2.5 py-1">Ketik minimal 2 karakter untuk mencari</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#333]">
          {hasActiveFilters() && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-[#333] text-red-400 rounded-lg hover:bg-[#444] transition-all text-sm font-medium"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleApply}
            className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faSearch} />
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
