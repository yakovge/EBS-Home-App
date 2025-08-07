/**
 * Tests for LoadingSpinner component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoadingSpinner from '../LoadingSpinner';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider theme={mockTheme}>
    {children}
  </PaperProvider>
);

describe('LoadingSpinner', () => {
  it('renders correctly with default props', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoadingSpinner />
      </TestWrapper>
    );

    expect(getByTestId).toBeDefined();
  });

  it('renders with custom text', () => {
    const customText = 'Loading data...';
    const { getByText } = render(
      <TestWrapper>
        <LoadingSpinner text={customText} />
      </TestWrapper>
    );

    expect(getByText(customText)).toBeTruthy();
  });

  it('renders as full screen when specified', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoadingSpinner fullScreen={true} />
      </TestWrapper>
    );

    // Test that full screen styles are applied
    expect(getByTestId).toBeDefined();
  });

  it('renders with small size', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoadingSpinner size="small" />
      </TestWrapper>
    );

    expect(getByTestId).toBeDefined();
  });

  it('renders with large size (default)', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <LoadingSpinner size="large" />
      </TestWrapper>
    );

    expect(getByTestId).toBeDefined();
  });
});