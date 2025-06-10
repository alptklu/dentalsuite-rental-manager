// Configuration file for environment variables

// Detect environment and set appropriate API base URL
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it (for custom configurations)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (deployed), use relative URLs
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // In development, check if we're accessing via network IP
  const isNetworkAccess = window?.location?.hostname === '192.168.1.104';
  return isNetworkAccess 
    ? 'http://192.168.1.104:3001/api' 
    : 'http://localhost:3001/api';
};

export const config = {
  // API Configuration
  API_URL: getApiBaseUrl(),
  
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