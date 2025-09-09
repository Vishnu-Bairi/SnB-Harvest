// API Configuration File
// This file centralizes all API endpoints and configuration using app.config.js

import Constants from 'expo-constants';

// Get configuration from app.config.js
const apiConfig = Constants.expoConfig?.extra?.apiConfig || {};

export const API_CONFIG = {
  // Base URL
  BASE_URL: apiConfig.baseUrl || 'https://ghdev.seedandbeyond.com:50000',
  API_VERSION: apiConfig.apiVersion || '/b1s/v1',
  
  // Company Configuration
  COMPANY_DB: apiConfig.companyDb || '__QAS',
  
  // Authentication Endpoints
  LOGIN: apiConfig.login || '/Login',
  USERS_SERVICE_GET_CURRENT_USER: apiConfig.usersServiceGetCurrentUser || '/UsersService_GetCurrentUser',
  
  // Data Endpoints
  CART_MASTER: apiConfig.cartMaster || '/U_CART_MASTER',
  HANGER: apiConfig.hanger || '/U_HANGER',
  BIN_LOCATIONS: apiConfig.binLocations || '/BinLocations',
  ITEMS: apiConfig.items || '/Items',
  IMMATURE_PLANNER: apiConfig.immaturePlanner || '/sml.svc/CV_IMMATURE_PLANNER_VW',
  BATCH_NUMBER_DETAILS: apiConfig.batchNumberDetails || '/BatchNumberDetails',
  NPFET: apiConfig.npfet || '/NPFET',
  NPFETLINES: apiConfig.npfetlines || '/NPFETLINES',
  BATCH_SERVICE: apiConfig.batchService || '/$batch',
  NBNLG: apiConfig.nbnlg || '/NBNLG',
  
  // App Configuration
  APP_NAME: apiConfig.appName || 'SH',
  APP_VERSION: apiConfig.appVersion || '1.0.9',
  
  // Timeout Configuration (in milliseconds)
  API_TIMEOUT: apiConfig.apiTimeout || 30000,
  BATCH_TIMEOUT: apiConfig.batchTimeout || 60000,
  
  // Batch Processing
  BATCH_SIZE: apiConfig.batchSize || 200,
  
  // Scanner Configuration
  SCANNER_DELAY: apiConfig.scannerDelay || 300, // Delay in milliseconds for scanner input processing
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
  SCANNER_DELAY: API_CONFIG.SCANNER_DELAY,
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



