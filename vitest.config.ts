/**
 * FILE: vitest.config.ts
 * PURPOSE: Vitest testing framework configuration for React + TypeScript application
 * DEPENDENCIES: vitest, @testing-library/jest-dom, happy-dom
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Vitest provides fast unit testing with native ESM support and TypeScript integration
 * REF: happy-dom provides lightweight DOM environment for component testing
 * TODO: Add coverage reporting configuration after initial tests are written
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // REF: Use happy-dom for fast DOM simulation in tests
    environment: 'happy-dom',
    
    // REF: Setup files run before each test file
    setupFiles: ['./client/src/test/setup.ts'],
    
    // REF: Include all test files with standard naming conventions
    include: [
      'client/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'
    ],
    
    // REF: Exclude common directories that shouldn't contain tests
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.next'
    ],
    
    // REF: Test timeout for slow operations (API calls, complex renders)
    testTimeout: 10000,
    
    // REF: Global test utilities available in all test files
    globals: true,
    
    // REF: Coverage configuration for code quality metrics
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'build/'
      ],
      // REF: Coverage thresholds to maintain code quality
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  
  // REF: Resolve path aliases to match main application configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  
  // REF: Define globals for better TypeScript support
  define: {
    // REF: Environment variables for test context
    'process.env.NODE_ENV': '"test"',
    'process.env.VITEST': 'true'
  }
}) 