import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  thickness?: number;
  speed?: number;
  label?: string;
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const getSize = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return '16px';
    case 'md':
      return '32px';
    case 'lg':
      return '48px';
    default:
      return '32px';
  }
};

const SpinnerWrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div<LoadingSpinnerProps>`
  width: ${props => getSize(props.size || 'md')};
  height: ${props => getSize(props.size || 'md')};
  border: ${props => props.thickness || 2}px solid transparent;
  border-top-color: ${props => props.color || props.theme.colors.primary};
  border-right-color: ${props => props.color || props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} ${props => props.speed || 0.7}s linear infinite;
`;

const Label = styled.div`
  margin-top: ${props => props.theme.spacing[2]};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color,
  thickness = 2,
  speed = 0.7,
  label,
}) => {
  return (
    <SpinnerWrapper role="status" aria-label={label || 'Loading'}>
      <Spinner
        size={size}
        color={color}
        thickness={thickness}
        speed={speed}
      />
      {label && <Label>{label}</Label>}
    </SpinnerWrapper>
  );
};
