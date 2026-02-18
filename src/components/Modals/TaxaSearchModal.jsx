import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch, faSpinner, faChevronRight } from '@fortawesome/free-solid-svg-icons';
const MAIN_RANKS = [
    { key: 'kingdom', label: 'Kingdom' },
    { key: 'phylum', label: 'Phylum' },
    { key: 'class', label: 'Class' },
    { key: 'order', label: 'Order' },
    { key: 'family', label: 'Family' },
    { key: 'genus', label: 'Genus' },
    { key: 'species', label: 'Species' }
];
const ALLOWED_KINGDOMS = ['Animalia', 'Bacteria', 'Fungi', 'Plantae'];

const TaxaSearchModal = ({ show, onClose, onSelect }) => {
    const [searchMode, setSearchMode] = useState('direct'); // 'hierarchy' or 'direct'
    const [directSearch, setDirectSearch] = useState('');
    const [directResults, setDirectResults] = useState([]);
    const [directLoading, setDirectLoading] = useState(false);
    const [hierarchySelections, setHierarchySelections] = useState({});
    const [rankValues, setRankValues] = useState({});
    const [rankSearches, setRankSearches] = useState({});
    const [rankLoading, setRankLoading] = useState({});
    const [selectedTaxa, setSelectedTaxa] = useState(null);
    const [selectedRank, setSelectedRank] = useState(null);
    const [selectedValue, setSelectedValue] = useState(null);
    useEffect(() => {
        if (show) {
            setHierarchySelections({});
            setRankValues({});
            setRankSearches({});
            setSelectedTaxa(null);
            setSelectedRank(null);
            setSelectedValue(null);
            setDirectSearch('');
            setDirectResults([]);
            MAIN_RANKS.forEach(rank => {
                fetchRankValues(rank.key);
            });
        }
    }, [show]);
    const fetchRankValues = useCallback(async (rank, parentRank = '', parentValue = '', search = '') => {
        setRankLoading(prev => ({ ...prev, [rank]: true }));
        try {
            const params = new URLSearchParams({
                rank,
                search,
                limit: 100
            });
            if (parentRank && parentValue) {
                params.append('parent_rank', parentRank);
                params.append('parent_value', parentValue);
            }
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/taxa/rank-values?${params}`);
            const data = await response.json();
            
            if (data.success) {
                let filteredData = data.data;
                if (rank === 'kingdom') {
                    filteredData = data.data.filter(item => ALLOWED_KINGDOMS.includes(item));
                }
                setRankValues(prev => ({ ...prev, [rank]: filteredData }));
            }
        } catch (error) {
            console.error('Error fetching rank values:', error);
        } finally {
            setRankLoading(prev => ({ ...prev, [rank]: false }));
        }
    }, []);
    const handleRankSelect = (rank, value) => {
        const newSelections = { ...hierarchySelections };
        const rankIndex = MAIN_RANKS.findIndex(r => r.key === rank);
        MAIN_RANKS.slice(rankIndex + 1).forEach(r => {
            delete newSelections[r.key];
        });
        
        newSelections[rank] = value;
        setHierarchySelections(newSelections);
        setSelectedRank(rank);
        setSelectedValue(value);
        MAIN_RANKS.slice(rankIndex + 1).forEach(childRank => {
            fetchRankValues(childRank.key, rank, value);
        });
        fetchTaxaByRankValue(rank, value);
    };
    const fetchTaxaByRankValue = async (rank, value) => {
        try {
            const params = new URLSearchParams({ [rank]: value });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/taxa/by-hierarchy?${params}&exact_rank=${rank}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const matchingTaxa = data.data.find(t => 
                    t.taxon_rank && t.taxon_rank.toLowerCase() === rank.toLowerCase()
                ) || data.data[0];
                setSelectedTaxa(matchingTaxa);
            } else {
                setSelectedTaxa({
                    id: null,
                    scientific_name: value,
                    taxon_rank: rank.toUpperCase(),
                    [rank]: value,
                    isVirtual: true
                });
            }
        } catch (error) {
            console.error('Error fetching taxa by rank value:', error);
        }
    };
    const handleRankSearch = (rank, search) => {
        setRankSearches(prev => ({ ...prev, [rank]: search }));
        const rankIndex = MAIN_RANKS.findIndex(r => r.key === rank);
        let parentRank = '';
        let parentValue = '';
        
        for (let i = rankIndex - 1; i >= 0; i--) {
            const prevRank = MAIN_RANKS[i].key;
            if (hierarchySelections[prevRank]) {
                parentRank = prevRank;
                parentValue = hierarchySelections[prevRank];
                break;
            }
        }
        
        fetchRankValues(rank, parentRank, parentValue, search);
    };
    const handleDirectSearch = async () => {
        if (!directSearch.trim()) return;
        
        setDirectLoading(true);
        try {
            const params = new URLSearchParams({
                search: directSearch.trim(),
                limit: 50
            });
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/taxa/search?${params}`);
            const data = await response.json();
            
            if (data.success) {
                setDirectResults(data.data);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
        } finally {
            setDirectLoading(false);
        }
    };
    const buildHierarchyPath = (taxa) => {
        const parts = [];
        if (taxa.superkingdom) parts.push(taxa.superkingdom);
        if (taxa.kingdom) parts.push(taxa.kingdom);
        if (taxa.phylum) parts.push(taxa.phylum);
        if (taxa.class) parts.push(taxa.class);
        if (taxa.order) parts.push(taxa.order);
        if (taxa.family) parts.push(taxa.family);
        if (taxa.genus) parts.push(taxa.genus);
        if (taxa.species) parts.push(taxa.species);
        return parts.join(' › ');
    };
    const handleConfirmSelection = () => {
        if (selectedTaxa) {
            onSelect(selectedTaxa);
            onClose();
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#444] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#333]">
                    <h2 className="text-lg font-semibold text-white">Cari Taksa</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Search Mode Tabs */}
                <div className="flex border-b border-[#333]">
                    <button
                        onClick={() => setSearchMode('direct')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            searchMode === 'direct'
                                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-[#252525]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Cari Langsung
                    </button>
                    <button
                        onClick={() => setSearchMode('hierarchy')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            searchMode === 'hierarchy'
                                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-[#252525]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Cari berdasarkan Hierarki
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {searchMode === 'hierarchy' ? (
                        <div className="space-y-4">
                            {/* Info about parent taxa */}
                            <div className="bg-[#1a3a5c] border border-[#2563EB] rounded-lg p-3 text-sm text-blue-200">
                                <strong>💡 Tips:</strong> Jika Anda memilih taksa induk (parent), semua taksa anak (child) akan otomatis termasuk dalam favorit Anda.
                            </div>
                            
                            {/* Hierarchy Grid - All 7 main ranks displayed */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {MAIN_RANKS.map(rank => (
                                    <div key={rank.key} className="bg-[#252525] rounded-lg p-3 border border-[#333]">
                                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
                                            {rank.label}
                                        </label>
                                        
                                        {/* Search input for this rank */}
                                        <div className="relative mb-2">
                                            <input
                                                type="text"
                                                placeholder={`Cari ${rank.label.toLowerCase()}...`}
                                                value={rankSearches[rank.key] || ''}
                                                onChange={(e) => handleRankSearch(rank.key, e.target.value)}
                                                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                                            />
                                            {rankLoading[rank.key] && (
                                                <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            )}
                                        </div>
                                        
                                        {/* Values list */}
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {(rankValues[rank.key] || []).map(value => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleRankSelect(rank.key, value)}
                                                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                                                        hierarchySelections[rank.key] === value
                                                            ? 'bg-[#3B82F6] text-white'
                                                            : 'text-gray-300 hover:bg-[#333]'
                                                    }`}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                            {!rankLoading[rank.key] && (!rankValues[rank.key] || rankValues[rank.key].length === 0) && (
                                                <p className="text-gray-500 text-sm px-3 py-1">Tidak ada data</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Direct Search Input */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Ketik nama taksa (scientific name atau nama umum)..."
                                        value={directSearch}
                                        onChange={(e) => setDirectSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDirectSearch()}
                                        className="w-full bg-[#252525] border border-[#444] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                                    />
                                </div>
                                <button
                                    onClick={handleDirectSearch}
                                    disabled={directLoading}
                                    className="px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50"
                                >
                                    {directLoading ? (
                                        <FontAwesomeIcon icon={faSpinner} spin />
                                    ) : (
                                        <FontAwesomeIcon icon={faSearch} />
                                    )}
                                </button>
                            </div>

                            {/* Direct Search Results */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {directResults.map(taxa => (
                                    <button
                                        key={taxa.id}
                                        onClick={() => setSelectedTaxa(taxa)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                            selectedTaxa?.id === taxa.id
                                                ? 'bg-[#3B82F6]/20 border-[#3B82F6]'
                                                : 'bg-[#252525] border-[#333] hover:border-[#444]'
                                        }`}
                                    >
                                        <div className="font-medium text-white italic">{taxa.scientific_name}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {taxa.taxon_rank} • {taxa.Cname || '-'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 truncate">
                                            {buildHierarchyPath(taxa)}
                                        </div>
                                    </button>
                                ))}
                                {directResults.length === 0 && directSearch && !directLoading && (
                                    <p className="text-center text-gray-500 py-8">Tidak ada hasil ditemukan</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Taxa Preview */}
                {(selectedTaxa || (selectedRank && selectedValue)) && (
                    <div className="p-4 bg-[#252525] border-t border-[#333]">
                        <div className="text-xs text-gray-400 mb-1">Taksa terpilih:</div>
                        <div className="flex items-center gap-2 text-sm text-white">
                            <span className="text-[#3B82F6]">
                                {selectedTaxa ? buildHierarchyPath(selectedTaxa) : `${selectedRank}: ${selectedValue}`}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium italic">
                                    {selectedTaxa?.scientific_name || selectedValue}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-[#333] rounded text-gray-400">
                                    {selectedTaxa?.taxon_rank || selectedRank?.toUpperCase()}
                                </span>
                            </div>
                            {(selectedTaxa?.taxon_rank || selectedRank) && 
                             !['SPECIES', 'SUBSPECIES'].includes((selectedTaxa?.taxon_rank || selectedRank || '').toUpperCase()) && (
                                <span className="text-xs text-green-400">
                                    ✓ Termasuk semua taksa anak
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-[#333]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleConfirmSelection}
                        disabled={!selectedTaxa && !(selectedRank && selectedValue)}
                        className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Tambah
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaxaSearchModal;
