import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TaxaSearch = ({ 
    placeholder = "Cari taksa...", 
    selectedRank = null, 
    onSelect = null,
    className = "",
    showRankFilter = true 
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedRankFilter, setSelectedRankFilter] = useState(selectedRank || 'species');
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const rankLabels = {
        domain: 'Domain',
        superkingdom: 'Superkingdom',
        kingdom: 'Kingdom',
        subkingdom: 'Subkingdom',
        superphylum: 'Superphylum',
        phylum: 'Phylum',
        subphylum: 'Subphylum',
        superclass: 'Superkelas',
        class: 'Kelas',
        subclass: 'Subkelas',
        infraclass: 'Infrakelas',
        magnorder: 'Magnorder',
        superorder: 'Superordo',
        order: 'Ordo',
        suborder: 'Subordo',
        infraorder: 'Infraordo',
        parvorder: 'Parvordo',
        superfamily: 'Superfamili',
        family: 'Famili',
        subfamily: 'Subfamili',
        supertribe: 'Supertribus',
        tribe: 'Tribus',
        subtribe: 'Subtribus',
        genus: 'Genus',
        subgenus: 'Subgenus',
        species: 'Spesies',
        subspecies: 'Subspesies',
        variety: 'Varietas',
        form: 'Forma',
        subform: 'Subforma'
    };
    const popularRanks = ['species', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (query.length >= 2) {
            searchTaxa();
        } else {
            setResults([]);
            setShowResults(false);
        }
    }, [query, selectedRankFilter]);

    const searchTaxa = async () => {
        if (query.length < 2) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/taxa/${selectedRankFilter}/search?q=${encodeURIComponent(query)}&limit=10`);
            const result = await response.json();

            if (result.success) {
                setResults(result.data);
                setShowResults(true);
            } else {
                setResults([]);
                setShowResults(false);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
            setResults([]);
            setShowResults(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTaxa = (taxa) => {
        if (onSelect) {
            onSelect(taxa);
        } else {
            navigate(`/taxa/${selectedRankFilter}/${taxa.taxa_id}`);
        }
        setQuery('');
        setResults([]);
        setShowResults(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (results.length > 0) {
            handleSelectTaxa(results[0]);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch(status) {
            case 'ACCEPTED': return 'bg-green-100 text-green-800';
            case 'UNACCEPTED': return 'bg-red-100 text-red-800';
            case 'SYNONYM': return 'bg-yellow-100 text-yellow-800';
            case 'HIDDEN': return 'bg-gray-100 text-gray-800';
            case 'DOUBTFUL': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div ref={searchRef} className={`relative ${className}`}>
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                {showRankFilter && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-sm text-gray-600 self-center">Cari dalam:</span>
                        {popularRanks.map(rank => (
                            <button
                                key={rank}
                                type="button"
                                onClick={() => setSelectedRankFilter(rank)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    selectedRankFilter === rank
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {rankLabels[rank]}
                            </button>
                        ))}
                        <select
                            value={selectedRankFilter}
                            onChange={(e) => setSelectedRankFilter(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(rankLabels).map(([rank, label]) => (
                                <option key={rank} value={rank}>{label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`${placeholder} (${rankLabels[selectedRankFilter]})`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoComplete="off"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </div>
            </form>

            {/* Search Results */}
            {showResults && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="py-2">
                            {results.map((taxa, index) => (
                                <button
                                    key={taxa.taxa_id}
                                    onClick={() => handleSelectTaxa(taxa)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900">
                                                    <em>{taxa.scientific_name}</em>
                                                </span>
                                                {taxa.taxonomic_status && (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(taxa.taxonomic_status)}`}>
                                                        {taxa.taxonomic_status}
                                                    </span>
                                                )}
                                            </div>
                                            {taxa.common_name && (
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {taxa.common_name}
                                                </div>
                                            )}
                                            {taxa.author && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {taxa.author}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-2 text-xs text-gray-500">
                                            {rankLabels[selectedRankFilter]}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                            Tidak ada hasil ditemukan untuk "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaxaSearch;
