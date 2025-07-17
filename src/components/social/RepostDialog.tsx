import React, { useState } from 'react';
import styled from 'styled-components';
import { Post } from '../../types/Post';

interface RepostDialogProps {
  post: Post;
  onRepost: (content: string) => Promise<void>;
  onClose: () => void;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background-color: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  
  &:hover {
    color: ${props => props.theme.colors.textDark};
  }
`;

const OriginalPost = styled.div`
  padding: 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  resize: vertical;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.primary ? `
    background-color: ${props.theme.colors.primary};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.colors.primaryDark};
    }
  ` : `
    background-color: transparent;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};
    
    &:hover {
      background-color: ${props.theme.colors.backgroundHover};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const RepostDialog: React.FC<RepostDialogProps> = ({
  post,
  onRepost,
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onRepost(content);
      onClose();
    } catch (error) {
      console.error('Failed to repost:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Dialog onClick={e => e.stopPropagation()}>
        <Header>
          <Title>Repost</Title>
          <CloseButton onClick={onClose} aria-label="Close dialog">
            ×
          </CloseButton>
        </Header>

        <OriginalPost>
          <div>
            <strong>{post.user.username}</strong>
          </div>
          <p>{post.content}</p>
        </OriginalPost>

        <TextArea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment..."
          disabled={submitting}
        />

        <Actions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            primary
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Reposting...' : 'Repost'}
          </Button>
        </Actions>
      </Dialog>
    </Overlay>
  );
};
