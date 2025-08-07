/**
 * Offline indicator component showing network status and sync information
 * Displays connection status, pending operations, and sync controls
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { 
  Text, 
  Snackbar, 
  ActivityIndicator, 
  IconButton,
  Surface,
  Chip 
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useOfflineContext } from '../../contexts/OfflineContext';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  position?: 'top' | 'bottom';
}

export default function OfflineIndicator({ 
  showDetails = true, 
  position = 'bottom' 
}: OfflineIndicatorProps) {
  const { t } = useTranslation();
  const {
    isOnline,
    syncStatus,
    pendingOperationsCount,
    forceSync,
    clearCache,
    clearPendingOperations,
  } = useOfflineContext();

  const [syncing, setSyncing] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animate in/out based on offline status
    Animated.timing(fadeAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, fadeAnim]);

  const handleForceSync = async () => {
    if (!isOnline) {
      showMessage(t('offline.noConnection'));
      return;
    }

    setSyncing(true);
    try {
      await forceSync();
      showMessage(t('offline.syncComplete'));
    } catch (error) {
      showMessage(t('offline.syncFailed'));
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      showMessage(t('offline.cacheCleared'));
    } catch (error) {
      showMessage(t('offline.cacheClearFailed'));
    }
  };

  const handleClearPending = async () => {
    try {
      await clearPendingOperations();
      showMessage(t('offline.pendingCleared'));
    } catch (error) {
      showMessage(t('offline.pendingClearFailed'));
    }
  };

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };

  const getStatusColor = () => {
    if (!isOnline) return '#f44336'; // Red for offline
    if (pendingOperationsCount > 0) return '#ff9800'; // Orange for pending
    return '#4caf50'; // Green for online and synced
  };

  const getStatusText = () => {
    if (!isOnline) return t('offline.offline');
    if (pendingOperationsCount > 0) {
      return t('offline.pendingOperations', { count: pendingOperationsCount });
    }
    return t('offline.online');
  };

  const formatLastSync = () => {
    if (!syncStatus?.lastSync) return t('offline.neverSynced');
    
    const lastSync = new Date(syncStatus.lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
    
    if (diffMinutes < 1) return t('offline.justSynced');
    if (diffMinutes < 60) return t('offline.minutesAgo', { minutes: diffMinutes });
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t('offline.hoursAgo', { hours: diffHours });
    
    const diffDays = Math.floor(diffHours / 24);
    return t('offline.daysAgo', { days: diffDays });
  };

  if (isOnline && pendingOperationsCount === 0) {
    // Don't show anything when fully online and synced
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          position === 'top' ? styles.top : styles.bottom,
          { opacity: fadeAnim },
        ]}
        pointerEvents={isOnline && pendingOperationsCount === 0 ? 'none' : 'auto'}
      >
        <Surface style={[styles.surface, { borderLeftColor: getStatusColor() }]}>
          <TouchableOpacity
            style={styles.mainContent}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{getStatusText()}</Text>
              {syncing && <ActivityIndicator size="small" style={styles.syncIndicator} />}
            </View>
            
            {!isOnline && (
              <Text style={styles.offlineMessage}>
                {t('offline.offlineMessage')}
              </Text>
            )}
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.detailsContainer}>
              <View style={styles.syncInfo}>
                <Text style={styles.syncInfoText}>
                  {t('offline.lastSync')}: {formatLastSync()}
                </Text>
                
                {syncStatus?.failedOperations > 0 && (
                  <Chip
                    mode="outlined"
                    textStyle={styles.chipText}
                    style={[styles.chip, styles.errorChip]}
                  >
                    {t('offline.failedOperations', { count: syncStatus.failedOperations })}
                  </Chip>
                )}
              </View>

              <View style={styles.actionButtons}>
                <IconButton
                  icon="refresh"
                  mode="outlined"
                  size={20}
                  onPress={handleForceSync}
                  disabled={!isOnline || syncing}
                  style={styles.actionButton}
                />
                
                <IconButton
                  icon="delete-sweep"
                  mode="outlined"
                  size={20}
                  onPress={handleClearCache}
                  style={styles.actionButton}
                />
                
                {pendingOperationsCount > 0 && (
                  <IconButton
                    icon="playlist-remove"
                    mode="outlined"
                    size={20}
                    onPress={handleClearPending}
                    style={styles.actionButton}
                  />
                )}
              </View>
            </View>
          )}
        </Surface>
      </Animated.View>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  top: {
    top: 50,
  },
  bottom: {
    bottom: 100,
  },
  surface: {
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainContent: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
  },
  syncIndicator: {
    marginLeft: 8,
  },
  offlineMessage: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    marginLeft: 16,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  syncInfo: {
    marginBottom: 8,
  },
  syncInfoText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  chip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 10,
  },
  errorChip: {
    borderColor: '#f44336',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    margin: 0,
  },
  snackbar: {
    marginBottom: 20,
  },
});