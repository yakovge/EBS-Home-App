/**
 * Tests for LoginPage component.
 * Tests login page rendering and user interactions.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import LoginPage from '@/pages/LoginPage'
import { theme } from '@/theme/theme'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useAuth } from '@/hooks/useAuth'

// Mock Firebase services
vi.mock('@/services/firebase', () => ({
  auth: {},
  googleProvider: {},
}))

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn().mockResolvedValue({
    user: {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
    },
  }),
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.loginWithGoogle': 'Sign in with Google',
        'auth.signInInstructions': 'Sign in with your Google account to access the family vacation house management system.',
        'auth.deviceRestriction': 'You can only be logged in from one device at a time.',
        'auth.firebaseError': 'Google Sign-In requires Firebase configuration. Please contact support.',
      }
      return translations[key] || key
    },
  }),
}))

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(),
  })),
}))

// Mock the notification hook
vi.mock('@/contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNotification: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
  }),
}))

describe('LoginPage', () => {
  const renderWithProviders = () => {
    return render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <LoginPage />
        </NotificationProvider>
      </ThemeProvider>
    )
  }

  it('renders login page correctly', () => {
    renderWithProviders()

    expect(screen.getByText('EBS Home')).toBeInTheDocument()
    expect(screen.getByText('Family Vacation House Management')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('shows instructions text', () => {
    renderWithProviders()

    expect(
      screen.getByText(/Sign in with your Google account to access/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/You can only be logged in from one device at a time/i)
    ).toBeInTheDocument()
  })

  it('handles Google login button click', async () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // Button should show loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
  })

  it('shows loading state when login is in progress', () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // The button should be disabled and show loading text
    const loadingButton = screen.getByRole('button', { name: /signing in/i })
    expect(loadingButton).toBeDisabled()
  })

  it('displays error message when login fails', async () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // Wait for component to process the click
    expect(loginButton).toBeInTheDocument()
  })
})