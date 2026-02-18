import { useState, useCallback } from 'react';
import { TAXONOMY_RANKS } from '../utils';

export const useUserSearch = () => {
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameResults, setUsernameResults] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hierarchySelections, setHierarchySelections] = useState({});
  const [rankValues, setRankValues] = useState({});
  const [rankSearches, setRankSearches] = useState({});
  const [rankLoading, setRankLoading] = useState({});

  const handleSearchUsers = useCallback(async (query) => {
    setUsernameSearch(query);
    if (query.length < 2) {
      setUsernameResults([]);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search-users?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) setUsernameResults(data.data);
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchRankValues = useCallback(async (rank, parentRank = '', parentValue = '', search = '') => {
    setRankLoading(prev => ({ ...prev, [rank]: true }));
    try {
      const params = new URLSearchParams({ rank, search, limit: 100 });
      if (parentRank && parentValue) {
        params.append('parent_rank', parentRank);
        params.append('parent_value', parentValue);
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/taxa/rank-values?${params}`);
      const data = await res.json();
      if (data.success) {
        setRankValues(prev => ({ ...prev, [rank]: data.data }));
      }
    } catch (e) {
      console.error('Error fetching rank values:', e);
    } finally {
      setRankLoading(prev => ({ ...prev, [rank]: false }));
    }
  }, []);

  const handleRankSelect = useCallback((rank, value, setFilterParams) => {
    const newSelections = { ...hierarchySelections };
    const rankIndex = TAXONOMY_RANKS.findIndex(r => r.key === rank);
    TAXONOMY_RANKS.slice(rankIndex + 1).forEach(r => { delete newSelections[r.key]; });
    newSelections[rank] = value;
    setHierarchySelections(newSelections);
    setFilterParams(prev => ({ ...prev, taxonomy_rank: rank, taxonomy_value: value }));
    TAXONOMY_RANKS.slice(rankIndex + 1).forEach(childRank => {
      fetchRankValues(childRank.key, rank, value);
    });
  }, [hierarchySelections, fetchRankValues]);

  const handleRankSearch = useCallback((rank, search) => {
    setRankSearches(prev => ({ ...prev, [rank]: search }));
    const rankIndex = TAXONOMY_RANKS.findIndex(r => r.key === rank);
    let parentRank = '';
    let parentValue = '';
    for (let i = rankIndex - 1; i >= 0; i--) {
      const prevRank = TAXONOMY_RANKS[i].key;
      if (hierarchySelections[prevRank]) {
        parentRank = prevRank;
        parentValue = hierarchySelections[prevRank];
        break;
      }
    }
    fetchRankValues(rank, parentRank, parentValue, search);
  }, [hierarchySelections, fetchRankValues]);

  const resetUserSearch = () => {
    setUsernameSearch('');
    setUsernameResults([]);
    setHierarchySelections({});
    setRankValues({});
    setRankSearches({});
  };

  return {
    usernameSearch,
    setUsernameSearch,
    usernameResults,
    setUsernameResults,
    isLoadingUsers,
    hierarchySelections,
    setHierarchySelections,
    rankValues,
    setRankValues,
    rankSearches,
    setRankSearches,
    rankLoading,
    handleSearchUsers,
    fetchRankValues,
    handleRankSelect,
    handleRankSearch,
    resetUserSearch
  };
};

export default useUserSearch;
