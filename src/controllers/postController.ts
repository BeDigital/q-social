import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { MediaService } from '../services/mediaService';

export class PostController {
  static async createPost(req: Request, res: Response) {
    try {
      const { content, isDraft, scheduledFor } = req.body;
      const userId = req.user!.userId;
      let mediaUrls: string[] = [];

      // Handle media uploads if present
      if (req.files && Array.isArray(req.files)) {
        mediaUrls = await Promise.all(
          req.files.map(file => MediaService.uploadMedia(file, userId))
        ).then(results => results.map(result => result.url));
      }

      const post = await PostService.createPost({
        content,
        userId,
        mediaUrls,
        isDraft,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      });

      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create post', error });
    }
  }

  static async updatePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, isDraft, scheduledFor } = req.body;
      const userId = req.user!.userId;
      let mediaUrls: string[] | undefined;

      // Handle media uploads if present
      if (req.files && Array.isArray(req.files)) {
        mediaUrls = await Promise.all(
          req.files.map(file => MediaService.uploadMedia(file, userId))
        ).then(results => results.map(result => result.url));
      }

      const post = await PostService.updatePost(parseInt(id), userId, {
        content,
        mediaUrls,
        isDraft,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      });

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update post', error });
    }
  }

  static async deletePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const post = await PostService.getPost(parseInt(id));
      if (post?.media_urls) {
        const mediaUrls = post.media_urls.split(',');
        await Promise.all(mediaUrls.map(url => MediaService.deleteMedia(url)));
      }

      const success = await PostService.deletePost(parseInt(id), userId);
      if (success) {
        res.json({ message: 'Post deleted successfully' });
      } else {
        res.status(404).json({ message: 'Post not found or unauthorized' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete post', error });
    }
  }

  static async getPost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await PostService.getPost(parseInt(id));

      if (post) {
        res.json(post);
      } else {
        res.status(404).json({ message: 'Post not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to get post', error });
    }
  }

  static async getUserPosts(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const includeDrafts = req.user?.userId === parseInt(userId);

      const [posts, total] = await PostService.getUserPosts(
        parseInt(userId),
        page,
        limit,
        includeDrafts
      );

      res.json({
        posts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user posts', error });
    }
  }

  static async getDraftPosts(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const posts = await PostService.getDraftPosts(userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get draft posts', error });
    }
  }

  static async getScheduledPosts(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const posts = await PostService.getScheduledPosts(userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get scheduled posts', error });
    }
  }
}
