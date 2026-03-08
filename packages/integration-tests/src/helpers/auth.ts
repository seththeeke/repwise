import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const pool = new CognitoUserPool({
  UserPoolId: process.env.COGNITO_USER_POOL_ID!,
  ClientId: process.env.COGNITO_CLIENT_ID!,
});

const tokenCache = new Map<string, string>();

export const getToken = (email: string, password: string): Promise<string> => {
  if (tokenCache.has(email)) return Promise.resolve(tokenCache.get(email)!);

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    const onSuccess = (session: { getIdToken: () => { getJwtToken: () => string } }) => {
      const token = session.getIdToken().getJwtToken();
      tokenCache.set(email, token);
      resolve(token);
    };
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess,
        onFailure: reject,
        newPasswordRequired: () => {
          // User is in FORCE_CHANGE_PASSWORD; complete with the new password only (no attribute updates)
          user.completeNewPasswordChallenge(password, {}, {
            onSuccess,
            onFailure: reject,
          });
        },
      }
    );
  });
};

export const getTestToken = () =>
  getToken(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
export const getTestToken2 = () =>
  getToken(process.env.TEST_USER_2_EMAIL!, process.env.TEST_USER_2_PASSWORD!);
