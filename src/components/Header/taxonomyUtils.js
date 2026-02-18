export const getRankOrder = (rank) => {
  const rankOrder = {
    'form': 1,
    'variety': 2,
    'subspecies': 3,
    'species': 4,
    'subgenus': 5,
    'genus': 6,
    'subtribe': 7,
    'tribe': 8,
    'supertribe': 9,
    'subfamily': 10,
    'family': 11,
    'superfamily': 12,
    'infraorder': 13,
    'suborder': 14,
    'order': 15,
    'superorder': 16,
    'infraclass': 17,
    'subclass': 18,
    'class': 19,
    'superclass': 20,
    'subphylum': 21,
    'phylum': 22,
    'superphylum': 23,
    'subkingdom': 24,
    'kingdom': 25,
    'superkingdom': 26,
    'domain': 27
  };
  return rankOrder[rank] || 99;
};

export const getTaxonomicLevel = (item) => {
  const ranks = [
    'domain',
    'superkingdom',
    'kingdom', 'subkingdom',
    'superphylum', 'phylum', 'subphylum',
    'superclass', 'class', 'subclass', 'infraclass',
    'superorder', 'order', 'suborder', 'infraorder',
    'superfamily', 'family', 'subfamily',
    'supertribe', 'tribe', 'subtribe',
    'genus', 'subgenus',
    'species', 'subspecies', 'variety', 'form'
  ];

  for (const rank of ranks) {
    if (item[rank]) {
      return rank;
    }
  }
  return 'species';
};

export const getTaxonomicRankOrder = () => {
  const ranks = [
    'domain',
    'superkingdom',
    'kingdom', 'subkingdom',
    'superphylum', 'phylum', 'subphylum',
    'superclass', 'class', 'subclass', 'infraclass',
    'superorder', 'order', 'suborder', 'infraorder',
    'superfamily', 'family', 'subfamily',
    'supertribe', 'tribe', 'subtribe',
    'genus', 'subgenus',
    'species', 'subspecies', 'variety', 'form'
  ];
  return ranks.reduce((acc, rank, index) => {
    acc[rank] = index;
    return acc;
  }, {});
};

export const groupSuggestionsHierarchically = (suggestions) => {
  const getHierarchyKey = (taxon) => {
    const data = taxon.full_data || {};
    return {
      kingdom: data.kingdom || '',
      phylum: data.phylum || '',
      class: data.class || '',
      order: data.order || '',
      family: data.family || '',
      genus: data.genus || '',
      species: data.species || ''
    };
  };
  
  const isSpecialRankParent = (parentTaxon, childTaxon, parent, child) => {
    const parentRank = parentTaxon.rank;
    const childRank = childTaxon.rank;
    if (parentRank === 'species' && ['subspecies', 'variety', 'form'].includes(childRank)) {
      return parent.genus === child.genus && parent.species === child.species;
    }
    if (parentRank === 'genus' && ['species', 'subspecies', 'variety', 'form'].includes(childRank)) {
      return parent.genus === child.genus;
    }
    
    return false;
  };
  
  const isParentOf = (parentTaxon, childTaxon) => {
    const parent = getHierarchyKey(parentTaxon);
    const child = getHierarchyKey(childTaxon);
    const parentRank = getRankOrder(parentTaxon.rank);
    const childRank = getRankOrder(childTaxon.rank);
    if (parentRank <= childRank) return false;
    const hierarchyLevels = [
      { rank: 'kingdom', field: 'kingdom' },
      { rank: 'phylum', field: 'phylum' },
      { rank: 'class', field: 'class' },
      { rank: 'order', field: 'order' },
      { rank: 'family', field: 'family' },
      { rank: 'genus', field: 'genus' },
      { rank: 'species', field: 'species' }
    ];
    const parentLevel = hierarchyLevels.findIndex(level => level.rank === parentTaxon.rank);
    const childLevel = hierarchyLevels.findIndex(level => level.rank === childTaxon.rank);
    
    if (parentLevel === -1 || childLevel === -1) {
      return isSpecialRankParent(parentTaxon, childTaxon, parent, child);
    }
    if (parentLevel >= childLevel) return false;
    for (let i = 0; i <= parentLevel; i++) {
      const field = hierarchyLevels[i].field;
      if (parent[field] && child[field]) {
        if (parent[field] !== child[field]) return false;
      } else if (parent[field] && !child[field]) {
        return false;
      }
    }
    const parentField = hierarchyLevels[parentLevel].field;
    if (parent[parentField] && child[parentField]) {
      return parent[parentField] === child[parentField];
    }
    
    return false;
  };
  
  const hierarchyNodes = suggestions.map(suggestion => ({
    ...suggestion,
    children: [],
    isProcessed: false
  }));
  
  hierarchyNodes.forEach(node => {
    hierarchyNodes.forEach(potentialChild => {
      if (node !== potentialChild && isParentOf(node, potentialChild)) {
        const isDirectParent = !hierarchyNodes.some(intermediate => 
          intermediate !== node && 
          intermediate !== potentialChild &&
          isParentOf(node, intermediate) && 
          isParentOf(intermediate, potentialChild)
        );
        
        if (isDirectParent) {
          node.children.push(potentialChild);
          potentialChild.isProcessed = true;
        }
      }
    });
  });
  
  hierarchyNodes.forEach(node => {
    node.children.sort((a, b) => {
      const aRank = getRankOrder(a.rank);
      const bRank = getRankOrder(b.rank);
      if (aRank !== bRank) return bRank - aRank;
      return (a.scientific_name || '').localeCompare(b.scientific_name || '');
    });
  });
  
  const rootNodes = hierarchyNodes.filter(node => !node.isProcessed);
  rootNodes.sort((a, b) => {
    const aRank = getRankOrder(a.rank);
    const bRank = getRankOrder(b.rank);
    if (aRank !== bRank) return bRank - aRank;
    return (a.scientific_name || '').localeCompare(b.scientific_name || '');
  });
  
  const flattenHierarchy = (nodes, level = 0) => {
    const result = [];
    nodes.forEach(node => {
      result.push({
        ...node,
        isParent: node.children.length > 0,
        isChild: level > 0,
        hierarchyLevel: level
      });
      
      if (node.children.length > 0) {
        result.push(...flattenHierarchy(node.children, level + 1));
      }
    });
    return result;
  };
  
  return flattenHierarchy(rootNodes);
};

export const groupSuggestionsByHierarchy = (suggestions) => {
  const grouped = {
    families: [],
    taxa: {}
  };

  if (!Array.isArray(suggestions) || suggestions.length === 0) return grouped;

  suggestions.forEach((s) => {
    const rank = (s.rank || s.full_data?.taxon_rank || '').toLowerCase();
    const full = s.full_data || {};

    const famName = s.scientific_name || full.family;
    const famCommon = s.common_name || full.cname_family;
    if (rank === 'family' || full.family) {
      if (famName && !grouped.families.some(f => f.scientific_name === famName)) {
        grouped.families.push({
          id: s.id || full.id,
          rank: 'family',
          scientific_name: famName,
          common_name: famCommon,
          full_data: full
        });
      }
    }

    const genus = full.genus || s.genus;
    const species = full.species || s.species || (rank === 'species' ? (s.scientific_name || '') : undefined);

    if (genus) {
      if (!grouped.taxa[genus]) {
        grouped.taxa[genus] = {
          id: full.id || s.id,
          genus: genus,
          cname_genus: full.cname_genus,
          species: {}
        };
      }

      if (species) {
        if (!grouped.taxa[genus].species[species]) {
          grouped.taxa[genus].species[species] = {
            data: Object.keys(full).length ? full : s,
            subspecies: []
          };
        }
      }

      if (rank === 'subspecies') {
        const spKey = species || full.species || s.species || 'unknown';
        if (!grouped.taxa[genus].species[spKey]) {
          grouped.taxa[genus].species[spKey] = {
            data: Object.keys(full).length ? full : s,
            subspecies: []
          };
        }
        grouped.taxa[genus].species[spKey].subspecies.push(s);
      }
    }
  });

  return grouped;
};

export const formatDisplayName = (item, getTaxonomicLevelFn) => {
  const rank = item.rank || getTaxonomicLevelFn(item);
  const scientificName = item[rank] || item.scientific_name;
  const commonName = item[`cname_${rank}`] || item.common_name;

  let displayName = scientificName;
  if (commonName) {
    displayName += ` (${commonName})`;
  }

  if ((rank === 'genus' || rank === 'species') && item.family) {
    displayName += ` | Family: ${item.family}`;
  }
  return displayName;
};
