/**
 * Checklist list component for mobile.
 * Displays exit checklists in a card-based layout.
 */

import React from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { Card, Text, Chip, IconButton } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { ExitChecklist } from '../../types'
import EmptyState from '../Layout/EmptyState'

interface ChecklistListProps {
  checklists: ExitChecklist[]
  onItemPress?: (checklist: ExitChecklist) => void
  onRefresh?: () => void
  refreshing?: boolean
  loading?: boolean
}

export default function ChecklistList({
  checklists,
  onItemPress,
  onRefresh,
  refreshing = false,
  loading = false,
}: ChecklistListProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (isComplete: boolean) => {
    return isComplete ? theme.colors.secondary : theme.colors.primary
  }

  const getStatusText = (isComplete: boolean) => {
    return isComplete ? t('checklist.completed') : t('checklist.pending')
  }

  const renderChecklistItem = ({ item }: { item: ExitChecklist }) => {
    const entriesCount = item.entries?.length || 0
    const photosCount = item.entries?.reduce((count, entry) => 
      count + (entry.photoUrl ? 1 : 0), 0) || 0

    return (
      <Card 
        style={styles.card}
        onPress={() => onItemPress?.(item)}
        mode="outlined"
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.title}>
                Exit Checklist
              </Text>
              <Text 
                variant="bodySmall" 
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.userName} • {formatDate(item.createdAt)}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <Chip 
                mode="flat"
                style={[
                  styles.statusChip, 
                  { backgroundColor: getStatusColor(item.isComplete) + '20' }
                ]}
                textStyle={{ color: getStatusColor(item.isComplete) }}
                compact
              >
                {getStatusText(item.isComplete)}
              </Chip>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <IconButton
                icon="format-list-bulleted"
                size={16}
                iconColor={theme.colors.onSurfaceVariant}
              />
              <Text 
                variant="bodySmall" 
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {entriesCount} entr{entriesCount === 1 ? 'y' : 'ies'}
              </Text>
            </View>
            
            {photosCount > 0 && (
              <View style={styles.detailItem}>
                <IconButton
                  icon="image-outline"
                  size={16}
                  iconColor={theme.colors.onSurfaceVariant}
                />
                <Text 
                  variant="bodySmall" 
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {photosCount} photo{photosCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {item.importantNotes && (
            <Text 
              variant="bodySmall" 
              style={[styles.importantNotes, { color: theme.colors.primary }]}
              numberOfLines={2}
            >
              Important: {item.importantNotes}
            </Text>
          )}

          {item.submittedAt && (
            <Text 
              variant="bodySmall" 
              style={[styles.submittedAt, { color: theme.colors.onSurfaceVariant }]}
            >
              Submitted {formatDate(item.submittedAt)}
            </Text>
          )}
        </Card.Content>
      </Card>
    )
  }

  if (checklists.length === 0 && !loading) {
    return (
      <EmptyState
        icon="clipboard-check-outline"
        title={t('checklist.noChecklists')}
        description="No exit checklists found"
        actionText={t('checklist.submitChecklist')}
        onActionPress={() => {
          // Will be handled in Phase 4
        }}
      />
    )
  }

  return (
    <FlatList
      data={checklists}
      renderItem={renderChecklistItem}
      keyExtractor={(item) => item.id || ''}
      contentContainerStyle={styles.listContainer}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  statusChip: {
    height: 24,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importantNotes: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  submittedAt: {
    fontSize: 11,
  },
})