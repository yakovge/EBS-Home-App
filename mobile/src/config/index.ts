/**
 * Centralized configuration management for the mobile app
 * Handles environment-specific settings and Firebase configuration
 */

import Constants from 'expo-constants';

// Get configuration from app.config.js via Constants.expoConfig.extra
const extra = Constants.expoConfig?.extra || {};

export const Config = {
  // API Configuration
  API_URL: extra.apiUrl || 'http://localhost:5000/api',
  API_TIMEOUT: extra.apiTimeout || 10000,
  
  // Firebase Configuration
  FIREBASE: {
    apiKey: extra.firebaseApiKey || '',
    authDomain: extra.firebaseAuthDomain || '',
    projectId: extra.firebaseProjectId || '',
    storageBucket: extra.firebaseStorageBucket || '',
    messagingSenderId: extra.firebaseMessagingSenderId || '',
    appId: extra.firebaseAppId || ''
  },
  
  // Demo Configuration
  DEMO_TOKEN: 'demo_session_token_mobile_test',
  
  // Environment
  APP_ENV: extra.appEnv || 'development',
  IS_DEVELOPMENT: extra.isDevelopment || __DEV__,
  IS_STAGING: extra.isStaging || false,
  IS_PRODUCTION: extra.isProduction || false,
  BUILD_TIME: extra.buildTime || new Date().toISOString(),
  
  // App Configuration
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
  APP_NAME: Constants.expoConfig?.name || 'EBS Home',
  
  // Debug Configuration
  DEBUG_MODE: extra.debugMode || __DEV__,
  ENABLE_MOCK_DATA: extra.enableMockData || false,
  LOG_LEVEL: extra.logLevel || 'info',
  
  // Feature Flags
  PUSH_NOTIFICATIONS_ENABLED: extra.pushNotificationsEnabled !== false,
  ENABLE_ANALYTICS: extra.enableAnalytics || false,
  ENABLE_CRASH_REPORTING: extra.enableCrashReporting || false,
  
  // Security Configuration
  SECURITY: {
    SSL_PINNING_ENABLED: extra.enableSSLPinning || false,
    CERTIFICATE_TRANSPARENCY_ENABLED: extra.enableCertificateTransparency || false,
    SECURITY_HEADERS_ENABLED: extra.enableSecurityHeaders || false,
    RATE_LIMITING: {
      ENABLED: extra.enableRateLimiting !== false,
      MAX_REQUESTS_PER_MINUTE: 60,
      MAX_REQUESTS_PER_HOUR: 1000
    }
  },
  
  // Performance Configuration
  PERFORMANCE: {
    MONITORING_ENABLED: extra.enablePerformanceMonitoring || false,
    BUNDLE_SIZE_ANALYSIS: extra.enableBundleSizeAnalysis || false,
    LAZY_LOADING_ENABLED: true,
    IMAGE_OPTIMIZATION_ENABLED: true
  },
  
  // EAS Configuration
  EAS_PROJECT_ID: extra.eas?.projectId || '',
  
  // Notification Configuration
  NOTIFICATION_PROJECT_ID: extra.firebaseMessagingSenderId || '533256873637',
};

// Type definitions for better TypeScript support
export type AppEnvironment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Environment-specific validation
export const validateEnvironment = (): boolean => {
  const requiredConfigKeys = [
    'API_URL',
    'FIREBASE.apiKey',
    'FIREBASE.authDomain',
    'FIREBASE.projectId'
  ];
  
  for (const key of requiredConfigKeys) {
    const keys = key.split('.');
    let value = Config as any;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (!value) {
      console.error(`Missing required configuration: ${key}`);
      return false;
    }
  }
  
  return true;
};

// Security helpers
export const getSecureHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (Config.SECURITY.SECURITY_HEADERS_ENABLED) {
    headers['X-Requested-With'] = 'EBSHome-Mobile';
    headers['X-App-Version'] = Config.APP_VERSION;
    headers['X-Platform'] = Constants.platform?.ios ? 'ios' : 'android';
    headers['X-Build-Time'] = Config.BUILD_TIME;
  }
  
  return headers;
};

// Rate limiting helper
let requestCounts = {
  perMinute: 0,
  perHour: 0,
  lastMinuteReset: Date.now(),
  lastHourReset: Date.now()
};

export const checkRateLimit = (): boolean => {
  if (!Config.SECURITY.RATE_LIMITING.ENABLED) {
    return true;
  }
  
  const now = Date.now();
  
  // Reset minute counter
  if (now - requestCounts.lastMinuteReset > 60000) {
    requestCounts.perMinute = 0;
    requestCounts.lastMinuteReset = now;
  }
  
  // Reset hour counter
  if (now - requestCounts.lastHourReset > 3600000) {
    requestCounts.perHour = 0;
    requestCounts.lastHourReset = now;
  }
  
  // Check limits
  if (requestCounts.perMinute >= Config.SECURITY.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE) {
    console.warn('Rate limit exceeded: too many requests per minute');
    return false;
  }
  
  if (requestCounts.perHour >= Config.SECURITY.RATE_LIMITING.MAX_REQUESTS_PER_HOUR) {
    console.warn('Rate limit exceeded: too many requests per hour');
    return false;
  }
  
  // Increment counters
  requestCounts.perMinute++;
  requestCounts.perHour++;
  
  return true;
};