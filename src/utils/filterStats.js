const statsCache = {
  data: null,
  timestamp: null,
  timeout: 30000 
};

const isCacheValid = () => {
  if (!statsCache.data || !statsCache.timestamp) return false;
  return Date.now() - statsCache.timestamp < statsCache.timeout;
};

export const fetchFilteredStats = async (queryParams) => {
  try {
    const skipFetchStats = localStorage.getItem('skipFetchStats') === 'true';
    if (skipFetchStats) {
      console.log('Melewati fetch stats karena skipFetchStats = true');
      
      if (statsCache.data) {
        console.log('Menggunakan stats dari cache karena skipFetchStats = true');
        return statsCache.data;
      }
    }
    
    if (isCacheValid()) {
      console.log('Menggunakan stats dari cache');
      return statsCache.data;
    }

    const baseUrl = `${import.meta.env.VITE_API_URL}`;
    const token = localStorage.getItem('jwt_token');

    let params;
    if (typeof queryParams === 'string') {
      params = new URLSearchParams(queryParams);
    } else if (queryParams instanceof URLSearchParams) {
      params = queryParams;
    } else if (typeof queryParams === 'object') {
      params = new URLSearchParams();
      
      Object.entries(queryParams).forEach(([key, value]) => {
        if (key === 'data_source' || key === 'data_source[]') {
          const cleanKey = 'data_source[]';
          
          if (typeof value === 'string' && value.includes(',')) {
            value.split(',').forEach(source => {
              params.append(cleanKey, source.trim());
            });
          } 
          else if (Array.isArray(value)) {
            if (value.length === 0) {
              ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
                params.append(cleanKey, source);
              });
            } else {
              value.forEach(source => {
                params.append(cleanKey, source);
              });
            }
          }
          else if (typeof value === 'string') {
            params.append(cleanKey, value);
          }
          else if (value === null || value === undefined) {
            ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
              params.append(cleanKey, source);
            });
          }
        }
        else if (key === 'grade' || key === 'grade[]') {
          const cleanKey = 'grade[]';
          if (Array.isArray(value)) {
            if (value.length > 0) {
              value.forEach(grade => {
                params.append(cleanKey, grade);
              });
            }
          } else if (typeof value === 'string') {
            params.append(cleanKey, value);
          }
        }
        else if (value !== null && value !== undefined) {
          params.append(key, value);
        }
      });
    } else {
      params = new URLSearchParams();
      ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
        params.append('data_source[]', source);
      });
    }

    if (!params.has('data_source[]')) {
      ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
        params.append('data_source[]', source);
      });
    }

    const queryString = params.toString();
    console.log('Fetching stats with params:', queryString);

    const response = await fetch(`${baseUrl}/filtered-stats?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error(`Error fetching stats: ${response.status} ${response.statusText}`);
      
      // Tangani error 500 secara khusus
      if (response.status === 500) {
        console.error('Server error 500, menggunakan cache atau default stats');
        // Gunakan cache jika ada
        if (statsCache.data) {
          return statsCache.data;
        }
        // Jika tidak ada cache, kembalikan stats default
        return getDefaultStats();
      }
      
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const result = await response.json();
    console.log('Stats response:', result);

    if (!result.success) {
      console.error('API returned success: false', result);
      throw new Error(result.message || 'API returned success: false');
    }

    if (!result.stats) {
      console.error('API did not return stats object', result);
      throw new Error('Invalid response format: missing stats object');
    }

    if (result.message && result.message.includes('data source field must be an array')) {
      console.error('Data source error:', result.message);
      throw new Error('The data source field must be an array');
    }

    if (result.success && result.stats) {
      const validatedStats = {
        burungnesia: result.stats.burungnesia || 0,
        kupunesia: result.stats.kupunesia || 0,
        fobi: result.stats.fobi || 0,
        observasi: result.stats.observasi || 0,
        spesies: result.stats.spesies || 0,
        kontributor: result.stats.kontributor || 0,
      };
      
      statsCache.data = validatedStats;
      statsCache.timestamp = Date.now();
      
      return validatedStats;
    }

    throw new Error('Invalid response format');

  } catch (error) {
    console.error('Error fetching filtered stats:', error);
    
    if (error.message.includes('The data source field must be an array')) {
      console.error('Data source error, mencoba lagi dengan format yang benar');
      
      try {
        const newParams = new URLSearchParams();
        ['fobi', 'burungnesia', 'kupunesia'].forEach(source => {
          newParams.append('data_source[]', source);
        });
        
        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        const token = localStorage.getItem('jwt_token');
        
        const response = await fetch(`${baseUrl}/filtered-stats?${newParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.stats) {
            const validatedStats = {
              burungnesia: result.stats.burungnesia || 0,
              kupunesia: result.stats.kupunesia || 0,
              fobi: result.stats.fobi || 0,
              observasi: result.stats.observasi || 0,
              spesies: result.stats.spesies || 0,
              kontributor: result.stats.kontributor || 0,
            };
            
              statsCache.data = validatedStats;
            statsCache.timestamp = Date.now();
            
            return validatedStats;
          }
        }
      } catch (retryError) {
        console.error('Error pada percobaan ulang:', retryError);
      }
    }
    
    if (statsCache.data) {
      console.log('Menggunakan stats dari cache karena error');
      return statsCache.data;
    }
    
    return getDefaultStats();
  }
};

const getDefaultStats = () => {
  return {
    burungnesia: 0,
    kupunesia: 0,
    fobi: 0,
    observasi: 0,
    spesies: 0,
    kontributor: 0,
  };
};

export const validateStats = (stats) => {
  const requiredFields = ['burungnesia', 'kupunesia', 'fobi', 'observasi', 'spesies', 'kontributor'];
  return requiredFields.every(field => typeof stats[field] === 'number');
};

export const combineStats = (statsArray) => {
  return statsArray.reduce((acc, curr) => ({
    burungnesia: (acc.burungnesia || 0) + (curr.burungnesia || 0),
    kupunesia: (acc.kupunesia || 0) + (curr.kupunesia || 0),
    fobi: (acc.fobi || 0) + (curr.fobi || 0),
    observasi: (acc.observasi || 0) + (curr.observasi || 0),
    spesies: Math.max(acc.spesies || 0, curr.spesies || 0),
    kontributor: Math.max(acc.kontributor || 0, curr.kontributor || 0)
  }), {});
}; 