/**
 * Lazy component loader with performance optimization
 * Provides code splitting and dynamic imports for better bundle size
 */

import React from 'react';
import { createLazyComponent } from '../components/Common/LazyWrapper';
import { ActivityIndicator, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

// Custom loading fallback
const CustomLoadingFallback = () => {
  const { t } = useTranslation();
  
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 32 
    }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>{t('common.loading')}</Text>
    </View>
  );
};

// Error fallback
const ErrorFallback = () => {
  const { t } = useTranslation();
  
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 32 
    }}>
      <Text style={{ color: '#f44336', textAlign: 'center' }}>
        {t('errors.unknownError')}
      </Text>
    </View>
  );
};

// Common lazy loading options
const defaultLazyOptions = {
  fallback: <CustomLoadingFallback />,
  errorFallback: <ErrorFallback />,
};

// ============= SCREEN COMPONENTS =============

// Dashboard Screen (High Priority - Load immediately)
export const LazyDashboardScreen = createLazyComponent(
  () => import('../screens/DashboardScreen'),
  defaultLazyOptions
);

// Maintenance Screens (Medium Priority)
export const LazyMaintenanceScreen = createLazyComponent(
  () => import('../screens/MaintenanceScreen'),
  defaultLazyOptions
);

export const LazyCreateMaintenanceScreen = createLazyComponent(
  () => import('../screens/CreateMaintenanceScreen'),
  defaultLazyOptions
);

// Booking Screens (Medium Priority)
export const LazyBookingScreen = createLazyComponent(
  () => import('../screens/BookingScreen'),
  defaultLazyOptions
);

export const LazyCreateBookingScreen = createLazyComponent(
  () => import('../screens/CreateBookingScreen'),
  defaultLazyOptions
);

// Checklist Screens (Low Priority)
export const LazyChecklistScreen = createLazyComponent(
  () => import('../screens/ChecklistScreen'),
  defaultLazyOptions
);

export const LazyCreateChecklistScreen = createLazyComponent(
  () => import('../screens/CreateChecklistScreen'),
  defaultLazyOptions
);

// Profile Screen (Low Priority)
export const LazyProfileScreen = createLazyComponent(
  () => import('../screens/ProfileScreen'),
  defaultLazyOptions
);

// Settings Screens (Low Priority)
export const LazySettingsScreen = createLazyComponent(
  () => import('../screens/SettingsScreen'),
  defaultLazyOptions
);

export const LazyBiometricSettingsScreen = createLazyComponent(
  () => import('../components/Settings/BiometricSettings'),
  defaultLazyOptions
);

// ============= LARGE COMPONENTS =============

// Advanced Camera (Medium Priority)
export const LazyAdvancedCameraView = createLazyComponent(
  () => import('../components/Camera/AdvancedCameraView'),
  defaultLazyOptions
);

// Hebrew Calendar Widget (Low Priority)
export const LazyHebrewCalendarWidget = createLazyComponent(
  () => import('../components/Calendar/HebrewCalendarWidget'),
  defaultLazyOptions
);

// Offline Indicator (Medium Priority)
export const LazyOfflineIndicator = createLazyComponent(
  () => import('../components/Common/OfflineIndicator'),
  defaultLazyOptions
);

// ============= UTILITY COMPONENTS =============

// Photo Gallery (Low Priority)
export const LazyPhotoGallery = createLazyComponent(
  () => import('../components/Common/PhotoGallery').then(module => ({ 
    default: module.PhotoGallery 
  })),
  defaultLazyOptions
);

// Image Viewer (Low Priority)
export const LazyImageViewer = createLazyComponent(
  () => import('../components/Common/ImageViewer').then(module => ({ 
    default: module.ImageViewer 
  })),
  defaultLazyOptions
);

// ============= PERFORMANCE MONITORING =============

// Performance Dashboard (Development only)
export const LazyPerformanceDashboard = __DEV__ ? createLazyComponent(
  () => import('../components/Debug/PerformanceDashboard'),
  defaultLazyOptions
) : null;

// ============= PRELOAD STRATEGIES =============

/**
 * Preload high-priority components
 * Should be called early in app lifecycle
 */
export const preloadHighPriorityComponents = () => {
  if (__DEV__) {
    console.log('🚀 Preloading high-priority components...');
  }
  
  // Preload dashboard immediately
  import('../screens/DashboardScreen');
  
  // Preload maintenance screens after short delay
  setTimeout(() => {
    import('../screens/MaintenanceScreen');
    import('../components/Common/OfflineIndicator');
  }, 1000);
};

/**
 * Preload medium-priority components
 * Should be called after app is interactive
 */
export const preloadMediumPriorityComponents = () => {
  if (__DEV__) {
    console.log('🚀 Preloading medium-priority components...');
  }
  
  setTimeout(() => {
    import('../screens/BookingScreen');
    import('../screens/CreateMaintenanceScreen');
    import('../components/Camera/AdvancedCameraView');
  }, 2000);
};

/**
 * Preload low-priority components
 * Should be called when app is idle
 */
export const preloadLowPriorityComponents = () => {
  if (__DEV__) {
    console.log('🚀 Preloading low-priority components...');
  }
  
  setTimeout(() => {
    import('../screens/ChecklistScreen');
    import('../screens/ProfileScreen');
    import('../screens/SettingsScreen');
    import('../components/Calendar/HebrewCalendarWidget');
    import('../components/Settings/BiometricSettings');
  }, 5000);
};

/**
 * Preload components based on user navigation patterns
 */
export const preloadByRoute = (currentRoute: string) => {
  switch (currentRoute) {
    case 'Dashboard':
      // Likely to navigate to maintenance or bookings
      import('../screens/MaintenanceScreen');
      import('../screens/BookingScreen');
      break;
      
    case 'Maintenance':
      // Likely to create maintenance request
      import('../screens/CreateMaintenanceScreen');
      import('../components/Camera/AdvancedCameraView');
      break;
      
    case 'Booking':
      // Likely to create booking
      import('../screens/CreateBookingScreen');
      break;
      
    case 'Profile':
      // Likely to access settings
      import('../screens/SettingsScreen');
      import('../components/Settings/BiometricSettings');
      break;
      
    default:
      break;
  }
};

/**
 * Get bundle analysis information
 */
export const getBundleInfo = () => {
  const components = {
    screens: [
      'DashboardScreen',
      'MaintenanceScreen', 
      'CreateMaintenanceScreen',
      'BookingScreen',
      'CreateBookingScreen', 
      'ChecklistScreen',
      'CreateChecklistScreen',
      'ProfileScreen',
      'SettingsScreen'
    ],
    components: [
      'AdvancedCameraView',
      'HebrewCalendarWidget', 
      'OfflineIndicator',
      'BiometricSettings'
    ],
    utils: [
      'PhotoGallery',
      'ImageViewer'
    ]
  };
  
  return {
    totalComponents: Object.values(components).flat().length,
    componentsByCategory: components,
    lazyLoadingEnabled: true,
    codesplitting: true,
  };
};