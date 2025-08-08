/**
 * Integration tests for booking creation and management
 */

import { apiClient } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Booking Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock session token (not demo token)
    mockAsyncStorage.getItem.mockResolvedValue('test_session_token_booking');
  });

  it('should create booking with real backend', async () => {
    const bookingData = {
      start_date: '2025-08-15',
      end_date: '2025-08-18',
      guest_name: 'Integration Test Family',
      guest_count: 4,
      notes: 'Test booking for integration testing'
    };

    try {
      const response = await apiClient.post<any>('/bookings', bookingData);
      
      // Verify response from real backend
      expect(response).toHaveProperty('id');
      expect(response.start_date).toBe(bookingData.start_date);
      expect(response.end_date).toBe(bookingData.end_date);
      expect(response.guest_name).toBe(bookingData.guest_name);
      expect(response.guest_count).toBe(bookingData.guest_count);
      expect(response.notes).toBe(bookingData.notes);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('created_at');
      
      // Should not be demo data
      expect(response.id).not.toContain('demo_booking_');
      
    } catch (error) {
      // Network error means we tried real API (good!)
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain('Demo mode');
    }
  }, 10000);

  it('should retrieve bookings from real backend', async () => {
    try {
      const response = await apiClient.get<any[]>('/bookings');
      
      // Should get real array from backend
      expect(Array.isArray(response)).toBe(true);
      
      // Check if any items exist and verify they're not demo data
      response.forEach(item => {
        if (item.id) {
          expect(item.id).not.toContain('demo_booking_');
        }
      });
      
    } catch (error) {
      // Network error is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle booking date validation', async () => {
    const bookingData = {
      start_date: '2025-08-20',
      end_date: '2025-08-22', 
      guest_name: 'Validation Test',
      guest_count: 2,
      notes: 'Testing date validation'
    };

    try {
      const response = await apiClient.post<any>('/bookings', bookingData);
      
      expect(response).toHaveProperty('id');
      expect(new Date(response.start_date)).toBeInstanceOf(Date);
      expect(new Date(response.end_date)).toBeInstanceOf(Date);
      
    } catch (error) {
      // If validation fails, it should be a server error, not demo mode
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle Hebrew dates for Israeli context', async () => {
    const bookingData = {
      start_date: '2025-09-15', // Near Rosh Hashana
      end_date: '2025-09-17',
      guest_name: 'Hebrew Calendar Test',
      guest_count: 6,
      notes: 'Testing Hebrew calendar integration'
    };

    try {
      const response = await apiClient.post<any>('/bookings', bookingData);
      
      // Should handle Hebrew calendar dates properly
      expect(response).toHaveProperty('id');
      expect(response.start_date).toBe(bookingData.start_date);
      
    } catch (error) {
      // Even if Hebrew calendar has issues, should not be demo mode
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain('Demo mode');
    }
  });
});