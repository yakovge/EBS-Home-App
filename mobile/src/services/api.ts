/**
 * API client configuration and base methods for React Native.
 * Handles HTTP requests, authentication headers, and error handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../config';
import { performanceService } from './performanceService';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | FormData;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = Config.API_URL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('session_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async isDemoMode(): Promise<boolean> {
    const token = await AsyncStorage.getItem('session_token');
    return token === Config.DEMO_TOKEN;
  }

  private async getMockResponse<T>(endpoint: string, method: string): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const now = new Date().toISOString();
    
    // Return mock data based on endpoint
    if (endpoint.includes('/maintenance')) {
      if (method === 'POST') {
        return {
          id: 'demo_maintenance_' + Date.now(),
          title: 'Demo Maintenance Request',
          description: 'Created in demo mode',
          priority: 'medium',
          location: 'Living Room',
          status: 'pending',
          photos: [],
          created_at: now,
          updated_at: now
        } as T;
      } else {
        return [
          {
            id: 'demo_maintenance_1',
            title: 'Demo: Leaky Faucet',
            description: 'Kitchen faucet is dripping',
            priority: 'high',
            location: 'Kitchen',
            status: 'pending',
            photos: [],
            user_id: 'demo_user_123',
            created_at: now,
            updated_at: now
          },
          {
            id: 'demo_maintenance_2',
            title: 'Demo: Broken Light',
            description: 'Bathroom light not working',
            priority: 'medium', 
            location: 'Bathroom',
            status: 'pending',
            photos: [],
            user_id: 'demo_user_123',
            created_at: now,
            updated_at: now
          }
        ] as T;
      }
    } else if (endpoint.includes('/bookings')) {
      if (method === 'POST') {
        return {
          id: 'demo_booking_' + Date.now(),
          user_name: 'Demo User',
          guest_name: 'Demo User',
          start_date: now,
          end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
          notes: 'Created in demo mode',
          user_id: 'demo_user_123',
          created_at: now,
          updated_at: now
        } as T;
      } else {
        return [
          {
            id: 'demo_booking_1',
            user_name: 'Demo Family',
            guest_name: 'Demo Family',
            start_date: now,
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'confirmed',
            notes: 'Demo booking for testing',
            created_at: now,
            updated_at: now
          },
          {
            id: 'demo_booking_2', 
            user_name: 'Smith Family',
            guest_name: 'Smith Family',
            start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'confirmed',
            notes: 'Another demo booking',
            created_at: now,
            updated_at: now
          }
        ] as T;
      }
    } else if (endpoint.includes('/checklists')) {
      if (method === 'POST') {
        return {
          id: 'demo_checklist_' + Date.now(),
          status: 'completed',
          submitted_at: now,
          message: 'Demo checklist submitted successfully!'
        } as T;
      } else {
        return [
          {
            id: 'demo_checklist_1',
            userId: 'demo_user_123',
            userName: 'Demo User',
            bookingId: 'demo_booking_1',
            entries: [
              { 
                id: 'entry_1',
                checklistId: 'demo_checklist_1',
                photoType: 'refrigerator' as any,
                notes: 'Refrigerator cleaned and empty',
                photoUrl: 'https://demo-photo.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_2',
                checklistId: 'demo_checklist_1', 
                photoType: 'freezer' as any,
                notes: 'Freezer defrosted and cleaned',
                photoUrl: 'https://demo-photo2.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_3',
                checklistId: 'demo_checklist_1', 
                photoType: 'closet' as any,
                notes: 'All closets organized and clean',
                photoUrl: 'https://demo-photo3.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_4',
                checklistId: 'demo_checklist_1', 
                photoType: 'general' as any,
                notes: 'General house condition looks good',
                photoUrl: 'https://demo-photo4.jpg',
                createdAt: now,
                updatedAt: now
              }
            ],
            importantNotes: 'Everything looks good',
            isComplete: true,
            submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_checklist_2',
            userId: 'demo_user_123',
            userName: 'Demo User',
            bookingId: 'demo_booking_2',
            entries: [
              { 
                id: 'entry_5',
                checklistId: 'demo_checklist_2',
                photoType: 'refrigerator' as any,
                notes: 'Refrigerator still has some items',
                photoUrl: 'https://demo-photo5.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_6',
                checklistId: 'demo_checklist_2',
                photoType: 'freezer' as any,
                notes: 'Freezer needs attention',
                photoUrl: 'https://demo-photo6.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_7',
                checklistId: 'demo_checklist_2',
                photoType: 'closet' as any,
                notes: 'Closets partially organized',
                photoUrl: 'https://demo-photo7.jpg',
                createdAt: now,
                updatedAt: now
              },
              { 
                id: 'entry_8',
                checklistId: 'demo_checklist_2',
                photoType: 'general' as any,
                notes: 'General condition needs improvement',
                createdAt: now,
                updatedAt: now
              }
            ],
            importantNotes: '',
            isComplete: false,
            submittedAt: undefined,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_checklist_3',
            userId: 'demo_user_123',
            userName: 'Smith Family',
            bookingId: 'demo_booking_3',
            entries: [
              { 
                id: 'entry_9',
                checklistId: 'demo_checklist_3',
                photoType: 'refrigerator' as any,
                notes: 'Refrigerator perfectly clean and empty',
                photoUrl: 'https://demo-photo8.jpg',
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              { 
                id: 'entry_10',
                checklistId: 'demo_checklist_3',
                photoType: 'freezer' as any,
                notes: 'Freezer defrosted and spotless',
                photoUrl: 'https://demo-photo9.jpg',
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              { 
                id: 'entry_11',
                checklistId: 'demo_checklist_3',
                photoType: 'closet' as any,
                notes: 'All closets clean and organized',
                photoUrl: 'https://demo-photo10.jpg',
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              { 
                id: 'entry_12',
                checklistId: 'demo_checklist_3',
                photoType: 'general' as any,
                notes: 'House is in excellent condition',
                photoUrl: 'https://demo-photo11.jpg',
                createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            importantNotes: 'Perfect condition',
            isComplete: true,
            submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        ] as T;
      }
    } else if (endpoint.includes('/dashboard')) {
      return {
        summary: {
          active_bookings: 1,
          pending_maintenance: 1,
          completed_checklists: 3
        },
        recent_activity: [
          {
            id: 'activity_1',
            type: 'maintenance',
            description: 'New maintenance request: Demo Leaky Faucet',
            timestamp: now
          }
        ]
      } as T;
    }
    
    // Default response
    return { success: true, message: 'Demo mode - no real data', timestamp: now } as T;
  }

  private async request<T>(
    endpoint: string, 
    config: RequestConfig
  ): Promise<T> {
    // Check if we're in demo mode
    const isDemo = await this.isDemoMode();
    
    if (isDemo) {
      // Return mock data for demo mode
      return this.getMockResponse<T>(endpoint, config.method);
    }
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth headers
    const authHeaders = await this.getAuthHeaders();
    
    // Merge headers
    const headers = {
      ...authHeaders,
      ...config.headers,
    };

    // Don't set Content-Type for FormData (let browser set boundary)
    if (!(config.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Track network performance
    const startTime = performance.now();
    let responseSize = 0;
    
    try {
      const response = await fetch(url, {
        ...config,
        headers,
      });

      // Calculate response size (approximate)
      const contentLength = response.headers?.get('content-length');
      if (contentLength) {
        responseSize = parseInt(contentLength, 10);
      }

      // Track network request
      const duration = performance.now() - startTime;
      performanceService.trackNetworkRequest({
        url: endpoint,
        method: config.method || 'GET',
        duration,
        size: responseSize,
        status: response.status,
        cacheHit: response.headers?.get('x-cache') === 'HIT',
      });

      // Handle authentication errors
      if (response.status === 401) {
        await AsyncStorage.removeItem('session_token');
        throw new Error('Authentication required. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(errorData.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(
    endpoint: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    // Note: React Native doesn't support upload progress tracking with fetch
    // For now, we'll call onProgress with 100% when complete
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) {
      onProgress(100);
    }

    return result;
  }
}

export const apiClient = new ApiClient();