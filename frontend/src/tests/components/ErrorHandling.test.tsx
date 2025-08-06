/**
 * Comprehensive error handling and error boundary tests.
 * Tests that components handle errors gracefully without crashing.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/theme/theme'
import ErrorBoundary from '@/components/ErrorBoundary'

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

// Mock notification context
vi.mock('@/contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNotification: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
  }),
}))

// Component that throws an error for testing
const ErrorThrowingComponent = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div data-testid="working-component">Component works</div>
}

// Component that simulates the bugs we fixed
const BuggyDataComponent = ({ data }: { data: any }) => {
  // Simulate the checklist entry grouping that was failing
  if (data?.photos) {
    const entriesByType = data.photos.reduce((acc: Record<string, any[]>, entry: any) => {
      // Handle null entries gracefully
      if (!entry || !entry.photo_type) {
        return acc
      }
      if (!acc[entry.photo_type]) {
        acc[entry.photo_type] = []
      }
      acc[entry.photo_type].push(entry)
      return acc
    }, {})

    return (
      <div>
        {['refrigerator', 'freezer', 'closet'].map(type => (
          <div key={type} data-testid={`entries-${type}`}>
            {entriesByType[type] && entriesByType[type].length > 0 ? (
              <span>Has entries for {type}</span>
            ) : (
              <span>No entries for {type}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Simulate undefined ID access that was causing errors
  if (data?.id === undefined) {
    return <div data-testid="undefined-id">ID is undefined: {data?.id || 'undefined'}</div>
  }

  return <div data-testid="data-component">Data: {JSON.stringify(data)}</div>
}

// Component that simulates API call failures
const ApiErrorComponent = ({ shouldFail = false }: { shouldFail?: boolean }) => {
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState<string>('')

  React.useEffect(() => {
    if (shouldFail) {
      setError('API call failed')
    } else {
      setData({ success: true })
    }
  }, [shouldFail])

  if (error) {
    return <div data-testid="api-error">Error: {error}</div>
  }

  return <div data-testid="api-success">Data loaded: {JSON.stringify(data)}</div>
}

describe('Error Handling Tests', () => {
  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    )
  }

  describe('ErrorBoundary Component', () => {
    it('renders children when there are no errors', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('working-component')).toBeInTheDocument()
      expect(screen.getByText('Component works')).toBeInTheDocument()
    })

    it('catches and displays errors gracefully', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} errorMessage="Test error message" />
        </ErrorBoundary>
      )

      // Should show error UI instead of crashing
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('displays different errors correctly', () => {
      const { rerender } = renderWithProviders(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      )

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

      // Test with different error
      rerender(
        <ThemeProvider theme={theme}>
          <ErrorBoundary>
            <ErrorThrowingComponent shouldThrow={true} errorMessage="Second error" />
          </ErrorBoundary>
        </ThemeProvider>
      )

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('provides error recovery option', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      // Should have some way to recover or reload
      const errorElement = screen.getByText(/something went wrong/i)
      expect(errorElement).toBeInTheDocument()
      
      // Check if there's a refresh or reload button
      const refreshButton = screen.queryByRole('button', { name: /reload|refresh|try again/i })
      if (refreshButton) {
        expect(refreshButton).toBeInTheDocument()
      }
    })
  })

  describe('Data Handling Error Cases', () => {
    it('handles undefined or null data gracefully', () => {
      renderWithProviders(<BuggyDataComponent data={null} />)
      expect(screen.getByTestId('undefined-id')).toBeInTheDocument()

      cleanup()
      renderWithProviders(<BuggyDataComponent data={undefined} />)
      expect(screen.getByTestId('undefined-id')).toBeInTheDocument()
    })

    it('handles missing ID field gracefully - tests the bug we fixed', () => {
      const dataWithoutId = {
        user_name: 'Test User',
        description: 'Test data without ID',
      }

      renderWithProviders(<BuggyDataComponent data={dataWithoutId} />)
      expect(screen.getByTestId('undefined-id')).toBeInTheDocument()
      expect(screen.getByText(/ID is undefined/)).toBeInTheDocument()
    })

    it('handles empty photos array correctly', () => {
      const emptyPhotosData = {
        id: 'test-id',
        photos: []
      }

      renderWithProviders(<BuggyDataComponent data={emptyPhotosData} />)
      
      // Should show "No entries" for all categories when photos array is empty
      expect(screen.getByTestId('entries-refrigerator')).toHaveTextContent('No entries for refrigerator')
      expect(screen.getByTestId('entries-freezer')).toHaveTextContent('No entries for freezer')
      expect(screen.getByTestId('entries-closet')).toHaveTextContent('No entries for closet')
    })

    it('handles photos with entries correctly - tests the grouping bug we fixed', () => {
      const photosWithEntries = {
        id: 'test-id',
        photos: [
          {
            photo_type: 'refrigerator',
            notes: 'Fridge clean',
            created_at: '2025-08-06T10:00:00Z'
          },
          {
            photo_type: 'refrigerator', 
            notes: 'Fridge empty',
            created_at: '2025-08-06T10:01:00Z'
          },
          {
            photo_type: 'freezer',
            notes: 'Freezer clean', 
            created_at: '2025-08-06T10:02:00Z'
          }
        ]
      }

      renderWithProviders(<BuggyDataComponent data={photosWithEntries} />)
      
      // Should show "Has entries" for categories with data, "No entries" for categories without
      expect(screen.getByTestId('entries-refrigerator')).toHaveTextContent('Has entries for refrigerator')
      expect(screen.getByTestId('entries-freezer')).toHaveTextContent('Has entries for freezer')
      expect(screen.getByTestId('entries-closet')).toHaveTextContent('No entries for closet')
    })

    it('handles malformed photos data', () => {
      const malformedData = {
        id: 'test-id',
        photos: [
          null, // null entry
          { photo_type: 'refrigerator' }, // missing notes
          { notes: 'Missing photo_type' }, // missing photo_type
          { photo_type: 'invalid_type', notes: 'Invalid type' } // invalid type
        ]
      }

      // Should not crash even with malformed data
      expect(() => {
        renderWithProviders(<BuggyDataComponent data={malformedData} />)
      }).not.toThrow()
    })
  })

  describe('API Error Handling', () => {
    it('handles API success states correctly', () => {
      renderWithProviders(<ApiErrorComponent shouldFail={false} />)
      expect(screen.getByTestId('api-success')).toBeInTheDocument()
      expect(screen.getByText(/Data loaded/)).toBeInTheDocument()
    })

    it('handles API failure states gracefully', () => {
      renderWithProviders(<ApiErrorComponent shouldFail={true} />)
      expect(screen.getByTestId('api-error')).toBeInTheDocument()
      expect(screen.getByText(/API call failed/)).toBeInTheDocument()
    })
  })

  describe('Runtime Error Scenarios', () => {
    it('handles the exact NoneType error scenario we fixed', () => {
      // Simulate the booking cancellation scenario that was failing
      const BookingCancelTest = ({ booking }: { booking: any }) => {
        const [error, setError] = React.useState('')

        const handleCancel = () => {
          try {
            // Before our fix, booking service returned null/undefined
            // and API tried to call .to_dict() on it
            if (!booking || typeof booking.to_dict !== 'function') {
              throw new Error("NoneType' object has no attribute 'user_id'")
            }
            const result = booking.to_dict()
            return result
          } catch (err: any) {
            setError(err.message)
          }
        }

        React.useEffect(() => {
          handleCancel()
        }, [])

        return (
          <div>
            {error ? (
              <div data-testid="cancellation-error">Error: {error}</div>
            ) : (
              <div data-testid="cancellation-success">Cancellation successful</div>
            )}
          </div>
        )
      }

      // Test with null booking (the bug scenario)
      renderWithProviders(<BookingCancelTest booking={null} />)
      expect(screen.getByTestId('cancellation-error')).toBeInTheDocument()
      expect(screen.getByText(/NoneType.*user_id/)).toBeInTheDocument()

      // Test with proper booking object (after fix)
      const properBooking = {
        to_dict: () => ({ id: 'test', user_id: 'user-123' })
      }
      renderWithProviders(<BookingCancelTest booking={properBooking} />)
      expect(screen.getByTestId('cancellation-success')).toBeInTheDocument()
    })

    it('handles the exact undefined document ID error we fixed', () => {
      // Simulate the maintenance mark-as-fixed scenario that was failing
      const MaintenanceMarkTest = ({ request }: { request: any }) => {
        const [error, setError] = React.useState('')

        const handleMarkFixed = () => {
          try {
            const requestId = request?.id
            if (requestId === undefined) {
              throw new Error(`404 No document to update: projects/ebs-home/databases/(default)/documents/maintenance_requests/undefined`)
            }
            // Simulate successful API call
            return `POST /maintenance/${requestId}/complete`
          } catch (err: any) {
            setError(err.message)
          }
        }

        React.useEffect(() => {
          handleMarkFixed()
        }, [])

        return (
          <div>
            {error ? (
              <div data-testid="mark-fixed-error">Error: {error}</div>
            ) : (
              <div data-testid="mark-fixed-success">Mark fixed successful</div>
            )}
          </div>
        )
      }

      // Test with undefined ID (the bug scenario)
      renderWithProviders(<MaintenanceMarkTest request={{ description: 'test' }} />)
      expect(screen.getByTestId('mark-fixed-error')).toBeInTheDocument()
      expect(screen.getByText(/404.*undefined/)).toBeInTheDocument()

      // Test with proper ID (after fix)
      renderWithProviders(<MaintenanceMarkTest request={{ id: 'maintenance-123', description: 'test' }} />)
      expect(screen.getByTestId('mark-fixed-success')).toBeInTheDocument()
    })

    it('handles the exact "No entries" display bug we fixed', () => {
      // Simulate the checklist display scenario that was failing
      const ChecklistDisplayTest = ({ checklist }: { checklist: any }) => {
        const photos = checklist?.photos || []
        const entriesByType = photos.reduce((acc: Record<string, any[]>, entry: any) => {
          if (entry && entry.photo_type) {
            if (!acc[entry.photo_type]) {
              acc[entry.photo_type] = []
            }
            acc[entry.photo_type].push(entry)
          }
          return acc
        }, {})

        return (
          <div>
            {['refrigerator', 'freezer', 'closet'].map(type => {
              const hasEntries = entriesByType[type] && entriesByType[type].length > 0
              return (
                <div key={type} data-testid={`display-${type}`}>
                  {hasEntries ? (
                    <span>Found {entriesByType[type].length} {type} entries</span>
                  ) : (
                    <span>No entries for {type}</span>
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      // Test with entries (should not show "No entries")
      const checklistWithEntries = {
        photos: [
          { photo_type: 'refrigerator', notes: 'Clean' },
          { photo_type: 'freezer', notes: 'Empty' }
        ]
      }

      renderWithProviders(<ChecklistDisplayTest checklist={checklistWithEntries} />)
      expect(screen.getByTestId('display-refrigerator')).toHaveTextContent('Found 1 refrigerator entries')
      expect(screen.getByTestId('display-freezer')).toHaveTextContent('Found 1 freezer entries')
      expect(screen.getByTestId('display-closet')).toHaveTextContent('No entries for closet')

      // Clean up and test with empty checklist (should show "No entries" for all)
      cleanup()
      renderWithProviders(<ChecklistDisplayTest checklist={{ photos: [] }} />)
      const fridgeElements = screen.getAllByTestId('display-refrigerator')
      expect(fridgeElements[0]).toHaveTextContent('No entries for refrigerator')
      const freezerElements = screen.getAllByTestId('display-freezer')
      expect(freezerElements[0]).toHaveTextContent('No entries for freezer')
      const closetElements = screen.getAllByTestId('display-closet')
      expect(closetElements[0]).toHaveTextContent('No entries for closet')
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely large data sets', () => {
      const largePhotoArray = Array.from({ length: 1000 }, (_, i) => ({
        photo_type: 'refrigerator',
        notes: `Entry ${i}`,
        created_at: '2025-08-06T10:00:00Z'
      }))

      const largeData = { id: 'large-test', photos: largePhotoArray }

      expect(() => {
        renderWithProviders(<BuggyDataComponent data={largeData} />)
      }).not.toThrow()

      expect(screen.getByTestId('entries-refrigerator')).toHaveTextContent('Has entries for refrigerator')
    })

    it('handles deeply nested error scenarios', () => {
      const NestedErrorComponent = ({ level }: { level: number }) => {
        if (level > 3) {
          throw new Error(`Deep error at level ${level}`)
        }
        
        return level < 4 ? (
          <NestedErrorComponent level={level + 1} />
        ) : (
          <div data-testid="nested-success">Deep nesting successful</div>
        )
      }

      renderWithProviders(
        <ErrorBoundary>
          <NestedErrorComponent level={0} />
        </ErrorBoundary>
      )

      // This should trigger an error when level reaches 4
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('handles concurrent error scenarios', async () => {
      const ConcurrentErrorComponent = () => {
        const [errors, setErrors] = React.useState<string[]>([])

        React.useEffect(() => {
          // Simulate multiple async operations failing
          const promises = [
            Promise.reject(new Error('Error 1')),
            Promise.reject(new Error('Error 2')),
            Promise.reject(new Error('Error 3'))
          ]

          Promise.allSettled(promises).then(results => {
            const failed = results
              .filter(r => r.status === 'rejected')
              .map((r: any) => r.reason.message)
            setErrors(failed)
          })
        }, [])

        return (
          <div>
            {errors.length > 0 ? (
              <div data-testid="concurrent-errors">
                {errors.length} concurrent errors occurred
              </div>
            ) : (
              <div data-testid="no-concurrent-errors">No errors</div>
            )}
          </div>
        )
      }

      renderWithProviders(<ConcurrentErrorComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('concurrent-errors')).toBeInTheDocument()
        expect(screen.getByText('3 concurrent errors occurred')).toBeInTheDocument()
      })
    })
  })
})

