/**
 * FILE: setup.ts
 * PURPOSE: Global test setup and configuration for Vitest + React Testing Library
 * DEPENDENCIES: @testing-library/jest-dom, vitest
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: This file runs before each test to set up the testing environment
 * REF: Provides custom matchers, mocks, and global configurations
 * TODO: Add more sophisticated mocks as testing coverage expands
 */

import { expect, vi } from 'vitest'
import '@testing-library/jest-dom'

// REF: Extend Vitest's expect with Testing Library matchers
// This enables matchers like .toBeInTheDocument(), .toHaveClass(), etc.

// REF: Mock window.matchMedia for components that use responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// REF: Mock IntersectionObserver for components that use intersection detection
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// REF: Mock ResizeObserver for components that observe element size changes
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// REF: Mock fetch for API testing
global.fetch = vi.fn()

// REF: Suppress console errors in tests unless needed for debugging
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// REF: Clear all mocks between tests to prevent state leakage
afterEach(() => {
  vi.clearAllMocks()
})

// REF: Custom testing utilities available globally
declare global {
  interface Window {
    __TEST_ENV__: boolean
  }
}

// REF: Mark window as test environment for conditional logic
window.__TEST_ENV__ = true 