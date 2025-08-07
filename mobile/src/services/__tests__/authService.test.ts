/**
 * Tests for authService
 * Covers login, logout, and device management functionality
 */

import { authService } from '../authService';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the API client
jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('expo-device');

const mockDevice = Device as jest.Mocked<typeof Device>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  describe('getDeviceInfo', () => {
    it('should return device information', async () => {
      // Device properties are mocked globally

      const deviceInfo = await authService.getDeviceInfo();

      expect(deviceInfo).toHaveProperty('deviceId');
      expect(deviceInfo).toHaveProperty('deviceName');
      expect(deviceInfo).toHaveProperty('platform');
      expect(deviceInfo.deviceName).toBe('Test Model');
      expect(deviceInfo.platform).toBe('Test OS');
    });

    it('should generate device ID if not stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      // Device properties are mocked globally

      const deviceInfo = await authService.getDeviceInfo();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'device_id',
        expect.stringMatching(/^mobile_device_\d+$/)
      );
      expect(deviceInfo.deviceId).toMatch(/^mobile_device_\d+$/);
    });

    it('should use stored device ID if available', async () => {
      const storedDeviceId = 'mobile_device_12345';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(storedDeviceId);

      const deviceInfo = await authService.getDeviceInfo();

      expect(deviceInfo.deviceId).toBe(storedDeviceId);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should call login API with correct parameters', async () => {
      const { apiClient } = require('../api');
      const mockResponse = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        session_token: 'test-token',
      };

      apiClient.post.mockResolvedValueOnce(mockResponse);

      const token = 'firebase-token';
      const deviceInfo = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        platform: 'Test OS',
      };

      const result = await authService.login(token, deviceInfo);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        token,
        device_info: {
          device_id: deviceInfo.deviceId,
          device_name: deviceInfo.deviceName,
          platform: deviceInfo.platform,
        },
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle login errors', async () => {
      const { apiClient } = require('../api');
      apiClient.post.mockRejectedValueOnce(new Error('Login failed'));

      const token = 'firebase-token';
      const deviceInfo = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        platform: 'Test OS',
      };

      await expect(authService.login(token, deviceInfo)).rejects.toThrow('Login failed');
    });
  });

  describe('verifySession', () => {
    it('should verify session with temporary token storage', async () => {
      const { apiClient } = require('../api');
      const mockResponse = { valid: true, user: { id: '1', name: 'Test User' } };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('original-token');
      apiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await authService.verifySession('test-token');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('session_token', 'test-token');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/verify');
      expect(result).toEqual(mockResponse);
    });

    it('should restore original token on error', async () => {
      const { apiClient } = require('../api');
      const originalToken = 'original-token';

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(originalToken);
      apiClient.get.mockRejectedValueOnce(new Error('Verification failed'));

      await expect(authService.verifySession('test-token')).rejects.toThrow('Verification failed');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('session_token', originalToken);
    });
  });

  describe('logout', () => {
    it('should call logout API', async () => {
      const { apiClient } = require('../api');
      apiClient.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });
});