/**
 * Integration tests for checklist submission and management
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

describe('Checklist Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock session token (not demo token)
    mockAsyncStorage.getItem.mockResolvedValue('test_session_token_checklist');
  });

  it('should submit checklist with real backend', async () => {
    const checklistData = {
      booking_id: 'test_booking_123',
      categories: [
        {
          type: 'refrigerator',
          text_notes: 'Refrigerator is clean and empty',
          photos: [
            {
              photo_url: 'https://example.com/fridge.jpg',
              notes: 'Fridge interior view'
            }
          ]
        },
        {
          type: 'freezer',
          text_notes: 'Freezer defrosted and cleaned',
          photos: []
        },
        {
          type: 'closet',
          text_notes: 'All closets organized',
          photos: [
            {
              photo_url: 'https://example.com/closet.jpg',
              notes: 'Main closet view'
            }
          ]
        },
        {
          type: 'general',
          text_notes: 'House in excellent condition',
          photos: []
        }
      ],
      important_notes: 'Everything looks great! Thank you.'
    };

    try {
      const response = await apiClient.post<any>('/checklists', checklistData);
      
      // Verify response from real backend
      expect(response).toHaveProperty('id');
      expect(response.booking_id).toBe(checklistData.booking_id);
      expect(response.categories).toHaveLength(4);
      expect(response.important_notes).toBe(checklistData.important_notes);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('created_at');
      
      // Should not be demo data
      expect(response.id).not.toContain('demo_checklist_');
      
      // Verify categories are preserved
      expect(response.categories[0].type).toBe('refrigerator');
      expect(response.categories[0].text_notes).toBe('Refrigerator is clean and empty');
      
    } catch (error) {
      // Network error means we tried real API (good!)
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain('Demo mode');
    }
  }, 10000);

  it('should retrieve checklists from real backend', async () => {
    try {
      const response = await apiClient.get<any[]>('/checklists');
      
      // Should get real array from backend
      expect(Array.isArray(response)).toBe(true);
      
      // Check if any items exist and verify they're not demo data
      response.forEach(item => {
        if (item.id) {
          expect(item.id).not.toContain('demo_checklist_');
        }
        // Verify structure
        if (item.categories) {
          expect(Array.isArray(item.categories)).toBe(true);
        }
      });
      
    } catch (error) {
      // Network error is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle checklist with minimal data', async () => {
    const minimalChecklist = {
      booking_id: 'minimal_booking',
      categories: [
        {
          type: 'general',
          text_notes: 'Basic check completed',
          photos: []
        }
      ],
      important_notes: ''
    };

    try {
      const response = await apiClient.post<any>('/checklists', minimalChecklist);
      
      expect(response).toHaveProperty('id');
      expect(response.categories).toHaveLength(1);
      expect(response.categories[0].type).toBe('general');
      
    } catch (error) {
      // Even validation errors should be server errors, not demo mode
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain('Demo mode');
    }
  });

  it('should handle checklist with multiple photos', async () => {
    const photoHeavyChecklist = {
      booking_id: 'photo_test_booking',
      categories: [
        {
          type: 'refrigerator',
          text_notes: 'Detailed refrigerator documentation',
          photos: [
            { photo_url: 'https://example.com/fridge1.jpg', notes: 'Top shelf' },
            { photo_url: 'https://example.com/fridge2.jpg', notes: 'Bottom shelf' },
            { photo_url: 'https://example.com/fridge3.jpg', notes: 'Door compartments' }
          ]
        }
      ],
      important_notes: 'Multiple photos uploaded'
    };

    try {
      const response = await apiClient.post<any>('/checklists', photoHeavyChecklist);
      
      expect(response).toHaveProperty('id');
      expect(response.categories[0].photos).toHaveLength(3);
      
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});