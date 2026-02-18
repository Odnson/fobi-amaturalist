import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faSpinner, faChevronRight, faChevronDown } from '@fortawesome/free-solid-svg-icons';
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
const EXCLUDED_NAMES = new Set([
  'Eukaryota', 'Deuterostomia', 'Ecdysozoa', 'Eumetazoa', 'Vertebrata',
  'Bilateria', 'Protostomia', 'Lophotrochozoa', 'Spiralia', 'Gnathostomata',
  'Tetrapoda', 'Amniota', 'Sauropsida', 'Diapsida', 'Archosauria',
  'Dinosauria', 'Theropoda', 'Metazoa', 'Opisthokonta', 'Holozoa'
]);

const ProfileSpecies = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['life']));
  const [totalObservations, setTotalObservations] = useState(0);
  const currentUserId = localStorage.getItem('user_id');
  const isOwnProfile = currentUserId === id;
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/home/${id}`);
        const data = await res.json();
        if (data.success) setProfileData(data.data);
      } catch (e) {
        console.error('Gagal memuat data profil:', e);
      }
    };
    fetchProfile();
  }, [id]);
  const fetchLifeList = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/life-list/${id}`);
      const data = await response.json();
      
      if (data.success) {
        const processedTree = buildLinnaeanTree(data.data);
        setTreeData(processedTree);
        setTotalObservations(processedTree?.count || 0);
      } else {
        setError(data.message || 'Gagal memuat data');
      }
    } catch (e) {
      console.error('Error fetching life list:', e);
      setError('Gagal memuat daftar hayati');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLifeList();
  }, [fetchLifeList]);
  const buildLinnaeanTree = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return null;
    const root = {
      id: 'life',
      name: 'Kehidupan',
      commonName: '',
      rank: 'life',
      count: 0,
      children: []
    };
    rawData.forEach(kingdom => {
      if (EXCLUDED_NAMES.has(kingdom.name)) return;
      const processNode = (node) => {
        return {
          id: node.id || `${node.rank}-${node.name}`,
          name: node.name,
          commonName: node.common_name || '',
          rank: node.rank,
          count: node.count || 0,
          taxa_id: node.taxa_id,
          children: (node.children || [])
            .filter(child => !EXCLUDED_NAMES.has(child.name))
            .map(child => processNode(child))
        };
      };
      
      root.children.push(processNode(kingdom));
    });
    root.count = root.children.reduce((sum, child) => sum + child.count, 0);

    return root;
  };
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  const handleNodeClick = (node) => {
    if (node.taxa_id && node.rank !== 'life') {
      navigate(`/taxa/${node.rank}/${node.taxa_id}`);
    }
  };
  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;
    
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isLife = node.rank === 'life';
    const isSpecies = node.rank === 'species';
    const canNavigate = node.taxa_id && node.rank !== 'life';
    
    return (
      <div key={node.id} className="text-sm">
        {/* Current node */}
        <div 
          className="flex items-center py-1 hover:bg-[#1a1a1a] rounded transition-colors cursor-pointer"
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {/* Expand/collapse arrow - only for nodes with children */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white mr-1 flex-shrink-0"
            >
              <FontAwesomeIcon 
                icon={isExpanded ? faChevronDown : faChevronRight} 
                className="text-xs"
              />
            </button>
          ) : (
            <span className="w-6 flex-shrink-0" />
          )}
          
          {/* Node content - clickable to taxa detail */}
          <span 
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => canNavigate && navigate(`/taxa/${node.rank}/${node.taxa_id}`)}
          >
            <span className={`${isSpecies ? 'italic' : ''} text-white hover:text-[#3B82F6] transition-colors truncate`}>
              {node.name}
            </span>
            {node.commonName && (
              <span className="text-gray-500 truncate">
                – {node.commonName}
              </span>
            )}
            {/* Rank label - after name, capitalize format */}
            {node.rank !== 'life' && (
              <span className="text-gray-500 text-[10px] flex-shrink-0">
                {node.rank.charAt(0).toUpperCase() + node.rank.slice(1)}
              </span>
            )}
            {/* Observation count - inline with name */}
            <span className="text-[#3B82F6] font-medium flex-shrink-0">
              {node.count}
            </span>
          </span>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121212]">
      <Header userData={getUserData()} />

      <div className="flex-1 container mx-auto px-3 sm:px-4 lg:px-6 py-6 mt-16">
        {/* Layout wrapper dengan fixed sidebar */}
        <div className="flex gap-0">
          {/* Sidebar - Fixed di desktop, floating button di mobile */}
          <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
            {/* Placeholder untuk space sidebar fixed */}
          </div>
          <Sidebar 
            userId={id} 
            activeItem="Spesies"
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
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {isOwnProfile ? 'Daftar hayati saya' : `Daftar hayati ${profileData?.user?.uname || 'Pengguna'}`}
                </h1>
                <p className="text-gray-400 text-sm">Urut berdasarkan taksonomi</p>
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-400 border-t border-[#252525] pt-4">
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChevronRight} className="text-gray-500" />
                  <span>Klik panah untuk buka/tutup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white">Nama taksa</span>
                  <span>Klik nama untuk lihat detail</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#3B82F6] font-medium">123</span>
                  <span>Jumlah observasi</span>
                </div>
              </div>
            </div>

            {/* Tree View Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-[#3B82F6]" />
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={fetchLifeList}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : !treeData ? (
                <div className="text-center py-20 text-gray-500">
                  <p>Belum ada data observasi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {renderTreeNode(treeData)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSpecies;