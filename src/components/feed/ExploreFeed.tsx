import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Post } from '../../types/Post';
import { PostCard } from '../post/PostCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  color: ${props => props.theme.colors.text};
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  background: ${props => 
    props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => 
    props.active ? 'white' : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => 
      props.active ? props.theme.colors.primaryDark : props.theme.colors.backgroundHover};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

type Filter = 'all' | 'media' | 'popular';

export const ExploreFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchExplorePosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feed/explore');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch explore content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorePosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    switch (filter) {
      case 'media':
        return post.media_urls && post.media_urls.length > 0;
      case 'popular':
        return (post.likes?.length || 0) > 5;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Explore</Title>
      </Header>

      <FilterContainer>
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </FilterButton>
        <FilterButton
          active={filter === 'media'}
          onClick={() => setFilter('media')}
        >
          Media
        </FilterButton>
        <FilterButton
          active={filter === 'popular'}
          onClick={() => setFilter('popular')}
        >
          Popular
        </FilterButton>
      </FilterContainer>

      <Grid>
        {filteredPosts.map(post => (
          <PostCard key={post.id} post={post} compact />
        ))}
      </Grid>

      {filteredPosts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No posts found for the selected filter.</p>
        </div>
      )}
    </Container>
  );
};
