/**
 * API Configuration
 * 
 * To switch between localhost and infinityfree hosting:
 * 1. For localhost: Set VITE_API_BASE_URL=http://localhost:8080/api in .env
 * 2. For infinityfree: Set VITE_API_BASE_URL=https://your-site.infinityfreeapp.com/api in .env
 * 
 * The Vite proxy will handle same-origin requests during development if left empty.
 */
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || '';
