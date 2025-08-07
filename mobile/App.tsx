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

// App content with theme
function AppContent() {
  const { theme, isDark } = useTheme()

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize notification service
        const notificationSuccess = await notificationService.initialize()
        if (notificationSuccess) {
          console.log('Push notifications initialized successfully')
          
          // Initialize reminder service after notifications are ready
          await reminderService.scheduleExitReminders()
          await reminderService.scheduleDailyReminderCheck()
          console.log('Reminder service initialized successfully')
        } else {
          console.warn('Push notifications failed to initialize')
        }
      } catch (error) {
        console.error('Failed to initialize services:', error)
      }
    }

    initializeServices()
  }, [])

  return (
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
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
