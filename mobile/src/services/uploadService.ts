/**
 * Upload service for handling file uploads in React Native.
 * Manages photo uploads for maintenance requests and checklists using native APIs.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiClient } from './api';

interface ImagePickerResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
}

class UploadService {
  async uploadMaintenancePhoto(
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Validate and compress image first
      const processedImage = await this.processImage(imageUri);
      
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Add the image file
      formData.append('photo', {
        uri: processedImage.uri,
        type: 'image/jpeg',
        name: `maintenance_${Date.now()}.jpg`,
      } as any);
      
      // Call the backend API using our apiClient
      return await apiClient.upload<{ photo_url: string }>('/maintenance/upload-photo', formData, onProgress)
        .then(response => response.photo_url);
    } catch (error) {
      console.error('Maintenance photo upload failed:', error);
      throw error;
    }
  }

  async uploadChecklistPhoto(
    imageUri: string,
    photoType: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    console.log('Uploading checklist photo. Type:', photoType);
    
    try {
      // Check session token
      const sessionToken = await AsyncStorage.getItem('session_token');
      
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in to upload photos.');
      }
      
      if (sessionToken.length < 10) {  // Basic validation
        throw new Error('Invalid authentication token. Please log in again.');
      }
      
      // Validate and compress image
      const processedImage = await this.processImage(imageUri);
      
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Add the image file
      formData.append('photo', {
        uri: processedImage.uri,
        type: 'image/jpeg',
        name: `checklist_${photoType}_${Date.now()}.jpg`,
      } as any);
      
      formData.append('photo_type', photoType);
      
      // Call the backend API
      const result = await apiClient.upload<{ photo_url: string }>('/checklists/upload-photo', formData, onProgress);
      
      console.log('Photo uploaded successfully:', result.photo_url);
      return result.photo_url;
    } catch (error) {
      console.error('Checklist photo upload failed:', error.message);
      throw error;
    }
  }

  async uploadProfilePhoto(
    imageUri: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Process image
      const processedImage = await this.processImage(imageUri);
      
      // Create form data
      const formData = new FormData();
      formData.append('photo', {
        uri: processedImage.uri,
        type: 'image/jpeg',
        name: `profile_${userId}_${Date.now()}.jpg`,
      } as any);
      
      // Call backend API (assuming endpoint exists)
      return await apiClient.upload<{ photo_url: string }>('/users/upload-photo', formData, onProgress)
        .then(response => response.photo_url);
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      throw error;
    }
  }

  async processImage(
    imageUri: string, 
    maxWidth: number = 1920,
    quality: number = 0.8
  ): Promise<ImageManipulator.ImageResult> {
    try {
      // Get image info first
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize if too large
          { resize: { width: maxWidth } }
        ],
        { 
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      console.log('Image processed:', {
        originalUri: imageUri,
        processedUri: result.uri,
        width: result.width,
        height: result.height
      });

      return result;
    } catch (error) {
      console.error('Image processing failed:', error);
      // Return original if processing fails
      return {
        uri: imageUri,
        width: 0,
        height: 0
      };
    }
  }

  validateImageUri(uri: string): { valid: boolean; error?: string } {
    if (!uri || uri.trim().length === 0) {
      return { valid: false, error: 'No image selected' };
    }

    // Basic URI validation
    if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('assets-library://')) {
      return { valid: false, error: 'Invalid image format' };
    }

    return { valid: true };
  }
}

export const uploadService = new UploadService();