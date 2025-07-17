import { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { oauthConfig } from '../config/oauthConfig';
import { OAuthService } from '../services/oauthService';

export class OAuthController {
  static initialize() {
    // Configure Google Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: oauthConfig.google.clientId,
          clientSecret: oauthConfig.google.clientSecret,
          callbackURL: oauthConfig.google.callbackUrl,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('Email not provided'));
            }

            const result = await OAuthService.handleOAuthLogin({
              id: profile.id,
              email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
              provider: 'google',
            });

            done(null, result);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    // Configure Facebook Strategy
    passport.use(
      new FacebookStrategy(
        {
          clientID: oauthConfig.facebook.clientId,
          clientSecret: oauthConfig.facebook.clientSecret,
          callbackURL: oauthConfig.facebook.callbackUrl,
          profileFields: ['id', 'emails', 'name', 'picture'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('Email not provided'));
            }

            const result = await OAuthService.handleOAuthLogin({
              id: profile.id,
              email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
              provider: 'facebook',
            });

            done(null, result);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });
  }

  static googleAuth = passport.authenticate('google', {
    scope: oauthConfig.google.scope,
  });

  static googleCallback = (req: Request, res: Response) => {
    passport.authenticate('google', (err: any, data: any) => {
      if (err) {
        return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
      }

      res.redirect(
        `/oauth/success?` +
        `accessToken=${data.accessToken}&` +
        `refreshToken=${data.refreshToken}`
      );
    })(req, res);
  };

  static facebookAuth = passport.authenticate('facebook', {
    scope: oauthConfig.facebook.scope,
  });

  static facebookCallback = (req: Request, res: Response) => {
    passport.authenticate('facebook', (err: any, data: any) => {
      if (err) {
        return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
      }

      res.redirect(
        `/oauth/success?` +
        `accessToken=${data.accessToken}&` +
        `refreshToken=${data.refreshToken}`
      );
    })(req, res);
  };
}
