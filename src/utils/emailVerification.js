import { apiFetch } from './api';

/**
 * Verify if email exists in Burungnesia database
 * @param {string} email - Email to verify
 * @returns {Promise<{exists: boolean, platform: string}>}
 */
export const verifyBurungnesiaEmail = async (email) => {
  try {
    const response = await apiFetch('/verify-burungnesia-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Burungnesia email verification error:', error);
    return { success: false, exists: false };
  }
};

/**
 * Verify if email exists in Kupunesia database
 * @param {string} email - Email to verify
 * @returns {Promise<{exists: boolean, platform: string}>}
 */
export const verifyKupunesiaEmail = async (email) => {
  try {
    const response = await apiFetch('/verify-kupunesia-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Kupunesia email verification error:', error);
    return { success: false, exists: false };
  }
};
