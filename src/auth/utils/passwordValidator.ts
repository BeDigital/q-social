export class PasswordValidator {
  static readonly MIN_LENGTH = 12;
  static readonly MAX_LENGTH = 128;
  
  private static readonly COMMON_PASSWORDS = new Set([
    'password123',
    'qwerty123',
    // Add more common passwords as needed
  ]);

  private static readonly PASSWORD_RULES = [
    {
      test: (password: string) => password.length >= this.MIN_LENGTH,
      message: `Password must be at least ${this.MIN_LENGTH} characters long`,
    },
    {
      test: (password: string) => password.length <= this.MAX_LENGTH,
      message: `Password must be less than ${this.MAX_LENGTH} characters long`,
    },
    {
      test: (password: string) => /[A-Z]/.test(password),
      message: 'Password must contain at least one uppercase letter',
    },
    {
      test: (password: string) => /[a-z]/.test(password),
      message: 'Password must contain at least one lowercase letter',
    },
    {
      test: (password: string) => /[0-9]/.test(password),
      message: 'Password must contain at least one number',
    },
    {
      test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      message: 'Password must contain at least one special character',
    },
    {
      test: (password: string) => !/\\s/.test(password),
      message: 'Password must not contain whitespace',
    },
  ];

  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check against common passwords
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('Password is too common');
      return { isValid: false, errors };
    }

    // Check all password rules
    this.PASSWORD_RULES.forEach(rule => {
      if (!rule.test(password)) {
        errors.push(rule.message);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static generatePasswordHash(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }
}
