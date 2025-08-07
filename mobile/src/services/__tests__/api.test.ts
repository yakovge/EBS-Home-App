/**
 * Tests for API client
 * Covers HTTP methods, authentication, and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();
  });

  describe('GET requests', () => {
    it('should make GET request with auth headers', async () => {
      const mockResponse = { data: 'test' };
      // Mock multiple AsyncStorage calls - isDemoMode() and getAuthHeaders() both call getItem
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve('test-token');
        }
        return Promise.resolve(null);
      });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: { get: () => 'application/json' },
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should make GET request without auth token', async () => {
      const mockResponse = { data: 'test' };
      // Mock AsyncStorage to return null (no token)
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: { get: () => 'application/json' },
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST requests', () => {
    it('should make POST request with JSON body', async () => {
      const mockResponse = { success: true };
      const postData = { name: 'test', value: 123 };
      
      // Mock multiple AsyncStorage calls - isDemoMode() and getAuthHeaders() both call getItem
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve('test-token');
        }
        return Promise.resolve(null);
      });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: { get: () => 'application/json' },
      });

      const result = await apiClient.post('/test', postData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(postData),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-ok responses', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('test-token');
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'HTTP 404: Not Found' }),
        headers: { get: () => 'application/json' },
      });

      await expect(apiClient.get('/nonexistent')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('test-token');
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('test-token');
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Invalid response'),
        headers: { get: () => 'application/json' },
      });

      await expect(apiClient.get('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Upload functionality', () => {
    it('should upload files with FormData', async () => {
      const mockResponse = { photo_url: 'https://example.com/photo.jpg' };
      const mockFormData = new FormData();
      mockFormData.append('file', 'test-file' as any);

      // Mock multiple AsyncStorage calls - isDemoMode() and getAuthHeaders() both call getItem
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'session_token') {
          return Promise.resolve('test-token');
        }
        return Promise.resolve(null);
      });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: { get: () => 'application/json' },
      });

      const mockProgressCallback = jest.fn();
      const result = await apiClient.upload('/upload', mockFormData, mockProgressCallback);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
          body: mockFormData,
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });
});