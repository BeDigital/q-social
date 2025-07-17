import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../../styles/theme';
import { Modal } from '../Modal';

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Modal', () => {
  it('renders when isOpen is true', () => {
    renderWithTheme(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderWithTheme(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking the close button', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the overlay if closeOnOverlayClick is true', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={true}>
        <div>Modal content</div>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when clicking the overlay if closeOnOverlayClick is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        <div>Modal content</div>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).not.toHaveBeenCalled();
    }
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <div>Modal content</div>
        </Modal>
      </ThemeProvider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWithTheme(
      <Modal isOpen={true} onClose={() => {}} title="Test Title">
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    renderWithTheme(
      <Modal
        isOpen={true}
        onClose={() => {}}
        footer={<button>Footer Button</button>}
      >
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('handles ESC key press when closeOnEsc is true', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={true}>
        <div>Modal content</div>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not handle ESC key press when closeOnEsc is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={false}>
        <div>Modal content</div>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('prevents event propagation when clicking modal content', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );
    
    const modalContent = screen.getByRole('dialog');
    fireEvent.click(modalContent);
    expect(handleClose).not.toHaveBeenCalled();
  });
});
