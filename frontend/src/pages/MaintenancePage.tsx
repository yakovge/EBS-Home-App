/**
 * Maintenance page for managing house maintenance requests.
 * Allows creating, viewing, and tracking maintenance issues.
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

export default function MaintenancePage() {
  const { t } = useTranslation()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('maintenance.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => console.log('Create maintenance request')}
        >
          {t('maintenance.createRequest')}
        </Button>
      </Box>

      {/* Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Maintenance Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will show maintenance requests and allow creating new ones.
            Integration with backend API is needed.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}