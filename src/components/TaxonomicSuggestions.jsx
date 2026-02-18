import React, { useState, useEffect, useRef, useCallback } from 'react';

const TaxonomicSuggestions = ({
    searchResults = [],
    onSuggestionClick,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    isLoadingMore = false,
    maxHeight = '200px',
    className = ''
}) => {
    const suggestionContainerRef = useRef(null);
    const getRankOrder = (rank) => {
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
            'kingdom': 23
        };
        return rankOrder[rank] || 0;
    };
    const groupSuggestionsHierarchically = (suggestions) => {
        if (!suggestions || suggestions.length === 0) return [];
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
            index === self.findIndex(s => s.scientific_name === suggestion.scientific_name)
        );
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
        const isDirectParent = (parentTaxon, childTaxon) => {
            const parent = getHierarchyKey(parentTaxon);
            const child = getHierarchyKey(childTaxon);
            const parentRank = getRankOrder(parentTaxon.rank);
            const childRank = getRankOrder(childTaxon.rank);
            if (parentRank <= childRank) return false;
            const hierarchyLevels = [
                'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'
            ];
            const parentLevelIndex = hierarchyLevels.findIndex(level => {
                const parentRankLower = parentTaxon.rank.toLowerCase();
                return parentRankLower === level || 
                       parentRankLower.includes(level) ||
                       (level === 'family' && (parentRankLower.includes('family') || parentRankLower === 'superfamily')) ||
                       (level === 'genus' && (parentRankLower.includes('genus') || parentRankLower === 'tribe' || parentRankLower === 'subtribe'));
            });
            
            const childLevelIndex = hierarchyLevels.findIndex(level => {
                const childRankLower = childTaxon.rank.toLowerCase();
                return childRankLower === level || 
                       childRankLower.includes(level) ||
                       (level === 'family' && (childRankLower.includes('family') || childRankLower === 'tribe' || childRankLower === 'subtribe')) ||
                       (level === 'genus' && (childRankLower.includes('genus') || childRankLower === 'species'));
            });
            for (let i = 0; i < hierarchyLevels.length; i++) {
                const level = hierarchyLevels[i];
                
                if (i <= parentLevelIndex) {
                    if (parent[level] && child[level] && parent[level] !== child[level]) {
                        return false;
                    }
                } else if (i === childLevelIndex) {
                    if (parent[level] && child[level] && parent[level] === child[level]) {
                        return false; // Ini berarti mereka di level yang sama
                    }
                }
            }
            
            return true;
        };
        const parentChildMap = new Map();
        const allTaxa = [...uniqueSuggestions];
        allTaxa.forEach(taxon => {
            parentChildMap.set(taxon.scientific_name, {
                taxon: taxon,
                children: [],
                hasParent: false
            });
        });
        allTaxa.forEach(potentialParent => {
            allTaxa.forEach(potentialChild => {
                if (potentialParent !== potentialChild && isDirectParent(potentialParent, potentialChild)) {
                    const parentEntry = parentChildMap.get(potentialParent.scientific_name);
                    const childEntry = parentChildMap.get(potentialChild.scientific_name);
                    
                    if (parentEntry && childEntry) {
                        parentEntry.children.push(potentialChild);
                        childEntry.hasParent = true;
                    }
                }
            });
        });
        parentChildMap.forEach(entry => {
            entry.children.sort((a, b) => {
                const aRank = getRankOrder(a.rank);
                const bRank = getRankOrder(b.rank);
                if (aRank !== bRank) return bRank - aRank; // Rank tertinggi dulu
                return (a.scientific_name || '').localeCompare(b.scientific_name || '');
            });
        });
        const rootNodes = Array.from(parentChildMap.values())
            .filter(entry => !entry.hasParent)
            .map(entry => entry.taxon)
            .sort((a, b) => {
                const aRank = getRankOrder(a.rank);
                const bRank = getRankOrder(b.rank);
                if (aRank !== bRank) return bRank - aRank;
                return (a.scientific_name || '').localeCompare(b.scientific_name || '');
            });
        const flattenHierarchy = (taxon, level = 0) => {
            const result = [];
            result.push({
                ...taxon,
                isParent: parentChildMap.get(taxon.scientific_name)?.children.length > 0,
                isChild: level > 0,
                hierarchyLevel: level
            });
            const children = parentChildMap.get(taxon.scientific_name)?.children || [];
            children.forEach(child => {
                result.push(...flattenHierarchy(child, level + 1));
            });
            
            return result;
        };
        const result = [];
        rootNodes.forEach(rootNode => {
            result.push(...flattenHierarchy(rootNode));
        });
        
        return result;
    };
    const handleScroll = useCallback((e) => {
        const element = e.target;
        const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
        
        if (scrollPosition < 30 && !isLoadingMore && hasMore && onLoadMore) {
            onLoadMore();
        }
    }, [isLoadingMore, hasMore, onLoadMore]);
    useEffect(() => {
        const container = suggestionContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);
    const renderTaxonSuggestions = () => {
        if (!searchResults || searchResults.length === 0) {
            return (
                <div className="p-4 text-center text-gray-400">
                    No suggestions found
                </div>
            );
        }

        const hierarchicalSuggestions = groupSuggestionsHierarchically(searchResults);
        
        return hierarchicalSuggestions.map((taxon, index) => {
            const isChild = taxon.isChild;
            const isParent = taxon.isParent;
            const hierarchyLevel = taxon.hierarchyLevel || 0;
            const bgClass = 'bg-transparent'; // Uniform background
            const hoverClass = 'hover:bg-[#3c3c3c]'; // Uniform hover
            const uniqueKey = taxon.full_data?.id || `hierarchical-${taxon.rank}-${taxon.scientific_name}-${index}`;
            let familyContext = '';
            if (taxon.full_data && !isChild) {
                const ranks = [];
                
                if (taxon.full_data.family) {
                    ranks.push(`Family: ${taxon.full_data.family}${taxon.full_data.cname_family ? ` (${taxon.full_data.cname_family})` : ''}`);
                }
                
                if (taxon.full_data.order) {
                    ranks.push(`Order: ${taxon.full_data.order}${taxon.full_data.cname_order ? ` (${taxon.full_data.cname_order})` : ''}`);
                }
                
                if (taxon.full_data.class) {
                    ranks.push(`Class: ${taxon.full_data.class}${taxon.full_data.cname_class ? ` (${taxon.full_data.cname_class})` : ''}`);
                }
                
                if (taxon.full_data.phylum) {
                    ranks.push(`Phylum: ${taxon.full_data.phylum}`);
                }
                
                if (taxon.full_data.kingdom) {
                    ranks.push(`Kingdom: ${taxon.full_data.kingdom}`);
                }
                
                familyContext = ranks.join(' | ');
            }
            const isSynonym = taxon.full_data?.taxonomic_status === 'SYNONYM';
            const acceptedName = taxon.full_data?.accepted_scientific_name;
            
            return (
                <div
                    key={uniqueKey}
                    onClick={() => onSuggestionClick && onSuggestionClick(taxon)}
                    className={`p-2 ${bgClass} ${hoverClass} cursor-pointer border-b border-[#444]`}
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''} text-[#e0e0e0] font-medium`}>
                        {taxon.scientific_name}
                        {taxon.common_name && <span className="not-italic"> | {taxon.common_name}</span>}
                        <span className="text-gray-400 text-sm not-italic"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                        {isSynonym && (
                            <span className="text-orange-400 text-xs not-italic ml-2">(Synonym)</span>
                        )}
                    </div>
                    
                    {isSynonym && acceptedName && (
                        <div className="text-sm text-blue-400 ml-2 mt-1">
                            → Accepted: <span className="italic">{acceptedName}</span>
                        </div>
                    )}
                    
                    {familyContext && (
                        <div className="text-sm text-gray-400 ml-2 mt-1">
                            {familyContext}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div 
            ref={suggestionContainerRef}
            className={`bg-[#2a2a2a] border border-[#444] rounded-md overflow-y-auto ${className}`}
            style={{ maxHeight }}
            onScroll={handleScroll}
        >
            {isLoading ? (
                <div className="p-4 text-center text-gray-400">
                    Loading suggestions...
                </div>
            ) : (
                <>
                    {renderTaxonSuggestions()}
                    {isLoadingMore && (
                        <div className="p-2 text-center text-gray-400 text-sm">
                            Loading more...
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TaxonomicSuggestions;
