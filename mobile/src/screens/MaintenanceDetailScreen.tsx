/**
 * Maintenance detail screen for viewing individual maintenance requests.
 * Displays full request details with photos and allows status updates.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Image, Alert, Dimensions } from 'react-native'
import { Text, Card, Button, Chip, Divider } from 'react-native-paper'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuthContext } from '../contexts/AuthContext'
import { apiClient } from '../services/api'
import { notificationService } from '../services/notifications'
import { MaintenanceRequest, MaintenanceStatus } from '../types'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'

type MaintenanceDetailRouteProp = RouteProp<{
  MaintenanceDetail: { requestId: string }
}, 'MaintenanceDetail'>

const { width } = Dimensions.get('window')
const imageWidth = width - 64 // Account for padding

export default function MaintenanceDetailScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const navigation = useNavigation()
  const route = useRoute<MaintenanceDetailRouteProp>()
  
  // State
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [request, setRequest] = useState<MaintenanceRequest | null>(null)

  const { requestId } = route.params

  const fetchRequest = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await apiClient.get<MaintenanceRequest>(`/maintenance/${requestId}`)
      setRequest(response)
      
    } catch (error) {
      console.error('Failed to fetch maintenance request:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequest()
  }, [requestId])

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return theme.colors.secondary
      case MaintenanceStatus.IN_PROGRESS:
        return theme.colors.tertiary
      case MaintenanceStatus.CANCELLED:
        return theme.colors.error
      default:
        return theme.colors.primary
    }
  }

  const getStatusText = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return t('maintenance.completed')
      case MaintenanceStatus.IN_PROGRESS:
        return t('maintenance.inProgress')
      case MaintenanceStatus.CANCELLED:
        return t('maintenance.cancelled')
      default:
        return t('maintenance.pending')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const canUpdateStatus = () => {
    return user?.is_maintenance_person || user?.is_yaffa || user?.role === 'admin'
  }

  const handleStatusUpdate = async (newStatus: MaintenanceStatus, notes?: string) => {
    if (!request) return

    try {
      setUpdating(true)
      setError('')

      const updateData: any = { status: newStatus }
      if (notes) {
        updateData.resolution_notes = notes
      }

      await apiClient.put(`/maintenance/${requestId}`, updateData)
      
      // Send notification when status is updated to completed
      if (newStatus === MaintenanceStatus.COMPLETED) {
        await notificationService.scheduleMaintenanceNotification(
          requestId,
          'Maintenance Request Completed',
          `The maintenance request for "${request.description}" has been completed. ${notes ? 'Notes: ' + notes : ''}`,
          1 // 1 second delay
        )
      }
      
      // Refresh the request data
      await fetchRequest()
      
      Alert.alert(
        t('common.success'),
        t('maintenance.statusUpdated'),
        [{ text: t('common.confirm') }]
      )
      
    } catch (error) {
      console.error('Failed to update maintenance request:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.serverError')
      setError(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkInProgress = () => {
    if (!canUpdateStatus()) return
    
    Alert.alert(
      t('maintenance.confirmInProgress'),
      'Mark this request as in progress?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          onPress: () => handleStatusUpdate(MaintenanceStatus.IN_PROGRESS)
        }
      ]
    )
  }

  const handleMarkComplete = () => {
    if (!canUpdateStatus()) return
    
    Alert.prompt(
      t('maintenance.markComplete'),
      'Add resolution notes (optional):',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          onPress: (notes) => handleStatusUpdate(MaintenanceStatus.COMPLETED, notes)
        }
      ],
      'plain-text'
    )
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  if (error && !request) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorMessage
          message={error}
          showRetry={true}
          onRetry={fetchRequest}
        />
      </View>
    )
  }

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorMessage
          message="Maintenance request not found"
          showRetry={false}
        />
      </View>
    )
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {error && (
        <ErrorMessage
          message={error}
          showRetry={true}
          onRetry={() => setError('')}
        />
      )}

      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.title}>
                {request.description}
              </Text>
              <Text 
                variant="bodyMedium" 
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                {request.location}
              </Text>
            </View>
            
            <Chip 
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(request.status) + '20' }]}
              textStyle={{ color: getStatusColor(request.status) }}
            >
              {getStatusText(request.status)}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Details Card */}
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>
          
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>Reported by:</Text>
            <Text variant="bodyMedium">{request.reporter_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>Created:</Text>
            <Text variant="bodyMedium">{formatDate(request.created_at)}</Text>
          </View>
          
          {request.assigned_to_name && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.label}>Assigned to:</Text>
              <Text variant="bodyMedium" style={[styles.value, { color: theme.colors.primary }]}>
                {request.assigned_to_name}
              </Text>
            </View>
          )}
          
          {request.resolution_date && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.label}>Resolved:</Text>
              <Text variant="bodyMedium">{formatDate(request.resolution_date)}</Text>
            </View>
          )}
          
          {request.resolution_notes && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleSmall" style={styles.notesTitle}>
                Resolution Notes
              </Text>
              <Text variant="bodyMedium" style={styles.notes}>
                {request.resolution_notes}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Photos Card */}
      {request.photo_urls && request.photo_urls.length > 0 && (
        <Card style={styles.photosCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Photos ({request.photo_urls.length})
            </Text>
            
            <View style={styles.photosContainer}>
              {request.photo_urls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      {canUpdateStatus() && request.status !== MaintenanceStatus.COMPLETED && (
        <View style={styles.actionContainer}>
          {request.status === MaintenanceStatus.PENDING && (
            <Button
              mode="outlined"
              onPress={handleMarkInProgress}
              disabled={updating}
              style={styles.actionButton}
            >
              Mark In Progress
            </Button>
          )}
          
          <Button
            mode="contained"
            onPress={handleMarkComplete}
            disabled={updating}
            style={styles.actionButton}
          >
            Mark Complete
          </Button>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
  },
  value: {
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  notesTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  notes: {
    lineHeight: 22,
  },
  photosCard: {
    marginBottom: 16,
  },
  photosContainer: {
    gap: 12,
  },
  photo: {
    width: imageWidth,
    height: imageWidth * 0.75,
    borderRadius: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
})