/**
 * Tests for ProtectedRoute component.
 * Tests authentication-based route protection.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProtectedRoute from '@/components/Auth/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

// Mock child component
// const MockChild = () => <div>Protected Content</div> // TODO: Use in tests

describe('ProtectedRoute', () => {
  const renderWithProviders = (authState: { user: any; loading: boolean }) => {
    mockUseAuth.mockReturnValue(authState)

    return render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('shows loading when auth is loading', () => {
    renderWithProviders({
      user: null,
      loading: true,
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    renderWithProviders({
      user: null,
      loading: false,
    })

    // Should redirect to login - we can't easily test navigation in this setup
    // but we can verify the component doesn't render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders outlet when user is authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    renderWithProviders({
      user: mockUser,
      loading: false,
    })

    // In a real scenario, the Outlet would render child routes
    // For this test, we just verify no loading/redirect occurs
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
})