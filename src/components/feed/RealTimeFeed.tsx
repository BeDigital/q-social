import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WebSocketService } from '../../services/websocketService';
import { Post } from '../../types/Post';
import { PostCard } from '../post/PostCard';

interface RealTimeFeedProps {
  initialPosts: Post[];
  userId?: number;
}

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
`;

const NewPostsButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const PostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PostWrapper = styled.div`
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const RealTimeFeed: React.FC<RealTimeFeedProps> = ({
  initialPosts,
  userId,
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [likeUpdates, setLikeUpdates] = useState<Map<number, number>>(new Map());
  const ws = WebSocketService.getInstance();

  useEffect(() => {
    // Subscribe to feed updates
    ws.subscribeToPosts(userId);

    // Handle new posts
    ws.on('post_update', handlePostUpdate);

    // Handle like updates
    ws.on('like_update', handleLikeUpdate);

    return () => {
      ws.unsubscribeFromPosts(userId);
      ws.off('post_update', handlePostUpdate);
      ws.off('like_update', handleLikeUpdate);
    };
  }, [userId]);

  const handlePostUpdate = (data: { post: Post; action: 'add' | 'update' | 'delete' }) => {
    switch (data.action) {
      case 'add':
        setNewPosts(prev => [data.post, ...prev]);
        break;
      case 'update':
        setPosts(prev =>
          prev.map(post =>
            post.id === data.post.id ? data.post : post
          )
        );
        setNewPosts(prev =>
          prev.map(post =>
            post.id === data.post.id ? data.post : post
          )
        );
        break;
      case 'delete':
        setPosts(prev =>
          prev.filter(post => post.id !== data.post.id)
        );
        setNewPosts(prev =>
          prev.filter(post => post.id !== data.post.id)
        );
        break;
    }
  };

  const handleLikeUpdate = (data: { postId: number; likeCount: number }) => {
    setLikeUpdates(prev => new Map(prev).set(data.postId, data.likeCount));
  };

  const showNewPosts = () => {
    setPosts(prev => [...newPosts, ...prev]);
    setNewPosts([]);
  };

  const renderPost = (post: Post) => {
    const updatedLikeCount = likeUpdates.get(post.id);
    const updatedPost = updatedLikeCount !== undefined
      ? { ...post, likes: { length: updatedLikeCount } }
      : post;

    return (
      <PostWrapper key={post.id}>
        <PostCard post={updatedPost} />
      </PostWrapper>
    );
  };

  return (
    <Container>
      {newPosts.length > 0 && (
        <NewPostsButton onClick={showNewPosts}>
          Show {newPosts.length} new {newPosts.length === 1 ? 'post' : 'posts'}
        </NewPostsButton>
      )}

      <PostList>
        {posts.map(renderPost)}
      </PostList>
    </Container>
  );
};
