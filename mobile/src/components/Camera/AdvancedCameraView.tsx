/**
 * Advanced camera component with enhanced features for maintenance photo capture
 * Includes grid lines, focus control, flash options, and quality settings
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Alert, Platform } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { IconButton, Surface, Chip, Portal, Modal } from 'react-native-paper';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from 'react-i18next';
import { Config } from '../../config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AdvancedCameraViewProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string, metadata?: PhotoMetadata) => void;
  captureMode?: 'maintenance' | 'checklist' | 'profile';
  gridLines?: boolean;
  maxPhotos?: number;
  requiredPhotos?: number;
}

interface PhotoMetadata {
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  cameraSettings: {
    flashMode: FlashMode;
    type: CameraType;
    zoom: number;
  };
  imageInfo: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

interface CameraSettings {
  flashMode: FlashMode;
  type: CameraType;
  zoom: number;
  autoFocus: boolean;
  gridLines: boolean;
  quality: number; // 0-1
  format: 'jpeg' | 'png';
}

export default function AdvancedCameraView({
  visible,
  onClose,
  onCapture,
  captureMode = 'maintenance',
  gridLines = true,
  maxPhotos,
  requiredPhotos,
}: AdvancedCameraViewProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<Camera>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState<CameraSettings>({
    flashMode: FlashMode.auto,
    type: CameraType.back,
    zoom: 0,
    autoFocus: true,
    gridLines: true,
    quality: 0.8,
    format: 'jpeg',
  });

  useEffect(() => {
    requestCameraPermissions();
  }, []);

  const requestCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status !== 'granted') {
      Alert.alert(
        t('permissions.camera'),
        t('camera.permissionRequired'),
        [
          { text: t('common.cancel'), onPress: onClose },
          { text: t('common.retry'), onPress: requestCameraPermissions }
        ]
      );
    }
  };

  const handleCameraReady = () => {
    setIsReady(true);
    console.log('📸 Camera ready');
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: settings.quality,
        base64: false,
        exif: true,
        imageType: settings.format === 'png' ? 'png' : 'jpg',
      });

      console.log('📸 Photo captured:', photo.uri);

      // Process the image based on capture mode
      const processedPhoto = await processPhoto(photo.uri);

      // Create metadata
      const metadata: PhotoMetadata = {
        timestamp: Date.now(),
        cameraSettings: {
          flashMode: settings.flashMode,
          type: settings.type,
          zoom: settings.zoom,
        },
        imageInfo: {
          width: photo.width,
          height: photo.height,
          size: 0, // Will be filled after processing
          format: settings.format,
        },
      };

      // Add location if available and permitted
      try {
        if (captureMode === 'maintenance') {
          // Location is useful for maintenance requests
          const location = await getCurrentLocation();
          if (location) {
            metadata.location = location;
          }
        }
      } catch (error) {
        console.log('📍 Location not available:', error);
      }

      // Save to gallery if this is a maintenance photo
      if (captureMode === 'maintenance') {
        try {
          const asset = await MediaLibrary.createAssetAsync(processedPhoto);
          console.log('💾 Photo saved to gallery:', asset.id);
        } catch (error) {
          console.log('💾 Failed to save to gallery:', error);
        }
      }

      setCapturedPhotos(prev => [...prev, processedPhoto]);
      onCapture(processedPhoto, metadata);

      // Check if we've reached the maximum photos
      if (maxPhotos && capturedPhotos.length + 1 >= maxPhotos) {
        setTimeout(onClose, 1000); // Brief delay to show the capture
      }

    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert(
        t('common.error'),
        t('camera.captureFailed')
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const processPhoto = async (uri: string): Promise<string> => {
    try {
      let manipulateActions: ImageManipulator.Action[] = [];

      // Resize based on capture mode
      const targetSize = getTargetSize();
      if (targetSize) {
        manipulateActions.push({
          resize: targetSize,
        });
      }

      // Add watermark for maintenance photos
      if (captureMode === 'maintenance' && Config.IS_PRODUCTION) {
        // In production, we might want to add a timestamp watermark
        // This would require additional image manipulation
      }

      // Apply compression and format
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulateActions,
        {
          compress: getCompressionRatio(),
          format: settings.format === 'png' 
            ? ImageManipulator.SaveFormat.PNG 
            : ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('🔄 Photo processed:', {
        originalSize: 'unknown',
        processedSize: 'unknown',
        format: settings.format,
      });

      return result.uri;
    } catch (error) {
      console.error('Failed to process photo:', error);
      return uri; // Return original if processing fails
    }
  };

  const getTargetSize = (): { width: number; height: number } | null => {
    switch (captureMode) {
      case 'profile':
        return { width: 400, height: 400 }; // Square for profile
      case 'checklist':
        return { width: 1200, height: 1600 }; // Good quality for checklist
      case 'maintenance':
        return { width: 1600, height: 1200 }; // High quality for maintenance
      default:
        return null;
    }
  };

  const getCompressionRatio = (): number => {
    switch (captureMode) {
      case 'profile':
        return 0.7; // Higher compression for profiles
      case 'checklist':
        return 0.8; // Balanced for checklists
      case 'maintenance':
        return 0.9; // Lower compression for maintenance (higher quality)
      default:
        return settings.quality;
    }
  };

  const getCurrentLocation = async () => {
    // This would integrate with expo-location
    // For now, return null - would need to implement location services
    return null;
  };

  const toggleFlash = () => {
    const flashModes = [FlashMode.off, FlashMode.on, FlashMode.auto, FlashMode.torch];
    const currentIndex = flashModes.indexOf(settings.flashMode);
    const nextIndex = (currentIndex + 1) % flashModes.length;
    setSettings(prev => ({ ...prev, flashMode: flashModes[nextIndex] }));
  };

  const toggleCameraType = () => {
    setSettings(prev => ({ 
      ...prev, 
      type: prev.type === CameraType.back ? CameraType.front : CameraType.back 
    }));
  };

  const getFlashIcon = () => {
    switch (settings.flashMode) {
      case FlashMode.on: return 'flash';
      case FlashMode.off: return 'flash-off';
      case FlashMode.auto: return 'flash-auto';
      case FlashMode.torch: return 'flashlight';
      default: return 'flash-auto';
    }
  };

  const renderGridLines = () => {
    if (!settings.gridLines) return null;

    return (
      <View style={styles.gridContainer}>
        {/* Vertical lines */}
        <View style={[styles.gridLine, styles.verticalLine, { left: '33.33%' }]} />
        <View style={[styles.gridLine, styles.verticalLine, { left: '66.66%' }]} />
        {/* Horizontal lines */}
        <View style={[styles.gridLine, styles.horizontalLine, { top: '33.33%' }]} />
        <View style={[styles.gridLine, styles.horizontalLine, { top: '66.66%' }]} />
      </View>
    );
  };

  const renderCaptureInfo = () => {
    const remainingPhotos = maxPhotos ? maxPhotos - capturedPhotos.length : null;
    const requiredRemaining = requiredPhotos ? Math.max(0, requiredPhotos - capturedPhotos.length) : 0;

    return (
      <View style={styles.infoContainer}>
        {capturedPhotos.length > 0 && (
          <Chip mode="flat" style={styles.infoChip}>
            {t('camera.capturedCount', { count: capturedPhotos.length })}
          </Chip>
        )}
        
        {remainingPhotos !== null && remainingPhotos > 0 && (
          <Chip mode="flat" style={styles.infoChip}>
            {t('camera.remainingPhotos', { count: remainingPhotos })}
          </Chip>
        )}
        
        {requiredRemaining > 0 && (
          <Chip mode="flat" style={[styles.infoChip, styles.requiredChip]}>
            {t('camera.requiredRemaining', { count: requiredRemaining })}
          </Chip>
        )}
      </View>
    );
  };

  const renderSettingsModal = () => (
    <Portal>
      <Modal visible={showSettings} onDismiss={() => setShowSettings(false)}>
        <Surface style={styles.settingsModal}>
          <Text style={styles.settingsTitle}>{t('camera.settings')}</Text>
          
          <View style={styles.settingRow}>
            <Text>{t('camera.gridLines')}</Text>
            <IconButton
              icon={settings.gridLines ? 'toggle-switch' : 'toggle-switch-off'}
              onPress={() => setSettings(prev => ({ ...prev, gridLines: !prev.gridLines }))}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text>{t('camera.quality')}: {Math.round(settings.quality * 100)}%</Text>
          </View>
          
          <IconButton
            icon="close"
            onPress={() => setShowSettings(false)}
            style={styles.closeButton}
          />
        </Surface>
      </Modal>
    </Portal>
  );

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('camera.noPermission')}</Text>
      </View>
    );
  }

  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} style={styles.modal}>
        <View style={styles.container}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={settings.type}
            flashMode={settings.flashMode}
            zoom={settings.zoom}
            autoFocus={settings.autoFocus}
            onCameraReady={handleCameraReady}
          >
            {renderGridLines()}
            
            {/* Top controls */}
            <View style={styles.topControls}>
              <IconButton
                icon="close"
                iconColor="white"
                onPress={onClose}
              />
              
              <View style={styles.topRightControls}>
                <IconButton
                  icon="cog"
                  iconColor="white"
                  onPress={() => setShowSettings(true)}
                />
                <IconButton
                  icon={getFlashIcon()}
                  iconColor="white"
                  onPress={toggleFlash}
                />
              </View>
            </View>

            {/* Capture info */}
            {renderCaptureInfo()}

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              <IconButton
                icon="camera-flip"
                iconColor="white"
                size={32}
                onPress={toggleCameraType}
                disabled={isCapturing}
              />

              <IconButton
                icon="camera"
                iconColor="white"
                size={80}
                style={[
                  styles.captureButton,
                  isCapturing && styles.capturingButton,
                ]}
                onPress={capturePhoto}
                disabled={!isReady || isCapturing}
              />

              <View style={styles.placeholder} />
            </View>
          </Camera>

          {renderSettingsModal()}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  topRightControls: {
    flexDirection: 'row',
  },
  infoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 2,
  },
  infoChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  requiredChip: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 2,
  },
  captureButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'white',
    borderWidth: 4,
  },
  capturingButton: {
    opacity: 0.5,
  },
  placeholder: {
    width: 64,
    height: 64,
  },
  settingsModal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
});