/**
 * Tests for biometric authentication service
 */

import { biometricAuthService } from '../biometricAuthService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Mock dependencies
jest.mock('expo-local-authentication');
jest.mock('expo-secure-store');

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('BiometricAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Capabilities Detection', () => {
    it('should detect available biometric types', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(
        LocalAuthentication.SecurityLevel.BIOMETRIC
      );

      const capabilities = await biometricAuthService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: true,
        isEnrolled: true,
        isAvailable: true,
        supportedTypes: [1, 2], // FINGERPRINT, FACIAL_RECOGNITION
        securityLevel: 'biometric',
      });
    });

    it('should handle device without biometric hardware', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(
        LocalAuthentication.SecurityLevel.NONE
      );

      const capabilities = await biometricAuthService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: false,
        isEnrolled: false,
        isAvailable: false,
        supportedTypes: [],
        securityLevel: 'none',
      });
    });

    it('should handle device with hardware but no enrolled biometrics', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(
        LocalAuthentication.SecurityLevel.SECRET
      );

      const capabilities = await biometricAuthService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: true,
        isEnrolled: false,
        isAvailable: false,
        supportedTypes: [1], // FINGERPRINT
        securityLevel: 'passcode',
      });
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Mock basic capabilities
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    });

    it('should authenticate successfully with fingerprint', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Authenticate with fingerprint',
        fallbackLabel: 'Use passcode',
      });

      expect(result.success).toBe(true);
      expect(result.authMethod).toBe('biometric');
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate with fingerprint',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
    });

    it('should handle authentication failure', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
        warning: undefined,
      });

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Authenticate',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(result.authMethod).toBeUndefined();
    });

    it('should handle authentication cancellation', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'Authentication was cancelled by user',
        warning: undefined,
      });

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Authenticate',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication was cancelled by user');
    });

    it('should test authentication without storing result', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });

      const result = await biometricAuthService.testAuthentication();

      expect(result.success).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test biometric authentication',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });
  });

  describe('Secure Storage', () => {
    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    });

    it('should store data securely with biometric protection', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();

      await biometricAuthService.storeSecureData(
        'test-key',
        'sensitive-data',
        { requireAuthentication: true }
      );

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'test-key',
        'sensitive-data',
        { requireAuthentication: true }
      );
    });

    it('should retrieve secure data with biometric authentication', async () => {
      const sensitiveData = 'secret-value';
      mockSecureStore.getItemAsync.mockResolvedValue(sensitiveData);

      const result = await biometricAuthService.getSecureData(
        'test-key',
        { requireAuthentication: true }
      );

      expect(result).toBe(sensitiveData);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'test-key',
        { requireAuthentication: true }
      );
    });

    it('should handle secure storage errors', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(
        new Error('Authentication required')
      );

      await expect(
        biometricAuthService.getSecureData('test-key', { requireAuthentication: true })
      ).rejects.toThrow('Authentication required');
    });

    it('should delete secure data', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await biometricAuthService.deleteSecureData('test-key');

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Settings Management', () => {
    it('should enable biometric authentication', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();

      await biometricAuthService.setBiometricEnabled(true);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_enabled',
        'true'
      );
    });

    it('should disable biometric authentication', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();

      await biometricAuthService.setBiometricEnabled(false);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_enabled',
        'false'
      );
    });

    it('should check if biometric is enabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('true');

      const isEnabled = await biometricAuthService.isBiometricEnabled();

      expect(isEnabled).toBe(true);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });

    it('should default to disabled when no setting exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const isEnabled = await biometricAuthService.isBiometricEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      mockLocalAuth.authenticateAsync.mockRejectedValue(
        new Error('Biometric hardware unavailable')
      );

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Authenticate',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric hardware unavailable');
    });

    it('should handle capabilities check errors', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(
        new Error('Hardware check failed')
      );

      const capabilities = await biometricAuthService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: false,
        isEnrolled: false,
        isAvailable: false,
        supportedTypes: [],
        securityLevel: 'none',
      });
    });

    it('should handle secure storage initialization errors', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(
        new Error('Secure store unavailable')
      );

      await expect(
        biometricAuthService.setBiometricEnabled(true)
      ).rejects.toThrow('Secure store unavailable');
    });
  });

  describe('Platform Compatibility', () => {
    it('should handle iOS Face ID', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Use Face ID to authenticate',
      });

      expect(result.success).toBe(true);
      expect(result.authMethod).toBe('biometric');
    });

    it('should handle Android fingerprint', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });

      const result = await biometricAuthService.authenticateUser({
        promptMessage: 'Use fingerprint to authenticate',
      });

      expect(result.success).toBe(true);
      expect(result.authMethod).toBe('biometric');
    });
  });
});