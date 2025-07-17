import config from '../../../config';

export const oauthConfig = {
  google: {
    clientId: config.oauth?.google.clientId || '',
    clientSecret: config.oauth?.google.clientSecret || '',
    callbackUrl: `${config.server.apiUrl}/auth/google/callback`,
    scope: ['profile', 'email'],
  },
  facebook: {
    clientId: config.oauth?.facebook.clientId || '',
    clientSecret: config.oauth?.facebook.clientSecret || '',
    callbackUrl: `${config.server.apiUrl}/auth/facebook/callback`,
    scope: ['email', 'public_profile'],
  },
};
