import React, { useState } from 'react';
import styled from 'styled-components';

interface FollowButtonProps {
  userId: number;
  isFollowing: boolean;
  onFollow: () => Promise<void>;
  onUnfollow: () => Promise<void>;
}

const Button = styled.button<{ following: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${props => props.theme.colors.primary};
  
  ${props => props.following ? `
    background-color: ${props.theme.colors.background};
    color: ${props.theme.colors.primary};
    
    &:hover {
      background-color: ${props.theme.colors.error}10;
      border-color: ${props.theme.colors.error};
      color: ${props.theme.colors.error};
    }
  ` : `
    background-color: ${props.theme.colors.primary};
    color: white;
    
    &:hover {
      background-color: ${props.theme.colors.primaryDark};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing,
  onFollow,
  onUnfollow,
}) => {
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (following) {
        await onUnfollow();
        setFollowing(false);
      } else {
        await onFollow();
        setFollowing(true);
      }
    } catch (error) {
      console.error('Failed to update follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      following={following}
      onClick={handleClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={following ? 'Unfollow user' : 'Follow user'}
    >
      {loading
        ? 'Loading...'
        : following
        ? hovered
          ? 'Unfollow'
          : 'Following'
        : 'Follow'}
    </Button>
  );
};
