import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { WebSocketService } from '../../services/websocketService';
import { NotificationService } from '../../services/notificationService';
import { Notification } from '../../types/Notification';

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
`;

const MarkAllReadButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const NotificationItem = styled.div<{ isRead: boolean }>`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => 
    props.isRead ? props.theme.colors.background : props.theme.colors.backgroundAlt};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 1rem;
`;

const Content = styled.div`
  flex: 1;
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textLight};
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  margin-top: 1rem;

  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ws = WebSocketService.getInstance();

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications
    ws.on('notification', handleNewNotification);

    return () => {
      ws.off('notification', handleNewNotification);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [newNotifications, total] = await NotificationService.getNotifications(
        1, // Current user ID
        page
      );
      setNotifications(prev => 
        page === 1 ? newNotifications : [...prev, ...newNotifications]
      );
      setHasMore(notifications.length < total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await NotificationService.markAsRead(notificationId, 1); // Current user ID
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead(1); // Current user ID
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadNotifications();
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

  const renderNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return (
          <Link to={`/post/${notification.metadata.postId}`}>
            {notification.content}
          </Link>
        );
      case 'comment':
        return (
          <Link to={`/post/${notification.metadata.postId}#comment-${notification.metadata.commentId}`}>
            {notification.content}
          </Link>
        );
      case 'follow':
        return (
          <Link to={`/user/${notification.metadata.userId}`}>
            {notification.content}
          </Link>
        );
      default:
        return notification.content;
    }
  };

  if (loading && notifications.length === 0) {
    return <div>Loading notifications...</div>;
  }

  return (
    <Container>
      <Header>
        <Title>Notifications</Title>
        <MarkAllReadButton onClick={handleMarkAllAsRead}>
          Mark all as read
        </MarkAllReadButton>
      </Header>

      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          isRead={notification.is_read}
          onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
        >
          <Avatar
            src={notification.metadata.actorAvatar || '/default-avatar.png'}
            alt=""
          />
          <Content>
            {renderNotificationContent(notification)}
            <div>
              <Timestamp>{formatTimestamp(notification.created_at)}</Timestamp>
            </div>
          </Content>
        </NotificationItem>
      ))}

      {hasMore && (
        <LoadMoreButton onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load more'}
        </LoadMoreButton>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          No notifications yet
        </div>
      )}
    </Container>
  );
};
