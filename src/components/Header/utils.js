export const getInitials = (name) => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getAvatarColor = (name) => {
  if (!name) return '#6B7280';
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getImageUrl = (profilePicture) => {
  if (!profilePicture) return null;
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }
  const cleanPath = profilePicture
    .replace(/^\/storage\//, '')
    .replace(/^\/api\/storage\//, '')
    .replace(/^storage\//, '')
    .replace(/^api\/storage\//, '');
  return `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${cleanPath}`;
};

export const getGradeDisplay = (grade) => {
  switch(grade.toLowerCase()) {
    case 'research grade':
      return 'ID Lengkap';
    case 'confirmed id':
      return 'ID Terkonfirmasi';
    case 'needs id':
      return 'Bantu Iden';
    case 'low quality id':
      return 'ID Kurang';
    default:
      return grade;
  }
};

export const normalizeScientificName = (scientificName) => {
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

export const TAXONOMY_RANKS = [
  { key: 'class', label: 'Class' },
  { key: 'order', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'species', label: 'Species' }
];

export const MAJOR_ISLANDS = {
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
  }
};
