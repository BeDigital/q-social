import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export class OAuthSecurityMiddleware {
  private static instance: OAuthSecurityMiddleware;
  private states: Map<string, { timestamp: number, csrfToken: string }>;

  private constructor() {
    this.states = new Map();
    // Cleanup expired states every minute
    setInterval(() => this.cleanupExpiredStates(), 60000);
  }

  static getInstance(): OAuthSecurityMiddleware {
    if (!OAuthSecurityMiddleware.instance) {
      OAuthSecurityMiddleware.instance = new OAuthSecurityMiddleware();
    }
    return OAuthSecurityMiddleware.instance;
  }

  /**
   * Generate and store state parameter for OAuth flow
   */
  generateState(csrfToken: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    this.states.set(state, {
      timestamp: Date.now(),
      csrfToken
    });
    return state;
  }

  /**
   * Validate state parameter from OAuth callback
   */
  validateState(state: string): boolean {
    const stateData = this.states.get(state);
    if (!stateData) {
      return false;
    }

    // Check expiration (5 minutes)
    if (Date.now() - stateData.timestamp > 300000) {
      this.states.delete(state);
      return false;
    }

    return true;
  }

  /**
   * Consume state after successful validation
   */
  consumeState(state: string): void {
    this.states.delete(state);
  }

  /**
   * Get CSRF token associated with state
   */
  getStateCSRFToken(state: string): string | null {
    const stateData = this.states.get(state);
    return stateData?.csrfToken || null;
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.states.entries()) {
      if (now - data.timestamp > 300000) {
        this.states.delete(state);
      }
    }
  }

  /**
   * Middleware to validate OAuth callback
   */
  validateOAuthCallback(req: Request, res: Response, next: NextFunction): void {
    const { state, code } = req.query;

    if (!state || !code) {
      res.status(400).json({ error: 'Invalid OAuth callback parameters' });
      return;
    }

    if (!this.validateState(state as string)) {
      res.status(400).json({ error: 'Invalid or expired OAuth state' });
      return;
    }

    // Store validated state in request for later use
    (req as any).validatedState = state;
    next();
  }

  /**
   * Middleware to handle OAuth initialization
   */
  initializeOAuth(req: Request, res: Response, next: NextFunction): void {
    const csrfToken = req.headers['x-csrf-token'] as string;
    if (!csrfToken) {
      res.status(403).json({ error: 'Missing CSRF token' });
      return;
    }

    const state = this.generateState(csrfToken);
    (req as any).oauthState = state;
    next();
  }

  /**
   * Middleware to cleanup after OAuth flow
   */
  cleanupOAuth(req: Request, res: Response, next: NextFunction): void {
    const state = (req as any).validatedState;
    if (state) {
      this.consumeState(state as string);
    }
    next();
  }
}
