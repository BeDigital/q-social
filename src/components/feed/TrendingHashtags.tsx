import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

interface TrendingHashtag {
  tag: string;
  count: number;
}

const Container = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.colors.text};
  font-size: 1.2rem;
`;

const HashtagList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const HashtagItem = styled.li`
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const HashtagLink = styled(Link)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
`;

const Count = styled.span`
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
  margin-left: 0.5rem;

  &:hover {
    text-decoration: underline;
  }
`;

export const TrendingHashtags: React.FC = () => {
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feed/trending');
      const data = await response.json();
      setTrending(data);
    } catch (error) {
      console.error('Failed to fetch trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    // Refresh trending hashtags every 5 minutes
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Container>
        <Title>Trending</Title>
        <div>Loading...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        Trending
        <RefreshButton onClick={fetchTrending}>Refresh</RefreshButton>
      </Title>
      <HashtagList>
        {trending.map(({ tag, count }) => (
          <HashtagItem key={tag}>
            <HashtagLink to={`/hashtag/${tag}`}>
              #{tag}
              <Count>{count} posts</Count>
            </HashtagLink>
          </HashtagItem>
        ))}
      </HashtagList>
    </Container>
  );
};
