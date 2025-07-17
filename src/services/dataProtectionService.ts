import crypto from 'crypto';
import { promisify } from 'util';
import config from '../config';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

export class DataProtectionService {
  private static readonly ENCRYPTION_KEY = config.security.encryptionKey;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;

  // Encrypt sensitive data
  static async encrypt(data: string): Promise<string> {
    try {
      const iv = await randomBytes(this.IV_LENGTH);
      const salt = await randomBytes(this.SALT_LENGTH);
      
      const key = await scrypt(
        this.ENCRYPTION_KEY,
        salt,
        this.KEY_LENGTH
      ) as Buffer;

      const cipher = crypto.createCipheriv(
        this.ALGORITHM,
        key,
        iv,
        { authTagLength: this.AUTH_TAG_LENGTH }
      );

      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Combine all components for storage
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted,
      ]);

      return result.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const data = Buffer.from(encryptedData, 'base64');

      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = data.slice(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH
      );
      const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH);

      const key = await scrypt(
        this.ENCRYPTION_KEY,
        salt,
        this.KEY_LENGTH
      ) as Buffer;

      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        key,
        iv,
        { authTagLength: this.AUTH_TAG_LENGTH }
      );

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash sensitive data (one-way)
  static async hash(data: string): Promise<string> {
    const salt = await randomBytes(this.SALT_LENGTH);
    const hash = await scrypt(data, salt, this.KEY_LENGTH) as Buffer;
    return `${salt.toString('base64')}.${hash.toString('base64')}`;
  }

  // Verify hashed data
  static async verify(data: string, hashedData: string): Promise<boolean> {
    const [saltStr, hashStr] = hashedData.split('.');
    const salt = Buffer.from(saltStr, 'base64');
    const hash = Buffer.from(hashStr, 'base64');

    const testHash = await scrypt(data, salt, this.KEY_LENGTH) as Buffer;
    return crypto.timingSafeEqual(testHash, hash);
  }

  // Sanitize data for storage
  static sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return this.sanitizeValue(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const sanitized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[this.sanitizeKey(key)] = this.sanitize(value);
    }
    return sanitized;
  }

  private static sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential XSS content
      return value
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    return value;
  }

  // Mask sensitive data for logging
  static maskSensitiveData(data: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'credit_card',
      'ssn',
      'email',
      'phone',
    ];

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    const masked: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = typeof value === 'string' ? '***' : '[REDACTED]';
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  // Generate secure random values
  static async generateSecureToken(length: number = 32): Promise<string> {
    const bytes = await randomBytes(length);
    return bytes.toString('base64').replace(/[/+=]/g, '').slice(0, length);
  }

  // Validate data against schema
  static validateSchema(data: any, schema: any): boolean {
    try {
      for (const [key, rules] of Object.entries(schema)) {
        const value = data[key];
        
        if (rules.required && (value === undefined || value === null)) {
          throw new Error(`${key} is required`);
        }

        if (value !== undefined && value !== null) {
          if (rules.type && typeof value !== rules.type) {
            throw new Error(`${key} must be of type ${rules.type}`);
          }

          if (rules.pattern && !rules.pattern.test(value)) {
            throw new Error(`${key} has invalid format`);
          }

          if (rules.min !== undefined && value < rules.min) {
            throw new Error(`${key} must be at least ${rules.min}`);
          }

          if (rules.max !== undefined && value > rules.max) {
            throw new Error(`${key} must be at most ${rules.max}`);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}
