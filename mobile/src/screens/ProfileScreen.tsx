/**
 * Profile screen for user settings and information.
 * Displays user info, settings, and app preferences.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Text, Avatar, Button, List, Switch, Divider } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../contexts/AuthContext'
import { changeLanguage, getCurrentLanguage, isRTL } from '../i18n/config'

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuthContext()
  
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage())

  const handleLanguageChange = async () => {
    const newLanguage = currentLanguage === 'en' ? 'he' : 'en'
    
    try {
      await changeLanguage(newLanguage)
      setCurrentLanguage(newLanguage)
      
      Alert.alert(
        t('common.success'),
        `Language changed to ${newLanguage === 'en' ? 'English' : 'עברית'}`,
        [{ text: t('common.confirm') }]
      )
    } catch (error) {
      console.error('Failed to change language:', error)
      Alert.alert(
        t('common.error'),
        'Failed to change language',
        [{ text: t('common.confirm') }]
      )
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      t('navigation.logout'),
      'Are you sure you want to logout?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('navigation.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
            } catch (error) {
              console.error('Logout error:', error)
              Alert.alert(
                t('common.error'),
                'Failed to logout properly',
                [{ text: t('common.confirm') }]
              )
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* User Info Card */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={user?.name?.charAt(0).toUpperCase() || 'U'}
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
          
          <View style={styles.userInfo}>
            <Text variant="headlineSmall" style={[styles.userName, { color: theme.colors.onSurface }]}>
              {user?.name || 'Unknown User'}
            </Text>
            <Text variant="bodyLarge" style={[styles.userEmail, { color: theme.colors.primary }]}>
              {user?.email}
            </Text>
            <Text variant="bodySmall" style={[styles.userRole, { color: theme.colors.onSurfaceVariant }]}>
              Role: {user?.role?.replace('_', ' ') || 'Unknown'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Settings Card */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('profile.settings')}
          </Text>

          <List.Section>
            <List.Item
              title={t('profile.language')}
              description={`Current: ${currentLanguage === 'en' ? 'English' : 'עברית'}`}
              left={(props) => <List.Icon {...props} icon="translate" />}
              right={(props) => (
                <Switch
                  value={currentLanguage === 'he'}
                  onValueChange={handleLanguageChange}
                />
              )}
            />

            <Divider />

            <List.Item
              title="Dark Mode"
              description={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              left={(props) => <List.Icon {...props} icon="brightness-6" />}
              right={(props) => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                />
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* Device Info Card */}
      <Card style={styles.deviceCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('profile.deviceInfo')}
          </Text>

          <List.Section>
            <List.Item
              title={t('profile.currentDevice')}
              description={user?.currentDevice?.deviceName || 'Unknown Device'}
              left={(props) => <List.Icon {...props} icon="cellphone" />}
            />

            {user?.currentDevice && (
              <>
                <List.Item
                  title="Platform"
                  description={user.currentDevice.platform}
                  left={(props) => <List.Icon {...props} icon="information-outline" />}
                />

                <List.Item
                  title="Last Login"
                  description={formatDate(user.currentDevice.lastLogin)}
                  left={(props) => <List.Icon {...props} icon="clock-outline" />}
                />
              </>
            )}

            <List.Item
              title="Member Since"
              description={formatDate(user?.createdAt || '')}
              left={(props) => <List.Icon {...props} icon="calendar-account" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* App Info Card */}
      <Card style={styles.appInfoCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('profile.about')}
          </Text>

          <List.Section>
            <List.Item
              title="EBS Home"
              description="House management application"
              left={(props) => <List.Icon {...props} icon="home" />}
            />

            <List.Item
              title={t('profile.version')}
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <Card style={styles.logoutCard}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleLogout}
            icon="logout"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
          >
            {t('navigation.logout')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    marginBottom: 4,
  },
  userRole: {
    textTransform: 'capitalize',
  },
  settingsCard: {
    marginBottom: 16,
  },
  deviceCard: {
    marginBottom: 16,
  },
  appInfoCard: {
    marginBottom: 16,
  },
  logoutCard: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  logoutButton: {
    // Additional logout button styles
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
})