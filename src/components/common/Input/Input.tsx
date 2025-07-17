import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'outline' | 'filled' | 'flushed';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: InputSize;
  variant?: InputVariant;
  error?: string;
  isFullWidth?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  label?: string;
  helperText?: string;
}

const InputWrapper = styled.div<{ isFullWidth?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  width: ${props => props.isFullWidth ? '100%' : 'auto'};
`;

const Label = styled.label`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing[1]};
`;

const InputGroup = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const getSizeStyles = (size: InputSize) => {
  switch (size) {
    case 'sm':
      return css`
        height: 32px;
        font-size: ${props => props.theme.typography.fontSize.sm};
        padding: 0 ${props => props.theme.spacing[2]};
      `;
    case 'md':
      return css`
        height: 40px;
        font-size: ${props => props.theme.typography.fontSize.base};
        padding: 0 ${props => props.theme.spacing[3]};
      `;
    case 'lg':
      return css`
        height: 48px;
        font-size: ${props => props.theme.typography.fontSize.lg};
        padding: 0 ${props => props.theme.spacing[4]};
      `;
  }
};

const getVariantStyles = (variant: InputVariant) => {
  switch (variant) {
    case 'outline':
      return css`
        border: 1px solid ${props => props.theme.colors.border};
        background-color: transparent;
        
        &:hover:not(:disabled) {
          border-color: ${props => props.theme.colors.borderHover};
        }
        
        &:focus {
          border-color: ${props => props.theme.colors.primary};
          box-shadow: 0 0 0 1px ${props => props.theme.colors.primary};
        }
      `;
    case 'filled':
      return css`
        border: 1px solid transparent;
        background-color: ${props => props.theme.colors.backgroundAlt};
        
        &:hover:not(:disabled) {
          background-color: ${props => props.theme.colors.backgroundHover};
        }
        
        &:focus {
          background-color: ${props => props.theme.colors.background};
          border-color: ${props => props.theme.colors.primary};
        }
      `;
    case 'flushed':
      return css`
        border: none;
        border-bottom: 1px solid ${props => props.theme.colors.border};
        border-radius: 0;
        padding-left: 0;
        padding-right: 0;
        background-color: transparent;
        
        &:hover:not(:disabled) {
          border-bottom-color: ${props => props.theme.colors.borderHover};
        }
        
        &:focus {
          border-bottom-color: ${props => props.theme.colors.primary};
          box-shadow: 0 1px 0 0 ${props => props.theme.colors.primary};
        }
      `;
  }
};

const StyledInput = styled.input<InputProps>`
  width: 100%;
  border-radius: ${props => props.theme.radii.md};
  color: ${props => props.theme.colors.text};
  transition: all ${props => props.theme.transitions.default};
  
  ${props => getSizeStyles(props.size || 'md')}
  ${props => getVariantStyles(props.variant || 'outline')}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textLight};
  }
  
  ${props => props.error && css`
    border-color: ${props.theme.colors.error} !important;
    
    &:focus {
      box-shadow: 0 0 0 1px ${props.theme.colors.error};
    }
  `}
  
  ${props => props.leftElement && css`
    padding-left: ${props.size === 'lg' ? '3rem' : props.size === 'sm' ? '2rem' : '2.5rem'};
  `}
  
  ${props => props.rightElement && css`
    padding-right: ${props.size === 'lg' ? '3rem' : props.size === 'sm' ? '2rem' : '2.5rem'};
  `}
`;

const ElementWrapper = styled.div<{ position: 'left' | 'right'; size: InputSize }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.position}: ${props => props.size === 'lg' ? '1rem' : props.size === 'sm' ? '0.5rem' : '0.75rem'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.textLight};
`;

const HelperText = styled.div<{ isError?: boolean }>`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.isError ? props.theme.colors.error : props.theme.colors.textLight};
  margin-top: ${props => props.theme.spacing[1]};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  variant = 'outline',
  error,
  isFullWidth = false,
  leftElement,
  rightElement,
  label,
  helperText,
  ...props
}, ref) => {
  return (
    <InputWrapper isFullWidth={isFullWidth}>
      {label && <Label>{label}</Label>}
      <InputGroup>
        {leftElement && (
          <ElementWrapper position="left" size={size}>
            {leftElement}
          </ElementWrapper>
        )}
        <StyledInput
          ref={ref}
          size={size}
          variant={variant}
          error={error}
          leftElement={leftElement}
          rightElement={rightElement}
          {...props}
        />
        {rightElement && (
          <ElementWrapper position="right" size={size}>
            {rightElement}
          </ElementWrapper>
        )}
      </InputGroup>
      {(helperText || error) && (
        <HelperText isError={!!error}>
          {error || helperText}
        </HelperText>
      )}
    </InputWrapper>
  );
});
