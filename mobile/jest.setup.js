/**
 * Jest setup file for React Native testing
 */

import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Expo modules
jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osName: 'Test OS',
  osVersion: '1.0.0',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:5000/api',
        firebaseApiKey: 'test-api-key',
        firebaseAuthDomain: 'test.firebaseapp.com',
        firebaseProjectId: 'test-project',
        firebaseStorageBucket: 'test.appspot.com',
        firebaseMessagingSenderId: '123456789',
        firebaseAppId: '1:123456789:web:test123'
      }
    }
  }
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri) => Promise.resolve({ uri })),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: (callback) => callback(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    SafeAreaInsetsContext: {
      Consumer: ({ children }) => children(inset),
      Provider: ({ children }) => children,
    },
  };
});

// Mock Firebase
jest.mock('./src/services/firebase', () => ({
  auth: {
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
  storage: jest.fn(),
  googleProvider: {
    addScope: jest.fn(),
  },
}));

// Global test setup
global.__DEV__ = true;

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  // Suppress unhandled promise rejections in tests
  // as they're often expected behavior in error handling tests
});

// Silence warnings
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const ActualPaper = jest.requireActual('react-native-paper');
  return {
    ...ActualPaper,
    Portal: ({ children }) => children,
  };
});

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: 'Calendar',
}));

// Mock react-native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Override problematic native modules
  RN.NativeModules = {
    ...RN.NativeModules,
    RNCAsyncStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
    DevMenu: {
      show: jest.fn(),
      reload: jest.fn(),
    },
  };
  
  return RN;
});

// Set up fake timers only for non-async tests
// beforeEach(() => {
//   jest.useFakeTimers();
// });

// afterEach(() => {
//   jest.runOnlyPendingTimers();
//   jest.useRealTimers();
// });