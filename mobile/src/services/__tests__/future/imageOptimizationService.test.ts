/**
 * Tests for image optimization service
 */

import { imageOptimizationService } from '../imageOptimizationService';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('expo-image-manipulator');
jest.mock('expo-file-system');
jest.mock('expo-image-picker');

const mockImageManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('ImageOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Resizing', () => {
    it('should resize image to target dimensions', async () => {
      const originalUri = 'file://path/to/original.jpg';
      const resizedUri = 'file://path/to/resized.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: resizedUri,
        width: 800,
        height: 600,
      });

      const result = await imageOptimizationService.resizeImage(originalUri, {
        width: 800,
        height: 600,
      });

      expect(result.uri).toBe(resizedUri);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [{ resize: { width: 800, height: 600 } }],
        expect.objectContaining({
          compress: expect.any(Number),
          format: ImageManipulator.SaveFormat.JPEG,
        })
      );
    });

    it('should maintain aspect ratio when only width is provided', async () => {
      const originalUri = 'file://path/to/original.jpg';
      const resizedUri = 'file://path/to/resized.jpg';

      // Mock getting original dimensions
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024000,
        uri: originalUri,
        modificationTime: Date.now(),
        isDirectory: false,
      });

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: resizedUri,
        width: 800,
        height: 600, // Calculated to maintain aspect ratio
      });

      const result = await imageOptimizationService.resizeImage(originalUri, {
        width: 800,
      });

      expect(result.uri).toBe(resizedUri);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [{ resize: { width: 800 } }],
        expect.any(Object)
      );
    });

    it('should handle resize failures gracefully', async () => {
      const originalUri = 'file://path/to/original.jpg';

      mockImageManipulator.manipulateAsync.mockRejectedValue(
        new Error('Image manipulation failed')
      );

      await expect(
        imageOptimizationService.resizeImage(originalUri, { width: 800 })
      ).rejects.toThrow('Image manipulation failed');
    });
  });

  describe('Image Compression', () => {
    it('should compress image with specified quality', async () => {
      const originalUri = 'file://path/to/original.jpg';
      const compressedUri = 'file://path/to/compressed.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: compressedUri,
        width: 1920,
        height: 1080,
      });

      const result = await imageOptimizationService.compressImage(originalUri, 0.8);

      expect(result.uri).toBe(compressedUri);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [],
        expect.objectContaining({
          compress: 0.8,
        })
      );
    });

    it('should use default compression quality when not specified', async () => {
      const originalUri = 'file://path/to/original.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      });

      await imageOptimizationService.compressImage(originalUri);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [],
        expect.objectContaining({
          compress: 0.7, // Default compression quality
        })
      );
    });

    it('should validate compression quality range', async () => {
      const originalUri = 'file://path/to/original.jpg';

      // Quality less than 0 should throw error
      await expect(
        imageOptimizationService.compressImage(originalUri, -0.1)
      ).rejects.toThrow('Compression quality must be between 0 and 1');

      // Quality greater than 1 should throw error
      await expect(
        imageOptimizationService.compressImage(originalUri, 1.1)
      ).rejects.toThrow('Compression quality must be between 0 and 1');
    });
  });

  describe('Image Format Conversion', () => {
    it('should convert image to JPEG format', async () => {
      const originalUri = 'file://path/to/original.png';
      const convertedUri = 'file://path/to/converted.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: convertedUri,
        width: 1920,
        height: 1080,
      });

      const result = await imageOptimizationService.convertFormat(
        originalUri,
        ImageManipulator.SaveFormat.JPEG
      );

      expect(result.uri).toBe(convertedUri);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [],
        expect.objectContaining({
          format: ImageManipulator.SaveFormat.JPEG,
        })
      );
    });

    it('should convert image to PNG format', async () => {
      const originalUri = 'file://path/to/original.jpg';
      const convertedUri = 'file://path/to/converted.png';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: convertedUri,
        width: 1920,
        height: 1080,
      });

      const result = await imageOptimizationService.convertFormat(
        originalUri,
        ImageManipulator.SaveFormat.PNG
      );

      expect(result.uri).toBe(convertedUri);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [],
        expect.objectContaining({
          format: ImageManipulator.SaveFormat.PNG,
        })
      );
    });

    it('should convert image to WebP format when supported', async () => {
      const originalUri = 'file://path/to/original.jpg';
      const convertedUri = 'file://path/to/converted.webp';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: convertedUri,
        width: 1920,
        height: 1080,
      });

      const result = await imageOptimizationService.convertFormat(
        originalUri,
        ImageManipulator.SaveFormat.WEBP
      );

      expect(result.uri).toBe(convertedUri);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple images in batch', async () => {
      const imageUris = [
        'file://image1.jpg',
        'file://image2.jpg',
        'file://image3.jpg',
      ];

      const processedUris = [
        'file://processed1.jpg',
        'file://processed2.jpg',
        'file://processed3.jpg',
      ];

      mockImageManipulator.manipulateAsync
        .mockResolvedValueOnce({
          uri: processedUris[0],
          width: 800,
          height: 600,
        })
        .mockResolvedValueOnce({
          uri: processedUris[1],
          width: 800,
          height: 600,
        })
        .mockResolvedValueOnce({
          uri: processedUris[2],
          width: 800,
          height: 600,
        });

      const results = await imageOptimizationService.batchProcess(imageUris, {
        resize: { width: 800, height: 600 },
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      expect(results).toHaveLength(3);
      expect(results.map(r => r.uri)).toEqual(processedUris);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch processing', async () => {
      const imageUris = [
        'file://image1.jpg',
        'file://image2.jpg', // This will fail
        'file://image3.jpg',
      ];

      mockImageManipulator.manipulateAsync
        .mockResolvedValueOnce({
          uri: 'file://processed1.jpg',
          width: 800,
          height: 600,
        })
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({
          uri: 'file://processed3.jpg',
          width: 800,
          height: 600,
        });

      const results = await imageOptimizationService.batchProcess(imageUris, {
        resize: { width: 800 },
      });

      // Should return successful results and null for failed ones
      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull(); // Failed processing
      expect(results[2]).not.toBeNull();
    });

    it('should provide progress callback for batch processing', async () => {
      const imageUris = ['file://image1.jpg', 'file://image2.jpg'];
      const progressCallback = jest.fn();

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://processed.jpg',
        width: 800,
        height: 600,
      });

      await imageOptimizationService.batchProcess(
        imageUris,
        { resize: { width: 800 } },
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(0, 2); // Started
      expect(progressCallback).toHaveBeenCalledWith(1, 2); // First completed
      expect(progressCallback).toHaveBeenCalledWith(2, 2); // All completed
    });
  });

  describe('Image Analysis', () => {
    it('should analyze image properties', async () => {
      const imageUri = 'file://path/to/image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 2048000, // 2MB
        uri: imageUri,
        modificationTime: Date.now(),
        isDirectory: false,
      });

      // Mock getting image dimensions
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: imageUri,
        width: 1920,
        height: 1080,
      });

      const analysis = await imageOptimizationService.analyzeImage(imageUri);

      expect(analysis).toEqual({
        uri: imageUri,
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        aspectRatio: 1920 / 1080,
        megapixels: (1920 * 1080) / 1000000,
        format: 'jpg',
        needsOptimization: true, // Based on file size > 1MB
      });
    });

    it('should detect if image needs optimization', async () => {
      const largeImageUri = 'file://large-image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 5000000, // 5MB - needs optimization
        uri: largeImageUri,
        modificationTime: Date.now(),
        isDirectory: false,
      });

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: largeImageUri,
        width: 4000,
        height: 3000,
      });

      const analysis = await imageOptimizationService.analyzeImage(largeImageUri);

      expect(analysis.needsOptimization).toBe(true);
    });

    it('should calculate optimal dimensions for target size', () => {
      const currentDimensions = { width: 4000, height: 3000 };
      const targetFileSize = 500000; // 500KB
      const currentFileSize = 2000000; // 2MB

      const optimal = imageOptimizationService.calculateOptimalDimensions(
        currentDimensions,
        targetFileSize,
        currentFileSize
      );

      // Should reduce dimensions to achieve target file size
      expect(optimal.width).toBeLessThan(currentDimensions.width);
      expect(optimal.height).toBeLessThan(currentDimensions.height);
      expect(optimal.width / optimal.height).toBeCloseTo(currentDimensions.width / currentDimensions.height);
    });
  });

  describe('Smart Optimization', () => {
    it('should automatically optimize image for upload', async () => {
      const originalUri = 'file://large-image.jpg';
      const optimizedUri = 'file://optimized.jpg';

      // Mock large image
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 3000000, // 3MB
        uri: originalUri,
        modificationTime: Date.now(),
        isDirectory: false,
      });

      // Mock getting dimensions
      mockImageManipulator.manipulateAsync
        .mockResolvedValueOnce({
          uri: originalUri,
          width: 3000,
          height: 2000,
        })
        .mockResolvedValueOnce({
          uri: optimizedUri,
          width: 1500,
          height: 1000,
        });

      const result = await imageOptimizationService.optimizeForUpload(originalUri);

      expect(result.uri).toBe(optimizedUri);
      expect(result.width).toBeLessThan(3000);
      expect(result.height).toBeLessThan(2000);
    });

    it('should skip optimization for already optimized images', async () => {
      const smallImageUri = 'file://small-image.jpg';

      // Mock small, already optimized image
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 200000, // 200KB - already optimized
        uri: smallImageUri,
        modificationTime: Date.now(),
        isDirectory: false,
      });

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: smallImageUri,
        width: 800,
        height: 600,
      });

      const result = await imageOptimizationService.optimizeForUpload(smallImageUri);

      // Should return original image without processing
      expect(result.uri).toBe(smallImageUri);
    });

    it('should optimize image for thumbnail generation', async () => {
      const originalUri = 'file://photo.jpg';
      const thumbnailUri = 'file://thumbnail.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: thumbnailUri,
        width: 150,
        height: 150,
      });

      const result = await imageOptimizationService.generateThumbnail(originalUri);

      expect(result.uri).toBe(thumbnailUri);
      expect(result.width).toBe(150);
      expect(result.height).toBe(150);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        originalUri,
        [{ resize: { width: 150, height: 150 } }],
        expect.objectContaining({
          compress: expect.any(Number),
          format: ImageManipulator.SaveFormat.JPEG,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image URIs', async () => {
      const invalidUri = 'invalid://not-an-image';

      mockImageManipulator.manipulateAsync.mockRejectedValue(
        new Error('Invalid image URI')
      );

      await expect(
        imageOptimizationService.resizeImage(invalidUri, { width: 800 })
      ).rejects.toThrow('Invalid image URI');
    });

    it('should handle file system errors gracefully', async () => {
      const imageUri = 'file://missing-image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: imageUri,
        modificationTime: 0,
        isDirectory: false,
        size: 0,
      });

      await expect(
        imageOptimizationService.analyzeImage(imageUri)
      ).rejects.toThrow('Image file does not exist');
    });

    it('should handle memory issues during processing', async () => {
      const largeImageUri = 'file://huge-image.jpg';

      mockImageManipulator.manipulateAsync.mockRejectedValue(
        new Error('Out of memory')
      );

      await expect(
        imageOptimizationService.resizeImage(largeImageUri, { width: 800 })
      ).rejects.toThrow('Out of memory');
    });
  });

  describe('Performance', () => {
    it('should process images efficiently', async () => {
      const imageUri = 'file://test-image.jpg';
      const startTime = Date.now();

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://processed.jpg',
        width: 800,
        height: 600,
      });

      await imageOptimizationService.resizeImage(imageUri, { width: 800 });

      const processingTime = Date.now() - startTime;

      // Should complete within reasonable time (less than 1 second for mock)
      expect(processingTime).toBeLessThan(1000);
    });

    it('should handle concurrent processing requests', async () => {
      const imageUris = Array.from({ length: 5 }, (_, i) => `file://image${i}.jpg`);

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://processed.jpg',
        width: 800,
        height: 600,
      });

      const promises = imageUris.map(uri =>
        imageOptimizationService.resizeImage(uri, { width: 800 })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.uri).toBe('file://processed.jpg');
      });
    });
  });
});