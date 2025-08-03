/**
 * Profile page for user settings and device management.
 * Shows user info and allows updating preferences.
 */

import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material'

import { useAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        {t('profile.title')}
      </Typography>

      {/* Profile Info */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Information
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('profile.name')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user?.name}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {t('profile.email')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user?.email}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Chip
                  label={user?.role}
                  color={user?.role === 'admin' ? 'primary' : 'default'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('profile.deviceInfo')}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('profile.currentDevice')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user?.currentDevice?.deviceName || 'Not set'}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Platform
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user?.currentDevice?.platform || 'Unknown'}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Last Login
                </Typography>
                <Typography variant="body1">
                  {user?.currentDevice?.lastLogin
                    ? new Date(user.currentDevice.lastLogin).toLocaleString()
                    : 'Never'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}