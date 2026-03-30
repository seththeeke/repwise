import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '';
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const oauthDomain = import.meta.env.VITE_COGNITO_OAUTH_DOMAIN ?? '';

const isConfigured = Boolean(userPoolId && userPoolClientId);

/** Same callback list as CDK UserPoolClient (localhost, production web, iOS custom scheme). */
const OAUTH_REDIRECTS = [
  'http://localhost:5173/',
  'https://repwisefit.com/',
  'com.repwisefit.app://callback',
  'com.repwise.app://callback',
];

if (isConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        ...(oauthDomain
          ? {
              loginWith: {
                oauth: {
                  domain: oauthDomain,
                  scopes: ['openid', 'email', 'profile'],
                  redirectSignIn: OAUTH_REDIRECTS,
                  redirectSignOut: OAUTH_REDIRECTS,
                  responseType: 'code' as const,
                },
              },
            }
          : {}),
      },
    },
  });
}

export const isCognitoConfigured = isConfigured;
/** True when Hosted UI / OAuth is configured (Sign in with Apple, etc.). */
export const isOAuthConfigured = Boolean(isConfigured && oauthDomain);
/**
 * Show Sign in with Apple when OAuth domain is set. Set `VITE_APPLE_SIGNIN_ENABLED=false` to hide
 * (e.g. before Cognito Apple IdP is configured). Omit or any value except `false` to show.
 */
export const isAppleSignInEnabled =
  isOAuthConfigured && import.meta.env.VITE_APPLE_SIGNIN_ENABLED !== 'false';
