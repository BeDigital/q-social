import { AppDataSource } from '../database/ormconfig';
import { User } from '../database/entities/User';
import { Post } from '../database/entities/Post';
import { Comment } from '../database/entities/Comment';
import { DataProtectionService } from './dataProtectionService';

interface UserData {
  personalInfo: {
    username: string;
    email: string;
    profile: any;
  };
  posts: any[];
  comments: any[];
  likes: any[];
  followers: any[];
  following: any[];
}

export class DataPrivacyService {
  private static readonly userRepository = AppDataSource.getRepository(User);
  private static readonly postRepository = AppDataSource.getRepository(Post);
  private static readonly commentRepository = AppDataSource.getRepository(Comment);

  // GDPR Data Export
  static async exportUserData(userId: number): Promise<UserData> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'posts',
        'comments',
        'likes',
        'followers',
        'following',
      ],
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userData: UserData = {
      personalInfo: {
        username: user.username,
        email: user.email,
        profile: {
          bio: user.bio,
          profile_image: user.profile_image,
          is_private: user.is_private,
          created_at: user.created_at,
        },
      },
      posts: await this.postRepository.find({
        where: { user: { id: userId } },
        relations: ['likes', 'comments'],
      }),
      comments: await this.commentRepository.find({
        where: { user: { id: userId } },
        relations: ['post'],
      }),
      likes: user.likes,
      followers: user.followers.map(f => ({
        username: f.username,
        created_at: f.created_at,
      })),
      following: user.following.map(f => ({
        username: f.username,
        created_at: f.created_at,
      })),
    };

    return userData;
  }

  // GDPR Right to be Forgotten
  static async deleteUserData(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['posts', 'comments'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Delete user's posts
    await this.postRepository.remove(user.posts);

    // Delete user's comments
    await this.commentRepository.remove(user.comments);

    // Anonymize user data before deletion
    await this.userRepository.update(userId, {
      username: `deleted_user_${Date.now()}`,
      email: `deleted_${Date.now()}@deleted.com`,
      password_hash: '',
      profile_image: null,
      bio: null,
      is_deleted: true,
    });

    // Finally, delete the user
    await this.userRepository.remove(user);
  }

  // GDPR Data Rectification
  static async updateUserData(userId: number, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update user data
    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  // GDPR Consent Management
  static async updateUserConsent(
    userId: number,
    consents: {
      marketing?: boolean;
      analytics?: boolean;
      thirdParty?: boolean;
    }
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, {
      consent_marketing: consents.marketing,
      consent_analytics: consents.analytics,
      consent_third_party: consents.thirdParty,
      consent_updated_at: new Date(),
    });
  }

  // CCPA Do Not Sell
  static async updateDoNotSell(userId: number, doNotSell: boolean): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, {
      do_not_sell: doNotSell,
      do_not_sell_updated_at: new Date(),
    });
  }

  // Data Retention
  static async applyDataRetention(): Promise<void> {
    const retentionPeriod = 24 * 60 * 60 * 1000 * 365 * 2; // 2 years
    const cutoffDate = new Date(Date.now() - retentionPeriod);

    // Delete old posts
    await this.postRepository.delete({
      created_at: cutoffDate,
      is_archived: false,
    });

    // Delete old comments
    await this.commentRepository.delete({
      created_at: cutoffDate,
    });

    // Archive old user data
    const oldUsers = await this.userRepository.find({
      where: {
        last_login: cutoffDate,
        is_archived: false,
      },
    });

    for (const user of oldUsers) {
      await this.archiveUserData(user.id);
    }
  }

  // Data Archiving
  private static async archiveUserData(userId: number): Promise<void> {
    const userData = await this.exportUserData(userId);
    const encryptedData = await DataProtectionService.encrypt(
      JSON.stringify(userData)
    );

    await this.userRepository.update(userId, {
      is_archived: true,
      archived_data: encryptedData,
      archived_at: new Date(),
    });
  }

  // Privacy Policy Version Management
  static async updatePrivacyPolicyConsent(
    userId: number,
    version: string
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, {
      privacy_policy_version: version,
      privacy_policy_accepted_at: new Date(),
    });
  }

  // Data Processing Audit Log
  static async logDataProcessing(
    userId: number,
    action: string,
    details: any
  ): Promise<void> {
    await AppDataSource.createQueryBuilder()
      .insert()
      .into('data_processing_logs')
      .values({
        user_id: userId,
        action,
        details: JSON.stringify(details),
        created_at: new Date(),
      })
      .execute();
  }
}
