/**
 * WebSocket service for real-time notifications in React Native.
 * Connects to the backend WebSocket server for live updates.
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../config';

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface ConnectionStats {
  total_users: number;
  total_sessions: number;
  users_with_multiple_sessions: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize WebSocket connection
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      console.log('Initializing WebSocket connection for user:', userId);
      
      this.userId = userId;
      
      // Get authentication token
      const token = await AsyncStorage.getItem('session_token');
      if (!token) {
        console.error('No authentication token found');
        return false;
      }

      // Create socket connection with authentication
      const socketUrl = Config.API_URL.replace('/api', ''); // Remove /api suffix for socket connection
      
      this.socket = io(socketUrl, {
        auth: {
          user_id: userId,
          token: token
        },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('WebSocket connection timeout');
          resolve(false);
        }, 10000);

        this.socket?.on('connected', (data) => {
          console.log('WebSocket connected successfully:', data);
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.socket?.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          clearTimeout(timeout);
          resolve(false);
        });
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      return false;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Real-time notification events
    this.socket.on('maintenance_notification', (data: RealtimeNotification) => {
      console.log('Received maintenance notification:', data);
      this.emit('maintenance_notification', data);
    });

    this.socket.on('booking_confirmation', (data: RealtimeNotification) => {
      console.log('Received booking confirmation:', data);
      this.emit('booking_confirmation', data);
    });

    this.socket.on('exit_reminder', (data: RealtimeNotification) => {
      console.log('Received exit reminder:', data);
      this.emit('exit_reminder', data);
    });

    this.socket.on('test_notification', (data: RealtimeNotification) => {
      console.log('Received test notification:', data);
      this.emit('test_notification', data);
    });

    // Keep-alive
    this.socket.on('pong', (data) => {
      console.log('Received pong:', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.userId) {
          this.initialize(this.userId);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
    }
  }

  /**
   * Send ping to server for keepalive
   */
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Join specific notification channels
   */
  joinChannels(channels: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('join_notifications', { channels });
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send test notification request to backend
   */
  async sendTestNotification(message: string = 'Test from mobile app'): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (!token || !this.userId) {
        return false;
      }

      // Send via HTTP API since this is an admin action
      const response = await fetch(`${Config.API_URL}/realtime/broadcast/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_type: 'user',
          target_id: this.userId,
          title: 'Test Notification',
          message: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Check connection status
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<ConnectionStats | null> {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (!token) {
        return null;
      }

      const response = await fetch(`${Config.API_URL}/realtime/connections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.statistics;
      }
    } catch (error) {
      console.error('Error getting connection stats:', error);
    }
    return null;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    console.log('Disconnecting WebSocket');
    this.isConnected = false;
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.disconnect();
    this.userId = null;
    this.reconnectAttempts = 0;
  }
}

export const webSocketService = new WebSocketService();