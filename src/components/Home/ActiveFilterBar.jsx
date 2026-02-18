import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faMapMarkerAlt, faTimes, faDna } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Komponen reusable untuk menampilkan filter aktif sebagai chip yang bisa dihapus satu per satu.
 * Desktop only — di mobile/tablet hidden (indicator ada di Header).
 *
 * Props:
 * - searchParams: { search, display, location, latitude, longitude, selectedId, species, searchType }
 * - filterParams: { grade, data_source, start_date, end_date, has_media, media_type, taxonomy_value, taxonomy_rank, taxonomy_from_category }
 * - onRemoveSearch: () => void
 * - onRemoveLocation: () => void
 * - onRemoveGrade: () => void
 * - onRemoveDate: () => void
 * - onRemoveMedia: () => void
 * - onRemoveTaxonomy: () => void
 * - onResetAll: () => void
 */
const ActiveFilterBar = ({
  searchParams = {},
  filterParams = {},
  onRemoveSearch,
  onRemoveLocation,
  onRemoveGrade,
  onRemoveDate,
  onRemoveMedia,
  onRemoveTaxonomy,
  onResetAll,
}) => {
  const hasActive = Boolean(
    searchParams.search ||
    searchParams.location ||
    searchParams.selectedId ||
    filterParams.start_date ||
    filterParams.end_date ||
    (filterParams.grade && filterParams.grade.length > 0) ||
    filterParams.has_media ||
    filterParams.media_type ||
    (filterParams.data_source && (filterParams.data_source.length !== 1 || !filterParams.data_source.includes('fobi')))
  );

  if (!hasActive) return null;

  return (
    <AnimatePresence>
      {hasActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="hidden lg:flex justify-center w-full mt-1 mb-1"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#121212]/95 backdrop-blur-sm rounded-full border border-[#333] shadow-lg overflow-x-auto scrollbar-hide max-w-[600px]">
            {/* Chip filter aktif */}
            <div className="flex items-center gap-1 flex-nowrap min-w-0 overflow-x-auto scrollbar-hide">
              {/* Search */}
              {searchParams.search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-[10px] text-blue-300 whitespace-nowrap flex-shrink-0">
                  <FontAwesomeIcon icon={faSearch} className="text-[8px]" />
                  <span className="max-w-[80px] truncate">{searchParams.display || searchParams.search}</span>
                  {onRemoveSearch && (
                    <button onClick={onRemoveSearch} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-blue-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}

              {/* Location */}
              {searchParams.location && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[10px] text-emerald-300 whitespace-nowrap flex-shrink-0">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[8px]" />
                  <span className="max-w-[80px] truncate">{searchParams.location}</span>
                  {onRemoveLocation && (
                    <button onClick={onRemoveLocation} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-emerald-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}

              {/* Data source (non-default) */}
              {filterParams.data_source && (filterParams.data_source.length !== 1 || !filterParams.data_source.includes('fobi')) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-[10px] text-purple-300 whitespace-nowrap flex-shrink-0">
                  {filterParams.data_source.map(s => s === 'fobi' ? 'Amaturalist' : s === 'burungnesia' ? 'Burungnesia' : 'Kupunesia').join('+')}
                </span>
              )}

              {/* Grade */}
              {filterParams.grade && filterParams.grade.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/20 border border-amber-500/30 text-[10px] text-amber-300 whitespace-nowrap flex-shrink-0">
                  {filterParams.grade.length} Kualitas
                  {onRemoveGrade && (
                    <button onClick={onRemoveGrade} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-amber-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}

              {/* Date */}
              {(filterParams.start_date || filterParams.end_date) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-600/20 border border-cyan-500/30 text-[10px] text-cyan-300 whitespace-nowrap flex-shrink-0">
                  Tanggal
                  {onRemoveDate && (
                    <button onClick={onRemoveDate} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-cyan-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}

              {/* Media */}
              {(filterParams.has_media || filterParams.media_type) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-600/20 border border-pink-500/30 text-[10px] text-pink-300 whitespace-nowrap flex-shrink-0">
                  {filterParams.media_type === 'photo' ? 'Foto' : filterParams.media_type === 'audio' ? 'Audio' : 'Media'}
                  {onRemoveMedia && (
                    <button onClick={onRemoveMedia} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-pink-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}

              {/* Taxonomy (dari kategori) */}
              {filterParams.taxonomy_value && filterParams.taxonomy_from_category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[10px] text-emerald-300 whitespace-nowrap flex-shrink-0">
                  <FontAwesomeIcon icon={faDna} className="text-[8px]" />
                  <span className="max-w-[80px] truncate">{filterParams.taxonomy_value}</span>
                  {onRemoveTaxonomy && (
                    <button onClick={onRemoveTaxonomy} className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none text-emerald-300 p-0">
                      <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Tombol reset semua */}
            {onResetAll && (
              <button
                onClick={onResetAll}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer bg-transparent border-none whitespace-nowrap"
                title="Reset semua filter"
              >
                <FontAwesomeIcon icon={faTimes} className="text-[9px] mr-1" />
                Reset
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Helper: cek apakah ada filter aktif berdasarkan searchParams dan filterParams.
 * Bisa dipakai di komponen mana saja tanpa duplikasi logika.
 */
export const checkHasActiveFilters = (searchParams = {}, filterParams = {}) => {
  return Boolean(
    searchParams.search ||
    searchParams.location ||
    searchParams.selectedId ||
    filterParams.start_date ||
    filterParams.end_date ||
    (filterParams.grade && filterParams.grade.length > 0) ||
    filterParams.has_media ||
    filterParams.media_type ||
    (filterParams.data_source && (filterParams.data_source.length !== 1 || !filterParams.data_source.includes('fobi')))
  );
};

export default ActiveFilterBar;
