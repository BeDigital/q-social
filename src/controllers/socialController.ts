import { Request, Response } from 'express';
import { SocialService } from '../services/socialService';

export class SocialController {
  static async followUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { followingId } = req.params;

      await SocialService.followUser(userId, parseInt(followingId));
      res.json({ message: 'Successfully followed user' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async unfollowUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { followingId } = req.params;

      await SocialService.unfollowUser(userId, parseInt(followingId));
      res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async likePost(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { postId } = req.params;

      await SocialService.likePost(userId, parseInt(postId));
      res.json({ message: 'Successfully liked post' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async unlikePost(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { postId } = req.params;

      await SocialService.unlikePost(userId, parseInt(postId));
      res.json({ message: 'Successfully unliked post' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async createComment(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { postId } = req.params;
      const { content } = req.body;

      const comment = await SocialService.createComment(
        userId,
        parseInt(postId),
        content
      );

      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteComment(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { commentId } = req.params;

      await SocialService.deleteComment(userId, parseInt(commentId));
      res.json({ message: 'Successfully deleted comment' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async repostPost(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { postId } = req.params;
      const { content } = req.body;

      const repost = await SocialService.repostPost(
        userId,
        parseInt(postId),
        content
      );

      res.status(201).json(repost);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async blockUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { blockedId } = req.params;

      await SocialService.blockUser(userId, parseInt(blockedId));
      res.json({ message: 'Successfully blocked user' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async unblockUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { blockedId } = req.params;

      await SocialService.unblockUser(userId, parseInt(blockedId));
      res.json({ message: 'Successfully unblocked user' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}
