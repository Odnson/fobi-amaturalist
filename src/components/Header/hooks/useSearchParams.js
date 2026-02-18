import { useState, useRef } from 'react';

export const useSearchParams = () => {
  const [searchParams, setSearchParams] = useState({
    search: '',
    location: '',
    latitude: '',
    longitude: '',
    searchType: 'all',
    boundingbox: null,
    radius: 10
  });

  const [filterParams, setFilterParams] = useState({
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
    taxonomy_value: ''
  });

  const [filterTab, setFilterTab] = useState('basic');
  const [filterTaxaSearch, setFilterTaxaSearch] = useState('');
  const [filterTaxaSuggestions, setFilterTaxaSuggestions] = useState([]);
  const [isLoadingFilterTaxa, setIsLoadingFilterTaxa] = useState(false);
  
  const filterTaxaAbortRef = useRef(null);
  const filterTaxaRequestIdRef = useRef(0);
  const filterTaxaTimeoutRef = useRef(null);
  const filterTaxaSuggestionRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const hasActiveFilters = () => {
    return searchParams.search || 
           searchParams.location || 
           searchParams.selectedId ||
           filterParams.start_date || 
           filterParams.end_date || 
           filterParams.grade.length > 0 || 
           filterParams.has_media || 
           filterParams.media_type ||
           filterParams.user_id ||
           filterParams.taxonomy_value;
  };

  const resetFilters = () => {
    setSearchParams({
      search: '',
      location: '',
      latitude: '',
      longitude: '',
      searchType: 'all',
      boundingbox: null,
      radius: 10
    });

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
      taxonomy_value: ''
    });

    setFilterTaxaSearch('');
    setFilterTaxaSuggestions([]);
    setFilterTab('basic');
  };

  const handleGradeChange = (grade) => {
    setFilterParams(prev => {
      const newGrades = prev.grade.includes(grade)
        ? prev.grade.filter(g => g !== grade)
        : [...prev.grade, grade];

      return {
        ...prev,
        grade: newGrades
      };
    });
  };

  return {
    searchParams,
    setSearchParams,
    filterParams,
    setFilterParams,
    filterTab,
    setFilterTab,
    filterTaxaSearch,
    setFilterTaxaSearch,
    filterTaxaSuggestions,
    setFilterTaxaSuggestions,
    isLoadingFilterTaxa,
    setIsLoadingFilterTaxa,
    filterTaxaAbortRef,
    filterTaxaRequestIdRef,
    filterTaxaTimeoutRef,
    filterTaxaSuggestionRef,
    searchTimeoutRef,
    hasActiveFilters,
    resetFilters,
    handleGradeChange
  };
};

export default useSearchParams;
