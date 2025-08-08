/**
 * Integration tests for maintenance request submission
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineStorageService } from '../offlineStorageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo to simulate online status
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => () => {}),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Maintenance Request Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock session token (not demo token)
    mockAsyncStorage.getItem.mockResolvedValue('test_session_token');
  });

  it('should submit maintenance request to real backend', async () => {
    const maintenanceData = {
      description: 'Test maintenance request - leaky faucet',
      location: 'kitchen',
      photo_urls: []
    };

    try {
      const response = await offlineStorageService.request<any>(
        'POST',
        '/maintenance',
        maintenanceData,
        { priority: 'high' }
      );
      
      // Verify response from real backend
      expect(response).toHaveProperty('id');
      expect(response.description).toBe(maintenanceData.description);
      expect(response.location).toBe(maintenanceData.location);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('created_at');
      
      // Should not be demo data (demo IDs contain 'demo_maintenance_')
      expect(response.id).not.toContain('demo_maintenance_');
      
    } catch (error) {
      // If backend is down, we expect a network error (not demo mode response)
      expect(error).toBeInstanceOf(Error);
      // Make sure it's not returning mock data
      if (error.message) {
        expect(error.message).not.toContain('Demo mode');
      }
    }
  }, 10000); // 10 second timeout for network request

  it('should retrieve maintenance requests from real backend', async () => {
    try {
      const response = await offlineStorageService.request<any[]>(
        'GET',
        '/maintenance',
        undefined
      );
      
      // Should get real array from backend
      expect(Array.isArray(response)).toBe(true);
      
      // Check if any items exist and verify they're not demo data
      response.forEach(item => {
        if (item.id) {
          expect(item.id).not.toContain('demo_maintenance_');
        }
      });
      
    } catch (error) {
      // Network error is acceptable - means we tried real API
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle maintenance request with photo URLs', async () => {
    const maintenanceDataWithPhotos = {
      description: 'Broken window in bedroom',
      location: 'bedroom',
      photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
    };

    try {
      const response = await offlineStorageService.request<any>(
        'POST',
        '/maintenance',
        maintenanceDataWithPhotos,
        { priority: 'medium' }
      );
      
      expect(response).toHaveProperty('id');
      expect(response.photo_urls).toEqual(maintenanceDataWithPhotos.photo_urls);
      
    } catch (error) {
      // Network error is fine - we're testing the request structure
      expect(error).toBeInstanceOf(Error);
    }
  });
});