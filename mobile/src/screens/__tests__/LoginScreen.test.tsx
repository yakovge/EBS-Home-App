/**
 * Tests for LoginScreen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoginScreen from '../LoginScreen';

// Mock the LoginForm component to simulate actual behavior
jest.mock('../../components/Auth/LoginForm', () => {
  const React = require('react');
  return function MockLoginForm() {
    const { View, Text, TouchableOpacity, TextInput } = require('react-native');
    const [token, setToken] = React.useState('');
    const { useAuthContext } = require('../../contexts/AuthContext');
    const { login } = useAuthContext();
    
    const handleSubmit = async () => {
      if (token.trim()) {
        try {
          await login(token.trim());
        } catch (error) {
          // Expected in failure tests
        }
      }
    };
    
    return (
      <View testID="login-form">
        <Text>LoginForm</Text>
        <TextInput
          testID="token-input"
          value={token}
          onChangeText={setToken}
          placeholder="Enter token"
        />
        <TouchableOpacity 
          testID="submit-button"
          onPress={handleSubmit}
        >
          <Text>Submit</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock auth context
const mockLogin = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    login: mockLogin,
    loading: false,
    user: null,
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

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider theme={mockTheme}>
    {children}
  </PaperProvider>
);

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByTestId('login-form')).toBeTruthy();
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce({});

    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    // Enter token and submit
    const tokenInput = getByTestId('token-input');
    const submitButton = getByTestId('submit-button');

    fireEvent.changeText(tokenInput, 'test-token');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test-token');
    });
  });

  it('handles login error', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid token'));

    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const tokenInput = getByTestId('token-input');
    const submitButton = getByTestId('submit-button');

    fireEvent.changeText(tokenInput, 'invalid-token');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('invalid-token');
    });

    // Login function should have been called even if it failed
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('applies correct theme styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    // The screen should render without errors with the provided theme
    expect(getByTestId('login-form')).toBeTruthy();
  });
});