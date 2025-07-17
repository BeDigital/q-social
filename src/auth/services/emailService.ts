import nodemailer from 'nodemailer';
import config from '../../../config';

export class EmailService {
  private static readonly transporter = nodemailer.createTransport({
    host: config.email?.host || 'smtp.example.com',
    port: config.email?.port || 587,
    secure: config.email?.secure || false,
    auth: {
      user: config.email?.user || 'user@example.com',
      pass: config.email?.password || 'password',
    },
  });

  static async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${config.server.frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: config.email?.from || 'noreply@example.com',
      to,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to Q-Social!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }
}
