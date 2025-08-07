/**
 * Main App component for EBS Home mobile application.
 * Integrates all providers and core services.
 */

import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Provider as PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

// Initialize Firebase
import './src/services/firebase'

// Initialize i18n
import './src/i18n/config'

// Import providers and navigation
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import { OfflineProvider } from './src/contexts/OfflineContext'
import RootNavigator from './src/navigation/RootNavigator'
import { notificationService } from './src/services/notifications'
import { reminderService } from './src/services/reminderService'
import { performanceService } from './src/services/performanceService'
import { securityService } from './src/services/securityService'
import { loggingService } from './src/services/loggingService'
import ErrorBoundary from './src/components/ErrorBoundary'

// App content with theme
function AppContent() {
  const { theme, isDark } = useTheme()

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize logging service first
        await loggingService.initialize()
        loggingService.info('App', 'Application starting up', { 
          timestamp: new Date().toISOString(),
          isDev: __DEV__ 
        })

        // Track app startup performance
        await performanceService.measure('app_initialization', async () => {
          // Initialize security service
          await securityService.initialize()
          loggingService.info('Security', 'Security service initialized')
          
          // Initialize notification service
          const notificationSuccess = await notificationService.initialize()
          if (notificationSuccess) {
            loggingService.info('Notifications', 'Push notifications initialized successfully')
            
            // Initialize reminder service after notifications are ready
            await reminderService.scheduleExitReminders()
            await reminderService.scheduleDailyReminderCheck()
            loggingService.info('Reminders', 'Reminder service initialized successfully')
          } else {
            loggingService.warn('Notifications', 'Push notifications failed to initialize')
          }
        })
        
        // Log performance summary in dev mode
        if (__DEV__) {
          const summary = performanceService.getPerformanceSummary()
          loggingService.debug('Performance', 'App startup metrics', {
            initializationMetrics: summary.metrics.filter(m => m.name === 'app_initialization')
          })
        }
        
        loggingService.info('App', 'Application startup completed successfully')
      } catch (error) {
        loggingService.error('App', 'Failed to initialize services', { error: error.toString() })
        console.error('Failed to initialize services:', error)
      }
    }

    initializeServices()
    
    // Cleanup on unmount
    return () => {
      loggingService.info('App', 'Application shutting down')
      performanceService.destroy()
      securityService.cleanup()
      loggingService.destroy()
    }
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PaperProvider theme={theme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <OfflineProvider>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </OfflineProvider>
          </PaperProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
