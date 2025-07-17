export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static readonly DISPOSABLE_DOMAINS = new Set([
    'tempmail.com',
    'throwaway.com',
    // Add more disposable email domains as needed
  ]);

  static isValidFormat(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  static isDisposable(email: string): boolean {
    const domain = email.split('@')[1].toLowerCase();
    return this.DISPOSABLE_DOMAINS.has(domain);
  }

  static async doesEmailExist(email: string): Promise<boolean> {
    try {
      // In a production environment, you might want to use an email verification service
      // For now, we'll just check the format
      return this.isValidFormat(email);
    } catch (error) {
      throw new Error('Email verification failed');
    }
  }

  static async validate(email: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.isValidFormat(email)) {
      errors.push('Invalid email format');
    }

    if (this.isDisposable(email)) {
      errors.push('Disposable email addresses are not allowed');
    }

    try {
      const exists = await this.doesEmailExist(email);
      if (!exists) {
        errors.push('Email address appears to be invalid');
      }
    } catch (error) {
      errors.push('Email verification failed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
