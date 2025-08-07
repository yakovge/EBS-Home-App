/**
 * Checklist detail screen for viewing checklist details.
 * Shows checklist entries, photos, and important notes.
 */

import React from 'react'
import { View, StyleSheet, ScrollView, Image } from 'react-native'
import { Card, Text, Chip, IconButton, Divider } from 'react-native-paper'
import { useRoute } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { ExitChecklist } from '../types'
import EmptyState from '../components/Layout/EmptyState'

export default function ChecklistDetailScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const route = useRoute()
  const { checklist } = (route.params as { checklist: ExitChecklist }) || {}

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString()
  }

  if (!checklist) {
    return (
      <EmptyState
        icon="clipboard-alert-outline"
        title="No Checklist Found"
        description="Unable to load checklist details"
      />
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Info */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.title}>
                Exit Checklist
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {checklist.userName}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Created: {formatDate(checklist.createdAt)} at {formatTime(checklist.createdAt)}
              </Text>
            </View>
            <Chip 
              mode="flat"
              style={[styles.statusChip, { 
                backgroundColor: checklist.isComplete 
                  ? theme.colors.secondary + '20' 
                  : theme.colors.tertiary + '20' 
              }]}
              textStyle={{ 
                color: checklist.isComplete 
                  ? theme.colors.secondary 
                  : theme.colors.tertiary 
              }}
            >
              {checklist.isComplete ? 'Complete' : 'Incomplete'}
            </Chip>
          </View>
          
          {checklist.submittedAt && (
            <Text variant="bodySmall" style={[styles.submittedText, { color: theme.colors.secondary }]}>
              Submitted: {formatDate(checklist.submittedAt)} at {formatTime(checklist.submittedAt)}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Important Notes */}
      {checklist.importantNotes && (
        <Card style={styles.notesCard}>
          <Card.Content>
            <View style={styles.notesHeader}>
              <IconButton
                icon="alert-circle"
                size={20}
                iconColor={theme.colors.primary}
              />
              <Text variant="titleMedium" style={[styles.notesTitle, { color: theme.colors.primary }]}>
                Important Notes
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {checklist.importantNotes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Checklist Entries */}
      <Card style={styles.entriesCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Checklist Entries ({checklist.entries?.length || 0})
          </Text>
          
          {(!checklist.entries || checklist.entries.length === 0) ? (
            <EmptyState
              icon="format-list-bulleted"
              title="No Entries"
              description="This checklist has no entries yet"
              compact
            />
          ) : (
            checklist.entries.map((entry, index) => (
              <View key={entry.id || index}>
                {index > 0 && <Divider style={styles.entryDivider} />}
                <View style={styles.entryItem}>
                  <View style={styles.entryHeader}>
                    <Chip 
                      mode="flat" 
                      compact
                      style={[styles.typeChip, { backgroundColor: theme.colors.primary + '10' }]}
                      textStyle={{ color: theme.colors.primary }}
                    >
                      {entry.photoType.charAt(0).toUpperCase() + entry.photoType.slice(1)}
                    </Chip>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                  
                  {entry.notes && (
                    <Text variant="bodyMedium" style={[styles.entryNotes, { color: theme.colors.onSurface }]}>
                      {entry.notes}
                    </Text>
                  )}
                  
                  {entry.photoUrl && (
                    <View style={styles.photoContainer}>
                      <Text variant="bodySmall" style={[styles.photoLabel, { color: theme.colors.onSurfaceVariant }]}>
                        Photo:
                      </Text>
                      <Image 
                        source={{ uri: entry.photoUrl }} 
                        style={styles.entryPhoto}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  statusChip: {
    height: 32,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  submittedText: {
    fontWeight: '500',
    marginTop: 4,
  },
  notesCard: {
    margin: 16,
    marginBottom: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontWeight: '600',
    marginLeft: 4,
  },
  entriesCard: {
    margin: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  entryDivider: {
    marginVertical: 16,
  },
  entryItem: {
    paddingVertical: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 28,
    alignSelf: 'flex-start',
  },
  entryNotes: {
    marginBottom: 12,
    lineHeight: 20,
  },
  photoContainer: {
    marginTop: 8,
  },
  photoLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  entryPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
})