import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndices.modal};
  animation: ${fadeIn} 0.2s ease-out;
`;

const getModalSize = (size: string) => {
  switch (size) {
    case 'sm':
      return css`max-width: 24rem;`; // 384px
    case 'md':
      return css`max-width: 32rem;`; // 512px
    case 'lg':
      return css`max-width: 48rem;`; // 768px
    case 'xl':
      return css`max-width: 64rem;`; // 1024px
    case 'full':
      return css`
        max-width: 100%;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
      `;
    default:
      return css`max-width: 32rem;`; // 512px
  }
};

const ModalContent = styled.div<{ size: string }>`
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.radii.lg};
  box-shadow: ${props => props.theme.shadows.xl};
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.3s ease-out;
  position: relative;
  
  ${props => getModalSize(props.size)}
`;

const ModalHeader = styled.div`
  padding: ${props => props.theme.spacing[4]};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textLight};
  cursor: pointer;
  padding: ${props => props.theme.spacing[2]};
  font-size: ${props => props.theme.typography.fontSize.xl};
  line-height: 1;
  transition: color ${props => props.theme.transitions.default};
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}40;
    border-radius: ${props => props.theme.radii.sm};
  }
`;

const ModalBody = styled.div`
  padding: ${props => props.theme.spacing[4]};
  overflow-y: auto;
`;

const ModalFooter = styled.div`
  padding: ${props => props.theme.spacing[4]};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing[2]};
`;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (isOpen && closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay
      isOpen={isOpen}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <ModalContent
        size={size}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || showCloseButton) && (
          <ModalHeader>
            {title && (
              <ModalTitle id="modal-title">{title}</ModalTitle>
            )}
            {showCloseButton && (
              <CloseButton
                onClick={onClose}
                aria-label="Close modal"
              >
                ×
              </CloseButton>
            )}
          </ModalHeader>
        )}
        
        <ModalBody>{children}</ModalBody>
        
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
