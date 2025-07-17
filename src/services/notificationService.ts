import { AppDataSource } from '../database/ormconfig';
import { Notification } from '../database/entities/Notification';
import { WebSocketService } from './websocketService';

interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  follows: boolean;
  reposts: boolean;
  email: boolean;
  push: boolean;
}

export class NotificationService {
  private static readonly notificationRepository = AppDataSource.getRepository(Notification);
  private static readonly ws = WebSocketService.getInstance();

  static async getNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<[Notification[], number]> {
    return this.notificationRepository.findAndCount({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  static async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: {
        user: { id: userId },
        is_read: false,
      },
    });
  }

  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { is_read: true }
    );
  }

  static async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId } },
      { is_read: true }
    );
  }

  static async createNotification(
    userId: number,
    type: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<Notification> {
    const notification = await this.notificationRepository.save({
      user: { id: userId },
      type,
      content,
      metadata,
    });

    // Send real-time notification
    this.ws.emit('notification', {
      userId,
      notification: {
        ...notification,
        user: { id: userId },
      },
    });

    return notification;
  }

  static async deleteNotification(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      user: { id: userId },
    });
  }

  static async getUserPreferences(userId: number): Promise<NotificationPreferences> {
    // In a real application, this would fetch from a preferences table
    // For now, return default preferences
    return {
      likes: true,
      comments: true,
      mentions: true,
      follows: true,
      reposts: true,
      email: true,
      push: true,
    };
  }

  static async updateUserPreferences(
    userId: number,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // In a real application, this would update the preferences table
    // For now, just return the merged preferences
    const currentPreferences = await this.getUserPreferences(userId);
    return {
      ...currentPreferences,
      ...preferences,
    };
  }

  static async sendPushNotification(
    userId: number,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<void> {
    // In a real application, this would integrate with a push notification service
    // For now, just log the notification
    console.log('Push notification:', { userId, title, body, data });
  }

  static async sendEmailNotification(
    userId: number,
    subject: string,
    body: string
  ): Promise<void> {
    // In a real application, this would integrate with an email service
    // For now, just log the email
    console.log('Email notification:', { userId, subject, body });
  }

  // Helper method to determine if a notification should be sent based on user preferences
  static async shouldNotify(
    userId: number,
    type: string
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    return preferences[type as keyof NotificationPreferences] || false;
  }
}
