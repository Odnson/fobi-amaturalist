/**
 * MSW Browser Setup
 * Setup Mock Service Worker untuk browser environment
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup worker dengan handlers
export const worker = setupWorker(...handlers);

// Export untuk digunakan di main.jsx
export { handlers };
