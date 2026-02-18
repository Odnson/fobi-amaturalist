import { useState, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';

export const useSidebar = () => {
  const [sidebarData, setSidebarData] = useState({
    isOpen: false,
    selectedGrid: null,
    species: [],
    allSpecies: [],
    currentPage: 1,
    loading: false,
    checklist: null,
    error: null
  });
  
  // Tambahkan ref untuk menyimpan ID checklist yang sedang aktif
  const activeChecklistRef = useRef(null);
  const allSpeciesRef = useRef([]);

  const toggleSidebar = useCallback(async (gridItem = null) => {
    if (!gridItem) {
      setSidebarData(prev => ({ 
        ...prev, 
        isOpen: false, 
        species: [],
        allSpecies: [],
        checklist: null,
        selectedGrid: null,
        error: null
      }));
      activeChecklistRef.current = null;
      allSpeciesRef.current = [];
      return;
    }
    
    // Jika sidebar sudah terbuka dengan grid yang sama, tutup saja
    if (sidebarData.isOpen && sidebarData.selectedGrid?.id === gridItem.id) {
      setSidebarData(prev => ({ ...prev, isOpen: false }));
      return;
    }
    
    // Buka sidebar dengan data baru
    setSidebarData(prev => ({ 
      ...prev, 
      isOpen: true, 
      selectedGrid: gridItem,
      loading: true,
      currentPage: 1,
      error: null
    }));
    
    activeChecklistRef.current = gridItem.id;
    
    try {
      // Siapkan data untuk request
      const checklistIds = gridItem.data?.map(item => {
        const id = String(item.id || '');
        // Perbaikan format ID untuk FOBI
        if (item.source?.includes('fobi')) {
          if (item.source.includes('burungnesia')) return `fobi_b_${id}`;
          if (item.source.includes('kupunesia')) return `fobi_k_${id}`;
          return `fobi_t_${id}`;
        }
        if (item.source?.includes('burungnesia')) return `brn_${id}`;
        if (item.source?.includes('kupunesia')) return `kpn_${id}`;
        return id;
      }).filter(Boolean) || [];
      
      // Gunakan data dari checklist pertama untuk tampilan awal
      let speciesData = [];
      let checklistData = null;
      
      // Tentukan endpoint berdasarkan sumber data checklist pertama
      let endpoint = '';
      if (gridItem.data && gridItem.data.length > 0) {
        const firstItem = gridItem.data[0];
        const id = firstItem.id || '';
        
        // Perbaikan format endpoint untuk FOBI
        if (firstItem.source?.includes('fobi')) {
          const sourceType = firstItem.source.includes('burungnesia') ? 'burungnesia_fobi' : 
                            firstItem.source.includes('kupunesia') ? 'kupunesia_fobi' : 'taxa_fobi';
          
          const fobiId = firstItem.source.includes('burungnesia') ? `fobi_b_${id}` : 
                        firstItem.source.includes('kupunesia') ? `fobi_k_${id}` : `fobi_t_${id}`;
          
          endpoint = `/fobi-species/${fobiId}/${sourceType}`;
        } else if (firstItem.source?.includes('burungnesia')) {
          endpoint = `/grid-species/brn_${id}`;
        } else if (firstItem.source?.includes('kupunesia')) {
          endpoint = `/grid-species/kpn_${id}`;
        }
      }
      
      // Hitung grid ID dari bounds untuk fetch getGridData
      const gridId = gridItem.bounds ? `${gridItem.bounds[0][0]}_${gridItem.bounds[0][1]}` : null;
      
      // Fetch data untuk checklist pertama, stats, dan grid data (untuk location) secara parallel
      const [speciesResponse, statsResponse, gridDataResponse] = await Promise.all([
        endpoint ? apiFetch(endpoint) : Promise.resolve({ json: () => ({ species: [] }) }),
        apiFetch('/grid-species-count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ checklistIds })
        }),
        gridId ? apiFetch(`/grid-data/${gridId}`) : Promise.resolve({ json: () => ({ status: 'error' }) })
      ]);
      
      const [responseData, statsData, gridDataResult] = await Promise.all([
        speciesResponse.json(),
        statsResponse.json(),
        gridDataResponse.json()
      ]);
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Merge location dan data lainnya dari getGridData ke selectedGrid.data
      if (gridDataResult.status === 'success' && gridDataResult.data) {
        // Buat map: raw ID -> data dari getGridData
        // getGridData mengembalikan id dengan prefix (brn_123, kpn_123, fob_123, fobt_123)
        const gridDataMap = {};
        gridDataResult.data.forEach(gd => {
          // Simpan by raw ID (tanpa prefix)
          const rawId = String(gd.id).replace(/^(brn_|kpn_|fob_|fobt_)/, '');
          gridDataMap[rawId] = gd;
          // Simpan juga by full prefixed ID
          gridDataMap[String(gd.id)] = gd;
        });
        
        // Merge location ke gridItem.data
        // gridWorker menyimpan item.id sebagai raw ID, item.source sebagai source
        if (gridItem.data) {
          gridItem.data = gridItem.data.map(item => {
            const rawId = String(item.id);
            // Coba match langsung by raw ID
            let matched = gridDataMap[rawId];
            // Jika tidak ketemu, coba build prefixed ID dari source
            if (!matched) {
              let prefixedId = rawId;
              if (item.source?.includes('burungnesia')) prefixedId = `brn_${rawId}`;
              else if (item.source?.includes('kupunesia')) prefixedId = `kpn_${rawId}`;
              else if (item.source?.includes('fobi')) prefixedId = `fob_${rawId}`;
              matched = gridDataMap[prefixedId];
            }
            if (matched) {
              return {
                ...item,
                location: matched.location || item.location,
                observer: matched.observer || item.observer,
                species: matched.species || item.species,
                local_name: matched.local_name || item.local_name
              };
            }
            return item;
          });
          
          // Update selectedGrid dengan data yang sudah di-merge
          setSidebarData(prev => ({
            ...prev,
            selectedGrid: { ...prev.selectedGrid, data: gridItem.data }
          }));
        }
      }
      
      // Pastikan species data adalah array
      speciesData = Array.isArray(responseData.species) ? responseData.species : [];
      checklistData = responseData.checklist || null;
      
      // Simpan semua spesies untuk referensi
      allSpeciesRef.current = speciesData;
      
      setSidebarData(prev => ({ 
        ...prev, 
        species: speciesData,
        allSpecies: speciesData,
        loading: false,
        checklist: checklistData,
        totalUniqueSpecies: statsData.totalSpecies || speciesData.length
      }));
      
    } catch (error) {
      console.error('Error fetching species data:', error);
      
      // Fallback ke data yang tersedia di grid item
      if (gridItem.data) {
        const fallbackSpecies = gridItem.data?.map(item => ({
          nameLat: item.species_name_latin || item.nameLat,
          nameId: item.species_name_local || item.nameId,
          count: item.count || 1,
          id: item.species_id || item.id
        })) || [];
        
        setSidebarData(prev => ({ 
          ...prev, 
          species: fallbackSpecies,
          allSpecies: fallbackSpecies,
          loading: false,
          error: error.message,
          checklist: gridItem,
          selectedGrid: gridItem,
          totalUniqueSpecies: fallbackSpecies.length
        }));
      }
    }
  }, [sidebarData.isOpen, sidebarData.selectedGrid]);

  const loadMore = useCallback(() => {
    setSidebarData(prev => {
      // Hitung total halaman berdasarkan jumlah data
      const totalItems = prev.selectedGrid?.data?.length || 0;
      const totalPages = Math.ceil(totalItems / 10); // 10 items per page (2 kolom x 5 baris)
      
      // Cek apakah masih ada data yang bisa dimuat
      if (prev.currentPage < totalPages) {
        return {
          ...prev,
          currentPage: prev.currentPage + 1
        };
      }
      return prev;
    });
  }, []);

  // Tambahkan helper untuk cek apakah masih ada data
  const hasMore = useCallback(() => {
    const totalItems = sidebarData.selectedGrid?.data?.length || 0;
    const currentlyLoaded = sidebarData.currentPage * 10;
    return currentlyLoaded < totalItems;
  }, [sidebarData.selectedGrid?.data?.length, sidebarData.currentPage]);

  return {
    sidebarData,
    toggleSidebar,
    loadMore,
    hasMore
  };
};