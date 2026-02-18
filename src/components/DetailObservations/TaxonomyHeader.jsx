const cleanScientificName = (name) => {
    if (!name) return '';
    return name.split(' ').filter(part => {
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};
const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'https://api.amaturalist.com/api';
};
const ITALIC_RANKS = ['species', 'subspecies', 'variety', 'form', 'subform'];

const TaxonomyHeader = ({ checklist }) => {
    const getCommonName = (level) => {
        const commonNameField = `cname_${level}`;
        return checklist?.[commonNameField];
    };

    const createTaxaLink = (level, name, id) => {
        if (!name) return null;
        const commonName = getCommonName(level);
        const shouldItalicize = ITALIC_RANKS.includes(level);
        const handleTaxaClick = async (e) => {
            e.preventDefault();
            
            try {
                if (id) {
                    window.open(`/taxa/${level}/${id}`, '_blank');
                    return;
                }
                const apiUrl = getApiBaseUrl();
                const response = await fetch(`${apiUrl}/taxa/${level}/search?q=${encodeURIComponent(name)}&limit=1`);
                const result = await response.json();
                
                if (result.success && result.data.length > 0) {
                    const taxaId = result.data[0].id || result.data[0].taxa_id;
                    window.open(`/taxa/${level}/${taxaId}`, '_blank');
                } else {
                    console.warn(`Taxa not found for ${level}: ${name}`);
                    alert(`Taxa "${name}" tidak ditemukan dalam database.`);
                }
            } catch (error) {
                console.error('Error navigating to taxa:', error);
                alert('Gagal mencari taxa. Silakan coba lagi.');
            }
        };
        
        return (
            <a 
                href="#" 
                onClick={handleTaxaClick}
                className="hover:text-[#1a73e8] hover:underline transition-colors cursor-pointer text-base sm:text-lg md:text-xl lg:text-2xl"
                title={`Lihat detail ${level}: ${name}`}
            >
                <span className={shouldItalicize ? 'italic' : ''}>
                    {cleanScientificName(name)}
                </span>
                {commonName && (
                    <span className="text-gray-300 text-xs sm:text-sm md:text-base ml-1 sm:ml-2 not-italic font-normal">
                        ({commonName})
                    </span>
                )}
            </a>
        );
    };
    const getBestTaxonomyLevel = () => {
        const taxonomyLevels = [
            'subform',
            'form',
            'variety',
            'subspecies',
            'species',
            'subgenus',
            'genus',
            'subtribe',
            'tribe',
            'supertribe',
            'subfamily',
            'family',
            'superfamily',
            'infraorder',
            'suborder',
            'order',
            'superorder',
            'infraclass',
            'subclass',
            'class',
            'superclass',
            'subdivision',
            'division',
            'superdivision',
            'subphylum',
            'phylum',
            'superphylum',
            'subkingdom',
            'kingdom',
            'superkingdom',
            'domain'
        ];
        if (!checklist?.phylum && checklist?.division) {
            return {
                level: 'phylum',
                name: checklist.division,
                id: null
            };
        }
        for (const level of taxonomyLevels) {
            if (checklist?.[level]) {
                const isFirstLevel = taxonomyLevels.findIndex(l => checklist?.[l]) === taxonomyLevels.indexOf(level);
                return {
                    level,
                    name: checklist[level],
                    id: isFirstLevel ? checklist?.taxa_id : null
                };
            }
        }

        return null;
    };

    const bestTaxonomy = getBestTaxonomyLevel();
    
    if (bestTaxonomy) {
        return createTaxaLink(bestTaxonomy.level, bestTaxonomy.name, bestTaxonomy.id);
    }

    return <span className="text-gray-400 text-base sm:text-lg">Belum teridentifikasi</span>;
};

export default TaxonomyHeader;