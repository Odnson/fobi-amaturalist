import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaxaSearch from '../TaxaDetail/TaxaSearch';

const TaxaBrowser = () => {
    const navigate = useNavigate();
    const { rank: urlRank } = useParams();
    const [selectedRank, setSelectedRank] = useState(urlRank || 'kingdom');
    const [taxa, setTaxa] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
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
    const popularRanks = [
        'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'
    ];

    const statusColors = {
        'ACCEPTED': 'bg-green-100 text-green-800',
        'UNACCEPTED': 'bg-red-100 text-red-800',
        'SYNONYM': 'bg-yellow-100 text-yellow-800',
        'HIDDEN': 'bg-gray-100 text-gray-800',
        'DOUBTFUL': 'bg-gray-100 text-gray-800'
    };

    useEffect(() => {
        if (urlRank && urlRank !== selectedRank) {
            setSelectedRank(urlRank);
        }
    }, [urlRank]);

    useEffect(() => {
        setTaxa([]);
        setPage(1);
        setHasMore(true);
        loadTaxa(1);
    }, [selectedRank]);

    const loadTaxa = async (pageNum = 1) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/taxa/${selectedRank}/search?q=&limit=20&page=${pageNum}`);
            const result = await response.json();

            if (result.success) {
                if (pageNum === 1) {
                    setTaxa(result.data);
                } else {
                    setTaxa(prev => [...prev, ...result.data]);
                }
                setHasMore(result.data.length === 20);
            }
        } catch (error) {
            console.error('Error loading taxa:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRankChange = (rank) => {
        setSelectedRank(rank);
        navigate(`/taxonomy/${rank}`);
    };

    const handleTaxaClick = (taxa) => {
        navigate(`/taxa/${selectedRank}/${taxa.taxa_id}`);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadTaxa(nextPage);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Penjelajah Taksonomi
                </h1>
                <p className="text-gray-600 mb-6">
                    Jelajahi keanekaragaman hayati berdasarkan klasifikasi taksonomi
                </p>

                {/* Search Component */}
                <div className="mb-6">
                    <TaxaSearch 
                        placeholder="Cari taksa tertentu..."
                        selectedRank={selectedRank}
                        showRankFilter={true}
                        className="max-w-2xl"
                    />
                </div>

                {/* Rank Selection */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Pilih Tingkat Taksonomi:</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {popularRanks.map(rank => (
                            <button
                                key={rank}
                                onClick={() => handleRankChange(rank)}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    selectedRank === rank
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {rankLabels[rank]}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Atau pilih lainnya:</span>
                        <select
                            value={selectedRank}
                            onChange={(e) => handleRankChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(rankLabels).map(([rank, label]) => (
                                <option key={rank} value={rank}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Taxa List */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                        Daftar {rankLabels[selectedRank]}
                    </h2>
                    <span className="text-sm text-gray-600">
                        {taxa.length} {taxa.length === 1 ? 'taksa' : 'taksa'}
                    </span>
                </div>

                {loading && taxa.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : taxa.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {taxa.map((taxaItem, index) => (
                                <div
                                    key={`${taxaItem.taxa_id}-${index}`}
                                    onClick={() => handleTaxaClick(taxaItem)}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-blue-600 hover:text-blue-800">
                                            <em>{taxaItem.scientific_name}</em>
                                        </h3>
                                        {taxaItem.taxonomic_status && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[taxaItem.taxonomic_status] || 'bg-gray-100 text-gray-800'}`}>
                                                {taxaItem.taxonomic_status}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {taxaItem.common_name && (
                                        <p className="text-gray-600 text-sm mb-2">
                                            {taxaItem.common_name}
                                        </p>
                                    )}
                                    
                                    {taxaItem.author && (
                                        <p className="text-gray-500 text-xs">
                                            {taxaItem.author}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="text-center mt-6">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Belum ada data {rankLabels[selectedRank]}
                        </h3>
                        <p className="text-gray-500">
                            Coba pilih tingkat taksonomi yang berbeda atau gunakan pencarian.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxaBrowser;
