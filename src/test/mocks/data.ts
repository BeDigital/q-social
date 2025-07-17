export const mockUsers = [
  {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    profile_image: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    is_private: false,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    username: 'anotheruser',
    email: 'another@example.com',
    profile_image: 'https://example.com/avatar2.jpg',
    bio: 'Another test user bio',
    is_private: true,
    created_at: '2025-01-02T00:00:00.000Z',
  },
];

export const mockPosts = [
  {
    id: 1,
    content: 'Test post content',
    user: mockUsers[0],
    likes: [],
    comments: [],
    created_at: '2025-01-01T12:00:00.000Z',
  },
  {
    id: 2,
    content: 'Another test post',
    user: mockUsers[1],
    likes: [{ user_id: 1 }],
    comments: [
      {
        id: 1,
        content: 'Test comment',
        user: mockUsers[0],
        created_at: '2025-01-01T12:30:00.000Z',
      },
    ],
    created_at: '2025-01-01T13:00:00.000Z',
  },
];

export const mockNotifications = [
  {
    id: 1,
    type: 'like',
    content: 'testuser liked your post',
    user_id: 2,
    is_read: false,
    created_at: '2025-01-01T14:00:00.000Z',
  },
  {
    id: 2,
    type: 'comment',
    content: 'testuser commented on your post',
    user_id: 2,
    is_read: true,
    created_at: '2025-01-01T15:00:00.000Z',
  },
];
