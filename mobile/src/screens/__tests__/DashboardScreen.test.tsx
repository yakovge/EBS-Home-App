/**
 * Tests for DashboardScreen
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import DashboardScreen from '../DashboardScreen';

// Mock API client
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock theme context
const mockTheme = {
  colors: {
    primary: '#6200EE',
    surface: '#FFFFFF',
    onSurface: '#000000',
  },
  roundness: 4,
};

// Mock contexts
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
}));

// Mock offline context
jest.mock('../../contexts/OfflineContext', () => ({
  useOfflineContext: () => ({
    isOnline: true,
    syncStatus: {
      isOnline: true,
      lastSync: Date.now(),
      pendingOperations: 0,
      failedOperations: 0,
    },
    pendingOperationsCount: 0,
    getData: jest.fn().mockImplementation((endpoint) => {
      const { apiClient } = require('../../services/api');
      return apiClient.get(endpoint);
    }),
    forceSync: jest.fn(),
    clearCache: jest.fn(),
    clearPendingOperations: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock components
jest.mock('../../components/Layout/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    const { Text } = require('react-native');
    return <Text testID="loading-spinner">Loading...</Text>;
  };
});

jest.mock('../../components/Layout/ErrorMessage', () => {
  return function MockErrorMessage({ message }: { message: string }) {
    const { Text } = require('react-native');
    return <Text testID="error-message">{message}</Text>;
  };
});

jest.mock('../../components/Common/OfflineIndicator', () => {
  return function MockOfflineIndicator() {
    const { View } = require('react-native');
    return <View testID="offline-indicator" />;
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider theme={mockTheme}>
    {children}
  </PaperProvider>
);

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    const { apiClient } = require('../../services/api');
    // Make API calls hang to test loading state
    apiClient.get.mockImplementation(() => new Promise(() => {}));

    const { getByTestId } = render(
      <TestWrapper>
        <DashboardScreen />
      </TestWrapper>
    );

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays dashboard content after loading', async () => {
    const { apiClient } = require('../../services/api');
    
    // Mock API to return data immediately
    apiClient.get.mockResolvedValue([]);

    const { getByText } = render(
      <TestWrapper>
        <DashboardScreen />
      </TestWrapper>
    );

    // Wait for the loading spinner to disappear and welcome text to appear
    await waitFor(() => {
      expect(getByText('dashboard.welcome')).toBeTruthy();
    }, { timeout: 3000 });

    expect(getByText('Test User')).toBeTruthy();
  });

  it('displays error message when API fails', async () => {
    const { apiClient } = require('../../services/api');
    apiClient.get.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(
      <TestWrapper>
        <DashboardScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('handles empty data gracefully', async () => {
    const { apiClient } = require('../../services/api');
    apiClient.get.mockResolvedValue([]);

    const { getByText } = render(
      <TestWrapper>
        <DashboardScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('dashboard.welcome')).toBeTruthy();
    }, { timeout: 3000 });

    // Should show empty states
    expect(getByText('dashboard.noBookings')).toBeTruthy();
    expect(getByText('dashboard.noMaintenance')).toBeTruthy();
  });
});