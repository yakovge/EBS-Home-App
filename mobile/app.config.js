/**
 * Expo app configuration with environment-specific settings.
 * This allows us to configure different settings for development, staging, and production.
 */

// Environment detection with fallbacks
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = APP_ENV === 'development';
const IS_STAGING = APP_ENV === 'staging';
const IS_PRODUCTION = APP_ENV === 'production';

// Environment-specific configuration
const getEnvironmentConfig = () => {
  const base = {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
    apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000'),
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
    enableMockData: process.env.EXPO_PUBLIC_ENABLE_MOCK_DATA === 'true',
    logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'info',
    pushNotificationsEnabled: process.env.EXPO_PUBLIC_PUSH_NOTIFICATIONS_ENABLED !== 'false',
    enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
  };

  if (IS_DEVELOPMENT) {
    return {
      ...base,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.61.52:5000/api',
      debugMode: true,
      enableMockData: true,
      logLevel: 'debug',
      enableAnalytics: false,
      enableCrashReporting: false,
    };
  }

  if (IS_STAGING) {
    return {
      ...base,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://staging-api.ebshome.app/api',
      debugMode: false,
      enableMockData: false,
      logLevel: 'info',
      enableAnalytics: true,
      enableCrashReporting: true,
    };
  }

  // Production
  return {
    ...base,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.ebshome.app/api',
    debugMode: false,
    enableMockData: false,
    logLevel: 'error',
    enableAnalytics: true,
    enableCrashReporting: true,
  };
};

// App naming based on environment
const getAppName = () => {
  if (IS_DEVELOPMENT) return "EBS Home (Dev)";
  if (IS_STAGING) return "EBS Home (Staging)";
  return "EBS Home";
};

// Bundle identifier based on environment
const getBundleId = () => {
  if (IS_DEVELOPMENT) return "com.eisenberg.ebshome.dev";
  if (IS_STAGING) return "com.eisenberg.ebshome.staging";
  return "com.eisenberg.ebshome";
};

const envConfig = getEnvironmentConfig();

export default {
  expo: {
    name: getAppName(),
    slug: "ebs-home",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#6200EE"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleId(),
      infoPlist: {
        UIBackgroundModes: ["background-fetch", "remote-notification"],
        // Production security settings
        ...(IS_PRODUCTION && {
          NSAppTransportSecurity: {
            NSExceptionDomains: {},
            NSAllowsArbitraryLoads: false
          }
        })
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#6200EE"
      },
      package: getBundleId(),
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      // Production security settings
      ...(IS_PRODUCTION && {
        usesCleartextTraffic: false
      })
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-notifications",
      [
        "expo-build-properties",
        {
          android: {
            // Enable ProGuard in production
            enableProguard: IS_PRODUCTION
          },
          ios: {
            // Enable bitcode in production  
            enableBitcode: IS_PRODUCTION
          }
        }
      ]
    ],
    extra: {
      // Environment configuration
      ...envConfig,
      
      // Firebase Configuration
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCZKZfRt8k2CmuADEnIy7TXjVFmBQThCa4",
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "ebs-home-c4f07.firebaseapp.com",
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "ebs-home-c4f07",
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "ebs-home-c4f07.firebasestorage.app",
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "533256873637",
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:533256873637:web:1d2f91fe3c30591a7b0f4c",
      
      // Environment metadata
      appEnv: APP_ENV,
      isDevelopment: IS_DEVELOPMENT,
      isStaging: IS_STAGING,
      isProduction: IS_PRODUCTION,
      buildTime: new Date().toISOString(),
      
      // EAS Configuration
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "your-eas-project-id"
      }
    },
    updates: {
      // Enable OTA updates in production/staging only
      enabled: !IS_DEVELOPMENT,
      fallbackToCacheTimeout: 0,
      url: IS_PRODUCTION 
        ? "https://u.expo.dev/your-production-eas-project-id"
        : IS_STAGING 
        ? "https://u.expo.dev/your-staging-eas-project-id"
        : undefined
    }
  }
};