import { AppDataSource } from '../database/ormconfig';
import { Post } from '../database/entities/Post';
import { User } from '../database/entities/User';
import { Hashtag } from '../database/entities/Hashtag';
import { In } from 'typeorm';

interface FeedOptions {
  page: number;
  limit: number;
  userId?: number;
  following?: boolean;
  hashtag?: string;
}

interface FeedResponse {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

export class FeedService {
  private static readonly postRepository = AppDataSource.getRepository(Post);
  private static readonly userRepository = AppDataSource.getRepository(User);
  private static readonly hashtagRepository = AppDataSource.getRepository(Hashtag);

  static async getFeed(options: FeedOptions): Promise<FeedResponse> {
    const { page = 1, limit = 20, userId, following = true, hashtag } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.hashtags', 'hashtags')
      .leftJoinAndSelect('post.likes', 'likes')
      .where('post.is_draft = :isDraft', { isDraft: false })
      .andWhere('post.scheduled_for IS NULL')
      .orderBy('post.created_at', 'DESC');

    if (userId && following) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['following'],
      });

      if (user) {
        const followingIds = user.following.map(f => f.id);
        if (followingIds.length > 0) {
          queryBuilder.andWhere('post.user_id IN (:...followingIds)', {
            followingIds: [...followingIds, userId],
          });
        } else {
          queryBuilder.andWhere('post.user_id = :userId', { userId });
        }
      }
    }

    if (hashtag) {
      queryBuilder
        .innerJoin('post.hashtags', 'tag')
        .andWhere('tag.name = :hashtag', { hashtag });
    }

    const [posts, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      posts,
      total,
      hasMore: total > skip + posts.length,
    };
  }

  static async getTrendingHashtags(timeWindow: number = 24): Promise<{ tag: string; count: number }[]> {
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - timeWindow);

    const trending = await this.postRepository
      .createQueryBuilder('post')
      .innerJoin('post.hashtags', 'hashtag')
      .select('hashtag.name', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('post.created_at >= :hourAgo', { hourAgo })
      .groupBy('hashtag.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return trending;
  }

  static async getExploreContent(userId: number): Promise<Post[]> {
    // Get user's interests based on their likes and follows
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['likes', 'following'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get hashtags from posts the user has liked
    const likedPostIds = user.likes.map(post => post.id);
    const likedPosts = await this.postRepository.find({
      where: { id: In(likedPostIds) },
      relations: ['hashtags'],
    });

    const interestingHashtags = new Set(
      likedPosts.flatMap(post => post.hashtags.map(tag => tag.name))
    );

    // Get posts with similar hashtags, excluding posts from blocked users
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.hashtags', 'hashtags')
      .leftJoinAndSelect('post.likes', 'likes')
      .where('post.is_draft = :isDraft', { isDraft: false })
      .andWhere('post.scheduled_for IS NULL')
      .andWhere('post.user_id != :userId', { userId });

    if (interestingHashtags.size > 0) {
      queryBuilder
        .andWhere('hashtags.name IN (:...tags)', {
          tags: Array.from(interestingHashtags),
        });
    }

    return queryBuilder
      .orderBy('post.created_at', 'DESC')
      .take(20)
      .getMany();
  }

  static async cachePopularPosts(): Promise<void> {
    // In a production environment, you would:
    // 1. Query popular posts based on engagement metrics
    // 2. Store them in a cache (e.g., Redis)
    // 3. Set cache expiration
    // For now, we'll just prepare the query
    const popularPosts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.likes', 'likes')
      .leftJoinAndSelect('post.comments', 'comments')
      .where('post.created_at >= :dayAgo', {
        dayAgo: new Date(Date.now() - 24 * 60 * 60 * 1000),
      })
      .addSelect(
        '(COUNT(DISTINCT likes.user_id) + COUNT(DISTINCT comments.id))',
        'engagement'
      )
      .groupBy('post.id')
      .orderBy('engagement', 'DESC')
      .take(100)
      .getMany();

    // In production: await cacheService.set('popular_posts', popularPosts, '1h');
  }

  static async refreshFeed(userId: number): Promise<void> {
    // Clear user's feed cache
    // In production: await cacheService.delete(`user_feed:${userId}`);
    
    // Pre-fetch new posts
    await this.getFeed({ page: 1, limit: 20, userId, following: true });
  }
}
