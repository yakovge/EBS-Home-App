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

  it('handles Google login button click', () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // Should show error about Firebase setup (as implemented in the component)
    expect(
      screen.getByText(/Google Sign-In requires Firebase configuration/i)
    ).toBeInTheDocument()
  })

  it('shows loading state when login is in progress', () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // The button should be disabled during loading
    expect(loginButton).toBeDisabled()
  })

  it('displays error message when login fails', () => {
    renderWithProviders()

    const loginButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(loginButton)

    // Error alert should be visible
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText(/Google Sign-In requires Firebase configuration/i)
    ).toBeInTheDocument()
  })
})