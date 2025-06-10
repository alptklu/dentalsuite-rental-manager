// Configuration file for environment variables

// Detect if we're accessing via network IP
const isNetworkAccess = window.location.hostname === '192.168.1.104';
const apiBaseUrl = isNetworkAccess 
  ? 'http://192.168.1.104:3001/api' 
  : 'http://localhost:3001/api';

export const config = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || apiBaseUrl,
  
  // Frontend Configuration
  APP_NAME: 'DentLeon Suits',
  APP_DESCRIPTION: 'Dental Suite Rental Management System',
  
  // Development settings
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // Default credentials (for development only)
  DEFAULT_ADMIN: {
    username: 'admin',
    password: 'admin123',
  },
} as const;

export default config; 