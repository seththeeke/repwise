import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '';
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const isConfigured = Boolean(userPoolId && userPoolClientId);

if (isConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
}

export const isCognitoConfigured = isConfigured;
