/**
 * Tests for MaintenanceDetailScreen
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { Alert } from 'react-native'
import MaintenanceDetailScreen from '../MaintenanceDetailScreen'
import { MaintenanceStatus } from '../../types'

// Mock Alert first
jest.spyOn(Alert, 'alert')
jest.spyOn(Alert, 'prompt')

// Mock API client
const mockGet = jest.fn()
const mockPut = jest.fn()

// Mock auth context
let mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  is_maintenance_person: false,
  is_yaffa: false,
  role: 'user',
}

// Mock all modules before importing the component
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}))

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: { requestId: 'test-request-123' },
  }),
}))

jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}))

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#6200EE',
        secondary: '#03DAC6',
        tertiary: '#FF6F00',
        error: '#B00020',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        background: '#F5F5F5',
      },
    },
  }),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>
    {children}
  </PaperProvider>
)

describe('MaintenanceDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up the mocks with their default implementations
    const { apiClient } = require('../../services/api')
    apiClient.get.mockImplementation(mockGet)
    apiClient.put.mockImplementation(mockPut)
    
    const { useAuthContext } = require('../../contexts/AuthContext')
    useAuthContext.mockReturnValue({ user: mockUser })
  })

  const mockRequest = {
    id: 'test-request-123',
    description: 'Kitchen faucet is leaking',
    location: 'Kitchen',
    status: MaintenanceStatus.PENDING,
    reporter_name: 'John Doe',
    created_at: '2025-01-01T10:00:00Z',
    photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    assigned_to_name: null,
    resolution_date: null,
    resolution_notes: null,
  }

  it('renders loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { getByTestId } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    expect(getByTestId('loading-spinner')).toBeTruthy()
  })

  it('renders maintenance request details correctly', async () => {
    mockGet.mockResolvedValue(mockRequest)

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Kitchen faucet is leaking')).toBeTruthy()
      expect(getByText('Kitchen')).toBeTruthy()
      expect(getByText('John Doe')).toBeTruthy()
      expect(getByText('maintenance.pending')).toBeTruthy()
      expect(getByText('Photos (2)')).toBeTruthy()
    })

    expect(mockGet).toHaveBeenCalledWith('/maintenance/test-request-123')
  })

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy()
    })
  })

  it('shows action buttons for maintenance person', async () => {
    mockGet.mockResolvedValue(mockRequest)
    
    // Mock user as maintenance person
    const maintenanceUser = { ...mockUser, is_maintenance_person: true }
    const { useAuthContext } = require('../../contexts/AuthContext')
    useAuthContext.mockReturnValue({
      user: maintenanceUser,
    })

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Mark In Progress')).toBeTruthy()
      expect(getByText('Mark Complete')).toBeTruthy()
    })
  })

  it('handles status update to in progress', async () => {
    mockGet.mockResolvedValue(mockRequest)
    mockPut.mockResolvedValue({ success: true })
    
    const maintenanceUser = { ...mockUser, is_maintenance_person: true }
    const { useAuthContext } = require('../../contexts/AuthContext')
    useAuthContext.mockReturnValue({
      user: maintenanceUser,
    })

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Mark In Progress')).toBeTruthy()
    })

    fireEvent.press(getByText('Mark In Progress'))

    expect(Alert.alert).toHaveBeenCalledWith(
      'maintenance.confirmInProgress',
      'Mark this request as in progress?',
      expect.any(Array)
    )

    // Simulate user confirming the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
    const confirmButton = alertCall[2][1]
    confirmButton.onPress()

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/maintenance/test-request-123', {
        status: MaintenanceStatus.IN_PROGRESS,
      })
    })
  })

  it('handles completion with notes', async () => {
    mockGet.mockResolvedValue(mockRequest)
    mockPut.mockResolvedValue({ success: true })
    
    const maintenanceUser = { ...mockUser, is_maintenance_person: true }
    const { useAuthContext } = require('../../contexts/AuthContext')
    useAuthContext.mockReturnValue({
      user: maintenanceUser,
    })

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Mark Complete')).toBeTruthy()
    })

    fireEvent.press(getByText('Mark Complete'))

    expect(Alert.prompt).toHaveBeenCalledWith(
      'maintenance.markComplete',
      'Add resolution notes (optional):',
      expect.any(Array),
      'plain-text'
    )

    // Simulate user adding notes and confirming
    const promptCall = (Alert.prompt as jest.Mock).mock.calls[0]
    const confirmButton = promptCall[2][1]
    confirmButton.onPress('Fixed the leak by replacing the gasket')

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/maintenance/test-request-123', {
        status: MaintenanceStatus.COMPLETED,
        resolution_notes: 'Fixed the leak by replacing the gasket',
      })
    })
  })

  it('does not show action buttons for regular users', async () => {
    mockGet.mockResolvedValue(mockRequest)

    const { queryByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(queryByText('Mark In Progress')).toBeNull()
      expect(queryByText('Mark Complete')).toBeNull()
    })
  })

  it('shows completed request details correctly', async () => {
    const completedRequest = {
      ...mockRequest,
      status: MaintenanceStatus.COMPLETED,
      assigned_to_name: 'Maintenance Team',
      resolution_date: '2025-01-02T15:30:00Z',
      resolution_notes: 'Fixed the leak by replacing the gasket',
    }
    
    mockGet.mockResolvedValue(completedRequest)

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('maintenance.completed')).toBeTruthy()
      expect(getByText('Maintenance Team')).toBeTruthy()
      expect(getByText('Resolution Notes')).toBeTruthy()
      expect(getByText('Fixed the leak by replacing the gasket')).toBeTruthy()
    })
  })

  it('handles status update errors', async () => {
    mockGet.mockResolvedValue(mockRequest)
    mockPut.mockRejectedValue(new Error('Update failed'))
    
    const maintenanceUser = { ...mockUser, is_maintenance_person: true }
    const { useAuthContext } = require('../../contexts/AuthContext')
    useAuthContext.mockReturnValue({
      user: maintenanceUser,
    })

    const { getByText } = render(
      <TestWrapper>
        <MaintenanceDetailScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Mark In Progress')).toBeTruthy()
    })

    fireEvent.press(getByText('Mark In Progress'))
    
    // Simulate user confirming the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
    const confirmButton = alertCall[2][1]
    confirmButton.onPress()

    await waitFor(() => {
      expect(getByText('Update failed')).toBeTruthy()
    })
  })
})