import { AppDataSource } from '../../database/ormconfig';
import { User } from '../../database/entities/User';
import { TokenService } from './tokenService';
import { PasswordValidator } from '../utils/passwordValidator';

interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | 'facebook';
}

export class OAuthService {
  private static readonly userRepository = AppDataSource.getRepository(User);

  static async handleOAuthLogin(profile: OAuthProfile) {
    let user = await this.userRepository.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      // Create new user
      const username = await this.generateUniqueUsername(profile.name || profile.email);
      const randomPassword = this.generateRandomPassword();
      const passwordHash = await PasswordValidator.generatePasswordHash(randomPassword);

      user = await this.userRepository.save({
        email: profile.email,
        username,
        password_hash: passwordHash,
        profile_image: profile.picture,
        email_verified: true, // OAuth emails are pre-verified
      });
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  private static async generateUniqueUsername(base: string): Promise<string> {
    // Remove email domain if base is an email
    const nameBase = base.split('@')[0];
    
    // Remove special characters and spaces
    let username = nameBase.toLowerCase().replace(/[^a-z0-9]/g, '');

    let counter = 1;
    let finalUsername = username;

    // Keep trying until we find a unique username
    while (await this.userRepository.findOne({ where: { username: finalUsername } })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    return finalUsername;
  }

  private static generateRandomPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }
}
