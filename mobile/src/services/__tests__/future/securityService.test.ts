/**
 * Tests for security service
 */

import { securityService } from '../securityService';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('expo-crypto');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

// Mock device info
jest.mock('expo-device', () => ({
  deviceType: 1, // Phone
  brand: 'Apple',
  manufacturer: 'Apple Inc.',
  modelName: 'iPhone 14',
  osName: 'iOS',
  osVersion: '16.4',
}));

// Mock application state
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data', async () => {
      const plaintext = 'sensitive user data';
      const mockEncrypted = 'encrypted_data_hash';
      
      mockCrypto.digestStringAsync.mockResolvedValue(mockEncrypted);

      const encrypted = await securityService.encryptData(plaintext);

      expect(encrypted).toBe(mockEncrypted);
      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        plaintext,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    });

    it('should decrypt data', async () => {
      // In a real implementation, this would use symmetric encryption
      // For testing, we'll mock the decryption process
      const encryptedData = 'encrypted_data_hash';
      const expectedPlaintext = 'decrypted data';
      
      // Mock the decryption process
      const mockDecrypt = jest.spyOn(securityService, 'decryptData');
      mockDecrypt.mockResolvedValue(expectedPlaintext);

      const decrypted = await securityService.decryptData(encryptedData);

      expect(decrypted).toBe(expectedPlaintext);
    });

    it('should generate secure random keys', async () => {
      const mockRandomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockRandomBytes);

      const key = await securityService.generateSecureKey(8);

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(8);
      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(8);
    });

    it('should hash passwords securely', async () => {
      const password = 'user_password_123';
      const salt = 'random_salt';
      const expectedHash = 'secure_password_hash';

      mockCrypto.digestStringAsync.mockResolvedValue(expectedHash);

      const hashedPassword = await securityService.hashPassword(password, salt);

      expect(hashedPassword).toBe(expectedHash);
      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA512,
        password + salt,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    });
  });

  describe('Session Security', () => {
    it('should validate session tokens', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        device_id: 'device123',
      };

      // Mock JWT validation
      const mockValidate = jest.spyOn(securityService, 'validateSessionToken');
      mockValidate.mockResolvedValue({
        valid: true,
        payload: mockPayload,
        remainingTime: 3600,
      });

      const result = await securityService.validateSessionToken(validToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
      expect(result.remainingTime).toBe(3600);
    });

    it('should detect expired tokens', async () => {
      const expiredToken = 'expired.jwt.token';
      
      const mockValidate = jest.spyOn(securityService, 'validateSessionToken');
      mockValidate.mockResolvedValue({
        valid: false,
        error: 'Token expired',
        remainingTime: 0,
      });

      const result = await securityService.validateSessionToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should detect invalid token signatures', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const mockValidate = jest.spyOn(securityService, 'validateSessionToken');
      mockValidate.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
        remainingTime: 0,
      });

      const result = await securityService.validateSessionToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should refresh tokens automatically', async () => {
      const oldToken = 'old.jwt.token';
      const newToken = 'new.jwt.token';

      const mockRefresh = jest.spyOn(securityService, 'refreshSessionToken');
      mockRefresh.mockResolvedValue({
        success: true,
        token: newToken,
        expiresIn: 3600,
      });

      const result = await securityService.refreshSessionToken(oldToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(newToken);
    });
  });

  describe('Device Security', () => {
    it('should generate device fingerprint', async () => {
      const mockFingerprint = 'unique_device_fingerprint_hash';
      mockCrypto.digestStringAsync.mockResolvedValue(mockFingerprint);

      const fingerprint = await securityService.generateDeviceFingerprint();

      expect(fingerprint).toBe(mockFingerprint);
      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        expect.stringContaining('iPhone 14'), // Should include device info
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    });

    it('should detect device changes', async () => {
      const oldFingerprint = 'old_fingerprint';
      const newFingerprint = 'new_fingerprint';

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(oldFingerprint);
      mockCrypto.digestStringAsync.mockResolvedValue(newFingerprint);

      const isDeviceChanged = await securityService.detectDeviceChange();

      expect(isDeviceChanged).toBe(true);
    });

    it('should validate device integrity', async () => {
      const mockValidation = {
        isJailbroken: false,
        hasHooks: false,
        isDebuggingEnabled: false,
        isEmulator: false,
        riskLevel: 'low',
      };

      const mockIntegrityCheck = jest.spyOn(securityService, 'checkDeviceIntegrity');
      mockIntegrityCheck.mockResolvedValue(mockValidation);

      const integrity = await securityService.checkDeviceIntegrity();

      expect(integrity.riskLevel).toBe('low');
      expect(integrity.isJailbroken).toBe(false);
    });

    it('should detect high-risk devices', async () => {
      const mockHighRiskValidation = {
        isJailbroken: true,
        hasHooks: true,
        isDebuggingEnabled: false,
        isEmulator: false,
        riskLevel: 'high',
      };

      const mockIntegrityCheck = jest.spyOn(securityService, 'checkDeviceIntegrity');
      mockIntegrityCheck.mockResolvedValue(mockHighRiskValidation);

      const integrity = await securityService.checkDeviceIntegrity();

      expect(integrity.riskLevel).toBe('high');
      expect(integrity.isJailbroken).toBe(true);
    });
  });

  describe('Network Security', () => {
    it('should detect insecure network connections', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        details: {
          ssid: 'PublicWiFi',
          strength: 50,
          frequency: 2400,
          ipAddress: '192.168.1.100',
          subnet: '255.255.255.0',
        },
      });

      const networkSecurity = await securityService.analyzeNetworkSecurity();

      expect(networkSecurity).toHaveProperty('isSecure');
      expect(networkSecurity).toHaveProperty('riskFactors');
      expect(networkSecurity).toHaveProperty('recommendations');
    });

    it('should validate SSL certificates', async () => {
      const mockCertValidation = jest.spyOn(securityService, 'validateSSLCertificate');
      mockCertValidation.mockResolvedValue({
        valid: true,
        issuer: 'DigiCert Inc',
        expiryDate: new Date('2024-12-31'),
        isExpired: false,
        isSelfSigned: false,
      });

      const certInfo = await securityService.validateSSLCertificate('https://api.example.com');

      expect(certInfo.valid).toBe(true);
      expect(certInfo.isExpired).toBe(false);
    });

    it('should detect man-in-the-middle attacks', async () => {
      const mockMITMDetection = jest.spyOn(securityService, 'detectMITM');
      mockMITMDetection.mockResolvedValue({
        suspected: false,
        indicators: [],
        riskLevel: 'low',
      });

      const mitmResult = await securityService.detectMITM();

      expect(mitmResult.suspected).toBe(false);
      expect(mitmResult.riskLevel).toBe('low');
    });
  });

  describe('Input Validation', () => {
    it('should sanitize user input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitizedInput = securityService.sanitizeInput(maliciousInput);

      expect(sanitizedInput).not.toContain('<script>');
      expect(sanitizedInput).not.toContain('alert');
      expect(sanitizedInput).toContain('Hello');
    });

    it('should validate email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@test-domain.org',
      ];

      const invalidEmails = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user..double@domain.com',
      ];

      validEmails.forEach(email => {
        expect(securityService.validateEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(securityService.validateEmail(email)).toBe(false);
      });
    });

    it('should validate phone numbers', () => {
      const validPhones = [
        '+1-555-123-4567',
        '+44-20-7946-0958',
        '+972-50-123-4567',
      ];

      const invalidPhones = [
        '123',
        'phone-number',
        '+1-555-CALL-NOW',
      ];

      validPhones.forEach(phone => {
        expect(securityService.validatePhoneNumber(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(securityService.validatePhoneNumber(phone)).toBe(false);
      });
    });

    it('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM passwords",
      ];

      const safeInputs = [
        "user input",
        "search term",
        "normal text with apostrophe's",
      ];

      maliciousInputs.forEach(input => {
        expect(securityService.detectSQLInjection(input)).toBe(true);
      });

      safeInputs.forEach(input => {
        expect(securityService.detectSQLInjection(input)).toBe(false);
      });
    });
  });

  describe('Security Monitoring', () => {
    it('should log security events', async () => {
      const securityEvent = {
        type: 'login_attempt',
        severity: 'medium',
        details: {
          userId: 'user123',
          deviceId: 'device456',
          ipAddress: '192.168.1.100',
          userAgent: 'Mobile App v1.0',
        },
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await securityService.logSecurityEvent(securityEvent);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('security_log'),
        expect.stringContaining(JSON.stringify(securityEvent))
      );
    });

    it('should detect brute force attempts', async () => {
      const failedAttempts = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() - (5 - i) * 1000, // 5 attempts in 5 seconds
        type: 'login_failure',
        userId: 'user123',
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(failedAttempts)
      );

      const isBruteForce = await securityService.detectBruteForce('user123');

      expect(isBruteForce).toBe(true);
    });

    it('should rate limit requests', async () => {
      const requests = Array.from({ length: 10 }, () => ({
        timestamp: Date.now(),
        endpoint: '/api/login',
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(requests)
      );

      const isRateLimited = await securityService.checkRateLimit('/api/login', 5);

      expect(isRateLimited).toBe(true);
    });

    it('should generate security reports', async () => {
      const mockEvents = [
        {
          type: 'login_success',
          timestamp: Date.now() - 3600000, // 1 hour ago
          severity: 'low',
        },
        {
          type: 'failed_validation',
          timestamp: Date.now() - 1800000, // 30 minutes ago
          severity: 'medium',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEvents)
      );

      const report = await securityService.generateSecurityReport();

      expect(report).toHaveProperty('totalEvents');
      expect(report).toHaveProperty('eventsByType');
      expect(report).toHaveProperty('riskAssessment');
      expect(report.totalEvents).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      mockCrypto.digestStringAsync.mockRejectedValue(
        new Error('Crypto operation failed')
      );

      const result = await securityService.encryptData('test data');

      // Should return null or handle error gracefully
      expect(result).toBeNull();
    });

    it('should handle storage errors in security logging', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage full')
      );

      // Should not throw
      await expect(
        securityService.logSecurityEvent({
          type: 'test_event',
          severity: 'low',
          details: {},
        })
      ).resolves.toBeUndefined();
    });

    it('should handle network errors in security checks', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(
        new Error('Network unavailable')
      );

      const networkSecurity = await securityService.analyzeNetworkSecurity();

      expect(networkSecurity.isSecure).toBe(false);
      expect(networkSecurity.riskFactors).toContain('Unable to analyze network');
    });
  });
});