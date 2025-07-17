import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Comment } from '../../types/Comment';

interface CommentSectionProps {
  postId: number;
  initialComments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}

const Container = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const CommentForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const CommentInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SubmitButton = styled.button<{ disabled: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 20px;
  background-color: ${props => 
    props.disabled ? props.theme.colors.disabled : props.theme.colors.primary};
  color: white;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  background-color: ${props => props.theme.colors.backgroundAlt};
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const CommentContent = styled.div`
  flex: 1;
`;

const Username = styled.span`
  font-weight: 600;
  margin-right: 0.5rem;
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textLight};
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.error};
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialComments,
  onAddComment,
  onDeleteComment,
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment);
      // In a real app, you'd get the new comment from the response
      // and add it to the list. For now, we'll simulate it:
      const simulatedNewComment: Comment = {
        id: Date.now(),
        content: newComment,
        user: {
          id: 1, // Current user's ID
          username: 'currentuser',
          profile_image: '/default-avatar.png',
        },
        created_at: new Date().toISOString(),
      };
      setComments(prev => [simulatedNewComment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await onDeleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container>
      <CommentForm onSubmit={handleSubmit}>
        <CommentInput
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={submitting}
        />
        <SubmitButton
          type="submit"
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? 'Posting...' : 'Post'}
        </SubmitButton>
      </CommentForm>

      <CommentList>
        {comments.map(comment => (
          <CommentItem key={comment.id}>
            <Avatar
              src={comment.user.profile_image || '/default-avatar.png'}
              alt={comment.user.username}
            />
            <CommentContent>
              <div>
                <Username>{comment.user.username}</Username>
                <Timestamp>{formatTimestamp(comment.created_at)}</Timestamp>
              </div>
              <p>{comment.content}</p>
            </CommentContent>
            {comment.user.id === 1 && ( // Check if comment is from current user
              <DeleteButton
                onClick={() => handleDelete(comment.id)}
                aria-label="Delete comment"
              >
                ×
              </DeleteButton>
            )}
          </CommentItem>
        ))}
      </CommentList>
    </Container>
  );
};
