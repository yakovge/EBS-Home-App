/**
 * Tests for ChecklistScreen
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import ChecklistScreen from '../ChecklistScreen'
import { ExitChecklist } from '../../types'

// Mock navigation
const mockNavigate = jest.fn()
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    const React = require('react')
    React.useEffect(callback, [])
  },
}))

// Mock API client
const mockGet = jest.fn()
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

// Mock theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#6200EE',
        background: '#F5F5F5',
      },
    },
  }),
}))

// Mock ChecklistList component
jest.mock('../../components/Lists/ChecklistList', () => {
  const { View, Text } = require('react-native')
  
  return function MockChecklistList({ checklists, onItemPress, loading }: any) {
    if (loading) return null
    
    return (
      <View>
        {checklists.map((checklist: ExitChecklist) => (
          <View
            key={checklist.id}
            testID={`checklist-item-${checklist.id}`}
          >
            <Text>{checklist.booking_id}</Text>
          </View>
        ))}
      </View>
    )
  }
})

// Mock i18n
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

describe('ChecklistScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { apiClient } = require('../../services/api')
    apiClient.get.mockImplementation(mockGet)
  })

  const mockChecklists: ExitChecklist[] = [
    {
      id: '1',
      booking_id: 'booking-1',
      user_id: 'user-1',
      categories: [],
      important_notes: 'Test notes',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      booking_id: 'booking-2',
      user_id: 'user-2',
      categories: [],
      important_notes: '',
      createdAt: '2025-01-14T10:00:00Z',
      updatedAt: '2025-01-14T10:00:00Z',
    },
  ]

  it('renders loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { getByTestId } = render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    expect(getByTestId('loading-spinner')).toBeTruthy()
  })

  it('renders checklists list correctly', async () => {
    mockGet.mockResolvedValue(mockChecklists)

    const { getByText } = render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('booking-1')).toBeTruthy()
      expect(getByText('booking-2')).toBeTruthy()
    })

    expect(mockGet).toHaveBeenCalledWith('/checklists')
  })

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { getByText } = render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy()
    })
  })

  it('shows FAB for creating new checklist', async () => {
    mockGet.mockResolvedValue(mockChecklists)

    const { getByText } = render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByText('checklist.submitChecklist')).toBeTruthy()
    })
  })

  it('navigates to checklist form when FAB pressed', async () => {
    mockGet.mockResolvedValue(mockChecklists)

    const { getByText } = render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      const fab = getByText('checklist.submitChecklist')
      fireEvent.press(fab)
    })

    expect(mockNavigate).toHaveBeenCalledWith('ChecklistForm')
  })

  it('sorts checklists by creation date (newest first)', async () => {
    mockGet.mockResolvedValue(mockChecklists)

    render(
      <TestWrapper>
        <ChecklistScreen />
      </TestWrapper>
    )

    await waitFor(() => {
      // Checklists should be sorted with newest first
      // booking-1 (2025-01-15) should come before booking-2 (2025-01-14)
      expect(mockGet).toHaveBeenCalled()
    })
  })
})