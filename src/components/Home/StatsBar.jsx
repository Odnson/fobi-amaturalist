import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFilter, faTimes, faSearch, faMapMarkerAlt, faLayerGroup, faCamera, faHeadphones, faUser, faSpinner, faDna, faSlidersH, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import CountUp from 'react-countup';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import PropTypes from 'prop-types';
import {
  calculateDistance,
  calculateCenterPoint,
  calculateZoomLevel
} from '../../utils/geoHelpers';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import icoAmaturalist from '../../assets/icon/ico.png';
import icoBurungnesia from '../../assets/icon/icon.png';
import icoKupunesia from '../../assets/icon/kupnes.png';
import ActiveFilterBar from './ActiveFilterBar';

const TAXONOMY_RANKS = [
  { key: 'class', label: 'Class' },
  { key: 'order', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'species', label: 'Species' }
];

const StatsBar = ({ 
  stats, 
  onSearch, 
  setStats, 
  onMapReset, 
  onSpeciesSelect, 
  selectedSpecies,
  onFilterChange
}) => {
  const safeStats = {
    observasi: stats?.observasi || 0,
    taksa: stats?.taksa || 0,
    media: stats?.media || 0,
  };

  const [searchParams, setSearchParams] = useState({
    search: '',
    location: '',
    latitude: '',
    longitude: '',
    searchType: 'all'
  });

  const [filterParams, setFilterParams] = useState({
    start_date: '',
    end_date: '',
    date_type: 'created_at',
    grade: [],
    has_media: false,
    media_type: '',
    data_source: ['fobi'], // Default hanya FOBi/Amaturalist
    user_id: null,
    user_name: '',
    taxonomy_rank: '',
    taxonomy_value: '',
    location_name: '',
    location_source: ''
  });

  const [showFilter, setShowFilter] = useState(false);
  const [filterTab, setFilterTab] = useState('basic');
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameResults, setUsernameResults] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hierarchySelections, setHierarchySelections] = useState({});
  const [rankValues, setRankValues] = useState({});
  const [rankSearches, setRankSearches] = useState({});
  const [rankLoading, setRankLoading] = useState({});
  const [advLocationSearch, setAdvLocationSearch] = useState('');
  const [advLocationResults, setAdvLocationResults] = useState([]);
  const [isLoadingAdvLocation, setIsLoadingAdvLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  const [showSearchHint, setShowSearchHint] = useState(false);
  const [filterTaxaSearch, setFilterTaxaSearch] = useState('');
  const [filterTaxaSuggestions, setFilterTaxaSuggestions] = useState([]);
  const [isLoadingFilterTaxa, setIsLoadingFilterTaxa] = useState(false);
  const filterTaxaAbortRef = useRef(null);
  const filterTaxaRequestIdRef = useRef(0);
  const filterTaxaTimeoutRef = useRef(null);
  const filterTaxaSuggestionRef = useRef(null);

  const suggestionRef = useRef(null);
  const locationSuggestionRef = useRef(null);
  const searchButtonRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dataSourceRef = useRef(filterParams.data_source); // Ref untuk akses data_source terbaru di closure

  const [currentStatsPage, setCurrentStatsPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const suggestionContainerRef = useRef(null);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setDirection(1);
      setCurrentStatsPage((prev) => 
        prev === mobileStats.totalPages - 1 ? 0 : prev + 1
      );
    },
    onSwipedRight: () => {
      setDirection(-1);
      setCurrentStatsPage((prev) => 
        prev === 0 ? mobileStats.totalPages - 1 : prev - 1
      );
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionRef.current && 
        !suggestionRef.current.contains(event.target) &&
        !event.target.closest('input[placeholder="Spesies/ genus/ famili"]')
      ) {
        setSpeciesSuggestions([]);
      }
      if (
        locationSuggestionRef.current && 
        !locationSuggestionRef.current.contains(event.target) &&
        !event.target.closest('input[placeholder="Lokasi"]')
      ) {
        setLocationSuggestions([]);
      }
      if (
        filterTaxaSuggestionRef.current &&
        !filterTaxaSuggestionRef.current.contains(event.target)
      ) {
        setFilterTaxaSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchParams.location) {
        handleLocationSearch(searchParams.location);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchParams.location]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchParams.search && !searchParams.selectedId) {
        handleSpeciesSearch(searchParams.search);
      } else if (!searchParams.search) {
        setSpeciesSuggestions([]);
      }
    }, 300); // Delay 300ms untuk menghindari terlalu banyak request

    return () => clearTimeout(delayDebounceFn);
  }, [searchParams.search, searchParams.selectedId, filterParams.data_source]);

  const handleLocationSearch = async (locationName) => {
    if (!locationName) {
        setLocationSuggestions([]);
        return;
    }

    setIsLoadingLocation(true);
    try {
        const majorIslands = {
            'jawa': {
                display_name: 'Pulau Jawa, Indonesia',
                lat: -7.6145,
                lon: 110.7124,
                radius: 500,
                boundingbox: [-8.7, -5.9, 105.0, 114.4],
                type: 'island'
            },
            'sumatera': {
                display_name: 'Pulau Sumatera, Indonesia',
                lat: -0.5897,
                lon: 101.3431,
                radius: 500,
                boundingbox: [-6.0, 6.0, 95.0, 106.0],
                type: 'island'
            },
            'kalimantan': {
                display_name: 'Pulau Kalimantan, Indonesia',
                lat: 0.9619,
                lon: 114.5548,
                radius: 800,
                boundingbox: [-4.0, 7.0, 108.0, 119.0],
                type: 'island'
            },
            'sulawesi': {
                display_name: 'Pulau Sulawesi, Indonesia',
                lat: -2.5489,
                lon: 120.7999,
                radius: 600,
                boundingbox: [-6.0, 2.0, 118.0, 125.0],
                type: 'island'
            },
            'papua': {
                display_name: 'Pulau Papua, Indonesia',
                lat: -4.2690,
                lon: 138.0804,
                radius: 1000,
                boundingbox: [-9.0, 0.0, 130.0, 141.0],
                type: 'island'
            },
            'bali': {
                display_name: 'Pulau Bali, Indonesia',
                lat: -8.3405,
                lon: 115.0920,
                radius: 100,
                boundingbox: [-8.9, -8.0, 114.4, 115.7],
                type: 'island'
            },
            'nusa tenggara': {
                display_name: 'Kepulauan Nusa Tenggara, Indonesia',
                lat: -8.6524,
                lon: 118.7278,
                radius: 500,
                boundingbox: [-10.0, -8.0, 115.0, 125.0],
                type: 'island'
            },
            'maluku': {
                display_name: 'Kepulauan Maluku, Indonesia',
                lat: -3.2385,
                lon: 130.1452,
                radius: 500,
                boundingbox: [-8.0, 2.0, 124.0, 135.0],
                type: 'island'
            },
            'lombok': {
                display_name: 'Pulau Lombok, Nusa Tenggara Barat, Indonesia',
                lat: -8.6500,
                lon: 116.3200,
                radius: 100,
                boundingbox: [-8.9, -8.2, 115.9, 116.7],
                type: 'island'
            },
            'flores': {
                display_name: 'Pulau Flores, Nusa Tenggara Timur, Indonesia',
                lat: -8.6573,
                lon: 121.0794,
                radius: 150,
                boundingbox: [-9.0, -8.0, 119.9, 123.0],
                type: 'island'
            },
            'sumba': {
                display_name: 'Pulau Sumba, Nusa Tenggara Timur, Indonesia',
                lat: -9.6500,
                lon: 120.0000,
                radius: 150,
                boundingbox: [-10.5, -9.0, 118.9, 121.0],
                type: 'island'
            },
            'timor': {
                display_name: 'Pulau Timor, Nusa Tenggara Timur, Indonesia',
                lat: -9.5000,
                lon: 124.5000,
                radius: 150,
                boundingbox: [-10.3, -8.3, 123.3, 125.5],
                type: 'island'
            },
            'sumbawa': {
                display_name: 'Pulau Sumbawa, Nusa Tenggara Barat, Indonesia',
                lat: -8.7500,
                lon: 118.0000,
                radius: 150,
                boundingbox: [-9.1, -8.0, 116.5, 119.5],
                type: 'island'
            },
            'halmahera': {
                display_name: 'Pulau Halmahera, Maluku Utara, Indonesia',
                lat: 1.0000,
                lon: 128.0000,
                radius: 150,
                boundingbox: [0.0, 2.0, 127.0, 129.0],
                type: 'island'
            },
            'seram': {
                display_name: 'Pulau Seram, Maluku, Indonesia',
                lat: -3.1000,
                lon: 129.5000,
                radius: 150,
                boundingbox: [-3.7, -2.7, 128.0, 131.0],
                type: 'island'
            },
            'bangka': {
                display_name: 'Pulau Bangka, Bangka Belitung, Indonesia',
                lat: -2.1000,
                lon: 106.0000,
                radius: 100,
                boundingbox: [-3.0, -1.2, 105.0, 107.0],
                type: 'island'
            },
            'belitung': {
                display_name: 'Pulau Belitung, Bangka Belitung, Indonesia',
                lat: -2.8700,
                lon: 107.9500,
                radius: 80,
                boundingbox: [-3.2, -2.5, 107.5, 108.3],
                type: 'island'
            },
            'madura': {
                display_name: 'Pulau Madura, Jawa Timur, Indonesia',
                lat: -7.0000,
                lon: 113.3000,
                radius: 100,
                boundingbox: [-7.3, -6.7, 112.5, 114.1],
                type: 'island'
            }
        };
        const provinces = {
            'aceh': {
                display_name: 'Provinsi Aceh, Indonesia',
                lat: 4.6951,
                lon: 96.7494,
                radius: 250,
                boundingbox: [1.8, 6.2, 94.8, 98.5],
                type: 'province'
            },
            'sumatera utara': {
                display_name: 'Provinsi Sumatera Utara, Indonesia',
                lat: 2.1154,
                lon: 99.5451,
                radius: 200,
                boundingbox: [0.5, 4.0, 97.0, 100.5],
                type: 'province'
            },
            'sumatera barat': {
                display_name: 'Provinsi Sumatera Barat, Indonesia',
                lat: -0.7393,
                lon: 100.8000,
                radius: 150,
                boundingbox: [-3.0, 0.5, 98.5, 101.5],
                type: 'province'
            },
            'riau': {
                display_name: 'Provinsi Riau, Indonesia',
                lat: 0.2933,
                lon: 101.7068,
                radius: 200,
                boundingbox: [-1.0, 2.5, 100.0, 103.5],
                type: 'province'
            },
            'jambi': {
                display_name: 'Provinsi Jambi, Indonesia',
                lat: -1.4852,
                lon: 102.4381,
                radius: 150,
                boundingbox: [-2.5, -0.5, 101.0, 104.5],
                type: 'province'
            },
            'sumatera selatan': {
                display_name: 'Provinsi Sumatera Selatan, Indonesia',
                lat: -3.3194,
                lon: 103.9144,
                radius: 200,
                boundingbox: [-5.0, -1.5, 102.0, 106.0],
                type: 'province'
            },
            'bengkulu': {
                display_name: 'Provinsi Bengkulu, Indonesia',
                lat: -3.5778,
                lon: 102.3464,
                radius: 150,
                boundingbox: [-5.0, -2.0, 101.0, 104.0],
                type: 'province'
            },
            'lampung': {
                display_name: 'Provinsi Lampung, Indonesia',
                lat: -4.5585,
                lon: 105.4068,
                radius: 150,
                boundingbox: [-6.0, -3.5, 103.5, 106.5],
                type: 'province'
            },
            'kepulauan bangka belitung': {
                display_name: 'Provinsi Kepulauan Bangka Belitung, Indonesia',
                lat: -2.7411,
                lon: 106.4406,
                radius: 150,
                boundingbox: [-3.5, -1.5, 105.0, 109.0],
                type: 'province'
            },
            'kepulauan riau': {
                display_name: 'Provinsi Kepulauan Riau, Indonesia',
                lat: 3.9456,
                lon: 108.1428,
                radius: 200,
                boundingbox: [0.0, 5.0, 103.0, 110.0],
                type: 'province'
            },
            'dki jakarta': {
                display_name: 'Provinsi DKI Jakarta, Indonesia',
                lat: -6.2088,
                lon: 106.8456,
                radius: 30,
                boundingbox: [-6.4, -6.0, 106.6, 107.0],
                type: 'province'
            },
            'jawa barat': {
                display_name: 'Provinsi Jawa Barat, Indonesia',
                lat: -6.9175,
                lon: 107.6191,
                radius: 150,
                boundingbox: [-7.8, -5.9, 106.3, 109.0],
                type: 'province'
            },
            'jawa tengah': {
                display_name: 'Provinsi Jawa Tengah, Indonesia',
                lat: -7.1510,
                lon: 110.1403,
                radius: 150,
                boundingbox: [-8.2, -6.5, 108.5, 111.7],
                type: 'province'
            },
            'di yogyakarta': {
                display_name: 'Provinsi DI Yogyakarta, Indonesia',
                lat: -7.7956,
                lon: 110.3695,
                radius: 50,
                boundingbox: [-8.2, -7.5, 110.0, 110.8],
                type: 'province'
            },
            'jawa timur': {
                display_name: 'Provinsi Jawa Timur, Indonesia',
                lat: -7.5360,
                lon: 112.2384,
                radius: 200,
                boundingbox: [-8.8, -6.7, 111.0, 114.7],
                type: 'province'
            },
            'banten': {
                display_name: 'Provinsi Banten, Indonesia',
                lat: -6.4058,
                lon: 106.0640,
                radius: 100,
                boundingbox: [-7.0, -5.8, 105.0, 106.7],
                type: 'province'
            },
            'bali': {
                display_name: 'Provinsi Bali, Indonesia',
                lat: -8.3405,
                lon: 115.0920,
                radius: 80,
                boundingbox: [-8.9, -8.0, 114.4, 115.7],
                type: 'province'
            },
            'nusa tenggara barat': {
                display_name: 'Provinsi Nusa Tenggara Barat, Indonesia',
                lat: -8.6524,
                lon: 117.3616,
                radius: 150,
                boundingbox: [-9.1, -8.0, 115.8, 119.3],
                type: 'province'
            },
            'nusa tenggara timur': {
                display_name: 'Provinsi Nusa Tenggara Timur, Indonesia',
                lat: -8.6573,
                lon: 121.0794,
                radius: 250,
                boundingbox: [-11.0, -8.0, 118.5, 125.2],
                type: 'province'
            },
            'kalimantan barat': {
                display_name: 'Provinsi Kalimantan Barat, Indonesia',
                lat: 0.0000,
                lon: 111.0000,
                radius: 250,
                boundingbox: [-3.0, 2.0, 108.5, 114.0],
                type: 'province'
            },
            'kalimantan tengah': {
                display_name: 'Provinsi Kalimantan Tengah, Indonesia',
                lat: -1.6813,
                lon: 113.3823,
                radius: 250,
                boundingbox: [-3.5, 0.5, 110.5, 116.0],
                type: 'province'
            },
            'kalimantan selatan': {
                display_name: 'Provinsi Kalimantan Selatan, Indonesia',
                lat: -3.0926,
                lon: 115.2838,
                radius: 150,
                boundingbox: [-4.5, -1.5, 114.0, 117.0],
                type: 'province'
            },
            'kalimantan timur': {
                display_name: 'Provinsi Kalimantan Timur, Indonesia',
                lat: 0.5387,
                lon: 116.4194,
                radius: 250,
                boundingbox: [-2.0, 3.0, 114.0, 119.0],
                type: 'province'
            },
            'kalimantan utara': {
                display_name: 'Provinsi Kalimantan Utara, Indonesia',
                lat: 3.0726,
                lon: 116.0414,
                radius: 200,
                boundingbox: [1.0, 4.5, 114.5, 118.0],
                type: 'province'
            },
            'sulawesi utara': {
                display_name: 'Provinsi Sulawesi Utara, Indonesia',
                lat: 0.6246,
                lon: 123.9750,
                radius: 150,
                boundingbox: [-0.5, 2.5, 121.0, 125.5],
                type: 'province'
            },
            'sulawesi tengah': {
                display_name: 'Provinsi Sulawesi Tengah, Indonesia',
                lat: -1.4300,
                lon: 121.4456,
                radius: 200,
                boundingbox: [-3.0, 1.0, 119.0, 124.0],
                type: 'province'
            },
            'sulawesi selatan': {
                display_name: 'Provinsi Sulawesi Selatan, Indonesia',
                lat: -3.6687,
                lon: 119.9740,
                radius: 200,
                boundingbox: [-7.0, -0.5, 118.5, 122.5],
                type: 'province'
            },
            'sulawesi tenggara': {
                display_name: 'Provinsi Sulawesi Tenggara, Indonesia',
                lat: -4.1449,
                lon: 122.1746,
                radius: 200,
                boundingbox: [-6.0, -2.0, 120.5, 124.5],
                type: 'province'
            },
            'gorontalo': {
                display_name: 'Provinsi Gorontalo, Indonesia',
                lat: 0.6999,
                lon: 122.4467,
                radius: 100,
                boundingbox: [0.0, 1.5, 121.0, 123.5],
                type: 'province'
            },
            'sulawesi barat': {
                display_name: 'Provinsi Sulawesi Barat, Indonesia',
                lat: -2.8441,
                lon: 119.2321,
                radius: 150,
                boundingbox: [-3.5, -0.5, 118.5, 120.0],
                type: 'province'
            },
            'maluku': {
                display_name: 'Provinsi Maluku, Indonesia',
                lat: -3.2385,
                lon: 130.1452,
                radius: 300,
                boundingbox: [-8.0, 0.5, 125.0, 135.0],
                type: 'province'
            },
            'maluku utara': {
                display_name: 'Provinsi Maluku Utara, Indonesia',
                lat: 1.5709,
                lon: 127.8087,
                radius: 300,
                boundingbox: [-2.0, 3.0, 124.0, 129.0],
                type: 'province'
            },
            'papua': {
                display_name: 'Provinsi Papua, Indonesia',
                lat: -4.2690,
                lon: 138.0804,
                radius: 500,
                boundingbox: [-9.0, 0.0, 134.0, 141.0],
                type: 'province'
            },
            'papua barat': {
                display_name: 'Provinsi Papua Barat, Indonesia',
                lat: -1.3361,
                lon: 133.1747,
                radius: 300,
                boundingbox: [-4.0, 1.0, 129.0, 135.0],
                type: 'province'
            }
        };
        const majorCities = {
            'jakarta': {
                display_name: 'Jakarta, Indonesia',
                lat: -6.2088,
                lon: 106.8456,
                radius: 30,
                boundingbox: [-6.4, -6.0, 106.6, 107.0],
                type: 'city'
            },
            'surabaya': {
                display_name: 'Surabaya, Jawa Timur, Indonesia',
                lat: -7.2575,
                lon: 112.7521,
                radius: 20,
                boundingbox: [-7.4, -7.1, 112.5, 112.9],
                type: 'city'
            },
            'bandung': {
                display_name: 'Bandung, Jawa Barat, Indonesia',
                lat: -6.9175,
                lon: 107.6191,
                radius: 15,
                boundingbox: [-7.0, -6.8, 107.5, 107.7],
                type: 'city'
            },
            'medan': {
                display_name: 'Medan, Sumatera Utara, Indonesia',
                lat: 3.5952,
                lon: 98.6722,
                radius: 20,
                boundingbox: [3.4, 3.7, 98.5, 98.8],
                type: 'city'
            },
            'semarang': {
                display_name: 'Semarang, Jawa Tengah, Indonesia',
                lat: -7.0051,
                lon: 110.4381,
                radius: 15,
                boundingbox: [-7.1, -6.9, 110.3, 110.5],
                type: 'city'
            },
            'makassar': {
                display_name: 'Makassar, Sulawesi Selatan, Indonesia',
                lat: -5.1477,
                lon: 119.4327,
                radius: 15,
                boundingbox: [-5.2, -5.0, 119.3, 119.5],
                type: 'city'
            },
            'yogyakarta': {
                display_name: 'Yogyakarta, Indonesia',
                lat: -7.7956,
                lon: 110.3695,
                radius: 10,
                boundingbox: [-7.9, -7.7, 110.2, 110.5],
                type: 'city'
            },
            'denpasar': {
                display_name: 'Denpasar, Bali, Indonesia',
                lat: -8.6705,
                lon: 115.2126,
                radius: 10,
                boundingbox: [-8.7, -8.6, 115.1, 115.3],
                type: 'city'
            },
            'palembang': {
                display_name: 'Palembang, Sumatera Selatan, Indonesia',
                lat: -2.9761,
                lon: 104.7754,
                radius: 15,
                boundingbox: [-3.1, -2.8, 104.6, 104.9],
                type: 'city'
            }
        };
        const predefinedLocations = {...majorIslands, ...provinces, ...majorCities};
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(locationName + ' indonesia')}&` + // Tambahkan 'indonesia' untuk memfokuskan pencarian
            `limit=8&` + // Tingkatkan limit untuk mendapatkan lebih banyak hasil
            `addressdetails=1&` +
            `bounded=1&` +
            `countrycodes=id&` +
            `viewbox=95.0,6.0,141.0,-11.0&` + // Bounding box Indonesia
            `dedupe=1` // Hapus duplikat
        );
        const nominatimData = await response.json();
        const processedNominatim = nominatimData
            .filter(item => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                return !isNaN(lat) && !isNaN(lon) &&
                       lat >= -11.0 && lat <= 6.0 &&
                       lon >= 95.0 && lon <= 141.0;
            })
            .map(item => {
                const address = item.address;
                const parts = [];
                if (address.village || address.suburb) {
                    parts.push(address.village || address.suburb);
                }
                if (address.city || address.town || address.municipality || address.county) {
                    parts.push(address.city || address.town || address.municipality || address.county);
                }
                if (address.state || address.province) {
                    parts.push(address.state || address.province);
                }
                const displayName = parts.length > 0 ? parts.join(', ') + ', Indonesia' : item.display_name;

                const bbox = item.boundingbox.map(coord => parseFloat(coord));
                const [south, north, west, east] = bbox;
                const width = calculateDistance(south, west, south, east);
                const height = calculateDistance(south, west, north, west);
                const radius = Math.max(width, height) / 2;
                let locationType = 'area';
                if (address.city) locationType = 'city';
                else if (address.town) locationType = 'town';
                else if (address.municipality) locationType = 'municipality';
                else if (address.county) locationType = 'county';
                else if (address.village) locationType = 'village';
                else if (address.suburb) locationType = 'suburb';
                else if (address.state) locationType = 'province'; // Ubah state menjadi province untuk konsistensi
                const normalizedLon = ((parseFloat(item.lon) + 180) % 360) - 180;

                return {
                    display_name: displayName,
                    lat: parseFloat(item.lat),
                    lon: normalizedLon,
                    boundingbox: bbox,
                    radius: radius || 10, // Default radius 10km jika tidak bisa dihitung
                    type: locationType,
                    importance: item.importance || 0 // Untuk pengurutan
                };
            });
        const searchLower = locationName.toLowerCase();
        const suggestions = [];
        Object.entries(predefinedLocations).forEach(([key, locationData]) => {
            if (searchLower.includes(key) || key.includes(searchLower)) {
                suggestions.push({
                    ...locationData,
                    importance: 1 // Berikan prioritas tertinggi
                });
            }
        });
        suggestions.push(...processedNominatim);
        const uniqueSuggestions = Array.from(
            new Map(suggestions.map(item => [item.display_name, item])).values()
        );
        const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
            if (a.type === 'island' && b.type !== 'island') return -1;
            if (a.type !== 'island' && b.type === 'island') return 1;
            if (a.type === 'province' && b.type !== 'province') return -1;
            if (a.type !== 'province' && b.type === 'province') return 1;
            if (a.type === 'city' && b.type !== 'city') return -1;
            if (a.type !== 'city' && b.type === 'city') return 1;
            const aContainsSearch = a.display_name.toLowerCase().includes(searchLower);
            const bContainsSearch = b.display_name.toLowerCase().includes(searchLower);
            if (aContainsSearch && !bContainsSearch) return -1;
            if (!aContainsSearch && bContainsSearch) return 1;
            return b.importance - a.importance;
        });
        const limitedSuggestions = sortedSuggestions.slice(0, 15); // Tingkatkan limit dari 10 menjadi 15
        
        setLocationSuggestions(limitedSuggestions);
    } catch (error) {
        console.error('Error searching location:', error);
        setLocationSuggestions([]);
    } finally {
        setIsLoadingLocation(false);
    }
};

  const handleLocationSelect = (location) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    const bbox = location.boundingbox;
    if (isNaN(lat) || isNaN(lon) || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180) {
        console.error('Invalid coordinates:', {lat, lon});
        return;
    }
    const zoomLevel = calculateZoomLevel(location.radius, bbox);

    setSearchParams({
        ...searchParams,
        location: location.display_name,
        latitude: lat,
        longitude: lon,
        radius: location.radius,
        boundingbox: bbox,
        zoomLevel: zoomLevel
    });

    setLocationSuggestions([]);
    if (onFilterChange) {
        onFilterChange({
            latitude: lat,
            longitude: lon,
            radius: location.radius || 10, // Default radius 10km
            autoSubmit: false // Flag untuk menandakan tidak perlu submit otomatis
        });
    }
    setShowSearchHint(true);
    setTimeout(() => {
      setShowSearchHint(false);
    }, 5000);
  };

  const handleSearch = async () => {
    const formattedParams = {
        ...searchParams,
        ...filterParams,
        autoSubmit: true
    };
    onSearch(formattedParams);

    setShowFilter(false);
  };
  const handleSearchUsers = useCallback(async (query) => {
    setUsernameSearch(query);
    if (query.length < 2) {
      setUsernameResults([]);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search-users?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) setUsernameResults(data.data);
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);
  const handleSearchAdvLocations = useCallback(async (query) => {
    setAdvLocationSearch(query);
    if (query.length < 2) {
      setAdvLocationResults([]);
      return;
    }
    setIsLoadingAdvLocation(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search-locations?q=${encodeURIComponent(query)}&limit=15`);
      const data = await res.json();
      if (data.success) setAdvLocationResults(data.data || []);
    } catch (e) {
      console.error('Error searching locations:', e);
    } finally {
      setIsLoadingAdvLocation(false);
    }
  }, []);
  const handleAdvLocationSelect = (location) => {
    setFilterParams(prev => {
      let newDataSource = [...(prev.data_source || ['fobi'])];
      if (location.source === 'burungnesia' && !newDataSource.includes('burungnesia')) {
        newDataSource.push('burungnesia');
      }
      if (location.source === 'kupunesia' && !newDataSource.includes('kupunesia')) {
        newDataSource.push('kupunesia');
      }
      if (location.source === 'fobi' && !newDataSource.includes('fobi')) {
        newDataSource.push('fobi');
      }
      
      return {
        ...prev,
        location_name: location.name,
        location_source: location.source,
        data_source: newDataSource
      };
    });
    setAdvLocationResults([]);
    setAdvLocationSearch(location.name);
  };
  const fetchRankValues = useCallback(async (rank, parentRank = '', parentValue = '', search = '') => {
    setRankLoading(prev => ({ ...prev, [rank]: true }));
    try {
      const params = new URLSearchParams({ rank, search, limit: 100 });
      if (parentRank && parentValue) {
        params.append('parent_rank', parentRank);
        params.append('parent_value', parentValue);
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/taxa/rank-values?${params}`);
      const data = await res.json();
      if (data.success) {
        setRankValues(prev => ({ ...prev, [rank]: data.data }));
      }
    } catch (e) {
      console.error('Error fetching rank values:', e);
    } finally {
      setRankLoading(prev => ({ ...prev, [rank]: false }));
    }
  }, []);
  const handleRankSelect = useCallback((rank, value) => {
    const newSelections = { ...hierarchySelections };
    const rankIndex = TAXONOMY_RANKS.findIndex(r => r.key === rank);
    TAXONOMY_RANKS.slice(rankIndex + 1).forEach(r => { delete newSelections[r.key]; });
    newSelections[rank] = value;
    setHierarchySelections(newSelections);
    setFilterParams(prev => ({ ...prev, taxonomy_rank: rank, taxonomy_value: value, taxonomy_from_category: false }));
    TAXONOMY_RANKS.slice(rankIndex + 1).forEach(childRank => {
      fetchRankValues(childRank.key, rank, value);
    });
  }, [hierarchySelections, fetchRankValues]);
  const handleRankSearch = useCallback((rank, search) => {
    setRankSearches(prev => ({ ...prev, [rank]: search }));
    const rankIndex = TAXONOMY_RANKS.findIndex(r => r.key === rank);
    let parentRank = '';
    let parentValue = '';
    for (let i = rankIndex - 1; i >= 0; i--) {
      const prevRank = TAXONOMY_RANKS[i].key;
      if (hierarchySelections[prevRank]) {
        parentRank = prevRank;
        parentValue = hierarchySelections[prevRank];
        break;
      }
    }
    fetchRankValues(rank, parentRank, parentValue, search);
  }, [hierarchySelections, fetchRankValues]);

  const handleApplyFilter = () => {
    setShowFilter(false);
    
    const activeSources = dataSourceRef.current || filterParams.data_source;
    const filters = {
      grade: filterParams.grade,
      data_source: activeSources,
      has_media: filterParams.has_media,
      media_type: filterParams.media_type || null,
      start_date: filterParams.start_date || null,
      end_date: filterParams.end_date || null,
      date_type: filterParams.date_type || 'created_at',
      user_id: filterParams.user_id || null,
      user_name: filterParams.user_name || null,
      taxonomy_rank: filterParams.taxonomy_rank || null,
      taxonomy_value: filterParams.taxonomy_value || null,
      location_name: filterParams.location_name || null,
      location_source: filterParams.location_source || null,
      autoSubmit: true,
      skipSearch: true
    };
    if (filterParams.taxonomy_value && !filterParams.taxonomy_from_category) {
      setSearchParams(prev => ({
        ...prev,
        search: filterParams.taxonomy_value,
        searchType: filterParams.taxonomy_rank || 'species',
        display: filterParams.taxonomy_value
      }));
    }
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const handleResetFilter = () => {
    const defaultSearchParams = {
      search: '',
      location: '',
      latitude: '',
      longitude: '',
      searchType: 'all',
      display: '',
      selectedId: null,
      species: null
    };
    
    setSearchParams(defaultSearchParams);
    const defaultFilters = {
      start_date: '',
      end_date: '',
      date_type: 'created_at',
      grade: [],
      has_media: false,
      media_type: '',
      data_source: ['fobi'],
      user_id: null,
      user_name: '',
      taxonomy_rank: '',
      taxonomy_value: '',
      location_name: '',
      location_source: ''
    };
    
    setFilterParams(defaultFilters);
    dataSourceRef.current = ['fobi']; // Reset ref juga
    setUsernameSearch('');
    setUsernameResults([]);
    setHierarchySelections({});
    setRankValues({});
    setRankSearches({});
    setAdvLocationSearch('');
    setAdvLocationResults([]);
    setFilterTab('basic');
    setSpeciesSuggestions([]);
    setLocationSuggestions([]);
    setFilterTaxaSearch('');
    setFilterTaxaSuggestions([]);
    setShowSearchHint(false);
    setShowFilter(false);
    if (onSearch) {
      onSearch(defaultSearchParams);
    }
    if (onFilterChange) {
      onFilterChange({
        search: '',
        grade: [],
        data_source: ['fobi'],
        has_media: false,
        media_type: null,
        start_date: null,
        end_date: null,
        date_type: 'created_at',
        user_id: null,
        user_name: null,
        taxonomy_rank: null,
        taxonomy_value: null,
        location_name: null,
        autoSubmit: true,
        skipSearch: true // onSearch sudah dipanggil di atas
      });
    }
    if (onMapReset) {
      onMapReset();
    }
    if (setStats) {
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
    }
  };
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSpeciesSearch = async (query, pageNum = 1) => {
    if (!query) {
      setSpeciesSuggestions([]);
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    setIsLoadingSpecies(true);
    try {
      const activeSources = dataSourceRef.current || filterParams.data_source || ['fobi'];
      const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=20&${sourceParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: abortControllerRef.current.signal
        }
      );
      if (currentRequestId === requestIdRef.current && response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          if (currentRequestId === requestIdRef.current) {
            if (pageNum === 1) {
              setSpeciesSuggestions(data.data);
            } else {
              setSpeciesSuggestions(prev => [...prev, ...data.data]);
            }
            setPage(pageNum);
            setHasMore(data.pagination ? pageNum < data.pagination.total_pages : false);
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
        console.error('Error searching species:', error);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingSpecies(false);
      }
    }
  };

  const getTaxonomicRankOrder = () => {
    const ranks = [
      'domain',
      'superkingdom',
      'kingdom',
      'subkingdom',
      'superphylum',
      'phylum',
      'subphylum',
      'superclass',
      'class',
      'subclass',
      'infraclass',
      'superorder',
      'order',
      'suborder',
      'infraorder',
      'superfamily',
      'family',
      'subfamily',
      'supertribe',
      'tribe',
      'subtribe',
      'genus',
      'subgenus',
      'species',
      'subspecies',
      'variety',
      'form'
    ];
    return ranks.reduce((acc, rank, index) => {
      acc[rank] = index;
      return acc;
    }, {});
  };

  const handleSpeciesSelect = async (suggestion) => {
    setShowFilter(false);
    if (suggestion.taxonomic_status === 'SYNONYM' && suggestion.accepted_scientific_name) {
      try {
        setIsLoadingSpecies(true);
        const activeSources = dataSourceRef.current || filterParams.data_source || ['fobi'];
        const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/species-suggestions?` +
          `query=${encodeURIComponent(suggestion.accepted_scientific_name)}&` +
          `page=1&` +
          `per_page=1&` +
          `include_all_taxa=true&${sourceParams}`
        );
        const responseData = await response.json();
        
        if (responseData.success && responseData.data && responseData.data.length > 0) {
          const acceptedTaxon = responseData.data.find(item => 
            item.scientific_name === suggestion.accepted_scientific_name &&
            item.taxonomic_status === 'ACCEPTED'
          ) || responseData.data[0]; // Fallback to first result
          
          if (acceptedTaxon) {
            console.log(`Redirecting from synonym "${suggestion.scientific_name}" to accepted name "${acceptedTaxon.scientific_name}"`);
            suggestion = acceptedTaxon;
          }
        }
      } catch (error) {
        console.error('Error fetching accepted taxon:', error);
      } finally {
        setIsLoadingSpecies(false);
      }
    }
    const normalizedScientificName = normalizeScientificName(suggestion.scientific_name);
    let displayName = suggestion.scientific_name;
    if (suggestion.common_name) {
      displayName += ` (${suggestion.common_name})`;
    } else if (suggestion.rank) {
      displayName += ` - ${suggestion.rank.charAt(0).toUpperCase() + suggestion.rank.slice(1)}`;
    }
    
    const newSearchParams = {
      ...searchParams,
      search: normalizedScientificName, // Use normalized name for search
      display: displayName, // Keep full name for display
      searchType: suggestion.rank,
      selectedId: suggestion.id,
      species: {
        id: suggestion.id,
        rank: suggestion.rank,
        scientific_name: normalizedScientificName, // Use normalized name
        display_name: displayName,
        common_name: suggestion.common_name,
        family: suggestion.full_data?.family
      }
    };
    
    setSearchParams(newSearchParams);
    setSpeciesSuggestions([]);
    setFilterParams(prev => ({
      ...prev,
      taxonomy_rank: suggestion.rank,
      taxonomy_value: normalizedScientificName
    }));
    setFilterTaxaSearch(displayName);
    if (onSearch) {
      onSearch(newSearchParams);
    }
    const activeSources = dataSourceRef.current || filterParams.data_source || ['fobi'];
    if (onFilterChange) {
      onFilterChange({
        taxa_id: suggestion.id,
        search: normalizedScientificName,
        searchType: suggestion.rank,
        taxonomy_rank: suggestion.rank,
        taxonomy_value: normalizedScientificName,
        data_source: activeSources,
        radius: 10, // Default radius
        autoSubmit: true, // Trigger fetchFilteredStats
        skipSearch: true // Jangan panggil onSearch lagi — sudah dipanggil di atas
      });
    }
  };
  const handleFilterTaxaSearch = async (query) => {
    if (!query || query.length < 2) {
      setFilterTaxaSuggestions([]);
      return;
    }
    if (filterTaxaAbortRef.current) filterTaxaAbortRef.current.abort();
    filterTaxaAbortRef.current = new AbortController();
    const currentReqId = ++filterTaxaRequestIdRef.current;
    setIsLoadingFilterTaxa(true);
    try {
      const activeSources = dataSourceRef.current || filterParams.data_source || ['fobi'];
      const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(query)}&page=1&per_page=20&include_all_taxa=true&${sourceParams}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: filterTaxaAbortRef.current.signal
        }
      );
      if (currentReqId === filterTaxaRequestIdRef.current && response.ok) {
        const data = await response.json();
        if (data.success && data.data && currentReqId === filterTaxaRequestIdRef.current) {
          const grouped = groupSuggestionsHierarchically(data.data);
          setFilterTaxaSuggestions(grouped);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error filter taxa search:', error);
    } finally {
      if (currentReqId === filterTaxaRequestIdRef.current) setIsLoadingFilterTaxa(false);
    }
  };

  const handleFilterTaxaSelect = async (suggestion) => {
    const isSynonym = (suggestion?.full_data?.taxonomic_status || suggestion?.taxonomic_status) === 'SYNONYM';
    const acceptedName = suggestion?.full_data?.accepted_scientific_name || suggestion?.accepted_scientific_name;
    if (isSynonym && acceptedName) {
      try {
        setIsLoadingFilterTaxa(true);
        const activeSources = dataSourceRef.current || filterParams.data_source || ['fobi'];
        const sourceParams = activeSources.map(s => `data_source[]=${encodeURIComponent(s)}`).join('&');
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(acceptedName)}&page=1&per_page=1&include_all_taxa=true&${sourceParams}`
        );
        const respJson = await resp.json();
        if (respJson?.success && Array.isArray(respJson?.data) && respJson.data.length > 0) {
          const accepted = respJson.data.find(item =>
            item.scientific_name === acceptedName && ((item?.full_data?.taxonomic_status || item?.taxonomic_status) === 'ACCEPTED')
          ) || respJson.data[0];
          if (accepted) suggestion = accepted;
        }
      } catch (e) { console.error('Error fetching accepted taxon:', e); }
      finally { setIsLoadingFilterTaxa(false); }
    }

    const normalized = normalizeScientificName(suggestion.scientific_name || '');
    const rank = suggestion.rank || 'species';
    const displayName = suggestion.common_name
      ? `${suggestion.scientific_name} (${suggestion.common_name})`
      : suggestion.scientific_name;

    setFilterTaxaSearch(displayName);
    setFilterTaxaSuggestions([]);
    setFilterParams(prev => ({
      ...prev,
      taxonomy_rank: rank,
      taxonomy_value: normalized,
      taxonomy_from_category: false
    }));
  };
  const formatDisplayName = (item) => {
    const rank = item.rank || getTaxonomicLevel(item);
    const scientificName = item[rank] || item.scientific_name;
    const commonName = item[`cname_${rank}`] || item.common_name;

    let displayName = scientificName;
    if (commonName) {
      displayName += ` (${commonName})`;
    }

    return displayName;
  };

  const getTaxonomicLevel = (item) => {
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
    for (let i = ranks.length - 1; i >= 0; i--) {
      const rank = ranks[i];
      if (item[rank]) {
        return rank;
      }
    }
    if (item.taxon_rank) {
      return item.taxon_rank;
    }
    
    return 'species'; // default fallback
  };

  const fetchFilteredStats = async (params) => {
    try {
      const queryParts = [];

      if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.taxonomy_rank) queryParts.push(`taxonomy_rank=${encodeURIComponent(params.taxonomy_rank)}`);
      if (params.taxonomy_value) queryParts.push(`taxonomy_value=${encodeURIComponent(params.taxonomy_value)}`);
      if (params.location_name) queryParts.push(`location_name=${encodeURIComponent(params.location_name)}`);
      if (params.polygon) queryParts.push(`polygon=${encodeURIComponent(params.polygon)}`);
      
      if (params.data_source?.length) {
        params.data_source.forEach(ds => queryParts.push(`data_source[]=${encodeURIComponent(ds)}`));
      } else {
        queryParts.push('data_source[]=fobi', 'data_source[]=burungnesia', 'data_source[]=kupunesia');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?${queryParts.join('&')}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          observasi: data.stats.observasi || 0,
          taksa: data.stats.taksa || 0,
          media: data.stats.media || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching filtered stats:', error);
      return null;
    }
  };
  const debouncedFetchStats = useCallback(
    debounce(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/filtered-stats?data_source[]=fobi&data_source[]=burungnesia&data_source[]=kupunesia`);
        const data = await response.json();
        if (data.success) {
          return {
            observasi: data.stats.observasi || 0,
            taksa: data.stats.taksa || 0,
            media: data.stats.media || 0,
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
      }
    }, 1000),
    []
  );
  const handleReset = async () => {
    try {
      const defaultSearchParams = {
        search: '',
        location: '',
        latitude: '',
        longitude: '',
        searchType: 'all',
        selectedId: null,
        display: '',
        species: null
      };
      
      setSearchParams(defaultSearchParams);

      const defaultFilterParams = {
        start_date: '',
        end_date: '',
        grade: [],
        has_media: false,
        media_type: '',
        data_source: ['fobi']
      };
      
      setFilterParams(defaultFilterParams);
      if (onFilterChange) {
        onFilterChange({
          search: '',
          polygon: null,
          start_date: null,
          end_date: null,
          latitude: null,
          longitude: null,
          radius: 10,
          grade: [],
          data_source: ['fobi'],
          has_media: false,
          media_type: null
        });
      }
      const cachedStats = localStorage.getItem('cachedStats');
      if (cachedStats && setStats) {
        setStats(JSON.parse(cachedStats));
      }

      if (onMapReset) {
        onMapReset();
      }

      setShowFilter(false);
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  };
  useEffect(() => {
    return () => {
      debouncedFetchStats.cancel();
    };
  }, [debouncedFetchStats]);
  const hasActiveFilters = () => {
    return Boolean(
      searchParams.search || 
      searchParams.location || 
      searchParams.selectedId ||
      filterParams.start_date || 
      filterParams.end_date || 
      filterParams.grade.length > 0 || 
      filterParams.has_media || 
      filterParams.media_type ||
      (filterParams.data_source.length !== 1 || !filterParams.data_source.includes('fobi')) // Cek jika bukan default FOBi saja
    );
  };
  const statsData = useMemo(() => {
    const baseStats = [
      { label: 'OBSERVASI', value: safeStats.observasi, duration: 0.5 },
      { label: 'TAKSA', value: safeStats.taksa, duration: 0.5 },
      { label: 'MEDIA', value: safeStats.media, duration: 0.5 },
    ];
    return baseStats;
  }, [safeStats]);
  const mobileStats = useMemo(() => {
    const itemsPerPage = 3;
    const pages = Math.ceil(statsData.length / itemsPerPage);
    const start = currentStatsPage * itemsPerPage;
    const end = start + itemsPerPage;
    
    return {
      currentItems: statsData.slice(start, end),
      totalPages: pages
    };
  }, [statsData, currentStatsPage]);
  const groupSuggestionsByHierarchy = (suggestions) => {
    const searchTerm = searchParams.search.toLowerCase();
    const normalizedSearchTerm = searchTerm.replace(/-/g, ' ');
    const alternativeSearchTerm = searchTerm.replace(/\s+/g, '-');
    const taxonomicRanks = [
      'domain', 'superkingdom', 'kingdom', 'subkingdom',
      'superphylum', 'phylum', 'subphylum',
      'superclass', 'class', 'subclass', 'infraclass',
      'superorder', 'order', 'suborder', 'infraorder',
      'superfamily', 'family', 'subfamily',
      'supertribe', 'tribe', 'subtribe',
      'genus', 'subgenus',
      'species', 'subspecies', 'variety', 'form'
    ];
    const grouped = {};
    taxonomicRanks.forEach(rank => {
      grouped[rank] = [];
    });
    const matchesSearch = (term) => {
      if (!term) return false;
      const termLower = term.toLowerCase();
      const termNormalized = termLower.replace(/-/g, ' '); // Remove hyphens from term
      return termNormalized.includes(normalizedSearchTerm) || termLower.includes(normalizedSearchTerm) || termLower.includes(alternativeSearchTerm);
    };
    suggestions.forEach(suggestion => {
      const rank = suggestion.rank || suggestion.taxon_rank;
      let isMatch = false;
      if (matchesSearch(suggestion.scientific_name)) {
        isMatch = true;
      }
      if (matchesSearch(suggestion.common_name)) {
        isMatch = true;
      }
      if (suggestion.full_data) {
        taxonomicRanks.forEach(rankField => {
          if (matchesSearch(suggestion.full_data[rankField])) {
            isMatch = true;
          }
          const cnameField = `cname_${rankField}`;
          if (matchesSearch(suggestion.full_data[cnameField])) {
            isMatch = true;
          }
        });
        const cnameFields = ['Cname', 'Cname_two', 'Cname_three', 'Cname_four', 'Cname_five', 
                            'Cname_six', 'Cname_seven', 'Cname_eight', 'Cname_nine', 'Cname_ten'];
        
        cnameFields.forEach(cnameField => {
          if (matchesSearch(suggestion.full_data[cnameField])) {
            isMatch = true;
          }
        });
      }
      if (isMatch && rank && taxonomicRanks.includes(rank)) {
        const exists = grouped[rank].some(item => 
          item.id === suggestion.id || 
          item.scientific_name === suggestion.scientific_name
        );
        
        if (!exists) {
          grouped[rank].push({
            id: suggestion.id,
            rank: rank,
            scientific_name: suggestion.scientific_name,
            common_name: suggestion.common_name,
            full_data: suggestion.full_data
          });
        }
      }
    });
    const result = {};
    taxonomicRanks.forEach(rank => {
      if (grouped[rank].length > 0) {
        result[rank] = grouped[rank].sort((a, b) => {
          const aName = a.scientific_name || '';
          const bName = b.scientific_name || '';
          return aName.localeCompare(bName);
        });
      }
    });
    
    return result;
  };
  const handleScroll = useCallback((e) => {
    const element = e.target;
    if (
      !loading &&
      hasMore &&
      element.scrollHeight - element.scrollTop <= element.clientHeight + 100
    ) {
      handleSpeciesSearch(searchParams.search, page + 1);
    }
  }, [loading, hasMore, page, searchParams.search]);
  useEffect(() => {
    const container = suggestionContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  const handleDataSourceChange = (source, isChecked) => {
    const newSources = isChecked
      ? [...filterParams.data_source, source]
      : filterParams.data_source.filter(s => s !== source);
    if (newSources.length > 0) {
      dataSourceRef.current = newSources;
      const hasNonFobi = newSources.some(s => s === 'burungnesia' || s === 'kupunesia');
      const newGrade = hasNonFobi ? [] : filterParams.grade;
      setFilterParams(prev => ({
        ...prev,
        data_source: newSources,
        grade: hasNonFobi ? [] : prev.grade
      }));
      if (onFilterChange) {
        onFilterChange({
          ...filterParams,
          data_source: newSources,
          grade: newGrade,
          autoSubmit: true,
          skipSearch: true
        });
      }
    }
  };
  const groupSuggestionsHierarchically = (suggestions) => {
    const hierarchyMap = new Map();
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
        if (aRank !== bRank) return bRank - aRank; // Rank tertinggi dulu
        return (a.scientific_name || '').localeCompare(b.scientific_name || '');
      });
    });
    const rootNodes = hierarchyNodes.filter(node => !node.isProcessed);
    rootNodes.sort((a, b) => {
      const aRank = getRankOrder(a.rank);
      const bRank = getRankOrder(b.rank);
      if (aRank !== bRank) return bRank - aRank; // Rank tertinggi dulu
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
  const sortSuggestionsByRelevance = (suggestions, searchTerm) => {
    const normalizedSearchTerm = searchTerm.toLowerCase().replace(/-/g, ' ');
    const alternativeSearchTerm = searchTerm.toLowerCase().replace(/\s+/g, '-');
    
    return [...suggestions].sort((a, b) => {
      const aCommonName = (a.common_name || '').toLowerCase();
      const bCommonName = (b.common_name || '').toLowerCase();
      if (aCommonName === normalizedSearchTerm || aCommonName === alternativeSearchTerm) return -1;
      if (bCommonName === normalizedSearchTerm || bCommonName === alternativeSearchTerm) return 1;
      if (aCommonName.startsWith(normalizedSearchTerm) || aCommonName.startsWith(alternativeSearchTerm)) return -1;
      if (bCommonName.startsWith(normalizedSearchTerm) || bCommonName.startsWith(alternativeSearchTerm)) return 1;
      const aContainsCommon = aCommonName.includes(normalizedSearchTerm) || aCommonName.includes(alternativeSearchTerm);
      const bContainsCommon = bCommonName.includes(normalizedSearchTerm) || bCommonName.includes(alternativeSearchTerm);
      if (aContainsCommon && !bContainsCommon) return -1;
      if (!aContainsCommon && bContainsCommon) return 1;
      const aRankOrder = getRankOrder(a.rank);
      const bRankOrder = getRankOrder(b.rank);
      return aRankOrder - bRankOrder;
    });
  };
  const normalizeScientificName = (scientificName) => {
    if (!scientificName) return scientificName;
    
    let normalized = scientificName
      .replace(/\s*\([^)]*\d{4}[^)]*\)/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*,\s*[A-Z][a-zA-Z]*)*(?:\s*&\s*[A-Z][a-zA-Z]*)?\s*,\s*\d{4}.*$/g, '')
      .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s+[A-Z][a-zA-Z]*(?:\s*,\s*\d{4}.*)?$/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*(?:\s*,\s*\d{4}.*)?$/g, '')
      .replace(/\s+[A-Z][a-zA-Z]*(?:\s*&\s*[A-Z][a-zA-Z]*)*,\s*$/g, '')
      .replace(/\s+[A-Z][a-z]*\.\s*$/g, '')
      .replace(/\s+[A-Z](?:\.[A-Z])*\.?\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
  };
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
      'superphylum': 23,
      'subkingdom': 24,
      'kingdom': 25,
      'superkingdom': 26,
      'domain': 27
    };
    return rankOrder[rank] || 99;
  };

  return (
    <div className="flex flex-col items-center bg-[#121212] mt-10 md:mt-12 md:p-0 text-white w-full md:flex-row md:justify-between relative">
      <div className="hidden md:flex flex-col items-center w-full md:flex-row md:justify-start md:w-auto mt-2">
        <div className="relative w-full md:w-60 md:mr-2">
          <input
            type="text"
            placeholder="Spesies/ genus/ famili"
            value={searchParams.display || searchParams.search}
            onChange={(e) => {
              const value = e.target.value;
              setSearchParams({
                ...searchParams,
                search: value,
                display: value,
                selectedId: null
              });
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              if (value.trim()) {
                setIsLoadingSpecies(true); // Show loading immediately
                searchTimeoutRef.current = setTimeout(() => {
                  const normalizedQuery = value.trim();
                  handleSpeciesSearch(normalizedQuery);
                }, 300); // 300ms debounce
              } else {
                setSpeciesSuggestions([]);
                setIsLoadingSpecies(false);
              }
            }}
            className="m-2 p-2 w-full md:w-60 border-none text-sm rounded bg-[#1e1e1e] text-white placeholder-gray-400"
          />
          
          {/* Loading indicator */}
          {isLoadingSpecies ? (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <FontAwesomeIcon icon={faSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          )}

          {speciesSuggestions.length > 0 && !searchParams.selectedId && (
            <div 
              ref={suggestionRef}
              className="absolute z-50 w-[400px] bg-[#1e1e1e] mt-1 rounded shadow-lg max-h-[400px] overflow-y-auto"
              style={{
                left: '0',
                minWidth: 'max-content',
                maxWidth: '500px'
              }}
            >
              {/* Indikator sumber data aktif */}
              {filterParams.data_source.length < 3 && (
                <div className="px-3 py-1.5 bg-[#252525] border-b border-[#444] text-[10px] text-gray-500">
                  Hasil dari: {filterParams.data_source.map(s => s === 'fobi' ? 'Amaturalist' : s === 'burungnesia' ? 'Burungnesia' : 'Kupunesia').join(', ')}
                </div>
              )}

              {/* Loading indicator di bagian atas */}
              {isLoadingSpecies && page === 1 && (
                <div className="p-3 text-center text-gray-300 border-b border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Mencari...
                </div>
              )}

              {/* Render suggestions for ALL taxonomic ranks */}
              {(() => {
                const hierarchicalSuggestions = groupSuggestionsHierarchically(speciesSuggestions);
                
                return hierarchicalSuggestions.map((suggestion, index) => {
                  const isChild = suggestion.isChild;
                  const isParent = suggestion.isParent;
                  const hierarchyLevel = suggestion.hierarchyLevel || 0;
                  const indentClass = ''; // Remove indentation
                  const bgClass = 'bg-[#333]'; // Uniform background
                  const hoverClass = 'hover:bg-[#3a3a3a]'; // Uniform hover
                  
                  return (
                    <div
                      key={`hierarchical-${suggestion.id}-${index}`}
                      className={`p-3 ${bgClass} cursor-pointer text-gray-200 border-b border-[#444] ${hoverClass} transition-colors ${indentClass}`}
                      onClick={() => handleSpeciesSelect({
                        id: suggestion.id,
                        rank: suggestion.rank,
                        scientific_name: suggestion.scientific_name,
                        common_name: suggestion.common_name,
                        taxonomic_status: suggestion.taxonomic_status,
                        accepted_scientific_name: suggestion.accepted_scientific_name,
                        full_data: suggestion.full_data
                      })}
                    >
                      <div className="font-medium text-sm">
                        {/* Add visual indicator for child taxa */}
                        {isChild && (
                          <span className="text-gray-500 mr-2"></span>
                        )}
                        <i>{suggestion.scientific_name}</i>
                        {suggestion.common_name && (
                          <span className="text-gray-400"> ({suggestion.common_name})</span>
                        )}
                        {/* Show rank for clarity */}
                        <span className="text-gray-500 text-xs ml-2">
                          [{suggestion.rank}]
                        </span>
                        {suggestion.taxonomic_status === 'SYNONYM' && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs rounded">
                            SINONIM
                          </span>
                        )}
                      </div>
                      
                      {/* Show display name if different from scientific name */}
                      {suggestion.display_name && suggestion.display_name !== suggestion.scientific_name && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {suggestion.display_name}
                        </div>
                      )}
                      
                      {/* Show family context for lower ranks - only for non-child or if parent doesn't have family info */}
                      {suggestion.full_data && suggestion.full_data.family && 
                       !['family', 'subfamily'].includes(suggestion.rank) && 
                       (!isChild || !isParent) && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Family: {suggestion.full_data.family}
                          {suggestion.full_data.cname_family && (
                            <span> ({suggestion.full_data.cname_family})</span>
                          )}
                        </div>
                      )}
                      
                      {/* Show accepted name for synonyms */}
                      {suggestion.taxonomic_status === 'SYNONYM' && suggestion.accepted_scientific_name && (
                        <div className="text-[11px] text-orange-300 mt-0.5">
                          → Nama diterima: <i>{suggestion.accepted_scientific_name}</i>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Tampilkan pesan jika tidak ada hasil */}
              {speciesSuggestions.length === 0 && !isLoadingSpecies && (
                <div className="p-3 text-center text-gray-300">
                  Tidak ada hasil ditemukan
                </div>
              )}

              {/* Loading indicator untuk infinite scroll */}
              {isLoadingSpecies && page > 1 && (
                <div className="p-3 text-center text-gray-300 border-t border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Memuat lebih banyak...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative w-full md:w-60 md:mr-5">
          <input
            type="text"
            placeholder="Lokasi"
            value={searchParams.location}
            onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
            className="m-2 p-2 w-full md:w-60 border-none text-sm rounded bg-[#1e1e1e] text-white placeholder-gray-400"
          />
          <FontAwesomeIcon
            icon={faMapMarkerAlt}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />

          {locationSuggestions.length > 0 && (
            <div 
              ref={locationSuggestionRef} 
              className="absolute z-50 w-[400px] bg-[#1e1e1e] mt-1 rounded shadow-lg max-h-[300px] overflow-y-auto"
              style={{
                left: '0',
                minWidth: 'max-content',
                maxWidth: '500px'
              }}
            >
              {/* Loading indicator */}
              {isLoadingLocation && (
                <div className="p-3 text-center text-gray-300 border-b border-[#444]">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500 mr-2"></div>
                  Mencari lokasi...
                </div>
              )}

              {/* Group locations by type */}
              {locationSuggestions.map((location, index) => {
                let icon = faMapMarkerAlt; // default icon
                let typeLabel = 'Area';
                
                if (location.type === 'island') {
                  typeLabel = 'Pulau';
                } else if (location.type === 'city') {
                  typeLabel = 'Kota';
                } else if (location.type === 'town') {
                  typeLabel = 'Kota/Kabupaten';
                } else if (location.type === 'municipality') {
                  typeLabel = 'Kota Madya';
                } else if (location.type === 'county') {
                  typeLabel = 'Kabupaten';
                } else if (location.type === 'village') {
                  typeLabel = 'Desa';
                } else if (location.type === 'suburb') {
                  typeLabel = 'Kecamatan';
                } else if (location.type === 'state') {
                  typeLabel = 'Provinsi';
                }
                
                return (
                  <div 
                    key={index}
                    className="cursor-pointer border-b border-[#444] hover:bg-[#333] transition-colors"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="text-[10px] text-gray-400 px-3 pt-2">
                      {typeLabel}
                    </div>
                    <div className="p-3 flex items-start">
                      <FontAwesomeIcon icon={icon} className="text-gray-400 mt-1 mr-2" />
                      <div>
                        <div className="font-medium text-sm text-gray-200">
                      {location.display_name}
                    </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Koordinat: {location.lat.toFixed(4)}, {location.lon.toFixed(4)} • Radius: ~{Math.round(location.radius)} km
                  </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {locationSuggestions.length === 0 && !isLoadingLocation && (
                <div className="p-3 text-center text-gray-300">
                  Tidak ada lokasi ditemukan
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-0 md:mt-0 relative">
          <button
            ref={searchButtonRef}
            onClick={handleSearch}
            className={`bg-[#1a73e8] border-none p-2 px-4 cursor-pointer rounded hover:bg-[#0d47a1] transition-all ${showSearchHint ? 'animate-pulse' : ''}`}
            aria-label="Search"
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
          
          {/* Tooltip hint untuk klik search */}
          {showSearchHint && (
            <div className="absolute -bottom-10 left-0 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-70 whitespace-nowrap">
              Klik untuk mencari
              <div className="absolute top-[-6px] left-4 w-3 h-3 bg-gray-800 transform rotate-45"></div>
            </div>
          )}
          
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="bg-[#1a73e8] border-none p-2 px-4 cursor-pointer rounded hover:bg-[#0d47a1]"
          >
            <FontAwesomeIcon icon={showFilter ? faTimes : faFilter} />
          </button>
        </div>
      </div>

      {/* Filter Modal Overlay */}
      {showFilter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowFilter(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="relative w-full max-w-xl mx-4 bg-[#1a1a1a] rounded-2xl shadow-2xl border border-[#333] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#2a2a2a]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faFilter} className="text-blue-400 text-base" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base m-0">Filter Observasi</h3>
                    <p className="text-gray-500 text-xs m-0">Sesuaikan tampilan data observasi</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilter(false)}
                  className="w-9 h-9 rounded-xl bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors border-none cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-gray-400 text-base" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex mt-4 gap-1 bg-[#222] rounded-xl p-1">
                <button
                  onClick={() => setFilterTab('basic')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                    filterTab === 'basic'
                      ? 'bg-[#333] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faFilter} className="text-xs" />
                  <span>Dasar</span>
                </button>
                <button
                  onClick={() => {
                    setFilterTab('advanced');
                    if (!rankValues['class'] || rankValues['class'].length === 0) {
                      TAXONOMY_RANKS.forEach(r => fetchRankValues(r.key));
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                    filterTab === 'advanced'
                      ? 'bg-[#333] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faSlidersH} className="text-xs" />
                  <span>Lanjutan</span>
                  {(filterParams.user_id || filterParams.taxonomy_value) && (
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Body - Scrollable */}
            <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">

              {filterTab === 'basic' ? (
                <>
                  {/* Pencarian Taksa */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Cari Taksa</label>
                    <p className="text-gray-500 text-xs mb-3">
                      Saring berdasarkan spesies, genus, famili, atau taksa lainnya
                      {filterParams.data_source.length < 3 && (
                        <span className="text-blue-400 ml-1">
                          — dari {filterParams.data_source.map(s => s === 'fobi' ? 'Amaturalist' : s === 'burungnesia' ? 'Burungnesia' : 'Kupunesia').join(', ')}
                        </span>
                      )}
                    </p>
                    <div className="relative" ref={filterTaxaSuggestionRef}>
                      {filterParams.taxonomy_value ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                          <FontAwesomeIcon icon={faSearch} className="text-blue-400 text-xs" />
                          <span className="text-sm text-blue-300 font-medium flex-1 truncate">
                            <i>{filterTaxaSearch || filterParams.taxonomy_value}</i>
                            <span className="text-gray-500 ml-1.5 text-xs">[{filterParams.taxonomy_rank}]</span>
                          </span>
                          <button
                            onClick={() => {
                              setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''}));
                              setFilterTaxaSearch('');
                              setFilterTaxaSuggestions([]);
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none"
                          >
                            <FontAwesomeIcon icon={faTimes} className="text-sm" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Spesies/ genus/ famili..."
                            value={filterTaxaSearch}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFilterTaxaSearch(value);
                              if (filterTaxaTimeoutRef.current) clearTimeout(filterTaxaTimeoutRef.current);
                              if (value.trim().length >= 2) {
                                setIsLoadingFilterTaxa(true);
                                filterTaxaTimeoutRef.current = setTimeout(() => {
                                  handleFilterTaxaSearch(value.trim());
                                }, 300);
                              } else {
                                setFilterTaxaSuggestions([]);
                                setIsLoadingFilterTaxa(false);
                              }
                            }}
                            className="w-full px-4 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none placeholder-gray-600"
                          />
                          {isLoadingFilterTaxa ? (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm" />
                          )}
                        </>
                      )}

                      {/* Suggestion dropdown */}
                      {filterTaxaSuggestions.length > 0 && !filterParams.taxonomy_value && (
                        <div className="absolute z-50 w-full bg-[#1e1e1e] mt-1 rounded-xl shadow-lg max-h-[280px] overflow-y-auto border border-[#3a3a3a]" onMouseDown={(e) => e.stopPropagation()}>
                          {filterTaxaSuggestions.map((suggestion, index) => (
                            <div
                              key={`filter-taxa-${suggestion.id}-${index}`}
                              className="px-4 py-3 cursor-pointer text-gray-200 border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFilterTaxaSelect({
                                id: suggestion.id,
                                rank: suggestion.rank,
                                scientific_name: suggestion.scientific_name,
                                common_name: suggestion.common_name,
                                taxonomic_status: suggestion.taxonomic_status,
                                accepted_scientific_name: suggestion.accepted_scientific_name,
                                full_data: suggestion.full_data
                              }); }}
                            >
                              <div className="text-sm">
                                <i>{suggestion.scientific_name}</i>
                                {suggestion.common_name && (
                                  <span className="text-gray-400"> ({suggestion.common_name})</span>
                                )}
                                <span className="text-gray-600 text-xs ml-1.5">[{suggestion.rank}]</span>
                                {suggestion.taxonomic_status === 'SYNONYM' && (
                                  <span className="ml-1.5 px-1.5 py-0.5 bg-orange-600 text-white text-[10px] rounded">SINONIM</span>
                                )}
                              </div>
                              {suggestion.full_data?.family && !['family', 'subfamily'].includes(suggestion.rank) && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  Family: {suggestion.full_data.family}
                                  {suggestion.full_data.cname_family && (
                                    <span> ({suggestion.full_data.cname_family})</span>
                                  )}
                                </div>
                              )}
                              {suggestion.taxonomic_status === 'SYNONYM' && suggestion.accepted_scientific_name && (
                                <div className="text-[11px] text-orange-300 mt-0.5">
                                  → Nama diterima: <i>{suggestion.accepted_scientific_name}</i>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Sumber Data */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Sumber Data</label>
                    <p className="text-gray-500 text-xs mb-3">Pilih platform sumber data observasi</p>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { value: 'fobi', label: 'Amaturalist', icon: icoAmaturalist, color: 'blue' },
                        { value: 'burungnesia', label: 'Burungnesia', icon: icoBurungnesia, color: 'green' },
                        { value: 'kupunesia', label: 'Kupunesia', icon: icoKupunesia, color: 'purple' }
                      ].map((source) => {
                        const isActive = filterParams.data_source.includes(source.value);
                        const colorMap = {
                          blue: isActive ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-blue-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                          green: isActive ? 'bg-green-600/20 border-green-500/60 text-green-300 shadow-green-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                          purple: isActive ? 'bg-purple-600/20 border-purple-500/60 text-purple-300 shadow-purple-500/10 shadow-md' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                        };
                        return (
                          <button
                            key={source.value}
                            onClick={() => handleDataSourceChange(source.value, !isActive)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer flex items-center gap-2 ${colorMap[source.color]}`}
                          >
                            <img src={source.icon} alt={source.label} className="w-5 h-5 rounded-full object-cover" />
                            <span>{source.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Rentang Waktu */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Rentang Waktu</label>
                    <p className="text-gray-500 text-xs mb-3">Pilih jenis tanggal yang ingin disaring</p>
                    <div className="flex gap-2.5 mb-4">
                      {[
                        { value: 'created_at', label: 'Tanggal Dibuat', desc: 'Saat data diunggah ke sistem' },
                        { value: 'observation_date', label: 'Tanggal Pengamatan', desc: 'Saat pengamatan dilakukan di lapangan' }
                      ].map((opt) => {
                        const isActive = filterParams.date_type === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setFilterParams(prev => ({...prev, date_type: opt.value}))}
                            className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                                : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]'
                            }`}
                            title={opt.desc}
                          >
                            <span className="block text-sm font-medium">{opt.label}</span>
                            <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-blue-400/70' : 'text-gray-600'}`}>{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <span className="block text-gray-400 text-xs font-medium mb-1.5">Dari tanggal</span>
                        <input
                          type="date"
                          value={filterParams.start_date}
                          onChange={(e) => setFilterParams(prev => ({...prev, start_date: e.target.value}))}
                          className="w-full px-3.5 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                      <span className="text-gray-600 text-lg pb-2.5">—</span>
                      <div className="flex-1">
                        <span className="block text-gray-400 text-xs font-medium mb-1.5">Sampai tanggal</span>
                        <input
                          type="date"
                          value={filterParams.end_date}
                          onChange={(e) => setFilterParams(prev => ({...prev, end_date: e.target.value}))}
                          className="w-full px-3.5 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Grade */}
                  {(() => {
                    const hasNonFobiSource = filterParams.data_source.some(s => s === 'burungnesia' || s === 'kupunesia');
                    const gradeDisabled = hasNonFobiSource;
                    return (
                      <div className={gradeDisabled ? 'opacity-60' : ''}>
                        <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Kualitas Data</label>
                        {gradeDisabled ? (
                          <p className="text-amber-400/80 text-xs mb-3 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-[10px]" />
                            Filter kualitas data hanya tersedia untuk sumber Amaturalist
                          </p>
                        ) : (
                          <p className="text-gray-500 text-xs mb-3">Saring berdasarkan tingkat verifikasi identifikasi</p>
                        )}
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            { value: 'research grade', label: 'ID Lengkap', color: 'blue', desc: 'Data terverifikasi lengkap oleh komunitas' },
                            { value: 'confirmed id', label: 'ID Terkonfirmasi', color: 'emerald', desc: 'Identifikasi terkonfirmasi secara hierarkis' },
                            { value: 'needs ID', label: 'Bantu Ident', color: 'amber', desc: 'Masih membutuhkan bantuan identifikasi' },
                            { value: 'low quality ID', label: 'ID Kurang', color: 'orange', desc: 'Data belum memenuhi standar kualitas' },
                          ].map((option) => {
                            const isActive = filterParams.grade.includes(option.value);
                            const colorMap = {
                              emerald: isActive ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                              blue: isActive ? 'bg-blue-600/20 border-blue-500/60 text-blue-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                              amber: isActive ? 'bg-amber-600/20 border-amber-500/60 text-amber-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                              orange: isActive ? 'bg-orange-600/20 border-orange-500/60 text-orange-300' : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]',
                            };
                            return (
                              <button
                                key={option.value}
                                disabled={gradeDisabled}
                                onClick={() => {
                                  if (gradeDisabled) return;
                                  const newGrades = isActive
                                    ? filterParams.grade.filter(g => g !== option.value)
                                    : [...filterParams.grade, option.value];
                                  setFilterParams(prev => ({...prev, grade: newGrades}));
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                                  gradeDisabled 
                                    ? 'cursor-not-allowed bg-[#1a1a1a] border-[#2a2a2a] text-gray-600' 
                                    : `cursor-pointer ${colorMap[option.color]}`
                                }`}
                                title={gradeDisabled ? 'Kualitas data hanya tersedia untuk sumber FOBi/Amaturalist. Nonaktifkan Burungnesia/Kupunesia untuk menggunakan filter ini.' : option.desc}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Media */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">Jenis Media</label>
                    <p className="text-gray-500 text-xs mb-3">Saring observasi berdasarkan jenis media yang diunggah</p>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { value: '', label: 'Semua Media', icon: faLayerGroup },
                        { value: 'photo', label: 'Dengan Foto', icon: faCamera },
                        { value: 'audio', label: 'Dengan Audio', icon: faHeadphones }
                      ].map((option) => {
                        const isActive = filterParams.media_type === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilterParams(prev => ({...prev, media_type: option.value, has_media: option.value !== ''}));
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                              isActive 
                                ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-blue-500/10 shadow-md' 
                                : 'bg-[#222] border-[#3a3a3a] text-gray-500 hover:border-[#555]'
                            }`}
                          >
                            <FontAwesomeIcon icon={option.icon} className="text-sm" />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* === ADVANCED TAB === */}

                  {/* Pengguna */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                      <FontAwesomeIcon icon={faUser} className="mr-1.5" />
                      Pengguna
                    </label>
                    <p className="text-gray-500 text-xs mb-3">Saring observasi berdasarkan pengguna tertentu</p>

                    {filterParams.user_id ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                        <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                        <span className="text-sm text-blue-300 font-medium flex-1">{filterParams.user_name}</span>
                        <button
                          onClick={() => {
                            setFilterParams(prev => ({...prev, user_id: null, user_name: ''}));
                            setUsernameSearch('');
                            setUsernameResults([]);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ketik username pengguna..."
                            value={usernameSearch}
                            onChange={(e) => handleSearchUsers(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm border rounded-xl bg-[#222] border-[#3a3a3a] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all pr-10"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isLoadingUsers ? (
                              <FontAwesomeIcon icon={faSpinner} spin className="text-gray-500 text-sm" />
                            ) : (
                              <FontAwesomeIcon icon={faSearch} className="text-gray-600 text-sm" />
                            )}
                          </div>
                        </div>
                        {usernameResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#3a3a3a] bg-[#222]">
                            {usernameResults.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  setFilterParams(prev => ({...prev, user_id: user.id, user_name: user.uname}));
                                  setUsernameSearch('');
                                  setUsernameResults([]);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#333] transition-colors cursor-pointer border-none bg-transparent border-b border-[#2a2a2a] last:border-b-0"
                              >
                                {user.profile_picture ? (
                                  <img src={user.profile_picture} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center">
                                    <FontAwesomeIcon icon={faUser} className="text-gray-500 text-xs" />
                                  </div>
                                )}
                                <span className="text-sm text-gray-300">{user.uname}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Taksonomi */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                      <FontAwesomeIcon icon={faDna} className="mr-1.5" />
                      Taksonomi
                    </label>
                    <p className="text-gray-500 text-xs mb-3">Pilih kategori atau saring berdasarkan hierarki taksonomi.</p>

                    {/* Selected taxonomy chip */}
                    {filterParams.taxonomy_value && (
                      <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-emerald-600/10 border border-emerald-500/40 rounded-xl">
                        <FontAwesomeIcon icon={faDna} className="text-emerald-400" />
                        <div className="flex-1">
                          <span className="text-sm text-emerald-300 font-medium italic">{filterParams.taxonomy_value}</span>
                          <span className="text-xs text-emerald-500/70 ml-2 uppercase">{filterParams.taxonomy_rank}</span>
                        </div>
                        <button
                          onClick={() => {
                            setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''}));
                            setHierarchySelections({});
                            setRankSearches({});
                            TAXONOMY_RANKS.forEach(r => fetchRankValues(r.key));
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    )}

                    {/* Category Grid - like iNaturalist */}
                    <div className="mb-4">
                      <label className="block text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">
                        Kategori
                      </label>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { value: 'Aves', label: 'Burung', icon: '/src/assets/icon/burung-01.png', rank: 'class', scale: 1 },
                          { value: 'Mammalia', label: 'Mamalia', icon: '/src/assets/icon/mammalia-01.png', rank: 'class', scale: 1 },
                          { value: 'Reptilia', label: 'Reptil', icon: '/src/assets/icon/reptil-01.png', rank: 'class', scale: 1 },
                          { value: 'Amphibia', label: 'Amfibi', icon: '/src/assets/icon/amphibi-01.png', rank: 'class', scale: 1 },
                          { value: 'Actinopterygii', label: 'Ikan', icon: '/src/assets/icon/ikan-01.png', rank: 'class', scale: 1 },
                          { value: 'Insecta', label: 'Serangga', icon: '/src/assets/icon/insecta-01.png', rank: 'class', scale: 1.5 },
                          { value: 'Lepidoptera', label: 'Kupu-kupu', icon: '/src/assets/icon/lepidoptera-01.png', rank: 'order', scale: 1.5 },
                          { value: 'Odonata', label: 'Capung', icon: '/src/assets/icon/capung-01.svg', rank: 'order', scale: 1 },
                          { value: 'Coleoptera', label: 'Kumbang', icon: '/src/assets/icon/kumbang-01.svg', rank: 'order', scale: 1 },
                          { value: 'Arachnida', label: 'Laba-laba', icon: '/src/assets/icon/arachnida-01.png', rank: 'class', scale: 1.5 },
                          { value: 'Fungi', label: 'Jamur', icon: '/src/assets/icon/jamur-01.png', rank: 'kingdom', scale: 1.5 },
                          { value: 'Plantae', label: 'Tumbuhan', icon: '/src/assets/icon/plants-01.png', rank: 'kingdom', scale: 1.5 },
                          { value: 'Orchidaceae', label: 'Anggrek', icon: '/src/assets/icon/anggrek-01.svg', rank: 'family', scale: 1 },
                          { value: 'Polypodiopsida', label: 'Paku', icon: '/src/assets/icon/paku-01.svg', rank: 'class', scale: 1 },
                          { value: 'Bryophyta', label: 'Lumut', icon: '/src/assets/icon/lumut-01.svg', rank: 'phylum', scale: 1 },
                          { value: 'Mollusca', label: 'Moluska', icon: '/src/assets/icon/mollusca-01.png', rank: 'phylum', scale: 1.5 },
                          { value: 'UNKNOWN', label: 'Unknown', icon: null, rank: 'UNKNOWN', scale: 1 },
                        ].map((cat) => {
                          const isActive = filterParams.taxonomy_value === cat.value;
                          return (
                            <button
                              key={cat.value}
                              onClick={() => {
                                if (isActive) {
                                  setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: '', taxonomy_from_category: false}));
                                  setHierarchySelections({});
                                } else {
                                  setFilterParams(prev => ({...prev, taxonomy_rank: cat.rank, taxonomy_value: cat.value, taxonomy_from_category: true}));
                                  setHierarchySelections({});
                                }
                              }}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-md border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                  : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-[#444] hover:text-gray-200'
                              }`}
                              title={cat.label}
                            >
                              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                                {cat.icon ? (
                                  <img src={cat.icon} alt={cat.label} className="object-contain" style={{ transform: `scale(${cat.scale})`, width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }} />
                                ) : (
                                  <span className="text-xl font-bold text-white">?</span>
                                )}
                              </div>
                              <span className="text-[10px] mt-0.5 truncate w-full text-center font-medium">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#2a2a2a]"></div>

                  {/* Filter Lokasi */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1.5" />
                      Lokasi
                    </label>
                    <p className="text-gray-500 text-xs mb-3">Cari berdasarkan nama lokasi pengamatan.</p>

                    {/* Selected location chip */}
                    {filterParams.location_name && (
                      <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-blue-600/10 border border-blue-500/40 rounded-xl">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-400" />
                        <div className="flex-1">
                          <span className="text-sm text-blue-300 font-medium">{filterParams.location_name}</span>
                          {filterParams.location_source && (
                            <span className="text-xs text-blue-500/70 ml-2 uppercase">
                              {filterParams.location_source === 'fobi' ? 'FOBi' : filterParams.location_source === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setFilterParams(prev => ({...prev, location_name: '', location_source: ''}));
                            setAdvLocationSearch('');
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    )}

                    {/* Search box */}
                    <div className="rounded-xl p-3 border bg-[#222] border-[#3a3a3a]">
                      <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">
                        Cari Lokasi
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ketik nama lokasi (min. 2 karakter)..."
                          value={advLocationSearch}
                          onChange={(e) => handleSearchAdvLocations(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        {isLoadingAdvLocation && (
                          <FontAwesomeIcon icon={faSpinner} spin className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 text-[10px]" />
                        )}
                      </div>

                      {/* Location results */}
                      <div className="max-h-40 overflow-y-auto mt-1.5 space-y-0.5">
                        {advLocationResults.length > 0 && !filterParams.location_name ? (
                          advLocationResults.map((loc, index) => (
                            <button
                              key={`loc-${index}`}
                              onClick={() => handleAdvLocationSelect(loc)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border-none text-gray-400 hover:bg-[#333] hover:text-gray-200 bg-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-500 text-[10px]" />
                                <span className="text-gray-300">{loc.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  loc.source === 'fobi' ? 'bg-emerald-600/30 text-emerald-300' :
                                  loc.source === 'burungnesia' ? 'bg-blue-600/30 text-blue-300' :
                                  'bg-purple-600/30 text-purple-300'
                                }`}>
                                  {loc.source === 'fobi' ? 'FOBi' : loc.source === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : !isLoadingAdvLocation && advLocationSearch.length >= 2 && advLocationResults.length === 0 && !filterParams.location_name ? (
                          <p className="text-gray-600 text-[10px] px-2.5 py-1">Tidak ditemukan</p>
                        ) : !filterParams.location_name && advLocationSearch.length < 2 ? (
                          <p className="text-gray-600 text-[10px] px-2.5 py-1">Ketik minimal 2 karakter untuk mencari</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Active Advanced Filters Summary */}
            {(filterParams.user_id || filterParams.taxonomy_value) && filterTab === 'basic' && (
              <div className="px-6 py-2.5 bg-[#1e1e1e] border-t border-[#2a2a2a]">
                <div className="flex flex-wrap gap-2">
                  {filterParams.user_id && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/10 border border-blue-500/30 text-xs text-blue-300">
                      <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                      {filterParams.user_name}
                      <button onClick={() => setFilterParams(prev => ({...prev, user_id: null, user_name: ''}))} className="ml-1 hover:text-red-400 cursor-pointer border-none bg-transparent text-blue-300">
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      </button>
                    </span>
                  )}
                  {filterParams.taxonomy_value && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-xs text-emerald-300">
                      <FontAwesomeIcon icon={faDna} className="text-[10px]" />
                      <span className="italic">{filterParams.taxonomy_value}</span>
                      <button onClick={() => { setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: ''})); setHierarchySelections({}); setRankSearches({}); }} className="ml-1 hover:text-red-400 cursor-pointer border-none bg-transparent text-emerald-300">
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  handleResetFilter();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all border border-[#3a3a3a] cursor-pointer"
              >
                Reset Semua
              </button>
              <button
                onClick={handleApplyFilter}
                className="px-7 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bar filter aktif — desktop only, komponen reusable */}
      <ActiveFilterBar
        searchParams={searchParams}
        filterParams={filterParams}
        onRemoveSearch={() => {
          setSearchParams(prev => ({...prev, search: '', display: '', selectedId: null, species: null, searchType: 'all'}));
          if (onSearch) onSearch({...searchParams, search: '', display: '', selectedId: null, species: null, searchType: 'all'});
        }}
        onRemoveLocation={() => {
          setSearchParams(prev => ({...prev, location: '', latitude: '', longitude: ''}));
          if (onSearch) onSearch({...searchParams, location: '', latitude: '', longitude: ''});
        }}
        onRemoveGrade={() => {
          setFilterParams(prev => ({...prev, grade: []}));
          if (onFilterChange) onFilterChange({...filterParams, grade: [], autoSubmit: true, skipSearch: true});
        }}
        onRemoveDate={() => {
          setFilterParams(prev => ({...prev, start_date: '', end_date: ''}));
          if (onFilterChange) onFilterChange({...filterParams, start_date: null, end_date: null, autoSubmit: true, skipSearch: true});
        }}
        onRemoveMedia={() => {
          setFilterParams(prev => ({...prev, has_media: false, media_type: ''}));
          if (onFilterChange) onFilterChange({...filterParams, has_media: false, media_type: null, autoSubmit: true, skipSearch: true});
        }}
        onRemoveTaxonomy={() => {
          setFilterParams(prev => ({...prev, taxonomy_rank: '', taxonomy_value: '', taxonomy_from_category: false}));
          setHierarchySelections({});
          if (onFilterChange) onFilterChange({...filterParams, taxonomy_rank: null, taxonomy_value: null, autoSubmit: true, skipSearch: true});
        }}
        onResetAll={handleReset}
      />

      <div className="flex flex-wrap justify-center mt-5 md:mt-2 md:justify-end w-full">
        {/* Mobile Stats View */}
        <div className="block md:hidden w-full px-4 overflow-hidden">
          <div 
            {...swipeHandlers}
            className="relative touch-pan-y"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentStatsPage}
                className="flex justify-between items-center"
                initial={{ 
                  x: direction > 0 ? 300 : -300,
                  opacity: 0 
                }}
                animate={{ 
                  x: 0,
                  opacity: 1 
                }}
                exit={{ 
                  x: direction < 0 ? 300 : -300,
                  opacity: 0 
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              >
                {mobileStats.currentItems.map((stat, index) => (
                  <div 
                    key={index} 
                    className="flex-1 text-center px-2"
                  >
                    <small className="text-sm font-bold text-[#1a73e8] block">
                      <CountUp 
                        end={stat.value} 
                        duration={stat.duration}
                        preserveValue={true}
                      />
                    </small>
                    <small className="block text-xs whitespace-nowrap text-gray-300">
                      {stat.label}
                    </small>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Stats View - tidak berubah */}
        <div className="hidden md:flex flex-wrap justify-center md:justify-end w-full">
          {statsData.map((stat, index) => (
            <div key={index} className="m-2 text-center w-1/3 md:w-auto mr-5">
              <small className="text-sm font-bold text-[#1a73e8]">
                <CountUp end={stat.value} duration={stat.duration} />
              </small>
              <small className="block text-xs text-gray-300">{stat.label}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

StatsBar.propTypes = {
  stats: PropTypes.shape({
    observasi: PropTypes.number,
    taksa: PropTypes.number,
    media: PropTypes.number,
  }).isRequired,
  onSearch: PropTypes.func.isRequired,
  setStats: PropTypes.func.isRequired,
  onMapReset: PropTypes.func,
  onSpeciesSelect: PropTypes.func,
  selectedSpecies: PropTypes.shape({
    id: PropTypes.string,
    rank: PropTypes.string,
    scientific_name: PropTypes.string,
    display_name: PropTypes.string,
    family: PropTypes.shape({
      id: PropTypes.string,
      rank: PropTypes.string,
      scientific_name: PropTypes.string,
      display_name: PropTypes.string,
    }),
  }),
  onFilterChange: PropTypes.func,
};

export default StatsBar;
