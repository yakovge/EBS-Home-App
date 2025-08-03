/**
 * Sidebar navigation component with menu items and user info.
 * Provides navigation between different app sections.
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Typography,
  Button,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'

import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/contexts/NotificationContext'

interface SidebarProps {
  onItemClick?: () => void
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { showSuccess } = useNotification()

  const menuItems = [
    {
      text: t('navigation.dashboard'),
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      text: t('navigation.maintenance'),
      icon: <BuildIcon />,
      path: '/maintenance',
    },
    {
      text: t('navigation.bookings'),
      icon: <EventIcon />,
      path: '/bookings',
    },
    {
      text: t('navigation.checklist'),
      icon: <CheckCircleIcon />,
      path: '/checklist',
    },
    {
      text: t('navigation.profile'),
      icon: <PersonIcon />,
      path: '/profile',
    },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    onItemClick?.()
  }

  const handleLogout = async () => {
    try {
      await logout()
      showSuccess(t('auth.logout'))
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Info */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 1,
            bgcolor: 'primary.main',
          }}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h6" noWrap>
          {user?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {user?.email}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Logout Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          {t('navigation.logout')}
        </Button>
      </Box>
    </Box>
  )
}