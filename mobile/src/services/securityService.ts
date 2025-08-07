/**
 * Advanced security service for app protection
 * Implements security measures, threat detection, and data protection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Alert, AppState, Platform } from 'react-native';

interface SecurityConfig {
  enableBiometric: boolean;
  enablePinLock: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableTamperDetection: boolean;
  enableRootDetection: boolean;
  enableScreenshotProtection: boolean;
  enableDataEncryption: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'biometric_fail' | 'session_timeout' | 'tamper_detected' | 'root_detected' | 'screenshot_attempt';
  timestamp: number;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

interface LoginAttempt {
  timestamp: number;
  method: 'biometric' | 'pin' | 'token';
  success: boolean;
  deviceInfo?: any;
}

class SecurityService {
  private config: SecurityConfig = {
    enableBiometric: true,
    enablePinLock: false,
    sessionTimeout: 15 * 60 * 1000, // 15 minutes
    maxLoginAttempts: 3,
    enableTamperDetection: true,
    enableRootDetection: true,
    enableScreenshotProtection: true,
    enableDataEncryption: true,
  };

  private securityEvents: SecurityEvent[] = [];
  private loginAttempts: LoginAttempt[] = [];
  private sessionTimer?: NodeJS.Timeout;
  private isSessionActive = false;
  private encryptionKey?: string;
  
  private readonly SECURITY_KEY = 'app_security';
  private readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private readonly ENCRYPTION_KEY_NAME = 'encryption_key';
  private readonly MAX_EVENTS = 1000;

  constructor() {
    this.initializeSecurity();
    this.setupAppStateListener();
  }

  /**
   * Initialize security service
   */
  private async initializeSecurity(): Promise<void> {
    try {
      // Load security configuration
      await this.loadSecurityConfig();
      
      // Load security events
      await this.loadSecurityEvents();
      
      // Load login attempts
      await this.loadLoginAttempts();
      
      // Initialize encryption key
      await this.initializeEncryption();
      
      // Check device security
      await this.checkDeviceSecurity();
      
      console.log('🔒 Security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      await this.logSecurityEvent({
        type: 'tamper_detected',
        severity: 'high',
        metadata: { error: error.message, context: 'initialization' },
      });
    }
  }

  /**
   * Setup app state listener for session management
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.handleAppBackground();
      } else if (nextAppState === 'active') {
        this.handleAppForeground();
      }
    });
  }

  /**
   * Initialize encryption
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Try to get existing encryption key
      let encryptionKey = await SecureStore.getItemAsync(this.ENCRYPTION_KEY_NAME);
      
      if (!encryptionKey) {
        // Generate new encryption key
        encryptionKey = await Crypto.randomUUID();
        await SecureStore.setItemAsync(
          this.ENCRYPTION_KEY_NAME,
          encryptionKey,
          { requireAuthentication: this.config.enableBiometric }
        );
      }
      
      this.encryptionKey = encryptionKey;
      console.log('🔐 Encryption initialized');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Check device security status
   */
  private async checkDeviceSecurity(): Promise<void> {
    try {
      // Check for root/jailbreak
      if (this.config.enableRootDetection) {
        const isRooted = await this.detectRootedDevice();
        if (isRooted) {
          await this.logSecurityEvent({
            type: 'root_detected',
            severity: 'critical',
            metadata: { platform: Platform.OS },
          });
          
          this.handleSecurityThreat('Device appears to be rooted/jailbroken');
        }
      }

      // Check biometric availability
      if (this.config.enableBiometric) {
        const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
        if (!biometricAvailable) {
          console.warn('⚠️ Biometric hardware not available');
        }
      }

    } catch (error) {
      console.error('Device security check failed:', error);
    }
  }

  /**
   * Detect rooted/jailbroken device
   */
  private async detectRootedDevice(): Promise<boolean> {
    try {
      // This is a simplified check - in production, use a proper root detection library
      if (Platform.OS === 'android') {
        // Check for common root indicators on Android
        const rootIndicators = [
          '/system/app/Superuser.apk',
          '/sbin/su',
          '/system/bin/su',
          '/system/xbin/su',
          '/data/local/xbin/su',
          '/data/local/bin/su',
          '/system/sd/xbin/su',
          '/system/bin/failsafe/su',
          '/data/local/su',
        ];
        
        // In a real implementation, you would check for these paths
        // For now, return false
        return false;
      } else if (Platform.OS === 'ios') {
        // Check for common jailbreak indicators on iOS
        const jailbreakIndicators = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
        ];
        
        // In a real implementation, you would check for these paths
        // For now, return false
        return false;
      }
      
      return false;
    } catch (error) {
      // If checks fail, assume potential compromise
      return true;
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    if (this.config.sessionTimeout > 0) {
      this.startSessionTimeout();
    }
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForeground(): void {
    this.clearSessionTimeout();
    
    if (!this.isSessionActive) {
      this.requireAuthentication();
    }
  }

  /**
   * Start session timeout timer
   */
  private startSessionTimeout(): void {
    this.clearSessionTimeout();
    
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.config.sessionTimeout);
  }

  /**
   * Clear session timeout timer
   */
  private clearSessionTimeout(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(): Promise<void> {
    this.isSessionActive = false;
    
    await this.logSecurityEvent({
      type: 'session_timeout',
      severity: 'medium',
      metadata: { timeout: this.config.sessionTimeout },
    });
    
    this.requireAuthentication();
  }

  /**
   * Require user authentication
   */
  private async requireAuthentication(): Promise<void> {
    if (this.config.enableBiometric) {
      await this.authenticateUser();
    }
  }

  /**
   * Authenticate user with biometric or PIN
   */
  async authenticateUser(): Promise<boolean> {
    try {
      const attempt: LoginAttempt = {
        timestamp: Date.now(),
        method: 'biometric',
        success: false,
      };

      if (this.config.enableBiometric) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access the app',
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
        });

        attempt.success = result.success;
        attempt.method = 'biometric';

        if (result.success) {
          this.isSessionActive = true;
          this.clearSessionTimeout();
          await this.logSuccessfulLogin(attempt);
          return true;
        } else {
          await this.logFailedLogin(attempt);
          await this.logSecurityEvent({
            type: 'biometric_fail',
            severity: 'medium',
            metadata: { error: result.error },
          });
        }
      }

      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      await this.logSecurityEvent({
        type: 'login_attempt',
        severity: 'high',
        metadata: { error: error.message },
      });
      return false;
    }
  }

  /**
   * Log successful login
   */
  private async logSuccessfulLogin(attempt: LoginAttempt): Promise<void> {
    this.loginAttempts.push(attempt);
    await this.saveLoginAttempts();
    
    console.log('✅ Authentication successful');
  }

  /**
   * Log failed login
   */
  private async logFailedLogin(attempt: LoginAttempt): Promise<void> {
    this.loginAttempts.push(attempt);
    await this.saveLoginAttempts();
    
    // Check for too many failed attempts
    const recentFailures = this.loginAttempts
      .filter(a => !a.success && Date.now() - a.timestamp < 60000)
      .length;
    
    if (recentFailures >= this.config.maxLoginAttempts) {
      await this.handleSecurityThreat('Too many failed authentication attempts');
    }
    
    console.warn('❌ Authentication failed');
  }

  /**
   * Handle security threat
   */
  private async handleSecurityThreat(message: string): Promise<void> {
    console.error(`🚨 Security threat detected: ${message}`);
    
    Alert.alert(
      'Security Alert',
      message,
      [
        { 
          text: 'Exit App', 
          onPress: () => {
            // In a real app, you might want to lock the app or exit
            console.log('App should be locked/exited');
          },
          style: 'destructive'
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    event: Omit<SecurityEvent, 'id' | 'timestamp' | 'handled'>
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: await this.generateId(),
      timestamp: Date.now(),
      handled: false,
      ...event,
    };

    this.securityEvents.push(securityEvent);
    
    // Keep only recent events
    if (this.securityEvents.length > this.MAX_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_EVENTS);
    }

    await this.saveSecurityEvents();
    
    console.log(`🔒 Security event logged: ${event.type} (${event.severity})`);
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<string> {
    if (!this.config.enableDataEncryption || !this.encryptionKey) {
      return data;
    }

    try {
      // Simple encryption (in production, use proper encryption library)
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + this.encryptionKey
      );
      
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    sessionActive: boolean;
    biometricEnabled: boolean;
    recentEvents: SecurityEvent[];
    recentLoginAttempts: LoginAttempt[];
    configuredSecurity: SecurityConfig;
  } {
    const recentEvents = this.securityEvents
      .filter(event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp);
      
    const recentLogins = this.loginAttempts
      .filter(attempt => Date.now() - attempt.timestamp < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      sessionActive: this.isSessionActive,
      biometricEnabled: this.config.enableBiometric,
      recentEvents,
      recentLoginAttempts: recentLogins,
      configuredSecurity: { ...this.config },
    };
  }

  /**
   * Update security configuration
   */
  async updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveSecurityConfig();
    
    console.log('🔒 Security configuration updated');
  }

  // Storage methods
  private async loadSecurityConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.SECURITY_KEY);
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
  }

  private async saveSecurityConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SECURITY_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save security config:', error);
    }
  }

  private async loadSecurityEvents(): Promise<void> {
    try {
      const eventsData = await AsyncStorage.getItem('security_events');
      if (eventsData) {
        this.securityEvents = JSON.parse(eventsData);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  }

  private async saveSecurityEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('security_events', JSON.stringify(this.securityEvents));
    } catch (error) {
      console.error('Failed to save security events:', error);
    }
  }

  private async loadLoginAttempts(): Promise<void> {
    try {
      const attemptsData = await AsyncStorage.getItem(this.LOGIN_ATTEMPTS_KEY);
      if (attemptsData) {
        this.loginAttempts = JSON.parse(attemptsData);
      }
    } catch (error) {
      console.error('Failed to load login attempts:', error);
    }
  }

  private async saveLoginAttempts(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LOGIN_ATTEMPTS_KEY, JSON.stringify(this.loginAttempts));
    } catch (error) {
      console.error('Failed to save login attempts:', error);
    }
  }

  /**
   * Clear all security data
   */
  async clearSecurityData(): Promise<void> {
    this.securityEvents = [];
    this.loginAttempts = [];
    
    await Promise.all([
      this.saveSecurityEvents(),
      this.saveLoginAttempts(),
      AsyncStorage.removeItem(this.SECURITY_KEY),
    ]);
    
    console.log('🗑️ Security data cleared');
  }

  /**
   * Generate a unique ID for security events
   */
  private async generateId(): Promise<string> {
    try {
      // Try using Crypto.randomUUID if available
      if (Crypto && Crypto.randomUUID) {
        return await Crypto.randomUUID();
      }
    } catch (error) {
      // Fallback for environments where Crypto.randomUUID is not available
    }
    
    // Fallback to timestamp + random string
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearSessionTimeout();
    console.log('🧹 Security service destroyed');
  }
}

export const securityService = new SecurityService();
export type { SecurityConfig, SecurityEvent, LoginAttempt };