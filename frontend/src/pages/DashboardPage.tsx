/**
 * Dashboard page showing overview of house status and activities.
 * Main landing page after login with quick access to key features.
 */

import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
} from '@mui/material'
import {
  Build as BuildIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
} from '@mui/icons-material'

import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const stats = [
    {
      title: 'Current Bookings',
      value: '2',
      icon: <EventIcon />,
      color: 'primary',
    },
    {
      title: 'Pending Maintenance',
      value: '1',
      icon: <BuildIcon />,
      color: 'warning',
    },
    {
      title: 'Exit Checklists',
      value: '5',
      icon: <CheckCircleIcon />,
      color: 'success',
    },
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome back, {user?.name}!
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {stat.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h3" color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Maintenance Requests
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent maintenance requests
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small">View All</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Bookings
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No upcoming bookings
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small">View Calendar</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}