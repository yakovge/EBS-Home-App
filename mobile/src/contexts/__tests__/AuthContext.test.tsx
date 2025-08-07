/**
 * Tests for AuthContext
 * Simplified tests that focus on core authentication logic
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuthContext } from '../AuthContext';

// Mock the auth service
jest.mock('../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    verifySession: jest.fn(),
    getDeviceInfo: jest.fn().mockResolvedValue({
      deviceId: 'test-device',
      deviceName: 'Test Device',
      platform: 'Test OS',
    }),
  },
}));

// Mock Device
jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osName: 'Test OS',
}));

const TestComponent: React.FC = () => {
  const { user, loading, login, logout } = useAuthContext();

  const handleLogin = async () => {
    try {
      await login('test-token');
    } catch (error) {
      // Expected in failure tests
    }
  };

  return (
    <>
      <Text testID="loading">{loading ? 'loading' : 'not-loading'}</Text>
      <Text testID="user">{user ? user.name : 'no-user'}</Text>
      <TouchableOpacity testID="login-button" onPress={handleLogin}>
        <Text>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="logout-button" onPress={logout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
  });

  it('initializes with loading state', () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should show loading
    expect(getByTestId('loading')).toHaveTextContent('loading');
  });

  it('handles basic auth state correctly', async () => {
    const { authService } = require('../../services/authService');
    
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    authService.verifySession.mockResolvedValueOnce({ valid: false });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('not-loading');
      expect(getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  it('handles successful login', async () => {
    const { authService } = require('../../services/authService');
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    const mockToken = 'new-session-token';

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    authService.verifySession.mockResolvedValueOnce({ valid: false });
    authService.login.mockResolvedValueOnce({
      user: mockUser,
      session_token: mockToken,
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Perform login
    await act(async () => {
      const loginButton = getByTestId('login-button');
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(getByTestId('user')).toHaveTextContent('Test User');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('session_token', mockToken);
  });
});