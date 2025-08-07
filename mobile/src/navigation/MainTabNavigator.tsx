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
import { 
  MainTabParamList, 
  DashboardStackParamList,
  MaintenanceStackParamList,
  ChecklistStackParamList,
  BookingStackParamList,
  ProfileStackParamList
} from '../types'

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
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>()
const MaintenanceStackNav = createNativeStackNavigator<MaintenanceStackParamList>()
const ChecklistStackNav = createNativeStackNavigator<ChecklistStackParamList>()
const BookingStackNav = createNativeStackNavigator<BookingStackParamList>()
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>()

// Dashboard Stack
function DashboardStackScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
    <DashboardStack.Navigator
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
      <DashboardStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: t('dashboard.title') }}
      />
    </DashboardStack.Navigator>
  )
}

// Maintenance Stack
function MaintenanceStackScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
    <MaintenanceStackNav.Navigator
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
      <MaintenanceStackNav.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: t('maintenance.title') }}
      />
      <MaintenanceStackNav.Screen
        name="MaintenanceForm"
        component={MaintenanceFormScreen}
        options={{ title: t('maintenance.createRequest') }}
      />
      <MaintenanceStackNav.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{ title: t('maintenance.title') }}
      />
    </MaintenanceStackNav.Navigator>
  )
}

// Checklist Stack
function ChecklistStackScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
    <ChecklistStackNav.Navigator
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
      <ChecklistStackNav.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{ title: t('checklist.title') }}
      />
      <ChecklistStackNav.Screen
        name="ChecklistForm"
        component={ChecklistFormScreen}
        options={{ title: t('checklist.submitChecklist') }}
      />
      <ChecklistStackNav.Screen
        name="ChecklistDetail"
        component={ChecklistDetailScreen}
        options={{ title: t('checklist.title') }}
      />
    </ChecklistStackNav.Navigator>
  )
}

// Booking Stack
function BookingStackScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
    <BookingStackNav.Navigator
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
      <BookingStackNav.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: t('booking.title') }}
      />
    </BookingStackNav.Navigator>
  )
}

// Profile Stack
function ProfileStackScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  return (
    <ProfileStackNav.Navigator
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
      <ProfileStackNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
    </ProfileStackNav.Navigator>
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
        component={DashboardStackScreen}
        options={{
          tabBarLabel: t('navigation.dashboard'),
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceStackScreen}
        options={{
          tabBarLabel: t('navigation.maintenance'),
        }}
      />
      <Tab.Screen
        name="Checklist"
        component={ChecklistStackScreen}
        options={{
          tabBarLabel: t('navigation.checklist'),
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingStackScreen}
        options={{
          tabBarLabel: t('navigation.bookings'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: t('navigation.profile'),
        }}
      />
    </Tab.Navigator>
  )
}