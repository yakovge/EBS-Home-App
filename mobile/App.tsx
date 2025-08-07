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
import RootNavigator from './src/navigation/RootNavigator'

// App content with theme
function AppContent() {
  const { theme, isDark } = useTheme()

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
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
