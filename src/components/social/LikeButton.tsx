import React, { useState } from 'react';
import styled from 'styled-components';

interface LikeButtonProps {
  postId: number;
  initialLikes: number;
  isLiked: boolean;
  onLike: () => Promise<void>;
  onUnlike: () => Promise<void>;
}

const Button = styled.button<{ liked: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: none;
  border: none;
  color: ${props => props.liked ? props.theme.colors.error : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${props => props.theme.colors.error};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LikeCount = styled.span`
  font-size: 0.875rem;
`;

const HeartIcon = styled.span<{ liked: boolean }>`
  font-size: 1.25rem;
  transition: transform 0.2s;

  ${props => props.liked && `
    animation: like-animation 0.3s ease-in-out;
  `}

  @keyframes like-animation {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;

export const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  initialLikes,
  isLiked,
  onLike,
  onUnlike,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (liked) {
        await onUnlike();
        setLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await onLike();
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to update like status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      liked={liked}
      aria-label={liked ? 'Unlike post' : 'Like post'}
    >
      <HeartIcon liked={liked}>
        {liked ? '❤️' : '🤍'}
      </HeartIcon>
      <LikeCount>
        {likeCount > 0 && likeCount.toLocaleString()}
      </LikeCount>
    </Button>
  );
};
