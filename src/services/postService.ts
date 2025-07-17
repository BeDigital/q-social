import { AppDataSource } from '../database/ormconfig';
import { Post } from '../database/entities/Post';
import { User } from '../database/entities/User';
import { Hashtag } from '../database/entities/Hashtag';

interface CreatePostDTO {
  content: string;
  userId: number;
  mediaUrls?: string[];
  isDraft?: boolean;
  scheduledFor?: Date;
}

interface UpdatePostDTO {
  content?: string;
  mediaUrls?: string[];
  isDraft?: boolean;
  scheduledFor?: Date;
}

export class PostService {
  private static readonly postRepository = AppDataSource.getRepository(Post);
  private static readonly hashtagRepository = AppDataSource.getRepository(Hashtag);

  private static extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return (content.match(hashtagRegex) || []).map(tag => tag.slice(1));
  }

  static async createPost(data: CreatePostDTO): Promise<Post> {
    const post = this.postRepository.create({
      content: data.content,
      user: { id: data.userId },
      media_urls: data.mediaUrls?.join(','),
      is_draft: data.isDraft || false,
      scheduled_for: data.scheduledFor,
    });

    // Extract and process hashtags
    const hashtags = this.extractHashtags(data.content);
    if (hashtags.length > 0) {
      post.hashtags = await Promise.all(
        hashtags.map(async name => {
          let hashtag = await this.hashtagRepository.findOne({ where: { name } });
          if (!hashtag) {
            hashtag = await this.hashtagRepository.save({ name });
          }
          return hashtag;
        })
      );
    }

    return this.postRepository.save(post);
  }

  static async updatePost(id: number, userId: number, data: UpdatePostDTO): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['hashtags'],
    });

    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    // Update basic fields
    if (data.content !== undefined) post.content = data.content;
    if (data.mediaUrls !== undefined) post.media_urls = data.mediaUrls.join(',');
    if (data.isDraft !== undefined) post.is_draft = data.isDraft;
    if (data.scheduledFor !== undefined) post.scheduled_for = data.scheduledFor;

    // Update hashtags if content changed
    if (data.content) {
      const hashtags = this.extractHashtags(data.content);
      post.hashtags = await Promise.all(
        hashtags.map(async name => {
          let hashtag = await this.hashtagRepository.findOne({ where: { name } });
          if (!hashtag) {
            hashtag = await this.hashtagRepository.save({ name });
          }
          return hashtag;
        })
      );
    }

    return this.postRepository.save(post);
  }

  static async deletePost(id: number, userId: number): Promise<boolean> {
    const result = await this.postRepository.delete({
      id,
      user: { id: userId },
    });

    return result.affected === 1;
  }

  static async getPost(id: number): Promise<Post | null> {
    return this.postRepository.findOne({
      where: { id },
      relations: ['user', 'hashtags', 'comments', 'likes'],
    });
  }

  static async getUserPosts(
    userId: number,
    page: number = 1,
    limit: number = 20,
    includeDrafts: boolean = false
  ): Promise<[Post[], number]> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .where('post.user_id = :userId', { userId })
      .andWhere(includeDrafts ? '1=1' : 'post.is_draft = false')
      .orderBy('post.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .leftJoinAndSelect('post.hashtags', 'hashtags')
      .leftJoinAndSelect('post.user', 'user');

    return query.getManyAndCount();
  }

  static async getDraftPosts(userId: number): Promise<Post[]> {
    return this.postRepository.find({
      where: {
        user: { id: userId },
        is_draft: true,
      },
      relations: ['hashtags'],
      order: {
        updated_at: 'DESC',
      },
    });
  }

  static async getScheduledPosts(userId: number): Promise<Post[]> {
    return this.postRepository.find({
      where: {
        user: { id: userId },
        scheduled_for: Not(IsNull()),
      },
      relations: ['hashtags'],
      order: {
        scheduled_for: 'ASC',
      },
    });
  }

  static async publishScheduledPosts(): Promise<void> {
    const now = new Date();
    await this.postRepository
      .createQueryBuilder()
      .update(Post)
      .set({
        is_draft: false,
        scheduled_for: null,
      })
      .where('scheduled_for <= :now', { now })
      .andWhere('is_draft = :isDraft', { isDraft: true })
      .execute();
  }
}
