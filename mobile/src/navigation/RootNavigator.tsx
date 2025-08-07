/**
 * Root navigation component for the mobile app.
 * Handles authentication flow and main app navigation.
 */

import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useAuthContext } from '../contexts/AuthContext'
import { RootStackParamList } from '../types'

// Import screens (will be created in Phase 4)
import LoginScreen from '../screens/LoginScreen'
import MainTabNavigator from './MainTabNavigator'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { theme } = useTheme()
  const { user, loading } = useAuthContext()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.dark || false,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.outline,
          notification: theme.colors.error,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {user ? (
          // User is authenticated - show main app
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // User is not authenticated - show login
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ 
              title: 'EBS Home',
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}