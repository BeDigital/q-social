# Component Documentation

## Overview

Q-Social uses a component-based architecture built with React and TypeScript. All components follow accessibility guidelines and support both light and dark themes.

## Base Components

### Button

A versatile button component that supports different variants, sizes, and states.

```tsx
import { Button } from '@/components/common/Button';

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Loading</Button>
<Button disabled>Disabled</Button>
<Button isFullWidth>Full Width</Button>

// With icons
<Button leftIcon={<Icon />}>With Icon</Button>
<Button rightIcon={<Icon />}>With Icon</Button>
```

### Input

A form input component with built-in validation and error handling.

```tsx
import { Input } from '@/components/common/Input';

// Basic usage
<Input placeholder="Enter text" />

// With label and helper text
<Input
  label="Username"
  helperText="Enter your username"
  placeholder="johndoe"
/>

// With error
<Input
  label="Email"
  error="Invalid email address"
  value={email}
  onChange={handleChange}
/>

// Variants
<Input variant="outline" />
<Input variant="filled" />
<Input variant="flushed" />

// With icons
<Input
  leftElement={<Icon />}
  rightElement={<Icon />}
  placeholder="Search"
/>
```

### Modal

A modal dialog component with customizable content and actions.

```tsx
import { Modal } from '@/components/common/Modal';

// Basic usage
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
>
  <p>Modal content goes here</p>
</Modal>

// With footer
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
  footer={
    <div>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>

// Different sizes
<Modal size="sm" />
<Modal size="md" />
<Modal size="lg" />
<Modal size="xl" />
<Modal size="full" />
```

## Feature Components

### Post Components

#### PostCard

Displays a single post with interactions.

```tsx
import { PostCard } from '@/components/post/PostCard';

<PostCard
  post={{
    id: 1,
    content: 'Post content',
    user: {
      id: 1,
      username: 'johndoe',
      profile_image: '/avatar.jpg',
    },
    likes: [],
    comments: [],
    created_at: '2025-01-01T00:00:00Z',
  }}
  onLike={handleLike}
  onComment={handleComment}
  onShare={handleShare}
/>
```

#### PostForm

Form for creating or editing posts.

```tsx
import { PostForm } from '@/components/post/PostForm';

<PostForm
  onSubmit={handleSubmit}
  initialContent=""
  maxLength={280}
  allowMedia={true}
  allowScheduling={true}
/>
```

### Feed Components

#### Feed

Displays a feed of posts with infinite scroll.

```tsx
import { Feed } from '@/components/feed/Feed';

<Feed
  posts={posts}
  loading={loading}
  hasMore={hasMore}
  onLoadMore={loadMore}
  onRefresh={refresh}
/>
```

#### TrendingHashtags

Displays trending hashtags sidebar.

```tsx
import { TrendingHashtags } from '@/components/feed/TrendingHashtags';

<TrendingHashtags />
```

### Social Components

#### FollowButton

Button for following/unfollowing users.

```tsx
import { FollowButton } from '@/components/social/FollowButton';

<FollowButton
  userId={123}
  isFollowing={false}
  onFollow={handleFollow}
  onUnfollow={handleUnfollow}
/>
```

#### LikeButton

Button for liking/unliking posts.

```tsx
import { LikeButton } from '@/components/social/LikeButton';

<LikeButton
  postId={123}
  initialLikes={5}
  isLiked={false}
  onLike={handleLike}
  onUnlike={handleUnlike}
/>
```

## Legal Components

### PrivacyPolicy

Displays privacy policy with consent management.

```tsx
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy';

<PrivacyPolicy
  userId={123}
  currentVersion="1.0.0"
  onAccept={handleAccept}
/>
```

### CookieConsent

Cookie consent banner with preference management.

```tsx
import { CookieConsent } from '@/components/legal/CookieConsent';

<CookieConsent
  onAccept={handleAccept}
  onDecline={handleDecline}
/>
```

## Hooks

### useAuth

Hook for authentication state and operations.

```tsx
import { useAuth } from '@/hooks/useAuth';

const {
  user,
  isAuthenticated,
  login,
  logout,
  register,
} = useAuth();
```

### useWebSocket

Hook for WebSocket connections and real-time updates.

```tsx
import { useWebSocket } from '@/hooks/useWebSocket';

const {
  isConnected,
  subscribe,
  unsubscribe,
  send,
} = useWebSocket();
```

## Theme

Components use the theme provided through styled-components' ThemeProvider:

```tsx
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '@/styles/theme';

<ThemeProvider theme={isDark ? darkTheme : lightTheme}>
  <App />
</ThemeProvider>
```

## Accessibility

All components follow WCAG 2.1 guidelines:

- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management

Example:

```tsx
// Accessible button with loading state
<Button
  aria-label="Submit form"
  aria-busy={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>
```

## Testing

Components include comprehensive test coverage:

```tsx
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```
