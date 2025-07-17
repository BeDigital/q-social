import { randomBytes } from 'crypto';
import { AppDataSource } from '../../database/ormconfig';
import { User } from '../../database/entities/User';
import { EmailVerificationToken } from '../../database/entities/EmailVerificationToken';
import { EmailService } from './emailService';

export class EmailVerificationService {
  private static readonly tokenRepository = AppDataSource.getRepository(EmailVerificationToken);
  private static readonly userRepository = AppDataSource.getRepository(User);

  private static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  static async createVerificationToken(user: User): Promise<string> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    await this.tokenRepository.save({
      token,
      user_id: user.id,
      expires_at: expiresAt,
    });

    return token;
  }

  static async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.createVerificationToken(user);
    await EmailService.sendVerificationEmail(user.email, token);
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const verificationToken = await this.tokenRepository.findOne({
      where: {
        token,
        is_used: false,
      },
      relations: ['user'],
    });

    if (!verificationToken) {
      throw new Error('Invalid verification token');
    }

    if (verificationToken.expires_at < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Mark token as used
    verificationToken.is_used = true;
    await this.tokenRepository.save(verificationToken);

    // Update user's email verification status
    await this.userRepository.update(verificationToken.user_id, {
      email_verified: true,
    });

    return true;
  }

  static async resendVerificationEmail(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.email_verified) {
      throw new Error('Email is already verified');
    }

    // Invalidate any existing tokens
    await this.tokenRepository.update(
      { user_id: userId, is_used: false },
      { is_used: true }
    );

    // Send new verification email
    await this.sendVerificationEmail(user);
  }
}
