"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Grid,
  Typography,
  Tabs,
  Tab,
  Box,
  Button,
  ThemeProvider,
  createTheme,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Modal,
  Backdrop,
} from "@mui/material"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFlag, faPlay, faPause, faImage, faMapMarkerAlt, faCalendarAlt, faMountain, faStickyNote, faLeaf, faShieldAlt, faSignature, faFont, faUser, faLayerGroup, faCheckCircle, faChevronLeft, faChevronRight, faTimes, faExpand, faSearchPlus, faSearchMinus, faCompress, faStar } from "@fortawesome/free-solid-svg-icons"
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons"
import { toast } from 'react-toastify'
import TaxaNavigationBreadcrumb from "./TaxaNavigationBreadcrumb"
import TreeView from "react-treeview"
import "react-treeview/react-treeview.css"
import "./TaxaDetail.css"
import TaxaFlagReport from "../TaxaFlagReport/TaxaFlagReport"
import { MapContainer, TileLayer, Popup, Rectangle, ZoomControl, useMap } from "react-leaflet"
import L from "leaflet"
import { getColor, getVisibleGridType } from "../../utils/mapHelpers"
import { GRID_SIZES } from "../../utils/gridHelpers"
import "leaflet/dist/leaflet.css"
const getMediaUrl = (filePath) => {
  if (!filePath) return null
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  let baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || ''
  baseUrl = baseUrl.replace(/\/$/, '')
  const cleanPath = filePath.replace(/^\//, '')
  
  return `${baseUrl}/storage/${cleanPath}`
}
const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", () => {
        const duration = audioRef.current.duration
        const currentTime = audioRef.current.currentTime
        const progress = (currentTime / duration) * 100
        setProgress(progress)
      })

      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false)
        setProgress(0)
      })
    }
  }, [])

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        bgcolor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ position: "relative", flex: 1, width: "100%", height: "100%", bgcolor: "#000", overflow: "hidden" }}>
        <img
          src={spectrogramUrl || "/placeholder.svg"}
          alt="Spectrogram"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          loading="lazy"
        />
        {audioUrl && (
          <>
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "2px",
                bgcolor: "#374151",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  bgcolor: "#3b82f6",
                  transition: "width 0.1s",
                  width: `${progress}%`,
                }}
              />
            </Box>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
              sx={{
                position: "absolute",
                bottom: 4,
                left: 4,
                width: 24,
                height: 24,
                bgcolor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#9ca3af",
                "&:hover": {
                  bgcolor: "rgba(0,0,0,0.9)",
                  transform: "scale(1.1)",
                  color: "#3b82f6",
                },
                "&:active": {
                  transform: "scale(0.95)",
                },
                transition: "all 0.2s",
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} style={{ fontSize: "10px" }} />
            </IconButton>
            <audio ref={audioRef} src={audioUrl} style={{ display: "none" }} />
          </>
        )}
      </Box>
    </Box>
  )
}
const getGridSizeFromType = (gridType) => {
  return GRID_SIZES[gridType] || GRID_SIZES.large
}
const ZoomHandler = ({ setVisibleGrid }) => {
  const map = useMap()

  useEffect(() => {
    const handleZoomChange = () => {
      const zoomLevel = map.getZoom()
      const gridType = getVisibleGridType(zoomLevel)
      setVisibleGrid(gridType)
    }

    map.on("zoomend", handleZoomChange)
    handleZoomChange() // Initialize on mount

    return () => {
      map.off("zoomend", handleZoomChange)
    }
  }, [map, setVisibleGrid])

  return null
}

const TaxaDetail = () => {
  const { rank, id } = useParams()
  const navigate = useNavigate()

  const [taxaData, setTaxaData] = useState(null)
  const [children, setChildren] = useState({})
  const [media, setMedia] = useState([])
  const [taxonomyTree, setTaxonomyTree] = useState([])
  const [statistics, setStatistics] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [flagReportOpen, setFlagReportOpen] = useState(false)
  const [locations, setLocations] = useState([])
  const [similarTaxa, setSimilarTaxa] = useState([])
  const [visibleGrid, setVisibleGrid] = useState("large")
  const [gridData, setGridData] = useState([])
  const [mapLoading, setMapLoading] = useState(false)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [conservationStatus, setConservationStatus] = useState(null)
  const [conservationLoading, setConservationLoading] = useState(false)
  const [synonyms, setSynonyms] = useState([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [favoriteId, setFavoriteId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [modalMedia, setModalMedia] = useState([])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const rankLabels = {
    domain: "Domain",
    superkingdom: "Superkingdom",
    kingdom: "Kingdom",
    subkingdom: "Subkingdom",
    superphylum: "Superphylum",
    phylum: "Phylum",
    subphylum: "Subphylum",
    superclass: "Superclass",
    class: "Class",
    subclass: "Subclass",
    infraclass: "Infraclass",
    magnorder: "Magnorder",
    superorder: "Superorder",
    order: "Order",
    suborder: "Suborder",
    infraorder: "Infraorder",
    parvorder: "Parvorder",
    superfamily: "Superfamily",
    family: "Family",
    subfamily: "Subfamily",
    supertribe: "Supertribe",
    tribe: "Tribe",
    subtribe: "Subtribe",
    genus: "Genus",
    subgenus: "Subgenus",
    species: "Species",
    subspecies: "Subspecies",
    variety: "Variety",
    form: "Form",
    subform: "Subform",
  }

  const statusColors = {
    ACCEPTED: "#16a34a",
    UNACCEPTED: "#dc2626",
    SYNONYM: "#ca8a04",
    HIDDEN: "#6b7280",
    DOUBTFUL: "#6b7280",
  }

  useEffect(() => {
    fetchTaxaDetail()
    fetchConservationStatus()
    checkFavoriteStatus()
  }, [rank, id])
  useEffect(() => {
    setLocations([])
    setGridData({})
    setMapLoading(false)
    setSimilarTaxa([])
    setSimilarLoading(false)
    setConservationStatus(null)
    setConservationLoading(false)
    setIsFavorite(false)
    setFavoriteId(null)
    console.log("Cleared location, similar taxa, and conservation data for new taxa:", rank, id)
  }, [rank, id])
  const checkFavoriteStatus = async () => {
    const token = localStorage.getItem('jwt_token')
    const userId = localStorage.getItem('user_id')
    if (!token || !userId || !id) return

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/profile/favorite-taxas/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      )
      
      if (response.data.success) {
        const favorite = response.data.data.find(f => f.taxa_id === parseInt(id))
        if (favorite) {
          setIsFavorite(true)
          setFavoriteId(favorite.id)
        } else {
          setIsFavorite(false)
          setFavoriteId(null)
        }
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
    }
  }
  const handleAddFavorite = async () => {
    const token = localStorage.getItem('jwt_token')
    if (!token) {
      toast.error('Silakan login terlebih dahulu')
      return
    }

    setFavoriteLoading(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/profile/favorite-taxas`,
        { taxa_id: parseInt(id) },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        toast.success('Taksa berhasil ditambahkan ke favorit')
        setIsFavorite(true)
        setFavoriteId(response.data.data.id)
      } else {
        toast.error(response.data.message || 'Gagal menambahkan taksa')
      }
    } catch (error) {
      console.error('Error adding favorite:', error)
      if (error.response?.status === 400) {
        toast.error('Taksa sudah ada di daftar favorit')
      } else if (error.response?.status === 401) {
        toast.error('Silakan login terlebih dahulu')
      } else {
        toast.error('Gagal menambahkan taksa favorit')
      }
    } finally {
      setFavoriteLoading(false)
    }
  }
  const handleRemoveFavorite = async () => {
    const token = localStorage.getItem('jwt_token')
    if (!token || !favoriteId) return

    setFavoriteLoading(true)
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/profile/favorite-taxas/${favoriteId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      )

      if (response.data.success) {
        toast.success('Taksa berhasil dihapus dari favorit')
        setIsFavorite(false)
        setFavoriteId(null)
      } else {
        toast.error(response.data.message || 'Gagal menghapus taksa')
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast.error('Gagal menghapus taksa favorit')
    } finally {
      setFavoriteLoading(false)
    }
  }
  useEffect(() => {
    if (locations.length > 0) {
      const gridGroups = {}
      const gridTypes = [
        "tiny",
        "verySmall",
        "small",
        "mediumSmall",
        "medium",
        "mediumLarge",
        "large",
        "veryLarge",
        "extremelyLarge",
      ]
      let validLocationsCount = 0

      gridTypes.forEach((gridType) => {
        const gridSize = getGridSizeFromType(gridType)
        gridGroups[gridType] = {}

        locations.forEach((loc) => {
          const lat = typeof loc.latitude === "string" ? Number.parseFloat(loc.latitude) : loc.latitude
          const lng = typeof loc.longitude === "string" ? Number.parseFloat(loc.longitude) : loc.longitude

          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            validLocationsCount++

            const latKey = Math.floor(lat / gridSize) * gridSize
            const lngKey = Math.floor(lng / gridSize) * gridSize
            const gridKey = `${latKey}_${lngKey}`

            if (!gridGroups[gridType][gridKey]) {
              gridGroups[gridType][gridKey] = {
                bounds: [
                  [latKey, lngKey],
                  [latKey + gridSize, lngKey + gridSize],
                ],
                center: [lat, lng],
                count: 0,
                locations: [],
              }
            }

            gridGroups[gridType][gridKey].count++
            gridGroups[gridType][gridKey].locations.push(loc)
          }
        })
      })

      console.log(`Valid locations count: ${validLocationsCount} out of ${locations.length}`)
      const grids = {}
      gridTypes.forEach((gridType) => {
        grids[gridType] = Object.values(gridGroups[gridType])
      })

      console.log("Grid data generated:", grids)

      setGridData(grids)
    }
  }, [locations])
  useEffect(() => {
    if (activeTab === "map" && locations.length === 0) {
      fetchDistributionData()
    } else if (activeTab === "similar" && similarTaxa.length === 0) {
      fetchSimilarTaxa()
    }
  }, [activeTab])

  const fetchTaxaDetail = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxa/${rank}/${id}`)
      const result = response.data
      if (result.success) {
        setTaxaData(result.data.taxa)
        setChildren(result.data.children)
        setMedia(result.data.media)
        setTaxonomyTree(result.data.taxonomy_tree)
        setStatistics(result.data.statistics)
        setSynonyms(result.data.synonyms || [])
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError("Gagal memuat data taxa")
      console.error("Error fetching taxa detail:", err)
    } finally {
      setLoading(false)
    }
  }
  const fetchDistributionData = async () => {
    if (!id || !rank) return

    setMapLoading(true)
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxa/${rank}/${id}/distribution`)
      if (response.data.success) {
        setLocations(response.data.data)
        console.log("Distribution data received:", response.data.data)
      } else {
        console.error("API returned success false for distribution")
      }
    } catch (error) {
      console.error("Error fetching distribution data:", error)
    } finally {
      setMapLoading(false)
    }
  }
  const fetchSimilarTaxa = async () => {
    if (!id || !rank) return

    setSimilarLoading(true)
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxa/${rank}/${id}/similar`)
      if (response.data.success) {
        setSimilarTaxa(response.data.data)
        console.log("Similar taxa data received:", response.data.data)
      } else {
        console.error("API returned success false for similar taxa")
      }
    } catch (error) {
      console.error("Error fetching similar taxa data:", error)
    } finally {
      setSimilarLoading(false)
    }
  }
  const fetchConservationStatus = async () => {
    if (!id || !rank || !["species", "subspecies", "form", "variety"].includes(rank)) {
      setConservationStatus(null)
      return
    }

    setConservationLoading(true)
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxa/${rank}/${id}/conservation-status`)
      if (response.data.success) {
        setConservationStatus(response.data.data)
        console.log("Conservation status data received:", response.data.data)
      } else {
        console.error("API returned success false for conservation status")
        setConservationStatus(null)
      }
    } catch (error) {
      console.error("Error fetching conservation status data:", error)
      setConservationStatus(null)
    } finally {
      setConservationLoading(false)
    }
  }
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      primary: {
        main: "#3b82f6",
      },
      secondary: {
        main: "#1e40af",
      },
      background: {
        paper: "transparent",
        default: "#000000",
      },
      text: {
        primary: "#e5e7eb",
        secondary: "#9ca3af",
      },
      divider: "#374151",
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "#1f1f1f",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(17, 24, 39, 0.4)",
            border: "1px solid rgba(55, 65, 81, 0.5)",
            backdropFilter: "blur(8px)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          contained: {
            backgroundColor: "#1e40af",
            "&:hover": {
              backgroundColor: "#1d4ed8",
            },
          },
          outlined: {
            borderColor: "rgba(59, 130, 246, 0.4)",
            color: "#60a5fa",
            "&:hover": {
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(17, 24, 39, 0.4)",
            borderBottom: "1px solid rgba(55, 65, 81, 0.5)",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: "#9ca3af",
            "&.Mui-selected": {
              color: "#60a5fa",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(17, 24, 39, 0.6)",
            border: "1px solid rgba(55, 65, 81, 0.5)",
          },
        },
      },
    },
  })

  const handleTaxaClick = (taxaRank, taxaId) => {
    if (taxaId) {
      navigate(`/taxa/${taxaRank}/${taxaId}`)
    }
  }

  const getStatusColor = (status) => {
    return statusColors[status] || "#6b7280"
  }

  const getConservationColor = (status) => {
    switch (status) {
      case "CR":
        return "#dc2626"
      case "EN":
        return "#ea580c"
      case "VU":
        return "#ca8a04"
      case "NT":
        return "#16a34a"
      case "LC":
        return "#059669"
      default:
        return "#6b7280"
    }
  }

  const getCitesColor = (appendix) => {
    switch (appendix) {
      case "I":
        return "#dc2626"
      case "II":
        return "#ca8a04"
      case "III":
        return "#16a34a"
      default:
        return "#6b7280"
    }
  }
  const openMediaModal = (mediaArray, index) => {
    setModalMedia(mediaArray)
    setCurrentMediaIndex(index)
    setModalOpen(true)
  }

  const closeMediaModal = () => {
    setModalOpen(false)
    setCurrentMediaIndex(0)
    setModalMedia([])
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
    setIsDragging(false)
  }

  const goToPrevMedia = () => {
    setCurrentMediaIndex((prev) => 
      prev === 0 ? modalMedia.length - 1 : prev - 1
    )
  }

  const goToNextMedia = () => {
    setCurrentMediaIndex((prev) => 
      prev === modalMedia.length - 1 ? 0 : prev + 1
    )
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
  }
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5)) // Max zoom 5x, smoother increment
  }

  const zoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = prev / 1.2
      if (newZoom <= 1) {
        setPanPosition({ x: 0, y: 0 }) // Reset pan when zoom is 1 or less
        return 1
      }
      return newZoom
    })
  }

  const resetZoom = () => {
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
  }
  const [lastTap, setLastTap] = useState(0)
  
  const handleDoubleTap = () => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      if (zoomLevel === 1) {
        setZoomLevel(2.5) // Zoom to 2.5x on double tap
      } else {
        resetZoom() // Reset zoom on double tap when zoomed
      }
    }
    setLastTap(now)
  }
  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault()
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      const maxPan = 150 * (zoomLevel - 1) // More generous boundaries
      const boundedX = Math.max(-maxPan, Math.min(maxPan, newX))
      const boundedY = Math.max(-maxPan, Math.min(maxPan, newY))
      
      setPanPosition({
        x: boundedX,
        y: boundedY
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleDoubleTap()
      if (zoomLevel > 1) {
        e.preventDefault()
        setIsDragging(true)
        setDragStart({
          x: touch.clientX - panPosition.x,
          y: touch.clientY - panPosition.y
        })
      }
    }
  }

  const handleTouchMove = (e) => {
    if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y
      const maxPan = 150 * (zoomLevel - 1)
      const boundedX = Math.max(-maxPan, Math.min(maxPan, newX))
      const boundedY = Math.max(-maxPan, Math.min(maxPan, newY))
      
      setPanPosition({
        x: boundedX,
        y: boundedY
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }
  const handleWheel = (e) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!modalOpen) return
      
      switch (event.key) {
        case 'ArrowLeft':
          goToPrevMedia()
          break
        case 'ArrowRight':
          goToNextMedia()
          break
        case 'Escape':
          closeMediaModal()
          break
        case '+':
        case '=':
          event.preventDefault()
          zoomIn()
          break
        case '-':
          event.preventDefault()
          zoomOut()
          break
        case '0':
          event.preventDefault()
          resetZoom()
          break
      }
    }

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [modalOpen])
  const renderOverview = () => {
    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={{ xs: 2, sm: 4, md: 6 }}>
          <Grid item xs={12} lg={5}>
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#e5e7eb", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
                  INFORMASI UMUM
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    py: 2,
                    borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                    <FontAwesomeIcon icon={faSignature} style={{ color: "#60a5fa", fontSize: "12px" }} />
                    <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                      Nama Ilmiah
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontStyle: "italic", color: "#e5e7eb", fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                    {taxaData.scientific_name}
                  </Typography>
                </Box>
                {taxaData.common_name && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      justifyContent: "space-between",
                      alignItems: { xs: "flex-start", sm: "center" },
                      py: 2,
                      borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                      <FontAwesomeIcon icon={faFont} style={{ color: "#60a5fa", fontSize: "12px" }} />
                      <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                        Nama Umum
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: "#e5e7eb", fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                      {taxaData.common_name}
                    </Typography>
                  </Box>
                )}
                {taxaData.author && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      justifyContent: "space-between",
                      alignItems: { xs: "flex-start", sm: "center" },
                      py: 2,
                      borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                      <FontAwesomeIcon icon={faUser} style={{ color: "#60a5fa", fontSize: "12px" }} />
                      <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                        Author
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: "#e5e7eb", fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                      {taxaData.author}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    py: 2,
                    borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                    <FontAwesomeIcon icon={faLayerGroup} style={{ color: "#60a5fa", fontSize: "12px" }} />
                    <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                      Peringkat Taksonomi
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: "#e5e7eb", fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                    {rankLabels[rank]}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: "#60a5fa", fontSize: "12px" }} />
                    <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                      Status Taksonomi
                    </Typography>
                  </Box>
                  <Chip
                    label={taxaData.taxonomic_status}
                    sx={{
                      bgcolor: `${getStatusColor(taxaData.taxonomic_status)}20`,
                      color: getStatusColor(taxaData.taxonomic_status),
                      border: `1px solid ${getStatusColor(taxaData.taxonomic_status)}40`,
                      fontWeight: "bold",
                      fontSize: { xs: "0.7rem", sm: "0.8rem" }
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {["species", "subspecies", "form", "variety"].includes(rank) && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
                  <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#e5e7eb", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
                    STATUS KONSERVASI
                  </Typography>
                </Box>
                {conservationLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={24} sx={{ color: "#3b82f6" }} />
                    <Typography variant="body2" sx={{ ml: 2, color: "#9ca3af", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                      Memuat status konservasi...
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {conservationStatus?.iucn?.status === "found" && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          justifyContent: "space-between",
                          alignItems: { xs: "flex-start", sm: "center" },
                          py: 2,
                          borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                          <FontAwesomeIcon icon={faLeaf} style={{ color: "#60a5fa", fontSize: "12px" }} />
                          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                            IUCN Red List
                          </Typography>
                        </Box>
                        <Chip
                          label={conservationStatus.iucn.value}
                          size="small"
                          sx={{
                            bgcolor: `${getConservationColor(conservationStatus.iucn.value)}20`,
                            color: getConservationColor(conservationStatus.iucn.value),
                            border: `1px solid ${getConservationColor(conservationStatus.iucn.value)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.7rem", sm: "0.8rem" }
                          }}
                        />
                      </Box>
                    )}
                    {conservationStatus?.cites?.status === "found" && (
                      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, py: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1, sm: 0 } }}>
                          <FontAwesomeIcon icon={faShieldAlt} style={{ color: "#60a5fa", fontSize: "12px" }} />
                          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                            CITES
                          </Typography>
                        </Box>
                        <Chip
                          label={`Appendix ${conservationStatus.cites.value}`}
                          size="small"
                          sx={{
                            bgcolor: `${getCitesColor(conservationStatus.cites.value)}20`,
                            color: getCitesColor(conservationStatus.cites.value),
                            border: `1px solid ${getCitesColor(conservationStatus.cites.value)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.7rem", sm: "0.8rem" }
                          }}
                        />
                      </Box>
                    )}
                    {(!conservationStatus?.iucn?.status || conservationStatus.iucn.status !== "found") &&
                      (!conservationStatus?.cites?.status || conservationStatus.cites.status !== "found") && (
                        <Typography variant="body2" sx={{ color: "#6b7280", textAlign: "center", py: 4, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                          Tidak ada data status konservasi dari API eksternal
                        </Typography>
                      )}
                  </Box>
                )}
              </Box>
            )}

            {/* Synonyms Section */}
            {synonyms && synonyms.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
                  <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#e5e7eb", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
                    SINONIM & NAMA LAMA
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" } }}>
                    ({synonyms.length})
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {synonyms.map((synonym, index) => (
                    <Box
                      key={synonym.id || index}
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                        py: 2,
                        px: 3,
                        borderBottom: index < synonyms.length - 1 ? "1px solid rgba(55, 65, 81, 0.3)" : "none",
                        bgcolor: "rgba(17, 24, 39, 0.3)",
                        borderRadius: 1,
                        mb: 1,
                        border: "1px solid rgba(55, 65, 81, 0.2)",
                      }}
                    >
                      <Box sx={{ flex: 1, mb: { xs: 2, sm: 0 } }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontStyle: "italic", 
                            color: "#e5e7eb", 
                            fontWeight: 500, 
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                            mb: 0.5
                          }}
                        >
                          {synonym.scientific_name}
                        </Typography>
                        {synonym.author && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: "#9ca3af", 
                              fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" }
                            }}
                          >
                            {synonym.author}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={synonym.taxonomic_status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(synonym.taxonomic_status)}20`,
                            color: getStatusColor(synonym.taxonomic_status),
                            border: `1px solid ${getStatusColor(synonym.taxonomic_status)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.6rem", sm: "0.7rem" }
                          }}
                        />
                        {/* <Chip
                          label={rankLabels[synonym.taxon_rank]}
                          size="small"
                          sx={{
                            bgcolor: "rgba(107, 114, 128, 0.2)",
                            color: "#9ca3af",
                            border: "1px solid rgba(107, 114, 128, 0.3)",
                            fontSize: { xs: "0.6rem", sm: "0.7rem" }
                          }}
                        /> */}
                      </Box>
                    </Box>
                  ))}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "#6b7280", 
                      fontSize: { xs: "0.7rem", sm: "0.8rem" },
                      fontStyle: "italic",
                      mt: 2,
                      p: 2,
                      bgcolor: "rgba(17, 24, 39, 0.2)",
                      borderRadius: 1,
                      border: "1px solid rgba(55, 65, 81, 0.2)"
                    }}
                  >
                    💡 Sinonim adalah nama-nama ilmiah yang pernah digunakan untuk taksa yang sama. 
                    {taxaData.accepted_scientific_name && (
                      <>Nama yang diterima saat ini: <strong style={{ color: "#e5e7eb" }}>{taxaData.accepted_scientific_name}</strong></>
                    )}
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} lg={6}>
            {renderTaxonomyTree()}
          </Grid>
        </Grid>
      </Box>
    )
  }
  const renderTaxonomy = () => {
    return renderTaxonomyTree()
  }
  const buildTaxonomyTreeStructure = () => {
    if (!taxonomyTree || taxonomyTree.length === 0) return null

    let currentNode = null
    for (let i = taxonomyTree.length - 1; i >= 0; i--) {
      const item = taxonomyTree[i]
      const isItalic = ["family", "genus", "species", "subspecies", "variety", "form", "subform"].includes(item.rank)

      const nodeLabel = (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            py: 2,
            "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)" },
            borderRadius: 1,
            transition: "all 0.2s",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Chip
                label={rankLabels[item.rank]}
                size="small"
                sx={{
                  bgcolor: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "0.75rem",
                }}
              />
            </Box>
            <Box sx={{ fontWeight: "medium", fontStyle: isItalic ? "italic" : "normal" }}>
              {item.taxa_id ? (
                <Button
                  onClick={() => handleTaxaClick(item.rank, item.taxa_id)}
                  sx={{
                    color: "#fff",
                    "&:hover": {
                      color: "#3b82f6",
                      textDecoration: "underline",
                    },
                    textTransform: "none",
                    p: 0,
                    minWidth: "auto",
                    justifyContent: "flex-start",
                    fontWeight: "medium",
                    fontSize: "1rem",
                  }}
                >
                  {item.name}
                </Button>
              ) : (
                <Typography component="span" sx={{ color: "#e5e7eb", fontWeight: "medium", fontSize: "1rem" }}>
                  {item.name}
                </Typography>
              )}
              {item.common_name && (
                <Typography component="span" variant="body2" sx={{ ml: 2, color: "#9ca3af" }}>
                  ({item.common_name})
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )

      const newNode = {
        nodeLabel: nodeLabel,
        children: currentNode ? [currentNode] : [],
      }
      currentNode = newNode
    }

    return currentNode
  }
  const renderTree = (node) => {
    if (!node) return null

    return (
      <TreeView nodeLabel={node.nodeLabel} defaultCollapsed={false} className="taxonomy-node">
        {node.children.map((child, index) => (
          <Box
            key={index}
            sx={{
              ml: 3,
              pl: 3,
              borderLeft: "1px solid rgba(59, 130, 246, 0.2)",
              "&:hover": {
                borderColor: "#3b82f6",
              },
              transition: "border-color 0.2s",
            }}
          >
            {renderTree(child)}
          </Box>
        ))}
      </TreeView>
    )
  }

  const renderTaxonomyTree = () => {
    const taxonomyTreeStructure = buildTaxonomyTreeStructure()

    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#e5e7eb" }}>
            TAKSONOMI
          </Typography>
        </Box>
        <Box sx={{ "& .taxonomy-tree": { color: "#e5e7eb" } }}>
          {taxonomyTreeStructure && renderTree(taxonomyTreeStructure)}
        </Box>
      </Box>
    )
  }

  const renderChildren = () => {
    const childRanks = Object.keys(children)

    if (childRanks.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: "#6b7280", mb: 2, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
            Tidak Ada Taksa Anak
          </Typography>
          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Tidak ada taksa anak yang ditemukan untuk {taxaData?.scientific_name}
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ py: 4 }}>
        {childRanks.map((childRank) => (
          <Box key={childRank} sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#60a5fa", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
                {rankLabels[childRank]} ({children[childRank].length})
              </Typography>
            </Box>
            <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
              {children[childRank].map((child) => (
                <Grid item xs={12} sm={6} md={4} key={child.taxa_id}>
                  <Box
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 2,
                      bgcolor: "rgba(17, 24, 39, 0.4)",
                      border: "1px solid rgba(55, 65, 81, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      "&:hover": {
                        borderColor: "rgba(59, 130, 246, 0.5)",
                        bgcolor: "rgba(59, 130, 246, 0.05)",
                        transform: "translateY(-2px)",
                      },
                    }}
                    onClick={() => handleTaxaClick(childRank, child.taxa_id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontStyle: "italic",
                            color: "#60a5fa",
                            "&:hover": { color: "#3b82f6" },
                            mb: 1,
                            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                          }}
                        >
                          {child.scientific_name}
                        </Typography>
                        {child.common_name && (
                          <Typography variant="body2" sx={{ color: "#9ca3af", mb: 1, fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" } }}>
                            {child.common_name}
                          </Typography>
                        )}
                        {child.author && (
                          <Typography variant="caption" sx={{ color: "#6b7280", fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" } }}>
                            {child.author}
                          </Typography>
                        )}
                      </Box>
                      {child.taxonomic_status && (
                        <Chip
                          label={child.taxonomic_status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(child.taxonomic_status)}20`,
                            color: getStatusColor(child.taxonomic_status),
                            border: `1px solid ${getStatusColor(child.taxonomic_status)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.65rem", sm: "0.7rem" }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>
    )
  }

  const renderMedia = () => {
    if (media.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: "#6b7280", mb: 2, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
            Belum Ada Media
          </Typography>
          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Belum ada media untuk taksa ini
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          {media.map((item, index) => (
            <Grid item xs={6} sm={4} md={3} lg={1.8} key={item.id}>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "rgba(17, 24, 39, 0.6)",
                  transition: "all 0.3s",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
                onClick={() => openMediaModal(media, index)}
              >
                <Box sx={{ position: "relative", aspectRatio: "1", bgcolor: "#000" }}>
                  {item.spectrogram ? (
                    <SpectrogramPlayer
                      spectrogramUrl={getMediaUrl(item.spectrogram)}
                      audioUrl={item.audio_url ? getMediaUrl(item.audio_url) : null}
                    />
                  ) : (
                    <>
                      {/* Media count indicator */}
                      {item.images && Array.isArray(item.images) && item.images.length > 1 && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            color: "#e5e7eb",
                            fontSize: { xs: "8px", sm: "10px", md: "12px" },
                            px: { xs: 0.5, sm: 1 },
                            py: { xs: 0.3, sm: 0.5 },
                            bgcolor: "rgba(0,0,0,0.8)",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            zIndex: 20,
                          }}
                        >
                          <FontAwesomeIcon icon={faImage} style={{ fontSize: "12px" }} />
                          <span>{item.images.length}</span>
                        </Box>
                      )}
                      {item.file_path && (
                        <img
                          src={getMediaUrl(item.file_path)}
                          alt="Observation"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit:
                              item.file_path &&
                              typeof item.file_path === "string" &&
                              item.file_path.includes("/assets/icon/")
                                ? "contain"
                                : "cover",
                            padding:
                              item.file_path &&
                              typeof item.file_path === "string" &&
                              item.file_path.includes("/assets/icon/")
                                ? "16px"
                                : "0",
                          }}
                          onError={(e) => {
                            e.target.src = "/placeholder-image.jpg"
                          }}
                        />
                      )}
                    </>
                  )}
                </Box>
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                  {item.location && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: "#60a5fa", fontSize: "10px" }} />
                      <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" } }}>
                        {item.location}
                      </Typography>
                    </Box>
                  )}
                  {item.date && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                      <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "#60a5fa", fontSize: "10px" }} />
                      <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" } }}>
                        {new Date(item.date).toLocaleDateString("id-ID")}
                      </Typography>
                    </Box>
                  )}
                  {/* {item.habitat && (
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                      <FontAwesomeIcon icon={faMountain} style={{ color: "#60a5fa", fontSize: "10px" }} />
                      <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" } }}>
                        {item.habitat}
                      </Typography>
                    </Box>
                  )} */}
                  {item.observation_notes && (
                    <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1, gap: 1 }}>
                      <FontAwesomeIcon icon={faStickyNote} style={{ color: "#60a5fa", fontSize: "10px", marginTop: "2px" }} />
                      <Typography variant="body2" sx={{ color: "#e5e7eb", fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" } }}>
                        {item.observation_notes}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }
  const renderMap = () => {
    if (mapLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#3b82f6", size: { xs: 24, sm: 30, md: 40 } }} />
          <Typography variant="body1" sx={{ ml: 2, color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Memuat data peta...
          </Typography>
        </Box>
      )
    }

    if (locations.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: "#6b7280", mb: 2, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
            🗺️ Tidak Ada Data Lokasi
          </Typography>
          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Belum ada data distribusi geografis untuk {taxaData?.scientific_name}
          </Typography>
        </Box>
      )
    }
    const getBounds = () => {
      if (locations.length === 0) {
        return L.latLngBounds([
          [-8.5, 95.0],
          [6.0, 141.0],
        ])
      }

      try {
        const validPoints = locations
          .map((loc) => {
            const lat = typeof loc.latitude === "string" ? Number.parseFloat(loc.latitude) : loc.latitude
            const lng = typeof loc.longitude === "string" ? Number.parseFloat(loc.longitude) : loc.longitude

            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              return [lat, lng]
            }
            return null
          })
          .filter((point) => point !== null)

        if (validPoints.length === 0) {
          return L.latLngBounds([
            [-8.5, 95.0],
            [6.0, 141.0],
          ])
        }

        return L.latLngBounds(validPoints).pad(0.2)
      } catch (error) {
        console.error("Error calculating bounds:", error)
        return L.latLngBounds([
          [-8.5, 95.0],
          [6.0, 141.0],
        ])
      }
    }

    return (
      <Box sx={{ py: 2 }}>
        <Box
          sx={{
            height: { xs: "300px", sm: "400px", md: "500px" },
            width: "100%",
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid rgba(55, 65, 81, 0.5)",
          }}
        >
          <MapContainer
            bounds={getBounds()}
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            maxZoom={14}
            zoomControl={false}
          >
            <TileLayer
              url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />

            <ZoomHandler setVisibleGrid={setVisibleGrid} />
            <ZoomControl position="bottomright" />

            {/* Render grid data using Rectangle */}
            {gridData[visibleGrid] && gridData[visibleGrid].length > 0 ? (
              gridData[visibleGrid].map((grid, index) => {
                const gridStyle = getColor(grid.count)

                if (!grid.bounds || !Array.isArray(grid.bounds) || grid.bounds.length !== 2) {
                  console.error("Invalid bounds for grid:", grid)
                  return null
                }

                return (
                  <Rectangle key={`grid-${index}`} bounds={grid.bounds} pathOptions={gridStyle}>
                    <Popup>
                      <div style={{ color: "white" }}>
                        <h4 style={{ fontWeight: "bold" }}>Jumlah Observasi: {grid.count}</h4>
                        {grid.locations && grid.locations.length > 0 && (
                          <div style={{ marginTop: "8px" }}>
                            <p style={{ fontSize: "14px", color: "#ccc" }}>
                              Lat: {Number.parseFloat(grid.center[0]).toFixed(6)}
                              <br />
                              Long: {Number.parseFloat(grid.center[1]).toFixed(6)}
                            </p>
                            {grid.locations[0].created_at && (
                              <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                                Tanggal: {new Date(grid.locations[0].created_at).toLocaleDateString("id-ID")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Rectangle>
                )
              })
            ) : (
              <div
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "rgba(0,0,0,0.8)",
                  padding: "16px",
                  borderRadius: "8px",
                  color: "#9ca3af",
                }}
              >
                Tidak ada data grid untuk ditampilkan.
              </div>
            )}
          </MapContainer>
        </Box>
      </Box>
    )
  }
  const renderSimilarTaxa = () => {
    if (similarLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#3b82f6" }} />
          <Typography variant="body1" sx={{ ml: 2, color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Memuat taksa mirip...
          </Typography>
        </Box>
      )
    }

    if (similarTaxa.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: "#6b7280", mb: 2, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
            🔍 Tidak Ada Taksa Mirip
          </Typography>
          <Typography variant="body1" sx={{ color: "#9ca3af", fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
            Belum ada data taksa yang mirip dengan {taxaData?.scientific_name}
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {similarTaxa.map((taxa, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "rgba(17, 24, 39, 0.4)",
                  border: "1px solid rgba(55, 65, 81, 0.5)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: "rgba(59, 130, 246, 0.5)",
                    bgcolor: "rgba(59, 130, 246, 0.05)",
                  },
                }}
                onClick={() => {
                  if (taxa.taxa_id) {
                    navigate(`/taxa/${taxa.rank}/${taxa.taxa_id}`)
                  }
                }}
              >
                {taxa.media && taxa.media.length > 0 && (
                  <Box sx={{ position: "relative", height: { xs: 150, sm: 180, md: 200 }, overflow: "hidden" }}>
                    <img
                      src={getMediaUrl(taxa.media[0].file_path)}
                      alt={taxa.scientific_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        color: "#e5e7eb",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" },
                      }}
                    >
                      {taxa.media.length} foto
                    </Box>
                  </Box>
                )}

                <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontStyle: "italic",
                      color: "#60a5fa",
                      mb: 1,
                      fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                      fontWeight: 500,
                    }}
                  >
                    {taxa.scientific_name}
                  </Typography>

                  {taxa.cname && (
                    <Typography variant="body2" sx={{ color: "#9ca3af", mb: 2, fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" } }}>
                      {taxa.cname}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Chip
                      label={taxa.rank || "Unknown"}
                      size="small"
                      sx={{
                        bgcolor: "rgba(59, 130, 246, 0.2)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        fontSize: { xs: "0.6rem", sm: "0.65rem", md: "0.7rem" },
                        height: { xs: 16, sm: 20 },
                      }}
                    />
                    {taxa.taxonomic_status && (
                      <Chip
                        label={taxa.taxonomic_status}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(taxa.taxonomic_status)}20`,
                          color: getStatusColor(taxa.taxonomic_status),
                          border: `1px solid ${getStatusColor(taxa.taxonomic_status)}40`,
                          fontSize: { xs: "0.6rem", sm: "0.65rem", md: "0.7rem" },
                          height: { xs: 16, sm: 20 },
                        }}
                      />
                    )}
                  </Box>

                  {taxa.family && (
                    <Typography variant="body2" sx={{ color: "#6b7280", mt: 1, fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" } }}>
                      Family: {taxa.family}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            bgcolor: "#000000",
          }}
        >
          <CircularProgress size={60} sx={{ color: "#3b82f6" }} />
        </Box>
      </ThemeProvider>
    )
  }

  if (error) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            bgcolor: "#000000",
          }}
        >
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              maxWidth: 400,
              bgcolor: "rgba(17, 24, 39, 0.4)",
              border: "1px solid rgba(55, 65, 81, 0.5)",
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", color: "#dc2626" }}>
              Error
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: "#9ca3af" }}>
              {error}
            </Typography>
            <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
              Kembali
            </Button>
          </Box>
        </Box>
      </ThemeProvider>
    )
  }

  if (!taxaData) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            bgcolor: "#000000",
          }}
        >
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              maxWidth: 400,
              bgcolor: "rgba(17, 24, 39, 0.4)",
              border: "1px solid rgba(55, 65, 81, 0.5)",
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", color: "#6b7280" }}>
              Data Tidak Ditemukan
            </Typography>
            <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
              Kembali
            </Button>
          </Box>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#0f0f0f", marginTop: { xs: "3vh", sm: "4vh", md: "5vh" } }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
          {/* Breadcrumb Navigation */}
          <TaxaNavigationBreadcrumb
            taxonomyTree={taxonomyTree}
            currentRank={rank}
            currentName={taxaData.scientific_name}
          />

          {/* Hero Section */}
          <Box sx={{ mb: 8 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 4,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, mb: 4, flexWrap: "wrap" }}>
                  <Chip
                    label={rankLabels[rank]}
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      fontWeight: "bold",
                      fontSize: { xs: "0.7rem", sm: "0.8rem" }
                    }}
                  />
                  {taxaData.taxonomic_status && (
                    <Chip
                      label={taxaData.taxonomic_status}
                      sx={{
                        bgcolor: `${getStatusColor(taxaData.taxonomic_status)}20`,
                        color: getStatusColor(taxaData.taxonomic_status),
                        border: `1px solid ${getStatusColor(taxaData.taxonomic_status)}40`,
                        fontWeight: "bold",
                        fontSize: { xs: "0.7rem", sm: "0.8rem" }
                      }}
                    />
                  )}

                  {/* Conservation Status in Header - API priority */}
                  {["species", "subspecies", "form", "variety"].includes(rank) && (
                    <>
                      {conservationStatus?.iucn?.status === "found" && (
                        <Chip
                          label={conservationStatus.iucn.value}
                          size="small"
                          sx={{
                            bgcolor: `${getConservationColor(conservationStatus.iucn.value)}20`,
                            color: getConservationColor(conservationStatus.iucn.value),
                            border: `1px solid ${getConservationColor(conservationStatus.iucn.value)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.7rem", sm: "0.8rem" }
                          }}
                        />
                      )}
                      {conservationStatus?.cites?.status === "found" && (
                        <Chip
                          label={`CITES ${conservationStatus.cites.value}`}
                          size="small"
                          sx={{
                            bgcolor: `${getCitesColor(conservationStatus.cites.value)}20`,
                            color: getCitesColor(conservationStatus.cites.value),
                            border: `1px solid ${getCitesColor(conservationStatus.cites.value)}40`,
                            fontWeight: "bold",
                            fontSize: { xs: "0.7rem", sm: "0.8rem" }
                          }}
                        />
                      )}
                    </>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FontAwesomeIcon icon={faFlag} />}
                    onClick={() => setFlagReportOpen(true)}
                    sx={{
                      borderColor: "rgba(251, 146, 60, 0.4)",
                      color: "#fb923c",
                      fontSize: { xs: "0.7rem", sm: "0.8rem" },
                      "&:hover": {
                        borderColor: "#fb923c",
                        backgroundColor: "rgba(251, 146, 60, 0.1)",
                      },
                    }}
                  >
                    Laporkan
                  </Button>
                  <Button
                    variant={isFavorite ? "contained" : "outlined"}
                    size="small"
                    startIcon={
                      favoriteLoading ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <FontAwesomeIcon icon={isFavorite ? faStar : faStarOutline} />
                      )
                    }
                    onClick={isFavorite ? handleRemoveFavorite : handleAddFavorite}
                    disabled={favoriteLoading}
                    sx={{
                      borderColor: isFavorite ? "transparent" : "rgba(234, 179, 8, 0.4)",
                      bgcolor: isFavorite ? "#EAB308" : "transparent",
                      color: isFavorite ? "#000" : "#EAB308",
                      fontSize: { xs: "0.7rem", sm: "0.8rem" },
                      "&:hover": {
                        borderColor: "#EAB308",
                        bgcolor: isFavorite ? "#CA8A04" : "rgba(234, 179, 8, 0.1)",
                      },
                      "&:disabled": {
                        opacity: 0.7,
                      },
                    }}
                  >
                    {isFavorite ? "Favorit" : "Tambah Favorit"}
                  </Button>
                </Box>

                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: "bold",
                    mb: 2,
                    fontStyle: "italic",
                    color: "#f3f4f6",
                    fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.5rem", lg: "2rem" },
                  }}
                >
                  {taxaData.scientific_name}
                </Typography>
                {taxaData.common_name && (
                  <Typography
                    variant="h4"
                    sx={{
                      color: "#9ca3af",
                      mb: 2,
                      fontSize: { xs: "0.9rem", sm: "1rem", md: "1.2rem", lg: "1.4rem" },
                    }}
                  >
                    {taxaData.common_name}
                  </Typography>
                )}
                {taxaData.author && (
                  <Typography variant="h6" sx={{ color: "#9ca3af", mb: 4, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                    Author: {taxaData.author}
                  </Typography>
                )}

                {taxaData.description && (
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#d1d5db",
                      leading: "relaxed",
                      maxWidth: "800px",
                      fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                      lineHeight: 1.7,
                    }}
                  >
                    {taxaData.description}
                  </Typography>
                )}
              </Box>

              {/* Statistics */}
              <Box sx={{ minWidth: { xs: "100%", lg: "280px" } }}>
                <Grid container spacing={{ xs: 1, sm: 2 }}>
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        textAlign: "center",
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        bgcolor: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                      }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#60a5fa", mb: 1, fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" } }}>
                        {statistics.total_observations || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#93c5fd", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                        OBSERVASI
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        textAlign: "center",
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        bgcolor: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#34d399", mb: 1, fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" } }}>
                        {statistics.total_media || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6ee7b7", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                        MEDIA
                      </Typography>
                    </Box>
                  </Grid>
                  {/* <Grid item xs={6}>
                    <Box
                      sx={{
                        textAlign: "center",
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        bgcolor: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                      }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#a78bfa", mb: 1, fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" } }}>
                        {statistics.total_children || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#c4b5fd", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                        TAKSA ANAK
                      </Typography>
                    </Box>
                  </Grid> */}
                </Grid>
              </Box>
            </Box>
          </Box>

          {/* Media Gallery Section */}
          {media && media.length > 0 && (
            <Box sx={{ mb: 8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: "#3b82f6", borderRadius: "50%" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#e5e7eb", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}>
                  Gallery Media
                </Typography>
                <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" } }}>
                  ({media.length})
                </Typography>
              </Box>
              <Grid container spacing={{ xs: 0.5, sm: 1 }}>
                {media.slice(0, 12).map((item, index) => (
                  <Grid item xs={4} sm={4} md={3} lg={1.8} alignItems="center" key={`media-${item.id || index}`}>
                    <Box
                      sx={{
                        position: "relative",
                        aspectRatio: "1",
                        overflow: "hidden",
                        cursor: "pointer",
                        bgcolor: "#000",
                        borderRadius: 1,
                        "&:hover": {
                          transform: "scale(1.05)",
                          transition: "transform 0.2s",
                        },
                      }}
                      onClick={() => openMediaModal(media, index)}
                    >
                      {item.spectrogram ? (
                        <SpectrogramPlayer
                          spectrogramUrl={getMediaUrl(item.spectrogram)}
                          audioUrl={item.audio_url ? getMediaUrl(item.audio_url) : null}
                        />
                      ) : (
                        <>
                          {/* Media count indicator */}
                          {item.images && Array.isArray(item.images) && item.images.length > 1 && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 8,
                                color: "#e5e7eb",
                                fontSize: { xs: "8px", sm: "10px" },
                                px: { xs: 0.5, sm: 1 },
                                py: { xs: 0.5, sm: 1 },
                                bgcolor: "rgba(0,0,0,0.8)",
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                zIndex: 20,
                              }}
                            >
                              <FontAwesomeIcon icon={faImage} style={{ color: "#60a5fa", fontSize: "10px" }} />
                              <span>{item.images.length}</span>
                            </Box>
                          )}
                          {item.file_path && (
                            <img
                              src={getMediaUrl(item.file_path)}
                              alt={`Media ${index + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit:
                                  item.file_path &&
                                  typeof item.file_path === "string" &&
                                  item.file_path.includes("/assets/icon/")
                                    ? "contain"
                                    : "cover",
                                padding:
                                  item.file_path &&
                                  typeof item.file_path === "string" &&
                                  item.file_path.includes("/assets/icon/")
                                    ? "16px"
                                    : "0",
                              }}
                              onError={(e) => {
                                e.target.src = "/placeholder-image.jpg"
                              }}
                            />
                          )}
                        </>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {media.length > 12 && (
                <Typography variant="body2" sx={{ mt: 3, textAlign: "center", color: "#9ca3af", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                  Menampilkan 12 dari {media.length} media. Lihat tab Media untuk selengkapnya.
                </Typography>
              )}
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(6, 1fr)"
                  },
                  gap: { xs: 0.5, sm: 1 },
                  p: { xs: 0.5, sm: 1 },
                  bgcolor: "rgba(17, 24, 39, 0.4)",
                  border: "1px solid rgba(55, 65, 81, 0.5)",
                  borderRadius: 2,
                  backdropFilter: "blur(8px)",
                  maxWidth: "fit-content",
                }}
              >
                {[
                  { value: "overview", label: "Ringkasan" },
                  { value: "taxonomy", label: "Taksonomi" },
                  { value: "children", label: `Taksa Anak (${statistics.total_children || 0})` },
                  { value: "media", label: `Media (${statistics.total_media || 0})` },
                  { value: "map", label: "Peta Sebaran" },
                  { value: "similar", label: "Taksa Mirip" },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    sx={{
                      px: { xs: 1, sm: 2, md: 3, lg: 6, xl: 10 },
                      py: { xs: 1, sm: 1.5 },
                      borderRadius: 1.5,
                      textTransform: "none",
                      fontWeight: "bold",
                      fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
                      minWidth: "auto",
                      whiteSpace: "nowrap",
                      color: activeTab === tab.value ? "#60a5fa" : "#9ca3af",
                      bgcolor: activeTab === tab.value ? "rgba(59, 130, 246, 0.2)" : "transparent",
                      border: activeTab === tab.value ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent",
                      "&:hover": {
                        bgcolor: activeTab === tab.value ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.1)",
                        color: "#60a5fa",
                        borderColor: "rgba(59, 130, 246, 0.4)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box>
              {activeTab === "overview" && renderOverview()}
              {activeTab === "taxonomy" && renderTaxonomy()}
              {activeTab === "children" && renderChildren()}
              {activeTab === "media" && renderMedia()}
              {activeTab === "map" && renderMap()}
              {activeTab === "similar" && renderSimilarTaxa()}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Taxa Flag Report Dialog */}
      <TaxaFlagReport
        open={flagReportOpen}
        onClose={() => setFlagReportOpen(false)}
        taxaId={id}
        taxaName={taxaData?.scientific_name}
        commonName={taxaData?.common_name}
      />

      {/* Media Modal/Lightbox */}
      <Modal
        open={modalOpen}
        onClose={closeMediaModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95vw', sm: '90vw', md: '85vw', lg: '80vw' },
            height: { xs: '90vh', sm: '85vh', md: '80vh' },
            bgcolor: 'transparent',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {modalMedia.length > 0 && (
            <>
              {/* Close Button */}
              <IconButton
                onClick={closeMediaModal}
                sx={{
                  position: 'absolute',
                  top: { xs: 10, sm: 20 },
                  right: { xs: 10, sm: 20 },
                  color: '#fff',
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                  zIndex: 1000,
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </IconButton>

              {/* Zoom Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 10, sm: 20 },
                  left: { xs: 10, sm: 20 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  zIndex: 1000,
                }}
              >
                {/* Zoom In */}
                <IconButton
                  onClick={zoomIn}
                  disabled={zoomLevel >= 5}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <FontAwesomeIcon icon={faSearchPlus} />
                </IconButton>

                {/* Zoom Out */}
                <IconButton
                  onClick={zoomOut}
                  disabled={zoomLevel <= 1}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <FontAwesomeIcon icon={faSearchMinus} />
                </IconButton>

                {/* Reset Zoom */}
                <IconButton
                  onClick={resetZoom}
                  disabled={zoomLevel === 1}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <FontAwesomeIcon icon={faCompress} />
                </IconButton>
              </Box>

              {/* Navigation Buttons */}
              {modalMedia.length > 1 && (
                <>
                  {/* Previous Button */}
                  <IconButton
                    onClick={goToPrevMedia}
                    sx={{
                      position: 'absolute',
                      left: { xs: 10, sm: 20 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#fff',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                      },
                      zIndex: 1000,
                    }}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </IconButton>

                  {/* Next Button */}
                  <IconButton
                    onClick={goToNextMedia}
                    sx={{
                      position: 'absolute',
                      right: { xs: 10, sm: 20 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#fff',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                      },
                      zIndex: 1000,
                    }}
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </IconButton>
                </>
              )}

              {/* Media Content */}
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onWheel={handleWheel}
              >
                {modalMedia[currentMediaIndex]?.spectrogram ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#1e1f1e',
                      borderRadius: 2,
                      transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease',
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <SpectrogramPlayer
                      spectrogramUrl={getMediaUrl(modalMedia[currentMediaIndex].spectrogram)}
                      audioUrl={modalMedia[currentMediaIndex].audio_url ? getMediaUrl(modalMedia[currentMediaIndex].audio_url) : null}
                    />
                  </Box>
                ) : (
                  modalMedia[currentMediaIndex]?.file_path && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease',
                        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <img
                        src={getMediaUrl(modalMedia[currentMediaIndex].file_path)}
                        alt={`Media ${currentMediaIndex + 1}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg'
                        }}
                        draggable={false}
                      />
                    </Box>
                  )
                )}
              </Box>

              {/* Media Info */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: { xs: 10, sm: 20 },
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#fff',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                  {currentMediaIndex + 1} / {modalMedia.length}
                </Typography>
                {modalMedia[currentMediaIndex]?.location && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                    📍 {modalMedia[currentMediaIndex].location}
                  </Typography>
                )}
                {modalMedia[currentMediaIndex]?.date && (
                  <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                    📅 {new Date(modalMedia[currentMediaIndex].date).toLocaleDateString("id-ID")}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </ThemeProvider>
  )
}

export default TaxaDetail
