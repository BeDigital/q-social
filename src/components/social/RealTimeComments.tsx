import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WebSocketService } from '../../services/websocketService';
import { Comment } from '../../types/Comment';

interface RealTimeCommentsProps {
  postId: number;
  initialComments: Comment[];
  onAddComment: (content: string) => Promise<void>;
}

const Container = styled.div`
  margin-top: 1rem;
`;

const CommentForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Input = styled.input`
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

const TypingIndicator = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textLight};
  font-style: italic;
  height: 1.5rem;
  margin-bottom: 0.5rem;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CommentItem = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  background-color: ${props => props.theme.colors.backgroundAlt};
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const RealTimeComments: React.FC<RealTimeCommentsProps> = ({
  postId,
  initialComments,
  onAddComment,
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const ws = WebSocketService.getInstance();

  useEffect(() => {
    // Subscribe to real-time updates for this post
    ws.subscribeToComments(postId);

    // Handle new comments
    ws.on('comment_update', handleCommentUpdate);

    // Handle typing indicators
    ws.on('typing', handleTypingUpdate);

    return () => {
      ws.unsubscribeFromComments(postId);
      ws.off('comment_update', handleCommentUpdate);
      ws.off('typing', handleTypingUpdate);
    };
  }, [postId]);

  const handleCommentUpdate = (data: { comment: Comment; action: 'add' | 'delete' }) => {
    if (data.action === 'add') {
      setComments(prev => [data.comment, ...prev]);
    } else {
      setComments(prev => prev.filter(comment => comment.id !== data.comment.id));
    }
  };

  const handleTypingUpdate = (data: { userId: number; username: string; isTyping: boolean }) => {
    setTypingUsers(prev => {
      const next = new Set(prev);
      if (data.isTyping) {
        next.add(data.username);
      } else {
        next.delete(data.username);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
      // The new comment will be added through the WebSocket update
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
    ws.sendTypingStatus(postId, Boolean(e.target.value));
  };

  const renderTypingIndicator = () => {
    const users = Array.from(typingUsers);
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users.length} people are typing...`;
  };

  return (
    <Container>
      <CommentForm onSubmit={handleSubmit}>
        <Input
          type="text"
          value={newComment}
          onChange={handleInputChange}
          placeholder="Write a comment..."
          disabled={submitting}
        />
      </CommentForm>

      <TypingIndicator>
        {renderTypingIndicator()}
      </TypingIndicator>

      <CommentList>
        {comments.map(comment => (
          <CommentItem key={comment.id}>
            <img
              src={comment.user.profile_image || '/default-avatar.png'}
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%' }}
            />
            <div>
              <strong>{comment.user.username}</strong>
              <p>{comment.content}</p>
            </div>
          </CommentItem>
        ))}
      </CommentList>
    </Container>
  );
};
