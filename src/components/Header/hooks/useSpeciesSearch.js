import { useState, useRef } from 'react';
import { groupSuggestionsHierarchically } from '../taxonomyUtils';

export const useSpeciesSearch = () => {
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const handleSpeciesSearch = async (query, pageNum = 1) => {
    if (!query) {
      setSpeciesSuggestions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    setIsLoadingSpecies(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=20&include_all_taxa=true`,
        { signal: abortControllerRef.current.signal }
      );
      const responseData = await resp.json();
      if (currentRequestId !== requestIdRef.current) return;
      if (!responseData?.success) {
        console.error('Error from API:', responseData?.message);
        setSpeciesSuggestions([]);
        return;
      }
      const data = Array.isArray(responseData.data) ? responseData.data : [];
      const hierarchicalData = groupSuggestionsHierarchically(data);
      setSpeciesSuggestions(hierarchicalData);
    } catch (error) {
      if (error.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
        console.error('Error searching species:', error);
        setSpeciesSuggestions([]);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingSpecies(false);
      }
    }
  };

  return {
    speciesSuggestions,
    setSpeciesSuggestions,
    isLoadingSpecies,
    setIsLoadingSpecies,
    handleSpeciesSearch,
    abortControllerRef,
    requestIdRef
  };
};

export default useSpeciesSearch;
