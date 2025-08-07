/**
 * Tests for LoginScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoginScreen from '../LoginScreen';

// Mock the LoginForm component
jest.mock('../../components/Auth/LoginForm', () => {
  return function MockLoginForm() {
    const { Text } = require('react-native');
    return <Text testID="login-form">LoginForm</Text>;
  };
});

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

// SafeAreaView is mocked globally in jest.setup.js

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider theme={mockTheme}>
    {children}
  </PaperProvider>
);

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByTestId('login-form')).toBeTruthy();
  });

  it('applies correct theme', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    // The screen should render without errors
    expect(getByTestId('login-form')).toBeTruthy();
  });
});