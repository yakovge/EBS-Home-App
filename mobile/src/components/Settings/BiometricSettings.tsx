/**
 * Biometric settings component for enabling/disabling biometric authentication
 * Shows available biometric methods and allows user to configure security options
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { 
  List, 
  Switch, 
  Text, 
  Card, 
  Button, 
  Chip,
  Surface,
  ActivityIndicator 
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { 
  biometricAuthService, 
  BiometricCapabilities, 
  AuthenticationResult 
} from '../../services/biometricAuthService';

interface BiometricSettingsProps {
  onSettingsChange?: (enabled: boolean) => void;
}

export default function BiometricSettings({ onSettingsChange }: BiometricSettingsProps) {
  const { t } = useTranslation();
  
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      setLoading(true);
      
      const [caps, enabled] = await Promise.all([
        biometricAuthService.getCapabilities(),
        biometricAuthService.isBiometricEnabled(),
      ]);
      
      setCapabilities(caps);
      setIsEnabled(enabled);
      
      console.log('🔐 Biometric settings initialized:', { caps, enabled });
    } catch (error) {
      console.error('Failed to initialize biometric settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometric = async (enable: boolean) => {
    if (!capabilities?.isAvailable && enable) {
      showUnavailableAlert();
      return;
    }

    try {
      if (enable) {
        // Test authentication before enabling
        const testResult = await biometricAuthService.testAuthentication();
        
        if (!testResult.success) {
          Alert.alert(
            t('biometric.authFailed'),
            testResult.error || t('biometric.authFailedMessage'),
            [{ text: t('common.ok') }]
          );
          return;
        }
      }

      await biometricAuthService.setBiometricEnabled(enable);
      setIsEnabled(enable);
      
      onSettingsChange?.(enable);
      
      const message = enable 
        ? t('biometric.enabledSuccess') 
        : t('biometric.disabledSuccess');
        
      Alert.alert(
        t('common.success'),
        message,
        [{ text: t('common.ok') }]
      );
      
    } catch (error) {
      console.error('Failed to toggle biometric:', error);
      Alert.alert(
        t('common.error'),
        t('biometric.settingsError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleTestAuthentication = async () => {
    if (!capabilities?.isAvailable) {
      showUnavailableAlert();
      return;
    }

    try {
      setTesting(true);
      
      const result = await biometricAuthService.testAuthentication();
      
      if (result.success) {
        Alert.alert(
          t('biometric.testSuccess'),
          t('biometric.testSuccessMessage', { 
            method: result.authMethod || t('biometric.biometric')
          }),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(
          t('biometric.testFailed'),
          result.error || t('biometric.testFailedMessage'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Biometric test failed:', error);
      Alert.alert(
        t('common.error'),
        t('biometric.testError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setTesting(false);
    }
  };

  const showUnavailableAlert = () => {
    let title = t('biometric.unavailable');
    let message = t('biometric.unavailableMessage');
    
    if (!capabilities?.hasHardware) {
      message = t('biometric.noHardware');
    } else if (!capabilities?.isEnrolled) {
      message = t('biometric.notEnrolled');
    }
    
    Alert.alert(title, message, [
      { text: t('common.cancel') },
      { 
        text: t('biometric.openSettings'), 
        onPress: () => {
          // Could open device settings here
          console.log('Open device settings');
        }
      }
    ]);
  };

  const getBiometricMethodName = (): string => {
    if (!capabilities?.supportedTypes.length) return '';
    
    const types = capabilities.supportedTypes;
    
    if (types.includes(1)) { // FINGERPRINT
      return Platform.OS === 'ios' ? 'Touch ID' : t('biometric.fingerprint');
    }
    
    if (types.includes(2)) { // FACIAL_RECOGNITION  
      return Platform.OS === 'ios' ? 'Face ID' : t('biometric.faceRecognition');
    }
    
    if (types.includes(3)) { // IRIS (Android)
      return t('biometric.iris');
    }
    
    return t('biometric.biometric');
  };

  const getSecurityLevelColor = () => {
    switch (capabilities?.securityLevel) {
      case 'biometric': return '#4caf50'; // Green
      case 'passcode': return '#ff9800'; // Orange  
      case 'none': return '#f44336'; // Red
      default: return '#757575'; // Grey
    }
  };

  const getSecurityLevelText = (): string => {
    switch (capabilities?.securityLevel) {
      case 'biometric': return t('biometric.securityHigh');
      case 'passcode': return t('biometric.securityMedium');
      case 'none': return t('biometric.securityNone');
      default: return t('biometric.securityUnknown');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('biometric.checkingCapabilities')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader>{t('biometric.title')}</List.Subheader>
            
            {/* Main toggle */}
            <List.Item
              title={t('biometric.enableBiometric')}
              description={capabilities?.isAvailable 
                ? t('biometric.enabledDescription')
                : t('biometric.unavailableDescription')
              }
              left={(props) => (
                <List.Icon 
                  {...props} 
                  icon={capabilities?.isAvailable ? "fingerprint" : "fingerprint-off"} 
                />
              )}
              right={() => (
                <Switch
                  value={isEnabled}
                  onValueChange={handleToggleBiometric}
                  disabled={!capabilities?.isAvailable}
                />
              )}
            />

            {/* Current method info */}
            {capabilities?.isAvailable && (
              <Surface style={styles.infoSurface}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('biometric.method')}:</Text>
                  <Text style={styles.infoValue}>{getBiometricMethodName()}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('biometric.securityLevel')}:</Text>
                  <Chip 
                    mode="flat"
                    textStyle={[styles.chipText, { color: getSecurityLevelColor() }]}
                    style={[styles.securityChip, { borderColor: getSecurityLevelColor() }]}
                  >
                    {getSecurityLevelText()}
                  </Chip>
                </View>
              </Surface>
            )}

            {/* Test button */}
            {capabilities?.isAvailable && (
              <View style={styles.testContainer}>
                <Button
                  mode="outlined"
                  onPress={handleTestAuthentication}
                  loading={testing}
                  disabled={testing}
                  icon="fingerprint"
                  style={styles.testButton}
                >
                  {testing ? t('biometric.testing') : t('biometric.testAuthentication')}
                </Button>
              </View>
            )}

            {/* Capabilities info */}
            <List.Accordion title={t('biometric.capabilities')} id="capabilities">
              <View style={styles.capabilitiesContainer}>
                <View style={styles.capabilityRow}>
                  <Text style={styles.capabilityLabel}>{t('biometric.hardwareAvailable')}:</Text>
                  <Chip mode="flat" style={capabilities?.hasHardware ? styles.successChip : styles.errorChip}>
                    {capabilities?.hasHardware ? t('common.yes') : t('common.no')}
                  </Chip>
                </View>
                
                <View style={styles.capabilityRow}>
                  <Text style={styles.capabilityLabel}>{t('biometric.biometricsEnrolled')}:</Text>
                  <Chip mode="flat" style={capabilities?.isEnrolled ? styles.successChip : styles.errorChip}>
                    {capabilities?.isEnrolled ? t('common.yes') : t('common.no')}
                  </Chip>
                </View>
                
                <View style={styles.capabilityRow}>
                  <Text style={styles.capabilityLabel}>{t('biometric.supportedMethods')}:</Text>
                  <Text style={styles.capabilityValue}>
                    {capabilities?.supportedTypes.length || 0}
                  </Text>
                </View>
              </View>
            </List.Accordion>

            {/* Security note */}
            <Surface style={[styles.noteSurface, styles.securityNote]}>
              <Text style={styles.noteText}>
                {t('biometric.securityNote')}
              </Text>
            </Surface>
          </List.Section>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  infoSurface: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    fontWeight: '500',
  },
  infoValue: {
    color: '#666',
  },
  securityChip: {
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  testContainer: {
    padding: 16,
    alignItems: 'center',
  },
  testButton: {
    minWidth: 200,
  },
  capabilitiesContainer: {
    padding: 16,
  },
  capabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  capabilityLabel: {
    flex: 1,
    fontWeight: '500',
  },
  capabilityValue: {
    color: '#666',
    fontWeight: '500',
  },
  successChip: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  errorChip: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  noteSurface: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  securityNote: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#666',
  },
});