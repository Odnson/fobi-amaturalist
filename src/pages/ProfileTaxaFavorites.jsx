import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TaxaSearchModal from '../components/Modals/TaxaSearchModal';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faPlus, faTrash, faSearch, faSpinner, faStar, faHeart } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import axios from 'axios';
const defaultTaxaImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyYzJjMmMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSI0MCI+8J+MvzwvdGV4dD48L3N2Zz4=';
const getUserData = () => {
  return {
    uname: localStorage.getItem('username'),
    level: localStorage.getItem('level'),
    email: localStorage.getItem('email'),
    bio: localStorage.getItem('bio'),
    profile_picture: localStorage.getItem('profile_picture'),
    totalObservations: localStorage.getItem('totalObservations'),
  };
};

const ProfileTaxaFavorites = () => {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const currentUserId = localStorage.getItem('user_id');
  const isOwnProfile = currentUserId === id;
  useEffect(() => {
    const user = {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      profile_picture: localStorage.getItem('profile_picture'),
    };
    setUserData(user);
  }, []);
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
        const data = await res.json();
        if (data.success) setProfileData(data.data);
      } catch (e) {
        console.error('Gagal memuat data profil (Taksa Favorit):', e);
      }
    };
    fetchProfile();
  }, [id]);
  const fetchFavorites = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/favorite-taxas/${id}`);
      const data = await response.json();
      if (data.success) {
        setFavorites(data.data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);
  const handleAddFavorite = async (taxa) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/profile/favorite-taxas`,
        { taxa_id: taxa.id },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Taksa berhasil ditambahkan ke favorit');
        fetchFavorites();
      } else {
        toast.error(response.data.message || 'Gagal menambahkan taksa');
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      if (error.response?.status === 400) {
        toast.error('Taksa sudah ada di daftar favorit');
      } else {
        toast.error('Gagal menambahkan taksa favorit');
      }
    }
  };
  const handleDeleteFavorite = async (favoriteId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus taksa ini dari favorit?')) return;
    
    setDeletingId(favoriteId);
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/profile/favorite-taxas/${favoriteId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Taksa berhasil dihapus dari favorit');
        setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      } else {
        toast.error(response.data.message || 'Gagal menghapus taksa');
      }
    } catch (error) {
      console.error('Error deleting favorite:', error);
      toast.error('Gagal menghapus taksa favorit');
    } finally {
      setDeletingId(null);
    }
  };
  const formatRank = (rank) => {
    if (!rank) return '';
    return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
  };
  const isParentTaxa = (taxonRank) => {
    if (!taxonRank) return false;
    return !['SPECIES', 'SUBSPECIES'].includes(taxonRank.toUpperCase());
  };
  const renderTaxaCard = (favorite, showDelete = false) => (
    <div 
      key={favorite.id}
      className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] hover:border-[#444] transition-all group"
    >
      {/* Photo */}
      <div className="relative h-36 bg-[#2c2c2c]">
        <img
          src={favorite.taxa?.photo_url || defaultTaxaImage}
          alt={favorite.taxa?.scientific_name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultTaxaImage;
          }}
        />
        {/* Child count badge for parent taxa */}
        {isParentTaxa(favorite.taxa?.taxon_rank) && favorite.taxa?.child_count > 0 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-[#3B82F6]/90 text-white text-xs rounded-full">
            {favorite.taxa.child_count.toLocaleString()} taksa
          </div>
        )}
        {showDelete && (
          <button
            onClick={() => handleDeleteFavorite(favorite.id)}
            disabled={deletingId === favorite.id}
            className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Hapus dari favorit"
          >
            {deletingId === favorite.id ? (
              <FontAwesomeIcon icon={faSpinner} spin className="w-3 h-3" />
            ) : (
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-white text-sm truncate italic">
          {favorite.taxa?.scientific_name || 'Unknown'}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            {formatRank(favorite.taxa?.taxon_rank)}
          </span>
          {isParentTaxa(favorite.taxa?.taxon_rank) && (
            <span className="text-xs text-green-400">• Termasuk anak</span>
          )}
        </div>
        {favorite.taxa?.common_name && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {favorite.taxa.common_name}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Header userData={userData} />

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 mt-16">
        {/* Layout wrapper dengan fixed sidebar */}
        <div className="flex gap-0">
          {/* Sidebar - Fixed di desktop, floating button di mobile */}
          <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
            {/* Placeholder untuk space sidebar fixed */}
          </div>
          <Sidebar 
            userId={id} 
            activeItem="Taksa favorit"
            isMobileOpen={showSidebar}
            onMobileClose={() => setShowSidebar(false)}
            onMobileOpen={() => setShowSidebar(true)}
            userOverride={{
              uname: profileData?.user?.uname,
              level: profileData?.user?.level,
              profile_picture: profileData?.user?.profile_picture,
              totalObservations: profileData?.user?.totalObservations || profileData?.stats?.totalObservations
            }}
          />
          
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 sm:p-8 border border-[#252525] shadow-xl">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {isOwnProfile ? 'Taksa favorit saya' : `Taksa favorit ${profileData?.user?.uname || 'Pengguna'}`}
                </h1>
                <p className="text-gray-400 text-sm">
                  {isOwnProfile 
                    ? 'Pilih taksa favorit yang ingin kamu tambahkan di halaman ini' 
                    : 'Daftar taksa favorit yang sudah ditambahkan'}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-semibold text-white">
                    {favorites.length}
                  </div>
                  <div className="text-sm text-[#3B82F6]">
                    Total Favorit
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-semibold text-white">
                    {favorites.filter(f => f.taxa?.taxon_rank?.toUpperCase() === 'SPECIES').length}
                  </div>
                  <div className="text-sm text-[#10B981]">
                    Species
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-semibold text-white">
                    {favorites.filter(f => f.taxa?.taxon_rank?.toUpperCase() === 'GENUS').length}
                  </div>
                  <div className="text-sm text-[#F59E0B]">
                    Genus
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-semibold text-white">
                    {favorites.filter(f => !['SPECIES', 'SUBSPECIES', 'GENUS'].includes(f.taxa?.taxon_rank?.toUpperCase())).length}
                  </div>
                  <div className="text-sm text-[#8B5CF6]">
                    Lainnya
                  </div>
                </div>
              </div>
            </div>

            {/* Add Favorite Section - Only for owner */}
            {isOwnProfile && (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 border border-[#252525] shadow-xl">
                <h2 className="text-lg font-medium text-white mb-4">Tambah taksa favorit</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#252525] border border-[#444] rounded-lg text-gray-400 hover:border-[#3B82F6] hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faSearch} />
                    <span>Cari taksa...</span>
                  </button>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>Tambah</span>
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  💡 Tip: Anda juga bisa menambahkan taksa favorit langsung dari halaman detail taksa
                </p>
              </div>
            )}

            {/* Favorites List */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 border border-[#252525] shadow-xl">
              <h2 className="text-lg font-medium text-white mb-4">
                Daftar taksa favorit
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FontAwesomeIcon icon={faStar} className="text-4xl mb-4 opacity-50" />
                  <p>Belum ada taksa favorit</p>
                  {isOwnProfile && (
                    <p className="text-sm mt-1">Klik tombol "Tambah" untuk menambahkan taksa favorit</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favorites.map(favorite => renderTaxaCard(favorite, isOwnProfile))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Taxa Search Modal */}
      <TaxaSearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleAddFavorite}
      />
    </>
  );
};

export default ProfileTaxaFavorites;