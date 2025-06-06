/**
 * FILE: test-utils.tsx
 * PURPOSE: Custom testing utilities and wrapper components for consistent test setup
 * DEPENDENCIES: @testing-library/react, @tanstack/react-query, vitest
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Provides custom render function with all necessary providers
 * REF: Includes mocks for authentication, React Query, and other context providers
 * TODO: Add more provider mocks as testing coverage expands
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// REF: Mock user data for testing authenticated components
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyReports: true,
    theme: 'dark',
    compactMode: true,
    animationsEnabled: false,
    fontSize: 16,
    dataRetention: 90,
    analyticsSharing: false,
    crashReporting: true,
    autoSave: true,
    batchSize: 10,
    timeZone: 'UTC',
    language: 'en',
    cacheEnabled: true,
    backgroundSync: true
  }
}

// REF: Mock authentication hook for testing components that require authentication
export const mockUseAuth = {
  user: mockUser,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn()
}

// REF: Mock toast hook for testing components that show notifications
export const mockUseToast = {
  toast: vi.fn(),
  dismiss: vi.fn(),
  toasts: []
}

// REF: Create a fresh QueryClient for each test to prevent state leakage
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // REF: Disable retries in tests for faster execution
        retry: false,
        // REF: Disable caching in tests for predictable behavior
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        // REF: Disable retries in tests
        retry: false,
      },
    },
  })
}

// REF: Custom wrapper component that provides all necessary context providers
interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

const AllTheProviders = ({ children, queryClient }: AllTheProvidersProps) => {
  const testQueryClient = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// REF: Custom render function that wraps components with necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  user?: typeof mockUser | null
  initialRoute?: string
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, user = mockUser, ...renderOptions } = options

  // REF: Mock auth hook before rendering
  vi.doMock('@/hooks/useAuth', () => ({
    useAuth: () => ({
      ...mockUseAuth,
      user,
    }),
  }))

  // REF: Mock toast hook before rendering
  vi.doMock('@/hooks/use-toast', () => ({
    useToast: () => mockUseToast,
  }))

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders queryClient={queryClient}>
      {children}
    </AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// REF: Helper function to create mock API responses
export function createMockApiResponse<T>(data: T, options: { delay?: number; shouldFail?: boolean } = {}) {
  const { delay = 0, shouldFail = false } = options

  return vi.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error('Mock API Error'))
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: () => Promise.resolve(data),
          text: () => Promise.resolve(JSON.stringify(data)),
        })
      }, delay)
    })
  })
}

// REF: Helper to simulate user interactions with proper async handling
export const userEvent = {
  click: async (element: Element) => {
    const { default: userEventLib } = await import('@testing-library/user-event')
    const user = userEventLib.setup()
    await user.click(element)
  },
  type: async (element: Element, text: string) => {
    const { default: userEventLib } = await import('@testing-library/user-event')
    const user = userEventLib.setup()
    await user.type(element, text)
  },
  clear: async (element: Element) => {
    const { default: userEventLib } = await import('@testing-library/user-event')
    const user = userEventLib.setup()
    await user.clear(element)
  },
  selectOptions: async (element: Element, values: string | string[]) => {
    const { default: userEventLib } = await import('@testing-library/user-event')
    const user = userEventLib.setup()
    await user.selectOptions(element, values)
  },
}

// REF: Helper to wait for loading states to complete
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => {
    expect(document.querySelector('[data-testid="loading"]')).not.toBeInTheDocument()
  }, { timeout: 5000 })
}

// REF: Re-export everything from React Testing Library for convenience
export * from '@testing-library/react'

// REF: Export custom render as default render function
export { customRender as render } 