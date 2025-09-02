// API Configuration File
// This file centralizes all API endpoints and configuration using environment variables

export const API_CONFIG = {
  // Base URL
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ghdev.seedandbeyond.com:50000',
  API_VERSION: process.env.EXPO_PUBLIC_API_VERSION || '/b1s/v1',
  
  // Company Configuration
  COMPANY_DB: process.env.EXPO_PUBLIC_COMPANY_DB || '__QAS',
  
  // Authentication Endpoints
  LOGIN: process.env.EXPO_PUBLIC_LOGIN_ENDPOINT || '/Login',
  USERS_SERVICE_GET_CURRENT_USER: process.env.EXPO_PUBLIC_USERS_SERVICE_ENDPOINT || '/UsersService_GetCurrentUser',
  
  // Data Endpoints
  CART_MASTER: process.env.EXPO_PUBLIC_CART_MASTER_ENDPOINT || '/U_CART_MASTER',
  HANGER: process.env.EXPO_PUBLIC_HANGER_ENDPOINT || '/U_HANGER',
  BIN_LOCATIONS: process.env.EXPO_PUBLIC_BIN_LOCATIONS_ENDPOINT || '/BinLocations',
  ITEMS: process.env.EXPO_PUBLIC_ITEMS_ENDPOINT || '/Items',
  IMMATURE_PLANNER: process.env.EXPO_PUBLIC_IMMATURE_PLANNER_ENDPOINT || '/sml.svc/CV_IMMATURE_PLANNER_VW',
  BATCH_NUMBER_DETAILS: process.env.EXPO_PUBLIC_BATCH_NUMBER_DETAILS_ENDPOINT || '/BatchNumberDetails',
  NPFET: process.env.EXPO_PUBLIC_NPFET_ENDPOINT || '/NPFET',
  NPFETLINES: process.env.EXPO_PUBLIC_NPFETLINES_ENDPOINT || '/NPFETLINES',
  BATCH_SERVICE: process.env.EXPO_PUBLIC_BATCH_SERVICE_ENDPOINT || '/$batch',
  NBNLG: process.env.EXPO_PUBLIC_NBNLG_ENDPOINT || '/NBNLG',
  
  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'SH',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  
  // Timeout Configuration (in milliseconds)
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
  BATCH_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_BATCH_TIMEOUT) || 60000,
  
  // Batch Processing
  BATCH_SIZE: parseInt(process.env.EXPO_PUBLIC_BATCH_SIZE) || 200,
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
};

// Helper function to build specific API URLs
export const API_URLS = {
  LOGIN: buildApiUrl(API_CONFIG.LOGIN),
  USERS_SERVICE: buildApiUrl(API_CONFIG.USERS_SERVICE_GET_CURRENT_USER),
  CART_MASTER: buildApiUrl(API_CONFIG.CART_MASTER),
  HANGER: buildApiUrl(API_CONFIG.HANGER),
  BIN_LOCATIONS: buildApiUrl(API_CONFIG.BIN_LOCATIONS),
  ITEMS: buildApiUrl(API_CONFIG.ITEMS),
  IMMATURE_PLANNER: buildApiUrl(API_CONFIG.IMMATURE_PLANNER),
  BATCH_NUMBER_DETAILS: buildApiUrl(API_CONFIG.BATCH_NUMBER_DETAILS),
  NPFET: buildApiUrl(API_CONFIG.NPFET),
  NPFETLINES: buildApiUrl(API_CONFIG.NPFETLINES),
  BATCH_SERVICE: buildApiUrl(API_CONFIG.BATCH_SERVICE),
  NBNLG: buildApiUrl(API_CONFIG.NBNLG),
};

// Company configuration
export const COMPANY_CONFIG = {
  DB: API_CONFIG.COMPANY_DB,
  NAME: 'Seed and Beyond',
};

// App configuration
export const APP_CONFIG = {
  NAME: API_CONFIG.APP_NAME,
  VERSION: API_CONFIG.APP_VERSION,
  TIMEOUT: API_CONFIG.API_TIMEOUT,
  BATCH_TIMEOUT: API_CONFIG.BATCH_TIMEOUT,
  BATCH_SIZE: API_CONFIG.BATCH_SIZE,
};

// Configuration validation function
export const validateConfig = () => {
  const issues = [];
  
  if (!API_CONFIG.BASE_URL) {
    issues.push('API_BASE_URL is not set');
  }
  
  if (!API_CONFIG.COMPANY_DB) {
    issues.push('COMPANY_DB is not set');
  }
  
  if (issues.length > 0) {
    console.warn('Configuration issues detected:', issues);
    console.log('Current configuration:', API_CONFIG);
  } else {
    console.log('Configuration loaded successfully');
  }
  
  return issues.length === 0;
};

// Auto-validate configuration on import
validateConfig();



