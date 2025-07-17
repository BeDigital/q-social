import { Request, Response } from 'express';
import { AppDataSource } from '../../database/ormconfig';
import { User } from '../../database/entities/User';
import { EmailValidator } from '../utils/emailValidator';
import { PasswordValidator } from '../utils/passwordValidator';
import { TokenService } from '../services/tokenService';

export class AuthController {
  private static readonly userRepository = AppDataSource.getRepository(User);

  static register = async (req: Request, res: Response) => {
    try {
      const { email, password, username } = req.body;

      // Validate email
      const emailValidation = await EmailValidator.validate(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ errors: emailValidation.errors });
      }

      // Validate password
      const passwordValidation = PasswordValidator.validate(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ errors: passwordValidation.errors });
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'User with this email or username already exists',
        });
      }

      // Hash password
      const passwordHash = await PasswordValidator.generatePasswordHash(password);

      // Create user
      const user = await this.userRepository.save({
        email,
        username,
        password_hash: passwordHash,
      });

      // Generate tokens
      const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
      };

      const accessToken = TokenService.generateAccessToken(payload);
      const refreshToken = TokenService.generateRefreshToken(payload);

      res.status(201).json({
        message: 'User registered successfully',
        accessToken,
        refreshToken,
      });
    } catch (error) {
      res.status(500).json({ message: 'Registration failed' });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await PasswordValidator.verifyPassword(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
      };

      const accessToken = TokenService.generateAccessToken(payload);
      const refreshToken = TokenService.generateRefreshToken(payload);

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  };

  static refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      const accessToken = await TokenService.refreshAccessToken(refreshToken);

      res.json({
        accessToken,
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  };

  static logout = async (req: Request, res: Response) => {
    // In a real implementation, you might want to blacklist the token
    res.json({ message: 'Logout successful' });
  };

  static forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        // Return success even if user doesn't exist for security
        return res.json({
          message: 'If your email is registered, you will receive a reset link',
        });
      }

      // In a real implementation, you would:
      // 1. Generate a password reset token
      // 2. Save it to the database with an expiry
      // 3. Send an email with the reset link

      res.json({
        message: 'If your email is registered, you will receive a reset link',
      });
    } catch (error) {
      res.status(500).json({ message: 'Password reset request failed' });
    }
  };

  static resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      // Validate password
      const passwordValidation = PasswordValidator.validate(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ errors: passwordValidation.errors });
      }

      // In a real implementation, you would:
      // 1. Verify the reset token
      // 2. Check if it's expired
      // 3. Update the user's password
      // 4. Invalidate the reset token

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: 'Password reset failed' });
    }
  };
}
