const cleanScientificName = (name) => {
    if (!name) return '';
    return name.split(' ').filter(part => {
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};
const ITALIC_RANKS = ['species', 'subspecies', 'variety', 'form', 'subform'];

const TaxonomyInfo = ({ checklist }) => {
    const taxonomyLevels = [
        { key: 'family', label: 'Family' }
    ];

    const renderTaxonInfo = (key, label, value, commonName) => {
        const shouldItalicize = ITALIC_RANKS.includes(key);
        
        if (['genus', 'species'].includes(key) && checklist?.taxa_id) {
            return (
                <div key={key} className="text-xs sm:text-sm">
                    <span>{label}: </span>
                    <a 
                        href={`/${key}/${checklist.taxa_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#1a73e8] hover:underline transition-colors"
                    >
                        <span className={shouldItalicize ? 'italic' : ''}>
                            {cleanScientificName(value)}
                        </span>
                        {commonName && (
                            <span className="ml-1 sm:ml-2 not-italic text-gray-400">
                                ({commonName})
                            </span>
                        )}
                    </a>
                </div>
            );
        }

        return (
            <div key={key} className="text-xs sm:text-sm">
                <span>{label}: </span>
                <span 
                    className={`${shouldItalicize ? 'italic' : ''} cursor-help`}
                    title="Halaman taksonomi sedang dalam pengembangan"
                >
                    {cleanScientificName(value)}
                </span>
                {commonName && (
                    <span className="ml-1 sm:ml-2 not-italic text-gray-400">
                        ({commonName})
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            {taxonomyLevels.map(({ key, label }) => 
                checklist?.[key] && renderTaxonInfo(
                    key,
                    label,
                    checklist[key],
                    checklist[`cname_${key}`]
                )
            )}
        </>
    );
};

export default TaxonomyInfo; 