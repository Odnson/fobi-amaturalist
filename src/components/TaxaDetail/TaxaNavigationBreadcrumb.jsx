import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';

const TaxaNavigationBreadcrumb = ({ taxonomyTree, currentRank, currentName }) => {
    const navigate = useNavigate();
    const rankLabels = {
        domain: 'Domain',
        superkingdom: 'Superkingdom',
        kingdom: 'Kingdom',
        subkingdom: 'Subkingdom',
        superphylum: 'Superphylum',
        phylum: 'Phylum',
        subphylum: 'Subphylum',
        superclass: 'Superclass',
        class: 'Class',
        subclass: 'Subclass',
        infraclass: 'Infraclass',
        magnorder: 'Magnorder',
        superorder: 'Superorder',
        order: 'Order',
        suborder: 'Suborder',
        infraorder: 'Infraorder',
        parvorder: 'Parvorder',
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
        form: 'Form',
        subform: 'Subform'
    };

    const handleNavigation = (rank, taxaId) => {
        if (taxaId) {
            navigate(`/taxa/${rank}/${taxaId}`);
        }
    };

    if (!taxonomyTree || taxonomyTree.length === 0) {
        return null;
    }
    const createCompactBreadcrumb = () => {
        const allTaxa = taxonomyTree;
        if (allTaxa.length > 6) {
            const start = allTaxa.slice(0, 2);
            const end = allTaxa.slice(-3);
            return [...start, { isEllipsis: true }, ...end];
        }
        
        return allTaxa;
    };

    const compactTree = createCompactBreadcrumb();

    return (
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4 overflow-x-auto">
            <Link 
                to="/" 
                className="hover:text-blue-600 transition-colors whitespace-nowrap flex items-center space-x-1"
            >
                <Home sx={{ fontSize: 16 }} />
                <span>Beranda</span>
            </Link>
            
            {/* Hide /Taksonomi for now - for future development */}
            {/* <span className="text-gray-400">/</span>
            <Link 
                to="/taxonomy" 
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
            >
                Taksonomi
            </Link> */}

            {compactTree.map((item, index) => (
                <React.Fragment key={index}>
                    <span className="text-gray-400">/</span>
                    
                    {item.isEllipsis ? (
                        <span className="text-gray-400 px-1">...</span>
                    ) : item.taxa_id && !item.is_current ? (
                        <button
                            onClick={() => handleNavigation(item.rank, item.taxa_id)}
                            className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none p-0 underline-offset-2 hover:underline whitespace-nowrap"
                        >
                            <span className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">
                                    {rankLabels[item.rank]}:
                                </span>
                                <span className={`${['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'subform'].includes(item.rank) ? 'italic' : ''}`}>
                                    {item.name}
                                </span>
                            </span>
                        </button>
                    ) : (
                        <span className={`whitespace-nowrap ${item.is_current ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                            <span className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">
                                    {rankLabels[item.rank]}:
                                </span>
                                <span className={`${['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'subform'].includes(item.rank) ? 'italic' : ''}`}>
                                    {item.name}
                                </span>
                            </span>
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default TaxaNavigationBreadcrumb;
