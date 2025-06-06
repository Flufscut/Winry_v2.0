/**
 * FILE: utils.test.ts
 * PURPOSE: Unit tests for utility functions used throughout the application
 * DEPENDENCIES: vitest
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Tests core utility functions like className merging (cn)
 * REF: Ensures utility functions work correctly with various inputs
 * TODO: Add tests for other utility functions as they are added
 */

import { describe, it, expect } from 'vitest'

describe('Utility Functions', () => {
  it('can import utils module without errors', async () => {
    // REF: Test that the utils module can be imported successfully
    const utils = await import('../utils')
    expect(utils).toBeDefined()
  })

  it('cn function combines class names correctly', async () => {
    // REF: Test className merging utility
    const { cn } = await import('../utils')
    
    // Test basic class combination
    expect(cn('class1', 'class2')).toContain('class1')
    expect(cn('class1', 'class2')).toContain('class2')
    
    // Test with undefined/null values
    expect(cn('class1', undefined, 'class2')).toContain('class1')
    expect(cn('class1', undefined, 'class2')).toContain('class2')
    expect(cn('class1', null, 'class2')).toContain('class1')
    expect(cn('class1', null, 'class2')).toContain('class2')
    
    // Test with empty strings
    expect(cn('class1', '', 'class2')).toContain('class1')
    expect(cn('class1', '', 'class2')).toContain('class2')
  })

  it('cn function handles Tailwind class conflicts correctly', async () => {
    // REF: Test that cn properly handles conflicting Tailwind classes
    const { cn } = await import('../utils')
    
    // Test conflicting padding classes (should use the last one)
    const result = cn('p-4', 'p-6')
    expect(result).toContain('p-6')
    expect(result).not.toContain('p-4')
    
    // Test conflicting background colors
    const bgResult = cn('bg-red-500', 'bg-blue-500')
    expect(bgResult).toContain('bg-blue-500')
    expect(bgResult).not.toContain('bg-red-500')
  })

  it('cn function handles arrays and conditional classes', async () => {
    // REF: Test array inputs and conditional class application
    const { cn } = await import('../utils')
    
    // Test array input
    const arrayResult = cn(['class1', 'class2'])
    expect(arrayResult).toContain('class1')
    expect(arrayResult).toContain('class2')
    
    // Test conditional classes
    const conditionalResult = cn('base-class', true && 'conditional-class', false && 'hidden-class')
    expect(conditionalResult).toContain('base-class')
    expect(conditionalResult).toContain('conditional-class')
    expect(conditionalResult).not.toContain('hidden-class')
  })

  it('cn function returns a string', async () => {
    // REF: Ensure cn always returns a string type
    const { cn } = await import('../utils')
    
    expect(typeof cn()).toBe('string')
    expect(typeof cn('class1')).toBe('string')
    expect(typeof cn('class1', 'class2')).toBe('string')
    expect(typeof cn(undefined)).toBe('string')
  })

  it('exports type function for type checking', async () => {
    // REF: Test that type utility function exists if implemented
    const utils = await import('../utils')
    
    // Check if type utility exists (common in TypeScript utilities)
    if ('type' in utils) {
      expect(typeof utils.type).toBe('function')
    }
  })
}) 