import jwt from 'jsonwebtoken';
import config from '../../../config';

interface TokenPayload {
  userId: number;
  username: string;
  email: string;
}

export class TokenService {
  private static readonly JWT_SECRET = config.auth.jwtSecret;
  private static readonly JWT_EXPIRY = config.auth.jwtExpiry;
  private static readonly REFRESH_TOKEN_EXPIRY = config.auth.refreshTokenExpiry;

  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = this.verifyToken(refreshToken);
      return this.generateAccessToken(payload);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static extractTokenFromHeader(header: string): string {
    const [type, token] = header.split(' ');
    
    if (type !== 'Bearer') {
      throw new Error('Invalid token type');
    }

    return token;
  }
}
