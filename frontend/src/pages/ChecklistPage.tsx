/**
 * Exit checklist page for submitting house condition photos.
 * Handles photo uploads and checklist requirements.
 */

import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material'
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material'

export default function ChecklistPage() {
  const { t } = useTranslation()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('checklist.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<PhotoCameraIcon />}
          onClick={() => console.log('Submit checklist')}
        >
          {t('checklist.submitChecklist')}
        </Button>
      </Box>

      {/* Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Exit Photo Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Before leaving the house, you must submit photos of:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>2 photos of the refrigerator</li>
            <li>2 photos of the freezer</li>
            <li>3 photos of the closets</li>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Each photo must include descriptive notes about what is present or missing.
            Integration with backend API and photo upload is needed.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}