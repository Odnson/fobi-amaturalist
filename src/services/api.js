import { apiFetch } from '../utils/api';

/**
 * Mendapatkan daftar observasi pengguna- Parameter untuk filter dan pagination
 * @returns {Promise}
 */
export const getUserObservations = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.perPage) queryParams.append('perPage', params.perPage);
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const response = await apiFetch(`/user/observations?${queryParams.toString()}`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching user observations:', error);
    throw error;
  }
};

/**
 * Mendapatkan detail observasi
 * @param {string|number} id - ID observasi
 * @returns {Promise}
 */
export const getObservationDetail = async (id) => {
  try {
    const response = await apiFetch(`/user/observations/${id}`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching observation detail:', error);
    throw error;
  }
};

/**
 * Menghapus observasi
 * @param {string|number} id
 * @returns {Promise} 
 */
export const deleteObservation = async (id) => {
  try {
    const response = await apiFetch(`/user/observations/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error deleting observation:', error);
    throw error;
  }
}; 