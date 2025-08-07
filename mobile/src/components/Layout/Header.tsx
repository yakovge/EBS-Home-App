/**
 * Header component for mobile screens.
 * Provides consistent header with title and actions.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Appbar, IconButton, Menu } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuthContext } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  title: string
  showMenu?: boolean
  onMenuPress?: () => void
  rightActions?: React.ReactNode[]
}

export default function Header({ title, showMenu = false, onMenuPress, rightActions }: HeaderProps) {
  const { theme } = useTheme()
  const { user, logout } = useAuthContext()
  const { t } = useTranslation()
  const [menuVisible, setMenuVisible] = React.useState(false)

  const openMenu = () => setMenuVisible(true)
  const closeMenu = () => setMenuVisible(false)

  const handleLogout = async () => {
    try {
      await logout()
      closeMenu()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      {showMenu && (
        <Appbar.Action 
          icon="menu" 
          onPress={onMenuPress}
          iconColor={theme.colors.onSurface}
        />
      )}
      
      <Appbar.Content 
        title={title}
        titleStyle={{ color: theme.colors.onSurface }}
      />
      
      {rightActions?.map((action, index) => (
        <View key={index}>{action}</View>
      ))}
      
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <IconButton
            icon="account-circle"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={openMenu}
          />
        }
      >
        <Menu.Item
          onPress={() => {
            closeMenu()
            // Navigate to profile - will be implemented in Phase 4
          }}
          title={user?.name || t('profile.title')}
          leadingIcon="account"
        />
        <Menu.Item
          onPress={handleLogout}
          title={t('navigation.logout')}
          leadingIcon="logout"
        />
      </Menu>
    </Appbar.Header>
  )
}

const styles = StyleSheet.create({
  header: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
})