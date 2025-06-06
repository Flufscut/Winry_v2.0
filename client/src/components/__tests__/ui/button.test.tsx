/**
 * FILE: button.test.tsx
 * PURPOSE: Unit tests for the Button UI component
 * DEPENDENCIES: @testing-library/react, vitest
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Tests basic Button component functionality, variants, and accessibility
 * REF: Serves as a foundation test to verify testing infrastructure works
 * TODO: Add more comprehensive tests for all button variants and states
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Button } from '../../ui/button'

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('inline-flex')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-input')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-primary')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10')
  })

  it('handles disabled state correctly', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('forwards ref correctly', () => {
    let buttonRef: HTMLButtonElement | null = null
    
    render(
      <Button ref={(ref) => { buttonRef = ref }}>
        Ref Button
      </Button>
    )
    
    expect(buttonRef).toBeInstanceOf(HTMLButtonElement)
    expect(buttonRef?.tagName).toBe('BUTTON')
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    // Should have button classes applied to the link
    expect(link).toHaveClass('inline-flex')
  })

  it('handles custom className correctly', () => {
    render(
      <Button className="custom-class">
        Custom Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    // Should still have default button classes
    expect(button).toHaveClass('inline-flex')
  })

  it('supports custom HTML attributes', () => {
    render(
      <Button data-testid="custom-button" aria-label="Custom Label">
        Button
      </Button>
    )
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom Label')
  })
}) 