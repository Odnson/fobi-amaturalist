import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faPlay, faPause, faUsers, faSort, faSortUp, faSortDown, faUser, faCalendar, faDna } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import './GridView.css';
import { useNavigate, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import defaultBirdLogo from '../../assets/icon/icon.png';
import defaultButterflyLogo from '../../assets/icon/kupnes.png';
import defaultFobiLogo from '../../assets/icon/FOBI.png';
import { debounce } from 'lodash';
import Footer from '../Footer';
const getStatsFromLocalStorage = () => {
  try {
    const savedStats = localStorage.getItem('currentStats');
    if (savedStats) {
      return JSON.parse(savedStats);
    }
  } catch (error) {
    console.error('Error reading stats from localStorage:', error);
  }
  return {
    observasi: 0,
    taksa: 0,
    media: 0,
  };
};

const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        const duration = audioRef.current.duration;
        const currentTime = audioRef.current.currentTime;
        const progress = (currentTime / duration) * 100;
        setProgress(progress);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden">
        <img
          src={spectrogramUrl}
          alt="Spectrogram"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {audioUrl && (
          <>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
              <div
                className="h-full bg-emerald-500 transition-width duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon
                icon={isPlaying ? faPause : faPlay}
                className="text-xs"
              />
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              preload="metadata"
            />
          </>
        )}
      </div>
    </div>
  );
};
const getDefaultImage = (type) => {
  switch(type) {
    case 'bird':
      return defaultBirdLogo;
    case 'butterfly':
      return defaultButterflyLogo;
    default:
      return defaultFobiLogo;
  }
};
const defaultIcons = [defaultBirdLogo, defaultButterflyLogo, defaultFobiLogo];
const isDefaultIcon = (url) => {
  if (!url) return true;
  return defaultIcons.some(icon => url === icon);
};
const getImageUrl = (item) => {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
    if (imageUrl) return imageUrl;
  }
  return getDefaultImage(item.type);
};

const MediaSlider = ({ images, spectrogram, audioUrl, type, isEager }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDefaultImg, setIsDefaultImg] = useState(false);
  const mediaItems = [];
  let hasRealImages = false;
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach(img => {
      let imageUrl;
      if (typeof img === 'string') {
        imageUrl = img;
      } else if (img && typeof img === 'object') {
        imageUrl = img.url;
      }
      
      if (imageUrl) {
        mediaItems.push({ type: 'image', url: imageUrl, isDefault: false });
        hasRealImages = true;
      }
    });
  }
  if (spectrogram) {
    mediaItems.push({ type: 'spectrogram', url: spectrogram, audioUrl, isDefault: false });
  }
  if (mediaItems.length === 0) {
    mediaItems.push({ 
      type: 'image', 
      url: getDefaultImage(type),
      isDefault: true
    });
  }

  const safeActiveIndex = Math.min(activeIndex, mediaItems.length - 1);
  const currentItem = mediaItems[safeActiveIndex];
  const showAsIcon = currentItem?.isDefault || isDefaultImg;

  return (
    <div className="relative w-full h-full">
      <div className={`w-full h-full overflow-hidden ${showAsIcon ? 'bg-[#1a1a1a] flex items-center justify-center' : 'bg-[#2c2c2c]'}`}>
        {currentItem?.type === 'spectrogram' ? (
          <SpectrogramPlayer
            spectrogramUrl={currentItem.url}
            audioUrl={currentItem.audioUrl}
          />
        ) : (
          <img
            src={currentItem?.url}
            alt=""
            className={`${showAsIcon ? 'w-16 h-16 object-contain opacity-40' : 'w-full h-full object-cover'}`}
            loading={isEager ? "eager" : "lazy"}
            onError={(e) => {
              e.target.src = getDefaultImage(type);
              setIsDefaultImg(true);
            }}
          />
        )}
      </div>

      {mediaItems.length > 1 && hasRealImages && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          <div className="flex gap-1 px-2 py-1 rounded-full bg-black/30">
            {mediaItems.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === safeActiveIndex ? 'bg-white' : 'bg-gray-400 hover:bg-gray-300'
                }`}
                onClick={() => setActiveIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const getGradeDisplay = (grade, type) => {
  if (grade.toLowerCase() === 'research grade') return 'ID Lengkap';
  if (grade.toLowerCase() === 'confirmed id') return 'ID Terkonfirmasi';
  if (grade.toLowerCase() === 'needs id') return 'Bantu Iden';
  if (grade.toLowerCase() === 'low quality id') return 'ID Kurang';
  switch(type) {
    case 'bird':
      return 'Checklist';
    case 'butterfly':
      return 'Checklist';
    default:
      return 'Checklist';
  }
};

const Card = ({ item, isEager }) => {
  const handleClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    if (source === 'general') {
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };
  const getTotalCount = () => {
    if (item.type === 'general') {
      return {
        count: item.fobi_count || 0,
        label: 'Amaturalist',
        color: 'text-green-700'
      };
    }
    else if (item.type === 'bird') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'Amaturalist',
          color: 'text-green-700'
        },
        {
          count: item.burungnesia_count || 0,
          label: 'Burungnesia',
          color: 'text-blue-700'
        }
      ];
    }
    else if (item.type === 'butterfly') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'Amaturalist',
          color: 'text-green-700'
        },
        {
          count: item.kupunesia_count || 0,
          label: 'Kupunesia',
          color: 'text-purple-700'
        }
      ];
    }
    return null;
  };

  const getTaxonomyTitle = () => {
    if (!item.taxonomyLevel) return '';
    return `${item.taxonomyLevel.charAt(0).toUpperCase() + item.taxonomyLevel.slice(1)}: ${item.title}`;
  };

  const totalCount = getTotalCount();
  const imagesCount = item.images && Array.isArray(item.images) ? item.images.length : 0;
  const isChecklist = item.type === 'bird' || item.type === 'butterfly';

  return (
    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] hover:border-[#444] transition-all duration-200 cursor-pointer group hover:shadow-lg hover:scale-[1.02] hover:bg-[#252525]">
      {/* Image / Spectrogram */}
      <div className="relative h-40 bg-[#2c2c2c]">
        <MediaSlider
          images={item.images || [item.image]}
          spectrogram={item.spectrogram}
          audioUrl={item.audioUrl}
          type={item.type}
          isEager={isEager}
        />
        
        {/* Images count badge */}
        {imagesCount > 1 && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <FontAwesomeIcon icon={faImage} className="text-xs" />
            <span>{imagesCount}</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3 flex flex-col h-32" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between mb-1 flex-shrink-0">
          <div className="text-xs text-gray-400 truncate">
            <Link 
              to={`/profile/${item.observer_id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-400 transition-colors"
            >
              {item.observer}
            </Link>
          </div>
          {/* Grade Badge */}
          <span className={`px-2 py-0.5 rounded-full text-xs text-white ${
            item.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-700/70' :
            item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-700/70' :
            item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-700/70' :
            item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-700/70' :
            'bg-gray-700/70'
          }`}>
            {getGradeDisplay(item.quality.grade, item.type)}
          </span>
        </div>
        <div className="mb-1">
          {isChecklist ? (
            <>
              {/* Checklist (Burungnesia/Kupunesia): title=lokasi, subtitle=species italic */}
              <h3 className="font-medium text-white text-sm truncate" title={item.location_name || item.location}>
                {item.location_name || item.location || 'Lokasi tidak tersedia'}
              </h3>
              {item.nameLat && (
                <p className="text-xs text-gray-300 truncate italic" title={item.nameLat}>
                  {item.nameLat}
                </p>
              )}
              {item.species_count > 1 && (
                <p className="text-[10px] text-blue-400">+{item.species_count - 1} jenis lain</p>
              )}
            </>
          ) : (
            /* Amaturalist (FOBi): sistem dinamis nama taksonomi */
            (() => {
              const commonNameField = `cname_${item.taxonomyLevel}`;
              const latinNameField = item.taxonomyLevel;
              const commonName = item[commonNameField];
              const latinName = item[latinNameField];
              
              if (commonName && latinName && commonName !== latinName) {
                return (
                  <>
                    <h3 
                      className={`font-medium text-white text-sm truncate ${item.taxonomyLevel ? 'cursor-help' : ''}`}
                      title={getTaxonomyTitle()}
                    >
                      {commonName}
                    </h3>
                    <div 
                      className={`text-xs text-gray-300 truncate ${['species', 'subspecies', 'form', 'variety'].includes(item.taxonomyLevel?.toLowerCase()) ? 'italic' : ''}`}
                      title={`${item.taxonomyLevel}: ${latinName}`}
                    >
                      {latinName}
                    </div>
                  </>
                );
              }
              
              const displayName = commonName || latinName || item.title || '-';
              const isLatinOnly = !commonName && latinName;
              
              return (
                <h3 
                  className={`font-medium text-white text-sm truncate ${isLatinOnly && ['species', 'subspecies', 'form', 'variety'].includes(item.taxonomyLevel?.toLowerCase()) ? 'italic' : ''} ${item.taxonomyLevel ? 'cursor-help' : ''}`}
                  title={getTaxonomyTitle()}
                >
                  {displayName}
                </h3>
              );
            })()
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <FontAwesomeIcon icon={faCalendar} className="text-[10px]" />
            <span className="truncate">
              {item.observation_date 
                ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short'
                  })
                : '-'
              }
            </span>
          </div>
          {!isChecklist && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
              <span className="truncate">{item.location || '-'}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="footer-tooltip px-3 py-1 bg-[#161616] border-t border-[#333] h-10 flex items-center hover:bg-[#1a1a1a] transition-colors" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between w-full">
          {isChecklist ? (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <FontAwesomeIcon icon={faDna} className="text-[10px]" />
              <span>{item.species_count || 0} Jenis</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
              <span>{item.identifications_count || 0} Identifikasi</span>
            </div>
          )}
          
          {totalCount && (Array.isArray(totalCount) ? (
            <div className="relative">
              <div className="flex items-center gap-1 text-xs cursor-help">
                {totalCount.map((count, idx) => (
                  <div key={idx} className={`${count.color} font-medium`}>
                    {count.count}
                  </div>
                ))}
              </div>
              
              {/* Tooltip untuk desktop - akan muncul saat hover footer */}
              <div className="footer-tooltip-content absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-30 min-w-[150px] whitespace-nowrap opacity-0 invisible transition-all duration-200">
                <div className="font-medium mb-1 border-b border-gray-600 pb-1">Total Checklist:</div>
                {totalCount.map((count, idx) => (
                  <div key={idx} className="flex justify-between items-center py-0.5">
                    <span>{count.label}:</span>
                    <span className={`${count.color} font-medium`}>{count.count}</span>
                  </div>
                ))}
                <div className="absolute bottom-[-6px] right-2 w-3 h-3 bg-gray-800 transform rotate-45"></div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className={`text-xs ${totalCount.color} font-medium cursor-help`}>
                {totalCount.count}
              </div>
              
              {/* Tooltip untuk desktop - akan muncul saat hover footer */}
              <div className="footer-tooltip-content absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-30 min-w-[150px] whitespace-nowrap opacity-0 invisible transition-all duration-200">
                <div className="font-medium mb-1 border-b border-gray-600 pb-1">Total Checklist:</div>
                <div className="flex justify-between items-center py-0.5">
                  <span>{totalCount.label}:</span>
                  <span className={`${totalCount.color} font-medium`}>{totalCount.count}</span>
                </div>
                <div className="absolute bottom-[-6px] right-2 w-3 h-3 bg-gray-800 transform rotate-45"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const defaultFilterParams = {
  start_date: '',
  end_date: '',
  date_type: 'created_at',
  grade: [],
  has_media: false,
  media_type: '',
  radius: 10,
  data_source: ['fobi'], // Default hanya FOBi/Amaturalist
  user_id: null,
  user_name: '',
  taxonomy_rank: '',
  taxonomy_value: ''
};
const extractScientificName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    const scientificNameParts = parts.filter(part => {
        if (part.includes('(') || part.includes(')')) return false;
        if (/\d/.test(part)) return false;
        if (parts.indexOf(part) > 1 && /^[A-Z]/.test(part)) return false;
        return true;
    });
    return scientificNameParts.join(' ');
};
const formatLocation = (lat, long) => {
  if (!lat || !long) return '-';
  return `${parseFloat(lat).toFixed(6)}, ${parseFloat(long).toFixed(6)}`;
};
const SortableHeader = ({ title, sortKey, currentSort, onSort, className = "" }) => {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey) return faSort;
    return currentSort.direction === 'asc' ? faSortUp : faSortDown;
  };

  return (
    <div 
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-2 cursor-pointer ${className}`}
    >
      <span>{title}</span>
      <FontAwesomeIcon 
        icon={getSortIcon()} 
        className={`text-xs ${
          currentSort.key === sortKey 
            ? 'text-blue-400' 
            : 'text-gray-500'
        }`}
      />
    </div>
  );
};
const isValidDateStr = (str) => {
  if (!str || str === '') return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};
const getDateValue = (item, key) => {
  if (isValidDateStr(item?.[key])) return new Date(item[key]);
  if (key !== 'observation_date' && isValidDateStr(item?.observation_date)) return new Date(item.observation_date);
  if (key !== 'created_at' && isValidDateStr(item?.created_at)) return new Date(item.created_at);
  if (isValidDateStr(item?.created_at)) return new Date(item.created_at);
  if (isValidDateStr(item?.observation_date)) return new Date(item.observation_date);
  return new Date(0);
};
const buildSortFn = (config) => {
  return (a, b) => {
    const dateA = getDateValue(a, config.key);
    const dateB = getDateValue(b, config.key);
    return config.direction === 'asc' ? dateA - dateB : dateB - dateA;
  };
};
const ListViewDesktop = ({ observations, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [localSorted, setLocalSorted] = useState(observations);
  const prevObsRef = useRef(observations);
  const prevSortRef = useRef(sortConfig);
  useEffect(() => {
    const obsChanged = prevObsRef.current !== observations;
    const sortChanged = prevSortRef.current !== sortConfig;
    prevObsRef.current = observations;
    prevSortRef.current = sortConfig;

    if (sortChanged) {
      setLocalSorted([...observations].sort(buildSortFn(sortConfig)));
    } else if (obsChanged) {
      setLocalSorted(observations);
    }
  }, [observations, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };
  const getTaxonomyTitle = (item) => {
    if (!item.taxonomyLevel) return '';
    return `${item.taxonomyLevel.charAt(0).toUpperCase() + item.taxonomyLevel.slice(1)}: ${item.title}`;
  };

  const sortedObservations = localSorted;

  return (
    <div className="hidden md:block w-full max-w-[95%] mx-auto mt-14 px-2 md:px-4 overflow-x-auto">
      <div className="min-w-[1000px]">
        <table className="w-full border-collapse bg-[#1e1e1e] rounded-lg shadow-md">
          <thead className="bg-[#2c2c2c]">
            <tr className="text-left border-b border-[#444]">
              <th className="p-8 font-medium text-sm text-gray-300">Verifikasi</th>
              <th className="p-4 font-medium text-sm text-gray-300">Nama</th>
              <th className="p-4 font-medium text-sm text-gray-300">Pengamat</th>
              <th className="p-4 font-medium text-sm text-gray-300">Lokasi</th>
              {/* <th className="p-4 font-medium text-sm text-gray-300">Jumlah observasi</th> */}
              <th className="p-4 font-medium text-sm text-gray-300">
                <SortableHeader
                  title="Tgl Observasi"
                  sortKey="observation_date"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-300">
                <SortableHeader
                  title="Tgl Upload"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-300">Informasi tambahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444]">
            {sortedObservations
              .map((item, index) => {
                const imagesCount = Array.isArray(item.images) 
                  ? item.images.length 
                  : (item.image ? 1 : 0);
                
                const firstImageUrl = (Array.isArray(item.images) && item.images.length > 0)
                  ? (item.images[0]?.url || item.images[0] || getDefaultImage(item.type))
                  : (item.image || getDefaultImage(item.type));

                return (
                  <tr 
                    key={index}
                    onClick={() => handleClick(item)}
                    className="hover:bg-[#2c2c2c] transition-colors duration-150 cursor-pointer"
                  >
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-900/70 text-blue-300' :
                        item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-900/70 text-green-300' :
                        item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-900/70 text-yellow-300' :
                        item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-900/70 text-orange-300' :
                        'bg-gray-700/70 text-gray-300'
                      }`}>
                        {getGradeDisplay(item.quality.grade, item.type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className={`w-16 h-16 rounded-lg overflow-hidden border border-[#444] ${isDefaultIcon(firstImageUrl) ? 'bg-[#1a1a1a] flex items-center justify-center' : 'bg-[#121212]'}`}>
                            <img 
                              src={firstImageUrl}
                              alt=""
                              className={`${isDefaultIcon(firstImageUrl) ? 'w-8 h-8 object-contain opacity-40' : 'w-full h-full object-cover'}`}
                              loading={index < 10 ? "eager" : "lazy"}
                              onError={(e) => {
                                e.target.src = getDefaultImage(item.type);
                                e.target.className = 'w-8 h-8 object-contain opacity-40';
                                e.target.parentElement.className = 'w-16 h-16 rounded-lg overflow-hidden border border-[#444] bg-[#1a1a1a] flex items-center justify-center';
                              }}
                            />
                          </div>
                          {imagesCount > 1 && (
                            <div className="absolute -top-2 -right-2 bg-[#1a73e8] text-white text-xs px-2 py-1 rounded-full">
                              {imagesCount}
                            </div>
                          )}
                          {item.spectrogram && (
                            <div className="absolute -bottom-1 -right-1 bg-[#1a73e8] text-white p-1.5 rounded-full shadow-md">
                              <FontAwesomeIcon icon={faPlay} className="text-xs" />
                            </div>
                          )}
                        </div>
                        <div>
                          {/* Sistem dinamis untuk menampilkan nama dari tabel taxas - konsisten dengan GridView */}
                          {(() => {
                            const commonNameField = `cname_${item.taxonomyLevel}`;
                            const latinNameField = item.taxonomyLevel;
                            const commonName = item[commonNameField];
                            const latinName = item[latinNameField];
                            if (commonName && latinName && commonName !== latinName) {
                              return (
                                <>
                                  {/* Common name - tidak italic */}
                                  <div 
                                    className={`font-medium text-white ${item.taxonomyLevel ? 'cursor-help' : ''}`}
                                    title={getTaxonomyTitle(item)}
                                  >
                                    {commonName}
                                  </div>
                                  {/* Nama latin - italic hanya untuk species ke bawah */}
                                  <div 
                                    className={`text-sm text-gray-400 mt-0.5 ${['species', 'subspecies', 'form', 'variety'].includes(item.taxonomyLevel?.toLowerCase()) ? 'italic' : ''}`}
                                    title={`${item.taxonomyLevel}: ${latinName}`}
                                  >
                                    {latinName}
                                  </div>
                                </>
                              );
                            }
                            const displayName = commonName || latinName || item.title || '-';
                            const isLatinOnly = !commonName && latinName;
                            
                            return (
                              <div 
                                className={`font-medium text-white ${isLatinOnly && ['species', 'subspecies', 'form', 'variety'].includes(item.taxonomyLevel?.toLowerCase()) ? 'italic' : ''} ${item.taxonomyLevel ? 'cursor-help' : ''}`}
                                title={getTaxonomyTitle(item)}
                              >
                                {displayName}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link 
                        to={`/profile/${item.observer_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          window.open(`/profile/${item.observer_id}`, '_blank');
                        }}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        {item.observer}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gray-300">{item.location || '-'}</td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-300">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      {(item.type === 'bird' || item.type === 'butterfly') ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-blue-400">
                            <FontAwesomeIcon icon={faDna} className="text-[10px]" />
                            <span>{item.species_count || 0} Jenis</span>
                          </div>
                          {item.quality.has_media && (
                            <span className="text-gray-400" title="Has Media">
                              <FontAwesomeIcon icon={faImage} className="text-xs" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center text-gray-400">
                          {item.quality.has_media && (
                            <span className="tooltip-container" title="Has Media">
                              <FontAwesomeIcon icon={faImage} />
                            </span>
                          )}
                          {item.quality.is_wild && (
                            <span className="tooltip-container" title="Wild">
                              <FontAwesomeIcon icon={faDove} />
                            </span>
                          )}
                          {item.quality.location_accurate && (
                            <span className="tooltip-container" title="Location Accurate">
                              <FontAwesomeIcon icon={faLocationDot} />
                            </span>
                          )}
                          {item.quality.needs_id && (
                            <span className="tooltip-container" title="Needs ID">
                              <FontAwesomeIcon icon={faQuestion} />
                            </span>
                          )}
                          {item.quality.recent_evidence && (
                            <span className="tooltip-container" title="Recent Evidence">
                              <FontAwesomeIcon icon={faCheck} />
                            </span>
                          )}
                          {item.quality.related_evidence && (
                            <span className="tooltip-container" title="Related Evidence">
                              <FontAwesomeIcon icon={faLink} />
                            </span>
                          )}
                          <span className="ml-2 text-xs">
                            {item.identifications_count || 0} ID
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const ListViewMobile = ({ observations, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [localSorted, setLocalSorted] = useState(observations);
  const prevObsRef = useRef(observations);
  const prevSortRef = useRef(sortConfig);
  useEffect(() => {
    const obsChanged = prevObsRef.current !== observations;
    const sortChanged = prevSortRef.current !== sortConfig;
    prevObsRef.current = observations;
    prevSortRef.current = sortConfig;

    if (sortChanged) {
      setLocalSorted([...observations].sort(buildSortFn(sortConfig)));
    } else if (obsChanged) {
      setLocalSorted(observations);
    }
  }, [observations, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };
  const getTaxonomyTitle = (item) => {
    if (!item.taxonomyLevel) return '';
    return `${item.taxonomyLevel.charAt(0).toUpperCase() + item.taxonomyLevel.slice(1)}: ${item.title}`;
  };

  const sortedObservations = localSorted;

  return (
    <div className="md:hidden px-4 pb-16">
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-300 text-sm">
          Urut berdasarkan:
        </div>
        <div className="flex gap-4">
          <SortableHeader
            title="Tgl Observasi"
            sortKey="observation_date"
            currentSort={sortConfig}
            onSort={handleSort}
            className="text-sm text-gray-300"
          />
          <SortableHeader
            title="Tgl Upload"
            sortKey="created_at"
            currentSort={sortConfig}
            onSort={handleSort}
            className="text-sm text-gray-300"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        {sortedObservations.map((item, index) => {
          const imagesCount = Array.isArray(item.images) 
            ? item.images.length 
            : (item.image ? 1 : 0);
          
          const firstImageUrl = (Array.isArray(item.images) && item.images.length > 0)
            ? (item.images[0]?.url || item.images[0] || getDefaultImage(item.type))
            : (item.image || getDefaultImage(item.type));

          return (
            <div 
              key={index}
              onClick={() => handleClick(item)}
              className="bg-[#1e1e1e] rounded-lg overflow-hidden shadow-md cursor-pointer"
            >
              <div className="flex items-center p-3 border-b border-[#444]">
                <div className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden ${isDefaultIcon(firstImageUrl) ? 'bg-[#1a1a1a] flex items-center justify-center' : ''}`}>
                  <img 
                    src={firstImageUrl}
                    alt=""
                    className={`${isDefaultIcon(firstImageUrl) ? 'w-10 h-10 object-contain opacity-40' : 'w-full h-full rounded-lg object-cover'}`}
                    loading={index < 5 ? "eager" : "lazy"}
                    onError={(e) => {
                      e.target.src = getDefaultImage(item.type);
                      e.target.className = 'w-10 h-10 object-contain opacity-40';
                      e.target.parentElement.className = 'relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a] flex items-center justify-center';
                    }}
                  />
                  {imagesCount > 1 && (
                    <div className="absolute -top-2 -right-2 bg-[#1a73e8] text-white text-xs px-2 py-1 rounded-full">
                      {imagesCount}
                    </div>
                  )}
                  {item.spectrogram && (
                    <div className="absolute -bottom-1 -right-1 bg-[#1a73e8] text-white p-1.5 rounded-full shadow-md">
                      <FontAwesomeIcon icon={faPlay} className="text-xs" />
                    </div>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div 
                    className={`font-medium text-white ${item.taxonomyLevel ? 'cursor-help' : ''}`}
                    title={getTaxonomyTitle(item)}
                  >
                    {item.title}
                  </div>
                  <div className="text-sm text-gray-400 italic">
                    {extractScientificName(item.species) || item.nameLat || '-'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-900/70 text-blue-300' :
                      item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-900/70 text-green-300' :
                      item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-900/70 text-yellow-300' :
                      item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-900/70 text-orange-300' :
                      'bg-gray-700/70 text-gray-300'
                    }`}>
                      {getGradeDisplay(item.quality.grade, item.type)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FontAwesomeIcon icon={faUsers} />
                      <span>{item.identifications_count || 0} ID</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 text-sm">
                <div className="flex justify-between text-gray-300">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                    <Link 
                      to={`/profile/${item.observer_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(`/profile/${item.observer_id}`, '_blank');
                      }}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                    >
                      {item.observer}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendar} className="text-gray-500" />
                    <span>
                      {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-gray-300">
                  <FontAwesomeIcon icon={faLocationDot} className="text-gray-500" />
                  <span>{item.location || '-'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 items-center text-gray-400">
                  {(item.type === 'bird' || item.type === 'butterfly') ? (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <FontAwesomeIcon icon={faDna} className="text-[10px]" />
                      <span>{item.species_count || 0} Jenis</span>
                      {item.quality.has_media && (
                        <span className="ml-2 text-gray-400" title="Has Media">
                          <FontAwesomeIcon icon={faImage} className="text-xs" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {item.quality.has_media && (
                        <span className="tooltip-container" title="Has Media">
                          <FontAwesomeIcon icon={faImage} />
                        </span>
                      )}
                      {item.quality.is_wild && (
                        <span className="tooltip-container" title="Wild">
                          <FontAwesomeIcon icon={faDove} />
                        </span>
                      )}
                      {item.quality.location_accurate && (
                        <span className="tooltip-container" title="Location Accurate">
                          <FontAwesomeIcon icon={faLocationDot} />
                        </span>
                      )}
                      {item.quality.needs_id && (
                        <span className="tooltip-container" title="Needs ID">
                          <FontAwesomeIcon icon={faQuestion} />
                        </span>
                      )}
                      {item.quality.recent_evidence && (
                        <span className="tooltip-container" title="Recent Evidence">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      )}
                      {item.quality.related_evidence && (
                        <span className="tooltip-container" title="Related Evidence">
                          <FontAwesomeIcon icon={faLink} />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
const GridView = ({ searchParams, filterParams = defaultFilterParams, view = 'grid', setStats, activePolygon, centralizedFilters, isActive = true }) => {
  const [visibleIndex, setVisibleIndex] = useState(null);
  const cardRefs = useRef([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const sourcePages = useRef({ fobi: 1, burungnesia: 1, kupunesia: 1 });
  const sourceHasMore = useRef({ fobi: true, burungnesia: true, kupunesia: true });
  const sourceTotals = useRef({ fobi: 0, burungnesia: 0, kupunesia: 0 });
  const navigate = useNavigate();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const modalRef = useRef(null);
  const isMobile = window.innerWidth <= 768;
  const [sortVisible, setSortVisible] = useState(false);
  const sortDropdownRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const sortConfigRef = useRef(sortConfig);
  useEffect(() => { sortConfigRef.current = sortConfig; }, [sortConfig]);
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  const isInitialLoad = useRef(true);
  const lastStats = useRef(null);
  const isInfiniteScrolling = useRef(false);
  const initialPageStats = useRef(null);
  const prevCurrentPage = useRef(currentPage);
  const prevFiltersRef = useRef(null);
  const fetchAbortRef = useRef(null);
  const handleSort = (key) => {
    setSortConfig((prevConfig) => {
      const newConfig = {
        key,
        direction: 
          prevConfig.key === key 
            ? prevConfig.direction === 'asc' 
              ? 'desc' 
              : 'asc'
            : 'desc'
      };
      setObservations(prev => [...prev].sort(buildSortFn(newConfig)));
      return newConfig;
    });
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortVisible(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  useEffect(() => {
    prevCurrentPage.current = currentPage;
  }, [currentPage]);
  useEffect(() => {
    const skipInitialFetch = localStorage.getItem('skipInitialStatsFetch') === 'true';
    
    try {
      const savedStats = getStatsFromLocalStorage();
      console.log('GridView: Inisialisasi dengan stats dari localStorage:', savedStats);
      lastStats.current = savedStats;
      initialPageStats.current = savedStats;
      if (!skipInitialFetch && setStats && savedStats && isActiveRef.current) {
        setStats(savedStats);
      }
    } catch (e) {
      console.error('Error initializing stats from localStorage:', e);
    }
    isInitialLoad.current = skipInitialFetch;
    return () => {
      isInitialLoad.current = false;
      if (initialPageStats.current) {
        localStorage.setItem('currentStats', JSON.stringify(initialPageStats.current));
      }
    };
  }, [setStats]);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const toggleDescription = (index) => {
    setVisibleIndex(visibleIndex === index ? null : index);
  };

  const handleClickOutside = (event) => {
    if (cardRefs.current.every(ref => ref && !ref.contains(event.target))) {
      setVisibleIndex(null);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setVisibleIndex(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const resetGridView = useCallback(() => {
    setCurrentPage(1);
    setObservations([]);
    setHasMore(true);
    setLoadingMore(false);
    sourcePages.current = { fobi: 1, burungnesia: 1, kupunesia: 1 };
    sourceHasMore.current = { fobi: true, burungnesia: true, kupunesia: true };
    sourceTotals.current = { fobi: 0, burungnesia: 0, kupunesia: 0 };
  }, []);
  useEffect(() => {
    const currentFilterKey = JSON.stringify({
      s: searchParams?.search || searchParams?.query || '',
      sId: searchParams?.selectedId || '',
      cf: centralizedFilters,
      fp: filterParams?.data_source,
    });
    
    const isFilterChanged = prevFiltersRef.current !== null && prevFiltersRef.current !== currentFilterKey;
    prevFiltersRef.current = currentFilterKey;
    if (isFilterChanged && currentPage !== 1) {
      setCurrentPage(1);
      setObservations([]);
      setHasMore(true);
      setLoadingMore(false);
      isInfiniteScrolling.current = false;
      initialPageStats.current = null;
      sourcePages.current = { fobi: 1, burungnesia: 1, kupunesia: 1 };
      sourceHasMore.current = { fobi: true, burungnesia: true, kupunesia: true };
      sourceTotals.current = { fobi: 0, burungnesia: 0, kupunesia: 0 };
      return; // Effect akan re-run karena currentPage berubah
    }
    
    const fetchObservationsAndStats = async (signal) => {
      try {
        if (currentPage === 1) {
          setLoading(true);
          setObservations([]);
          isInfiniteScrolling.current = false;
          initialPageStats.current = null;
          sourcePages.current = { fobi: 1, burungnesia: 1, kupunesia: 1 };
          sourceHasMore.current = { fobi: true, burungnesia: true, kupunesia: true };
          sourceTotals.current = { fobi: 0, burungnesia: 0, kupunesia: 0 };
        }
        setError(null);
        const queryParams = new URLSearchParams();
        queryParams.append('per_page', 30);
        if (centralizedFilters) {
          const useSearchParamsAsSource = !centralizedFilters.search && searchParams?.search;
          
          if (useSearchParamsAsSource) {
            if (searchParams.search) queryParams.append('search', searchParams.search);
            if (searchParams.searchType) queryParams.append('searchType', searchParams.searchType);
            if (searchParams.selectedId) queryParams.append('selectedId', searchParams.selectedId);
            if (searchParams.display) queryParams.append('display', searchParams.display);
            if (searchParams.species) {
              if (typeof searchParams.species === 'object') {
                queryParams.append('species', JSON.stringify(searchParams.species));
              } else {
                queryParams.append('species', searchParams.species);
              }
            }
          } else {
            if (centralizedFilters.search) queryParams.append('search', centralizedFilters.search);
            if (centralizedFilters.searchType) queryParams.append('searchType', centralizedFilters.searchType);
            if (centralizedFilters.selectedId) queryParams.append('selectedId', centralizedFilters.selectedId);
            if (centralizedFilters.display) queryParams.append('display', centralizedFilters.display);
            if (centralizedFilters.species) {
              if (typeof centralizedFilters.species === 'object') {
                queryParams.append('species', JSON.stringify(centralizedFilters.species));
              } else {
                queryParams.append('species', centralizedFilters.species);
              }
            }
          }
          if (centralizedFilters.start_date) queryParams.append('start_date', centralizedFilters.start_date);
          if (centralizedFilters.end_date) queryParams.append('end_date', centralizedFilters.end_date);
          if (centralizedFilters.date_type) queryParams.append('date_type', centralizedFilters.date_type);
          if (centralizedFilters.user_id) queryParams.append('user_id', centralizedFilters.user_id);
          if (centralizedFilters.taxonomy_rank) queryParams.append('taxonomy_rank', centralizedFilters.taxonomy_rank);
          if (centralizedFilters.taxonomy_value) queryParams.append('taxonomy_value', centralizedFilters.taxonomy_value);
          if (centralizedFilters.latitude) queryParams.append('latitude', centralizedFilters.latitude);
          if (centralizedFilters.longitude) queryParams.append('longitude', centralizedFilters.longitude);
          if (centralizedFilters.radius) queryParams.append('radius', centralizedFilters.radius);
          if (centralizedFilters.polygon) queryParams.append('polygon', centralizedFilters.polygon);
          
          if (centralizedFilters.grade && centralizedFilters.grade.length > 0) {
            centralizedFilters.grade.forEach(g => queryParams.append('grade[]', g));
          }
          
          if (centralizedFilters.data_source && centralizedFilters.data_source.length > 0) {
            centralizedFilters.data_source.forEach(ds => queryParams.append('data_source[]', ds));
          }
          
          if (centralizedFilters.has_media) queryParams.append('has_media', '1');
          if (centralizedFilters.media_type) queryParams.append('media_type', centralizedFilters.media_type);
        }
        if (searchParams) {
          if (searchParams.species) {
            if (typeof searchParams.species === 'object') {
              if (searchParams.species.scientific_name) {
                queryParams.append('search', searchParams.species.scientific_name);
                queryParams.append('searchType', 'species');
              } else if (searchParams.species.name) {
                queryParams.append('search', searchParams.species.name);
                queryParams.append('searchType', 'species');
              }
            } 
            else if (typeof searchParams.species === 'string') {
              queryParams.append('search', searchParams.species);
              queryParams.append('searchType', 'species');
            }
          } 
          else if (searchParams.query && !centralizedFilters?.search) {
            queryParams.append('search', searchParams.query);
          }
          Object.entries(searchParams).forEach(([key, value]) => {
            if (value && !queryParams.has(key) && key !== 'species' && key !== 'query' && 
                !centralizedFilters?.[key]) {
              if (key === 'location' && !centralizedFilters?.location) {
                queryParams.append('location', value);
              }
              else if (key !== 'query' && key !== 'location' && key !== 'data_source') {
                queryParams.append(key, value);
              }
            }
          });
        }
        if (filterParams) {
          Object.entries(filterParams).forEach(([key, value]) => {
            if (!queryParams.has(key) && value && key !== 'data_source' && 
                !centralizedFilters?.[key]) {
              if (Array.isArray(value)) {
                if (!centralizedFilters?.[key] || centralizedFilters[key].length === 0) {
                  value.forEach(v => queryParams.append(`${key}[]`, v));
                }
              } else if (value) {
                queryParams.append(key, value);
              }
            }
          });
        }
        if (activePolygon && !centralizedFilters?.polygon) {
          const polygonString = formatPolygonForApi(activePolygon);
          if (polygonString) {
            queryParams.append('polygon', polygonString);
          }
        }
        if (!queryParams.has('data_source[]')) {
          const dataSources = centralizedFilters?.data_source || filterParams?.data_source || ['fobi'];
          if (Array.isArray(dataSources) && dataSources.length > 0) {
            dataSources.forEach(source => {
              queryParams.append('data_source[]', source);
            });
          } else {
            ['fobi'].forEach(source => {
              queryParams.append('data_source[]', source);
            });
          }
        }

        const baseQueryString = queryParams.toString();

        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        const selectedSources = centralizedFilters?.data_source || filterParams?.data_source || ['fobi'];
        const isInitial = currentPage === 1;
        const fetchEntries = []; // { source, promise }
        const willFetchFobi = selectedSources.includes('fobi') && (isInitial || sourceHasMore.current.fobi);

        const buildSourceUrl = (endpoint, sourceName) => {
          const sourceParams = new URLSearchParams(baseQueryString);
          sourceParams.set('page', sourcePages.current[sourceName]);
          if (willFetchFobi && (sourceName === 'burungnesia' || sourceName === 'kupunesia')) {
            sourceParams.set('exclude_fobi', '1');
          }
          return `${baseUrl}/${endpoint}?${sourceParams.toString()}`;
        };

        if (willFetchFobi) {
          fetchEntries.push({
            source: 'fobi',
            promise: fetch(buildSourceUrl('general-observations', 'fobi'))
              .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
              .catch(err => { console.error('Error fetching general:', err); return { data: [] }; })
          });
        }

        if (selectedSources.includes('burungnesia') && (isInitial || sourceHasMore.current.burungnesia)) {
          fetchEntries.push({
            source: 'burungnesia',
            promise: fetch(buildSourceUrl('bird-observations', 'burungnesia'))
              .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
              .catch(err => { console.error('Error fetching birds:', err); return { data: [] }; })
          });
        }

        if (selectedSources.includes('kupunesia') && (isInitial || sourceHasMore.current.kupunesia)) {
          fetchEntries.push({
            source: 'kupunesia',
            promise: fetch(buildSourceUrl('butterfly-observations', 'kupunesia'))
              .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
              .catch(err => { console.error('Error fetching butterflies:', err); return { data: [] }; })
          });
        }
        if (fetchEntries.length === 0) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }

        const responses = await Promise.all(fetchEntries.map(e => e.promise));
        if (signal?.aborted) return;
        
        let allObservationsFromSources = [];
        let totalCount = 0;
        const fobiAlreadyFetched = fetchEntries.some(e => e.source === 'fobi');
        responses.forEach((response, idx) => {
          const sourceName = fetchEntries[idx].source;
          
          if (response?.data) {
            let data = response.data;
            if (fobiAlreadyFetched && (sourceName === 'burungnesia' || sourceName === 'kupunesia')) {
              data = data.filter(item => item.source !== 'fobi');
            }

            let formattedData;
            
            if (sourceName === 'fobi') {
              formattedData = formatGeneralData(data);
            } else if (sourceName === 'burungnesia') {
              formattedData = formatBirdData(data);
            } else if (sourceName === 'kupunesia') {
              formattedData = formatButterflyData(data);
            }
            
            if (formattedData) {
              allObservationsFromSources.push(...formattedData);
            }
            if (response.meta) {
              const { current_page, last_page, total } = response.meta;
              sourceTotals.current[sourceName] = total || 0;
              sourceHasMore.current[sourceName] = current_page < last_page;
            } else {
              sourceHasMore.current[sourceName] = false;
            }
          } else {
            sourceHasMore.current[sourceName] = false;
          }
        });
        selectedSources.forEach(src => {
          totalCount += sourceTotals.current[src] || 0;
        });
        const currentSortFn = buildSortFn(sortConfigRef.current);
        allObservationsFromSources.sort(currentSortFn);
        if (signal?.aborted) return;
        const anySourceHasMore = selectedSources.some(src => sourceHasMore.current[src]);
        setTotalItems(totalCount);
        setHasMore(anySourceHasMore);
        setObservations(prevObservations => {
          if (isInitial) {
            const seen = new Set();
            const deduped = allObservationsFromSources.filter(item => {
              const key = `${item.source}_${item.id}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return deduped.slice(0, 30);
          }
          const existingIds = new Set(prevObservations.map(item => `${item.source}_${item.id}`));
          const uniqueNew = allObservationsFromSources.filter(item => !existingIds.has(`${item.source}_${item.id}`));
          uniqueNew.sort(currentSortFn);
          
          return [...prevObservations, ...uniqueNew];
        });
        if (!isInfiniteScrolling.current && !isInitialLoad.current && isActiveRef.current) {
          try {
            const savedStats = getStatsFromLocalStorage();
            if (setStats && savedStats) {
              setStats(savedStats);
              initialPageStats.current = savedStats;
            }
          } catch (statsError) {
            console.error('Error getting stats from localStorage:', statsError);
          }
        } else if (isInfiniteScrolling.current && initialPageStats.current && setStats && isActiveRef.current) {
          setStats(initialPageStats.current);
        }
        
        isInitialLoad.current = false;
        if (isInfiniteScrolling.current) {
          isInfiniteScrolling.current = false;
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching data:', err);
          setError('Gagal memuat data');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortRef.current = abortController;
    const debouncedFetch = debounce(() => {
      fetchObservationsAndStats(abortController.signal);
    }, 300); // Kurangi dari 500ms ke 300ms untuk responsivitas lebih baik

    debouncedFetch();
    return () => {
      debouncedFetch.cancel();
      abortController.abort();
    };
  }, [searchParams, filterParams, currentPage, centralizedFilters, activePolygon, setStats]);
  const formatPolygonForApi = (polygon) => {
    if (!polygon) return null;
    
    if (polygon.type === 'Polygon') {
      return polygon.coordinates[0]
        .map(coord => `${coord[0]},${coord[1]}`)
        .join('|');
    } else if (polygon.type === 'Circle') {
      const { center, radius } = polygon;
      const points = [];
      const numPoints = 32; // Jumlah titik untuk membuat lingkaran
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const lng = center[0] + (radius / 111320 * Math.cos(angle)) / Math.cos(center[1] * Math.PI / 180);
        const lat = center[1] + (radius / 111320 * Math.sin(angle));
        points.push(`${lng},${lat}`);
      }
      points.push(points[0]);
      
      return points.join('|');
    }
    
    return null;
  };
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore && observations.length > 0) {
      setLoadingMore(true);
      isInfiniteScrolling.current = true;
      if (!initialPageStats.current && setStats) {
        initialPageStats.current = getStatsFromLocalStorage();
      }
      Object.keys(sourceHasMore.current).forEach(src => {
        if (sourceHasMore.current[src]) {
          sourcePages.current[src] += 1;
        }
      });
      
      setCurrentPage(prevPage => prevPage + 1);
    }
  }, [loading, loadingMore, hasMore, observations.length, setStats]);
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      console.log('GridView: Infinite scroll terdeteksi, memuat data tambahan');
      loadMore();
    }
  }, [inView, hasMore, loading, loadingMore, loadMore]);
  const formatGeneralData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      let title = 'Belum teridentifikasi';
      let taxonomyLevel = ''; // Tambahkan variabel untuk menyimpan level taksonomi
      if (item?.rank) {
        taxonomyLevel = item.rank; // Simpan level taksonomi
        if (item[`cname_${item.rank}`]) {
          title = item[`cname_${item.rank}`];
        } 
        else if (item[item.rank]) {
          if (item.rank === 'family' || item.rank === 'genus' || item.rank === 'species') {
            title = item[item.rank];
          } else {
            title = item[item.rank];
          }
        }
      } 
      else {
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
        let foundLevel = null;
        let foundValue = null;
        
        for (const level of taxonomyLevels) {
          if (item[`cname_${level}`]) {
            foundLevel = level;
            foundValue = item[`cname_${level}`];
            break;
          }
          else if (item[level]) {
            foundLevel = level;
            foundValue = item[level];
            break;
          }
        }
        if (foundLevel && foundValue) {
          taxonomyLevel = foundLevel;
          title = foundValue;
        } else {
          title = 'Belum teridentifikasi';
        }
      }
      let images = [];
      if (item?.images && Array.isArray(item.images)) {
        images = item.images;
      } else if (item?.image) {
        images = [{ url: item.image }];
      }
      
      return {
        id: `${item?.id || ''}`,
        taxa_id: item?.taxa_id || '',
        media_id: item?.media_id || '',
        image: item?.images?.[0]?.url || item?.image || null,
        images: images, // Pastikan images selalu tersedia sebagai array
        title: title,
        taxonomyLevel: taxonomyLevel, // Tambahkan informasi level taksonomi
        description: `Family: ${item?.family || '-'}
        Genus: ${item?.genus || '-'}
        Species: ${extractScientificName(item?.species) || '-'} 
        `,
        observer: item?.observer_name || 'Anonymous',
        observer_id: item?.observer_id || '',
        quality: {
          grade: item?.grade || 'casual',
          has_media: Boolean(item?.has_media),
          is_wild: Boolean(item?.is_wild),
          location_accurate: Boolean(item?.location_accurate),
          recent_evidence: Boolean(item?.recent_evidence),
          related_evidence: Boolean(item?.related_evidence),
          needs_id: Boolean(item?.needs_id),
          community_id_level: item?.community_id_level || null
        },
        observation_date: item?.observation_date || null,
        created_at: item?.created_at || null,
        updated_at: item?.updated_at || '',
        type: 'general',
        source: item?.source || 'fobi',
        spectrogram: item?.spectrogram || null,
        audioUrl: item?.audioUrl || null,
        kingdom: item?.kingdom,
        subkingdom: item?.subkingdom,
        superkingdom: item?.superkingdom,
        phylum: item?.phylum,
        subphylum: item?.subphylum,
        superphylum: item?.superphylum,
        division: item?.division,
        superdivision: item?.superdivision,
        class: item?.class,
        subclass: item?.subclass,
        infraclass: item?.infraclass,
        order: item?.order,
        suborder: item?.suborder,
        superorder: item?.superorder,
        infraorder: item?.infraorder,
        superfamily: item?.superfamily,
        family: item?.family,
        subfamily: item?.subfamily,
        tribe: item?.tribe,
        subtribe: item?.subtribe,
        genus: item?.genus,
        species: item?.species,
        form: item?.form,
        variety: item?.variety,
        cname_kingdom: item?.cname_kingdom,
        cname_subkingdom: item?.cname_subkingdom,
        cname_superkingdom: item?.cname_superkingdom,
        cname_phylum: item?.cname_phylum,
        cname_subphylum: item?.cname_subphylum,
        cname_superphylum: item?.cname_superphylum,
        cname_division: item?.cname_division,
        cname_superdivision: item?.cname_superdivision,
        cname_class: item?.cname_class,
        cname_subclass: item?.cname_subclass,
        cname_infraclass: item?.cname_infraclass,
        cname_order: item?.cname_order,
        cname_suborder: item?.cname_suborder,
        cname_superorder: item?.cname_superorder,
        cname_infraorder: item?.cname_infraorder,
        cname_superfamily: item?.cname_superfamily,
        cname_family: item?.cname_family,
        cname_subfamily: item?.cname_subfamily,
        cname_tribe: item?.cname_tribe,
        cname_subtribe: item?.cname_subtribe,
        cname_genus: item?.cname_genus,
        cname_species: item?.cname_species,
        cname_form: item?.cname_form,
        cname_variety: item?.cname_variety,
        identifications_count: item?.total_identifications || 0,
        fobi_count: item?.fobi_count || 0,
        location: item?.location_name || formatLocation(item?.latitude, item?.longitude),
        locationData: {
          latitude: parseFloat(item?.latitude),
          longitude: parseFloat(item?.longitude)
        },
        rank: item?.rank || '',
      };
    });
  };

  const formatBirdData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      let images = [];
      if (item?.images && Array.isArray(item.images)) {
        images = item.images;
      } else if (item?.image) {
        images = [{ url: item.image }];
      }
      const title = item?.nameId || item?.nameLat || 'Belum teridentifikasi';
      
      return {
        id: `${item?.id || ''}`,
        fauna_id: item?.fauna_id || '',
        image: item?.images?.[0]?.url || item?.image || null,
        images: images, // Pastikan images selalu tersedia sebagai array
        title: title,
        nameLat: item?.nameLat || '',
        nameId: item?.nameId || '',
        taxonomyLevel: 'species', // Tambahkan taxonomyLevel untuk bird data
        description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${'checklist burungnesia' || '-'}\n${item?.notes || '-'}`,
        observer: item?.observer_name || 'Anonymous',
        observer_id: item?.observer_id || '',
        count: `${item?.count || 0} Individu`,
        species_count: item?.species_count || 0,
        location_name: item?.location_name || '',
        breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
        breeding_note: item?.breeding_note || '-',
        quality: {
          grade: 'checklist burungnesia' || 'casual',
          has_media: Boolean(item?.has_media),
          is_wild: Boolean(item?.is_wild),
          location_accurate: Boolean(item?.location_accurate),
          needs_id: Boolean(item?.needs_id),
          community_level: item?.community_id_level || null
        },
        type: 'bird',
        source: item?.source || 'burungnesia',
        spectrogram: item?.spectrogram || null,
        audioUrl: item?.audioUrl || null,
        identifications_count: item?.total_identifications || 0,
        burungnesia_count: item?.burungnesia_count || 0,
        fobi_count: item?.fobi_count || 0,
        created_at: item?.created_at || null,
        observation_date: item?.observation_date || null,
        location: item?.location_name || formatLocation(item?.latitude, item?.longitude),
        locationData: {
          latitude: parseFloat(item?.latitude),
          longitude: parseFloat(item?.longitude)
        },
      };
    });
  };

  const formatButterflyData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      let images = [];
      if (item?.images && Array.isArray(item.images)) {
        images = item.images;
      } else if (item?.image) {
        images = [{ url: item.image }];
      }
      const title = item?.nameId || item?.nameLat || 'Belum teridentifikasi';
      const taxonomyLevel = item?.taxon_rank?.toLowerCase() || 'species';
      
      return {
        id: `${item?.id || ''}`,
        fauna_id: item?.fauna_id || '',
        image: item?.images?.[0]?.url || item?.image || null,
        images: images, // Pastikan images selalu tersedia sebagai array
        title: title,
        nameLat: item?.nameLat || '',
        nameId: item?.nameId || '',
        taxonomyLevel: taxonomyLevel,
        species: item?.nameLat || '',
        cname_species: item?.nameId || '',
        genus: item?.nameLat || '',
        cname_genus: item?.nameId || '',
        description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${'checklist kupunesia' || '-'}\n${item?.notes || '-'}`,
        observer: item?.observer_name || 'Anonymous',
        observer_id: item?.observer_id || '',
        count: `${item?.count || 0} Individu`,
        species_count: item?.species_count || 0,
        location_name: item?.location_name || '',
        breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
        breeding_note: item?.breeding_note || '-',
        quality: {
          grade: 'checklist kupunesia' || 'casual',
          has_media: Boolean(item?.has_media),
          is_wild: Boolean(item?.is_wild),
          location_accurate: Boolean(item?.location_accurate),
          needs_id: Boolean(item?.needs_id),
          community_level: item?.community_id_level || null
        },
        type: 'butterfly',
        source: item?.source || 'kupunesia',
        spectrogram: item?.spectrogram || null,
        audioUrl: item?.audioUrl || null,
        identifications_count: item?.total_identifications || 0,
        kupunesia_count: item?.kupunesia_count || 0,
        fobi_count: item?.fobi_count || 0,
        created_at: item?.created_at || null,
        observation_date: item?.observation_date || null,
        location: item?.location_name || formatLocation(item?.latitude, item?.longitude),
        locationData: {
          latitude: parseFloat(item?.latitude),
          longitude: parseFloat(item?.longitude)
        },
      };
    });
  };

  const handleClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    if (source === 'general') {
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };
  const handleRowClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    let prefix = '';
    let baseId = item.id || '';
    if (source === 'bird') {
      prefix = 'BN';
    } else if (source === 'butterfly') {
      prefix = 'KP';
    }
    if (source === 'general') {
      path = `/observations/${baseId}?source=fobi`;
    } else if (item.source?.includes('fobi')) {
      path = `/detail-checklist/${prefix}${baseId}`;
    } else {
      path = `/app-checklist/${prefix}${baseId}`;
    }
    
    window.open(path, '_blank');
  };
  const sortedObservations = observations;
  if (loading && currentPage === 1) {
  return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-[#1a73e8] rounded-full animate-spin"></div>
          <span>Memuat data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3">
          <span className="text-red-400">{error}</span>
          <button 
            onClick={() => {
              setError(null);
              resetGridView();
            }}
            className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#0d47a1] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }
  if (!loading && observations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-300">
        <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
          <span>Tidak ada data yang ditemukan</span>
          <span className="text-sm text-gray-400">
            Coba ubah filter atau kata kunci pencarian Anda
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tambahkan kontrol pengurutan untuk tampilan grid di desktop */}
      {view === 'grid' && (
        <div className="hidden md:block relative mb-4 px-4">
          <div className="flex items-center">
            <button 
              onClick={() => setSortVisible(prev => !prev)}
              className="bg-[#1e1e1e] hover:bg-[#2c2c2c] text-gray-300 p-2 rounded-lg border border-[#444] flex items-center gap-2 text-sm"
            >
              <FontAwesomeIcon icon={faSort} />
              <span>Urutkan</span>
            </button>
            
            {sortVisible && (
              <div ref={sortDropdownRef} className="absolute top-full left-4 mt-2 bg-[#1e1e1e] border border-[#444] rounded-lg p-3 shadow-lg z-10">
                <div className="mb-2 text-gray-300 text-sm font-medium">Urut berdasarkan:</div>
                <div className="flex flex-col gap-3">
                  <SortableHeader
                    title="Tgl Observasi"
                    sortKey="observation_date"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    className="text-sm text-gray-300"
                  />
                  <SortableHeader
                    title="Tgl Upload"
                    sortKey="created_at"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    className="text-sm text-gray-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop View */}
      {view === 'grid' ? (
        <div className="hidden md:grid gap-3 px-4 mx-auto mb-16
          md:grid-cols-3 md:max-w-4xl 
          lg:grid-cols-4 lg:max-w-6xl 
          xl:grid-cols-5 xl:max-w-7xl
          2xl:grid-cols-6 2xl:max-w-[90rem]">
          {sortedObservations.map((item, index) => (
            <Card 
              key={`${item.type}-${item.id}-${item.source || 'unknown'}`} 
              item={item} 
              isEager={index < 10}
            />
          ))}
        </div>
      ) : (
        <ListViewDesktop 
          observations={observations}
          handleClick={handleRowClick}
        />
      )}

      {/* Mobile View */}
      <div className="md:hidden">
        {view === 'grid' ? (
          <>
            {/* Tambahkan kontrol pengurutan untuk tampilan grid di mobile */}
            <div className="flex justify-between items-center mb-4 px-4">
              <div className="text-gray-300 text-sm">
                Urut berdasarkan:
              </div>
              <div className="flex gap-4">
                <SortableHeader
                  title="Tgl Observasi"
                  sortKey="observation_date"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="text-sm text-gray-300"
                />
                <SortableHeader
                  title="Tgl Upload"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="text-sm text-gray-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
              {sortedObservations.map((item, index) => (
                <div key={`mobile-${item.type}-${item.id}-${item.source || 'unknown'}`} className="card relative rounded-md overflow-hidden">
                  <div
                    className="cursor-pointer aspect-square relative"
                    onClick={() => handleMobileClick(item)}
                  >
                    {item.spectrogram ? (
                      <div className="w-full h-full">
                        <SpectrogramPlayer
                          spectrogramUrl={item.spectrogram}
                          audioUrl={item.audioUrl}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-[#121212]">
                                            {/* Indikator jumlah media untuk mobile */}
                    {item.images && Array.isArray(item.images) && item.images.length > 1 && (
                      <div className="absolute top-0 right-2 text-white text-xs px-1 py-1 rounded-full flex items-center gap-1 z-20">
                        <FontAwesomeIcon icon={faImage} className="text-xs" />
                        <span>{item.images.length}</span>
                      </div>
                    )}

                        <img 
                          src={item.images?.[0]?.url || item.image || getDefaultImage(item.type)}
                          alt={item.title} 
                          className={`w-full h-full ${
                            isDefaultIcon(item.images?.[0]?.url || item.image)
                              ? 'object-contain p-4 opacity-40' 
                              : 'object-cover'
                          }`}
                          loading={index < 10 ? "eager" : "lazy"}
                          onError={(e) => {
                            e.target.src = getDefaultImage(item.type);
                            e.target.className = 'w-full h-full object-contain p-4 opacity-40';
                          }}
                        />
                      </div>
                    )}
                    
                    
                    <div className="absolute top-1 left-1 right-1">
                      <span className="text-[10px] line-clamp-2 text-white font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                        {item.title}
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-1 left-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                      item.quality.grade.toLowerCase() === 'research grade' ? 'bg-blue-500/70' :
                      item.quality.grade.toLowerCase() === 'confirmed id' ? 'bg-green-500/70' :
                      item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                      item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                      item.type === 'bird' ? 'bg-blue-500/70' :
                      item.type === 'butterfly' ? 'bg-purple-500/70' :
                      'bg-green-500/70'
                    }`}>
                      {getGradeDisplay(item.quality.grade, item.type)}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleDescription(index)}
                    className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                  >
                    <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                  </button>

                  {visibleIndex === index && (
                    <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                      <div className="space-y-2">
                        <p className="font-medium">{item.title}</p>
                        <p className="whitespace-pre-line text-gray-300">{item.description}</p>
                        <p className="text-gray-300">Observer: {item.observer}</p>
                        {item.breeding && <p className="text-gray-300">{item.breeding}</p>}
                        {item.count && <p className="text-gray-300">{item.count}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <ListViewMobile 
            observations={observations}
            handleClick={handleRowClick}
          />
        )}
      </div>

      {/* Loading More Indicator */}
      {hasMore && (
        <div className="mt-4 flex justify-center" ref={ref}>
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-gray-300">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-[#1a73e8] rounded-full animate-spin"></div>
              <span>Memuat...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#2c2c2c] rounded-lg text-sm text-gray-300 transition-colors border border-[#444]"
            >
             Muat Lebih Banyak Data
            </button>
          )}
        </div>
      )}

      {/* Footer - tampil setelah initial load dengan data */}
      {!loading && observations.length > 0 && (
        <div className="mt-8">
          <Footer />
        </div>
      )}
    </>
  );
};

export default GridView;
