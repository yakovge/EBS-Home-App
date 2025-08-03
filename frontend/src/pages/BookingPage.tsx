/**
 * Booking page for managing house reservations.
 * Shows calendar view and allows creating/editing bookings.
 */

import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'

export default function BookingPage() {
  const { t } = useTranslation()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('booking.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => console.log('Create booking')}
        >
          {t('booking.createBooking')}
        </Button>
      </Box>

      {/* Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            House Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will show the booking calendar with both Gregorian and Hebrew dates.
            Integration with backend API and calendar component is needed.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}