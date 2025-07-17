import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import styled from 'styled-components';
import { Post } from '../../types/Post';
import { PostCard } from '../post/PostCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface FeedProps {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
}

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const RefreshButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.textLight};
`;

export const Feed: React.FC<FeedProps> = ({
  posts,
  loading,
  hasMore,
  onLoadMore,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  if (!posts.length && !loading) {
    return (
      <EmptyState>
        <h3>No posts to show</h3>
        <p>Follow some users to see their posts here</p>
        <RefreshButton onClick={handleRefresh}>Refresh</RefreshButton>
      </EmptyState>
    );
  }

  return (
    <FeedContainer>
      <RefreshButton onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
      </RefreshButton>

      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {loading && (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      )}

      {hasMore && !loading && <div ref={ref} />}
    </FeedContainer>
  );
};
