import { Request, Response } from 'express';
import { FeedService } from '../services/feedService';

export class FeedController {
  static async getFeed(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.user?.userId;
      const following = req.query.following !== 'false';
      const hashtag = req.query.hashtag as string;

      const feed = await FeedService.getFeed({
        page,
        limit,
        userId,
        following,
        hashtag,
      });

      res.json(feed);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch feed', error });
    }
  }

  static async getTrendingHashtags(req: Request, res: Response) {
    try {
      const timeWindow = parseInt(req.query.hours as string) || 24;
      const trending = await FeedService.getTrendingHashtags(timeWindow);
      res.json(trending);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch trending hashtags', error });
    }
  }

  static async getExploreContent(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const content = await FeedService.getExploreContent(userId);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch explore content', error });
    }
  }

  static async refreshFeed(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await FeedService.refreshFeed(userId);
      res.json({ message: 'Feed refreshed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to refresh feed', error });
    }
  }
}
