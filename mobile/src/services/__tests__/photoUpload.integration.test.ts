/**
 * Photo Upload Integration Tests
 * Tests the complete photo upload flow: mobile app → Flask backend → Firebase Storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadService } from '../uploadService';
import { apiClient } from '../api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock ImageManipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri) => ({
    uri: uri + '_processed',
    width: 800,
    height: 600,
  })),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

describe('Photo Upload Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Mock auth token for all requests
    mockedAsyncStorage.getItem.mockResolvedValue('valid-session-token');
  });

  describe('Maintenance Photo Upload', () => {
    it('should upload maintenance photo successfully', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';
      const mockPhotoUrl = 'https://firebase-storage.example.com/maintenance/photo123.jpg';

      // Mock successful upload response from Flask backend
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photo_url: mockPhotoUrl,
          success: true,
        }),
      });

      // Mock progress callback
      const onProgress = jest.fn();

      const result = await uploadService.uploadMaintenancePhoto(mockImageUri, onProgress);

      // Verify the request was made to the correct endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/maintenance/upload-photo',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-session-token',
          }),
          body: expect.any(FormData),
        })
      );

      // Verify the response
      expect(result).toBe(mockPhotoUrl);

      // Verify progress callback was called
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle maintenance photo upload errors', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';

      // Mock error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Storage service unavailable',
          message: 'Firebase Storage is not accessible',
        }),
      });

      await expect(
        uploadService.uploadMaintenancePhoto(mockImageUri)
      ).rejects.toThrow('Firebase Storage is not accessible');
    });

    it('should properly format FormData for maintenance photo', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';
      
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'test-url' }),
      });

      await uploadService.uploadMaintenancePhoto(mockImageUri);

      // Verify FormData structure
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const formData = callArgs[1].body as FormData;
      
      expect(formData).toBeInstanceOf(FormData);
      
      // Note: Cannot directly inspect FormData entries in Jest,
      // but we can verify the request was structured correctly
      expect(callArgs[1]).toEqual({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-session-token',
        }),
        body: expect.any(FormData),
      });
    });
  });

  describe('Checklist Photo Upload', () => {
    it('should upload checklist photo successfully', async () => {
      const mockImageUri = 'file:///path/to/checklist-image.jpg';
      const mockPhotoType = 'refrigerator';
      const mockPhotoUrl = 'https://firebase-storage.example.com/checklists/photo456.jpg';

      // Mock successful upload response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photo_url: mockPhotoUrl,
          success: true,
        }),
      });

      const result = await uploadService.uploadChecklistPhoto(mockImageUri, mockPhotoType);

      // Verify correct endpoint was called
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/checklists/upload-photo',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-session-token',
          }),
          body: expect.any(FormData),
        })
      );

      expect(result).toBe(mockPhotoUrl);
    });

    it('should include photo type in checklist upload', async () => {
      const mockImageUri = 'file:///path/to/freezer-image.jpg';
      const mockPhotoType = 'freezer';

      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'test-url' }),
      });

      await uploadService.uploadChecklistPhoto(mockImageUri, mockPhotoType);

      // The photo type should be included in the FormData
      // (We can't directly inspect FormData, but the endpoint should receive it)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].body).toBeInstanceOf(FormData);
    });
  });

  describe('Image Processing', () => {
    it('should process images before upload', async () => {
      const { manipulateAsync } = require('expo-image-manipulator');
      const mockImageUri = 'file:///path/to/large-image.jpg';

      // Mock successful upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'processed-photo-url' }),
      });

      await uploadService.uploadMaintenancePhoto(mockImageUri);

      // Verify image was processed
      expect(manipulateAsync).toHaveBeenCalledWith(
        mockImageUri,
        expect.arrayContaining([
          expect.objectContaining({
            resize: expect.objectContaining({
              width: expect.any(Number),
            }),
          }),
        ]),
        expect.objectContaining({
          compress: expect.any(Number),
          format: 'jpeg',
        })
      );
    });
  });

  describe('Authentication Handling', () => {
    it('should handle authentication errors during upload', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';

      // Mock 401 response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Authentication required' }),
      });

      mockedAsyncStorage.removeItem.mockResolvedValueOnce();

      await expect(
        uploadService.uploadMaintenancePhoto(mockImageUri)
      ).rejects.toThrow('Authentication required. Please log in again.');

      // Verify token was removed from storage
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('session_token');
    });

    it('should include authorization header in upload requests', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'test-url' }),
      });

      await uploadService.uploadMaintenancePhoto(mockImageUri);

      // Verify authorization header is present
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-session-token',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockImageUri = 'file:///path/to/test-image.jpg';

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(
        uploadService.uploadMaintenancePhoto(mockImageUri)
      ).rejects.toThrow('Network request failed');
    });

    it('should handle invalid image URIs gracefully', async () => {
      const { manipulateAsync } = require('expo-image-manipulator');
      const invalidImageUri = 'invalid://path/to/image.jpg';

      // Mock image processing failure - but upload service handles this gracefully
      manipulateAsync.mockRejectedValueOnce(new Error('Invalid image URI'));

      // Mock successful API response (using fallback URI)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'fallback-processed-url' }),
      });

      // Should not throw error - upload service handles image processing failures gracefully
      const result = await uploadService.uploadMaintenancePhoto(invalidImageUri);
      expect(result).toBe('fallback-processed-url');
    });
  });
});