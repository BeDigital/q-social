import { AppDataSource } from '../database/ormconfig';
import { User } from '../database/entities/User';
import { Post } from '../database/entities/Post';
import { Comment } from '../database/entities/Comment';
import { Notification } from '../database/entities/Notification';

export class SocialService {
  private static readonly userRepository = AppDataSource.getRepository(User);
  private static readonly postRepository = AppDataSource.getRepository(Post);
  private static readonly commentRepository = AppDataSource.getRepository(Comment);
  private static readonly notificationRepository = AppDataSource.getRepository(Notification);

  // Follow/Unfollow
  static async followUser(followerId: number, followingId: number): Promise<void> {
    const follower = await this.userRepository.findOne({
      where: { id: followerId },
      relations: ['following'],
    });

    const following = await this.userRepository.findOne({
      where: { id: followingId },
    });

    if (!follower || !following) {
      throw new Error('User not found');
    }

    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    if (follower.following.some(user => user.id === followingId)) {
      throw new Error('Already following this user');
    }

    follower.following.push(following);
    await this.userRepository.save(follower);

    // Create notification
    await this.notificationRepository.save({
      user: following,
      type: 'follow',
      content: `${follower.username} started following you`,
    });
  }

  static async unfollowUser(followerId: number, followingId: number): Promise<void> {
    const follower = await this.userRepository.findOne({
      where: { id: followerId },
      relations: ['following'],
    });

    if (!follower) {
      throw new Error('User not found');
    }

    follower.following = follower.following.filter(user => user.id !== followingId);
    await this.userRepository.save(follower);
  }

  // Like/Unlike
  static async likePost(userId: number, postId: number): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['likes', 'user'],
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!post || !user) {
      throw new Error('Post or user not found');
    }

    if (post.likes.some(like => like.id === userId)) {
      throw new Error('Already liked this post');
    }

    post.likes.push(user);
    await this.postRepository.save(post);

    // Create notification if the like is from another user
    if (post.user.id !== userId) {
      await this.notificationRepository.save({
        user: post.user,
        type: 'like',
        content: `${user.username} liked your post`,
      });
    }
  }

  static async unlikePost(userId: number, postId: number): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['likes'],
    });

    if (!post) {
      throw new Error('Post not found');
    }

    post.likes = post.likes.filter(user => user.id !== userId);
    await this.postRepository.save(post);
  }

  // Comments
  static async createComment(userId: number, postId: number, content: string): Promise<Comment> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!post || !user) {
      throw new Error('Post or user not found');
    }

    const comment = await this.commentRepository.save({
      content,
      post,
      user,
    });

    // Create notification if the comment is from another user
    if (post.user.id !== userId) {
      await this.notificationRepository.save({
        user: post.user,
        type: 'comment',
        content: `${user.username} commented on your post`,
      });
    }

    return comment;
  }

  static async deleteComment(userId: number, commentId: number): Promise<void> {
    const result = await this.commentRepository.delete({
      id: commentId,
      user: { id: userId },
    });

    if (result.affected === 0) {
      throw new Error('Comment not found or unauthorized');
    }
  }

  // Repost
  static async repostPost(userId: number, postId: number, content?: string): Promise<Post> {
    const originalPost = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!originalPost || !user) {
      throw new Error('Post or user not found');
    }

    const repost = await this.postRepository.save({
      content: content || '',
      user,
      original_post_id: postId,
      is_repost: true,
    });

    // Create notification
    if (originalPost.user.id !== userId) {
      await this.notificationRepository.save({
        user: originalPost.user,
        type: 'repost',
        content: `${user.username} reposted your post`,
      });
    }

    return repost;
  }

  // Mention handling
  static async handleMentions(content: string, postId: number, userId: number): Promise<void> {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (!mentions) return;

    const usernames = mentions.map(mention => mention.slice(1));
    const mentionedUsers = await this.userRepository.find({
      where: { username: In(usernames) },
    });

    // Create notifications for mentioned users
    const notifications = mentionedUsers
      .filter(user => user.id !== userId) // Don't notify self-mentions
      .map(user => ({
        user,
        type: 'mention',
        content: `${(await this.userRepository.findOne({ where: { id: userId } }))?.username} mentioned you in a post`,
        post_id: postId,
      }));

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
    }
  }

  // Blocking functionality
  static async blockUser(userId: number, blockedId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['blocked', 'following', 'followers'],
    });

    const blockedUser = await this.userRepository.findOne({
      where: { id: blockedId },
    });

    if (!user || !blockedUser) {
      throw new Error('User not found');
    }

    if (userId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    // Remove any existing follow relationships
    user.following = user.following.filter(f => f.id !== blockedId);
    user.followers = user.followers.filter(f => f.id !== blockedId);

    // Add to blocked list
    if (!user.blocked.some(b => b.id === blockedId)) {
      user.blocked.push(blockedUser);
    }

    await this.userRepository.save(user);
  }

  static async unblockUser(userId: number, blockedId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['blocked'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.blocked = user.blocked.filter(b => b.id !== blockedId);
    await this.userRepository.save(user);
  }
}
