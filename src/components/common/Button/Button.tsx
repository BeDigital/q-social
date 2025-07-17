import React from 'react';
import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${props => props.theme.colors.primary};
        color: ${props => props.theme.colors.textInverted};
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.primaryDark};
        }
        
        &:active:not(:disabled) {
          background-color: ${props => props.theme.colors.primaryDark};
        }
      `;
    case 'secondary':
      return css`
        background-color: ${props => props.theme.colors.backgroundAlt};
        color: ${props => props.theme.colors.text};
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.backgroundHover};
        }
        
        &:active:not(:disabled) {
          background-color: ${props => props.theme.colors.backgroundHover};
        }
      `;
    case 'outline':
      return css`
        background-color: transparent;
        color: ${props => props.theme.colors.primary};
        border: 2px solid ${props => props.theme.colors.primary};
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.primaryLight}20;
        }
        
        &:active:not(:disabled) {
          background-color: ${props => props.theme.colors.primaryLight}40;
        }
      `;
    case 'ghost':
      return css`
        background-color: transparent;
        color: ${props => props.theme.colors.text};
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.backgroundHover};
        }
        
        &:active:not(:disabled) {
          background-color: ${props => props.theme.colors.backgroundHover};
        }
      `;
    case 'danger':
      return css`
        background-color: ${props => props.theme.colors.error};
        color: ${props => props.theme.colors.textInverted};
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.error}dd;
        }
        
        &:active:not(:disabled) {
          background-color: ${props => props.theme.colors.error}bb;
        }
      `;
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return css`
        height: 32px;
        padding: 0 ${props => props.theme.spacing[3]};
        font-size: ${props => props.theme.typography.fontSize.sm};
      `;
    case 'md':
      return css`
        height: 40px;
        padding: 0 ${props => props.theme.spacing[4]};
        font-size: ${props => props.theme.typography.fontSize.base};
      `;
    case 'lg':
      return css`
        height: 48px;
        padding: 0 ${props => props.theme.spacing[6]};
        font-size: ${props => props.theme.typography.fontSize.lg};
      `;
  }
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing[2]};
  border-radius: ${props => props.theme.radii.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  transition: all ${props => props.theme.transitions.default};
  cursor: pointer;
  width: ${props => props.isFullWidth ? '100%' : 'auto'};
  
  ${props => getVariantStyles(props.variant || 'primary')}
  ${props => getSizeStyles(props.size || 'md')}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }
  
  ${props => props.isLoading && css`
    position: relative;
    color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid;
      border-radius: 50%;
      border-color: currentColor transparent transparent;
      animation: spin 0.7s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      isLoading={isLoading}
      isFullWidth={isFullWidth}
      disabled={isLoading || disabled}
      {...props}
    >
      {leftIcon && !isLoading && leftIcon}
      {children}
      {rightIcon && !isLoading && rightIcon}
    </StyledButton>
  );
};
