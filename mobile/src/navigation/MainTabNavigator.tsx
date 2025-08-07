/**
 * Main tab navigation component for authenticated users.
 * Provides bottom tab navigation between main app sections.
 */

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { MainTabParamList, RootStackParamList } from '../types'

// Import screens (will be created in Phase 4)
import DashboardScreen from '../screens/DashboardScreen'
import MaintenanceScreen from '../screens/MaintenanceScreen'
import MaintenanceFormScreen from '../screens/MaintenanceFormScreen'
import MaintenanceDetailScreen from '../screens/MaintenanceDetailScreen'
import ChecklistScreen from '../screens/ChecklistScreen'
import ChecklistFormScreen from '../screens/ChecklistFormScreen'
import ChecklistDetailScreen from '../screens/ChecklistDetailScreen'
import BookingScreen from '../screens/BookingScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

// Dashboard Stack
function DashboardStack() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
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
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: t('dashboard.title') }}
      />
    </Stack.Navigator>
  )
}

// Maintenance Stack
function MaintenanceStack() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
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
      <Stack.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: t('maintenance.title') }}
      />
      <Stack.Screen
        name="MaintenanceForm"
        component={MaintenanceFormScreen}
        options={{ title: t('maintenance.createRequest') }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{ title: t('maintenance.title') }}
      />
    </Stack.Navigator>
  )
}

// Checklist Stack
function ChecklistStack() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
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
      <Stack.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{ title: t('checklist.title') }}
      />
      <Stack.Screen
        name="ChecklistForm"
        component={ChecklistFormScreen}
        options={{ title: t('checklist.submitChecklist') }}
      />
      <Stack.Screen
        name="ChecklistDetail"
        component={ChecklistDetailScreen}
        options={{ title: t('checklist.title') }}
      />
    </Stack.Navigator>
  )
}

// Booking Stack
function BookingStack() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
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
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: t('booking.title') }}
      />
    </Stack.Navigator>
  )
}

// Profile Stack
function ProfileStack() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
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
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
    </Stack.Navigator>
  )
}

export default function MainTabNavigator() {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline'
              break
            case 'Maintenance':
              iconName = focused ? 'wrench' : 'wrench-outline'
              break
            case 'Checklist':
              iconName = focused ? 'clipboard-check' : 'clipboard-check-outline'
              break
            case 'Booking':
              iconName = focused ? 'calendar' : 'calendar-outline'
              break
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline'
              break
            default:
              iconName = 'help-circle-outline'
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: t('navigation.dashboard'),
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceStack}
        options={{
          tabBarLabel: t('navigation.maintenance'),
        }}
      />
      <Tab.Screen
        name="Checklist"
        component={ChecklistStack}
        options={{
          tabBarLabel: t('navigation.checklist'),
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingStack}
        options={{
          tabBarLabel: t('navigation.bookings'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t('navigation.profile'),
        }}
      />
    </Tab.Navigator>
  )
}