import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../../styles/theme';
import { Input } from '../Input';

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Input', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Input aria-label="test-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <Input
        value="test"
        onChange={handleChange}
        aria-label="test-input"
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays label correctly', () => {
    renderWithTheme(<Input label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('displays error message', () => {
    renderWithTheme(
      <Input
        error="This field is required"
        aria-label="test-input"
      />
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    renderWithTheme(
      <Input
        helperText="Helper text"
        aria-label="test-input"
      />
    );
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = renderWithTheme(
      <Input variant="outline" aria-label="test-input" />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Input variant="filled" aria-label="test-input" />
      </ThemeProvider>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Input variant="flushed" aria-label="test-input" />
      </ThemeProvider>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(
      <Input size="sm" aria-label="test-input" />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Input size="md" aria-label="test-input" />
      </ThemeProvider>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Input size="lg" aria-label="test-input" />
      </ThemeProvider>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with full width', () => {
    renderWithTheme(
      <Input isFullWidth aria-label="test-input" />
    );
    const inputWrapper = screen.getByRole('textbox').parentElement?.parentElement;
    expect(inputWrapper).toHaveStyle({ width: '100%' });
  });

  it('renders with left and right elements', () => {
    renderWithTheme(
      <Input
        leftElement={<span data-testid="left-element">$</span>}
        rightElement={<span data-testid="right-element">USD</span>}
        aria-label="test-input"
      />
    );
    
    expect(screen.getByTestId('left-element')).toBeInTheDocument();
    expect(screen.getByTestId('right-element')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <Input disabled aria-label="test-input" />
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    
    renderWithTheme(
      <Input
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label="test-input"
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });
});
