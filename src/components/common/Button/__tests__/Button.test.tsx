import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../../styles/theme';
import { Button } from '../Button';

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Button', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    renderWithTheme(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('displays loading state correctly', () => {
    renderWithTheme(<Button isLoading>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ position: 'relative' });
  });

  it('renders with different variants', () => {
    const { rerender } = renderWithTheme(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button variant="secondary">Secondary</Button>
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button variant="outline">Outline</Button>
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button size="md">Medium</Button>
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button size="lg">Large</Button>
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with full width', () => {
    renderWithTheme(<Button isFullWidth>Full Width</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ width: '100%' });
  });

  it('renders with icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    const RightIcon = () => <span data-testid="right-icon">→</span>;

    renderWithTheme(
      <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
        With Icons
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('is disabled when isLoading is true', () => {
    renderWithTheme(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
