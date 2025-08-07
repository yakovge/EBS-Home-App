/**
 * Integration tests for mobile app backend connectivity
 * Tests the connection between React Native mobile app and Flask backend API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api';
import { authService } from '../authService';

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage');
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock Device
jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osName: 'Test OS',
}));

describe('Mobile-Backend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('API Client Integration', () => {
    it('should successfully connect to Flask backend health check', async () => {
      // Mock successful health check response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', service: 'EBS Home API' }),
      });

      // Test health check endpoint
      const response = await apiClient.get('/health');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      
      expect(response).toEqual({
        status: 'healthy',
        service: 'EBS Home API',
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      await expect(apiClient.get('/test-error')).rejects.toThrow('Server error');
    });

    it('should include authorization headers when token is present', async () => {
      // Mock token in storage - need multiple calls since both isDemoMode and getAuthHeaders call getItem
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve('test-session-token');
        }
        return Promise.resolve(null);
      });

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiClient.get('/protected-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/protected-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-session-token',
          }),
        })
      );
    });
  });

  describe('Authentication Integration', () => {
    it('should format login request correctly for Flask backend', async () => {
      // Mock successful login response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
          },
          session_token: 'new-session-token',
        }),
      });

      const deviceInfo = {
        deviceId: 'test-device-123',
        deviceName: 'Test Device',
        platform: 'Test OS',
      };

      const result = await authService.login('firebase-auth-token', deviceInfo);

      // Verify the request format matches Flask backend expectations
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            token: 'firebase-auth-token',
            device_info: {
              device_id: 'test-device-123',
              device_name: 'Test Device',
              platform: 'Test OS',
            },
          }),
        })
      );

      expect(result).toEqual({
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
        },
        session_token: 'new-session-token',
      });
    });

    it('should handle authentication errors appropriately', async () => {
      // Mock 401 unauthorized response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      // Mock AsyncStorage for token removal
      mockedAsyncStorage.removeItem.mockResolvedValueOnce();

      await expect(
        authService.login('invalid-token', {
          deviceId: 'test-device',
          deviceName: 'Test Device', 
          platform: 'Test OS',
        })
      ).rejects.toThrow('Authentication required. Please log in again.');
    });

    it('should handle session verification correctly', async () => {
      // Mock AsyncStorage for the complex verifySession flow
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve('test-session-token');
        }
        return Promise.resolve(null);
      });
      mockedAsyncStorage.setItem.mockResolvedValue();

      // Mock successful verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
        }),
      });

      const result = await authService.verifySession('test-session-token');

      expect(result).toEqual({
        valid: true,
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      });

      // Should have called the verify endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/verify',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-session-token',
          }),
        })
      );
    });
  });

  describe('CRUD Operations Integration', () => {
    beforeEach(() => {
      // Mock auth token for all CRUD operations
      mockedAsyncStorage.getItem.mockResolvedValue('valid-session-token');
    });

    it('should create maintenance request with proper format', async () => {
      const maintenanceData = {
        description: 'Leaky faucet in kitchen',
        location: 'Kitchen',
        category: 'plumbing',
        priority: 'medium',
      };

      // Mock successful creation response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'maintenance123',
          ...maintenanceData,
          created_at: '2025-08-07T08:00:00Z',
          status: 'pending',
        }),
      });

      const result = await apiClient.post('/maintenance', maintenanceData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/maintenance',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(maintenanceData),
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-session-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toHaveProperty('id', 'maintenance123');
    });

    it('should fetch maintenance requests list', async () => {
      const mockMaintenanceList = [
        { id: '1', description: 'Fix door', status: 'pending' },
        { id: '2', description: 'Clean pool', status: 'in_progress' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMaintenanceList,
      });

      const result = await apiClient.get('/maintenance', { status: 'pending' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/maintenance?status=pending',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-session-token',
          }),
        })
      );

      expect(result).toEqual(mockMaintenanceList);
    });

    it('should create booking request', async () => {
      const bookingData = {
        start_date: '2025-08-15',
        end_date: '2025-08-20',
        notes: 'Family vacation',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'booking123',
          ...bookingData,
          user_id: 'user123',
          status: 'confirmed',
        }),
      });

      const result = await apiClient.post('/bookings', bookingData);

      expect(result).toHaveProperty('id', 'booking123');
      expect(result).toHaveProperty('status', 'confirmed');
    });
  });
});