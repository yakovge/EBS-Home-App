/**
 * Biometric authentication service for secure login and data access
 * Supports fingerprint, face recognition, and device passcode authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Config } from '../config';

interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: 'none' | 'biometric' | 'passcode' | 'both';
}

interface AuthenticationResult {
  success: boolean;
  error?: string;
  biometricUsed?: boolean;
  authMethod?: string;
}

interface SecureStorageOptions {
  requireAuthentication?: boolean;
  authPrompt?: string;
  fallbackToDevicePasscode?: boolean;
}

class BiometricAuthService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly SECURE_SESSION_KEY = 'secure_session';
  private readonly LAST_AUTH_KEY = 'last_biometric_auth';
  private readonly AUTH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private capabilities: BiometricCapabilities | null = null;
  private lastAuthTime: number = 0;

  constructor() {
    this.initializeCapabilities();
  }

  /**
   * Initialize biometric capabilities
   */
  private async initializeCapabilities(): Promise<void> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      let securityLevel: BiometricCapabilities['securityLevel'] = 'none';
      
      if (isEnrolled && supportedTypes.length > 0) {
        const hasBiometric = supportedTypes.some(type => 
          type === LocalAuthentication.AuthenticationType.FINGERPRINT ||
          type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );
        
        if (hasBiometric) {
          securityLevel = 'biometric';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.PASSCODE)) {
          securityLevel = 'passcode';
        }
      }

      this.capabilities = {
        isAvailable: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
        securityLevel,
      };

      console.log('🔐 Biometric capabilities:', this.capabilities);
    } catch (error) {
      console.error('Failed to initialize biometric capabilities:', error);
      this.capabilities = {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        securityLevel: 'none',
      };
    }
  }

  /**
   * Get current biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    if (!this.capabilities) {
      await this.initializeCapabilities();
    }
    return this.capabilities!;
  }

  /**
   * Check if biometric authentication is enabled by user
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable or disable biometric authentication
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, enabled.toString());
      
      if (!enabled) {
        // Clear secure session when disabled
        await this.clearSecureSession();
      }
      
      console.log(`🔐 Biometric authentication ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error setting biometric enabled status:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with biometrics or device passcode
   */
  async authenticateUser(options: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    requireBiometric?: boolean;
  } = {}): Promise<AuthenticationResult> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      const {
        promptMessage = 'Authenticate to access EBS Home',
        cancelLabel = 'Cancel',
        fallbackLabel = 'Use Passcode',
        requireBiometric = false,
      } = options;

      // Determine authentication options
      let authOptions: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage,
        cancelLabel,
        fallbackLabel,
        disableDeviceFallback: requireBiometric,
      };

      // Platform-specific options
      if (Platform.OS === 'ios') {
        authOptions = {
          ...authOptions,
          fallbackLabel: requireBiometric ? undefined : fallbackLabel,
        };
      }

      const result = await LocalAuthentication.authenticateAsync(authOptions);

      if (result.success) {
        this.lastAuthTime = Date.now();
        await AsyncStorage.setItem(this.LAST_AUTH_KEY, this.lastAuthTime.toString());
        
        const authMethod = this.getAuthMethodFromCapabilities(capabilities);
        
        console.log('✅ Biometric authentication successful:', authMethod);
        
        return {
          success: true,
          biometricUsed: true,
          authMethod,
        };
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        
        return {
          success: false,
          error: this.getErrorMessage(result.error),
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Check if user has recently authenticated (within timeout)
   */
  async isRecentlyAuthenticated(): Promise<boolean> {
    try {
      const lastAuthString = await AsyncStorage.getItem(this.LAST_AUTH_KEY);
      if (!lastAuthString) return false;
      
      const lastAuth = parseInt(lastAuthString, 10);
      const timeSinceAuth = Date.now() - lastAuth;
      
      return timeSinceAuth < this.AUTH_TIMEOUT;
    } catch (error) {
      console.error('Error checking recent authentication:', error);
      return false;
    }
  }

  /**
   * Store sensitive data securely
   */
  async storeSecureData(
    key: string, 
    value: string, 
    options: SecureStorageOptions = {}
  ): Promise<void> {
    try {
      const {
        requireAuthentication = true,
        authPrompt = 'Authenticate to store secure data',
        fallbackToDevicePasscode = true,
      } = options;

      let storageOptions: SecureStore.SecureStoreOptions = {};

      if (requireAuthentication && (await this.getCapabilities()).isAvailable) {
        storageOptions = {
          requireAuthentication: true,
          authenticationPrompt: authPrompt,
          ...(Platform.OS === 'ios' && {
            accessibilityLevel: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
          }),
        };
      }

      await SecureStore.setItemAsync(key, value, storageOptions);
      console.log(`🔒 Secure data stored for key: ${key}`);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw error;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getSecureData(
    key: string, 
    options: SecureStorageOptions = {}
  ): Promise<string | null> {
    try {
      const {
        requireAuthentication = true,
        authPrompt = 'Authenticate to access secure data',
      } = options;

      let retrieveOptions: SecureStore.SecureStoreOptions = {};

      if (requireAuthentication && (await this.getCapabilities()).isAvailable) {
        retrieveOptions = {
          requireAuthentication: true,
          authenticationPrompt: authPrompt,
        };
      }

      const data = await SecureStore.getItemAsync(key, retrieveOptions);
      
      if (data) {
        console.log(`🔓 Secure data retrieved for key: ${key}`);
      }
      
      return data;
    } catch (error) {
      if (error.code === 'UserCancel') {
        console.log('User cancelled secure data access');
        return null;
      }
      
      console.error('Error retrieving secure data:', error);
      throw error;
    }
  }

  /**
   * Delete secure data
   */
  async deleteSecureData(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`🗑️ Secure data deleted for key: ${key}`);
    } catch (error) {
      console.error('Error deleting secure data:', error);
      throw error;
    }
  }

  /**
   * Create a secure session with biometric protection
   */
  async createSecureSession(sessionData: any): Promise<void> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      const capabilities = await this.getCapabilities();
      
      if (!isEnabled || !capabilities.isAvailable) {
        // Fallback to regular storage
        await AsyncStorage.setItem(this.SECURE_SESSION_KEY, JSON.stringify(sessionData));
        return;
      }

      // Store in secure store with biometric protection
      await this.storeSecureData(
        this.SECURE_SESSION_KEY,
        JSON.stringify(sessionData),
        {
          requireAuthentication: true,
          authPrompt: 'Authenticate to create secure session',
        }
      );
    } catch (error) {
      console.error('Error creating secure session:', error);
      throw error;
    }
  }

  /**
   * Get secure session with biometric authentication
   */
  async getSecureSession(): Promise<any | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      const capabilities = await this.getCapabilities();
      
      if (!isEnabled || !capabilities.isAvailable) {
        // Fallback to regular storage
        const data = await AsyncStorage.getItem(this.SECURE_SESSION_KEY);
        return data ? JSON.parse(data) : null;
      }

      // Check if recently authenticated
      if (await this.isRecentlyAuthenticated()) {
        // Skip authentication if recently authenticated
        const data = await this.getSecureData(this.SECURE_SESSION_KEY, {
          requireAuthentication: false,
        });
        return data ? JSON.parse(data) : null;
      }

      // Require authentication
      const data = await this.getSecureData(this.SECURE_SESSION_KEY, {
        requireAuthentication: true,
        authPrompt: 'Authenticate to access your session',
      });
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting secure session:', error);
      return null;
    }
  }

  /**
   * Clear secure session
   */
  async clearSecureSession(): Promise<void> {
    try {
      await this.deleteSecureData(this.SECURE_SESSION_KEY);
      await AsyncStorage.removeItem(this.SECURE_SESSION_KEY);
      await AsyncStorage.removeItem(this.LAST_AUTH_KEY);
      
      console.log('🧹 Secure session cleared');
    } catch (error) {
      console.error('Error clearing secure session:', error);
    }
  }

  /**
   * Get authentication method name from capabilities
   */
  private getAuthMethodFromCapabilities(capabilities: BiometricCapabilities): string {
    const types = capabilities.supportedTypes;
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    
    if (types.includes(LocalAuthentication.AuthenticationType.PASSCODE)) {
      return 'Device Passcode';
    }
    
    return 'Biometric';
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error?: string): string {
    switch (error) {
      case 'UserCancel':
        return 'Authentication cancelled by user';
      case 'UserFallback':
        return 'User chose to use fallback authentication';
      case 'SystemCancel':
        return 'Authentication cancelled by system';
      case 'PasscodeNotSet':
        return 'Device passcode not set';
      case 'BiometryNotAvailable':
        return 'Biometric authentication not available';
      case 'BiometryNotEnrolled':
        return 'No biometric data enrolled';
      case 'BiometryLockout':
        return 'Biometric authentication locked out';
      default:
        return 'Authentication failed';
    }
  }

  /**
   * Test biometric authentication (for setup/debugging)
   */
  async testAuthentication(): Promise<AuthenticationResult> {
    return this.authenticateUser({
      promptMessage: 'Test biometric authentication',
      cancelLabel: 'Cancel Test',
    });
  }

  /**
   * Get detailed system info for debugging
   */
  async getSystemInfo(): Promise<{
    capabilities: BiometricCapabilities;
    isEnabled: boolean;
    recentlyAuthenticated: boolean;
    platform: string;
  }> {
    return {
      capabilities: await this.getCapabilities(),
      isEnabled: await this.isBiometricEnabled(),
      recentlyAuthenticated: await this.isRecentlyAuthenticated(),
      platform: Platform.OS,
    };
  }
}

export const biometricAuthService = new BiometricAuthService();
export type { BiometricCapabilities, AuthenticationResult, SecureStorageOptions };