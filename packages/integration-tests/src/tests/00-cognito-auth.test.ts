import { describe, it, expect } from 'vitest';
import { getTestToken } from '../helpers/auth';

/**
 * Authenticates against the Cognito User Pool and obtains a JWT.
 * Requires COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, TEST_USER_EMAIL, TEST_USER_PASSWORD in .env.test.
 */
describe('Cognito authentication', () => {
  it('obtains a JWT by signing in with test user', async () => {
    const token = await getTestToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT format: header.payload.signature (three base64 segments)
    expect(token.split('.')).toHaveLength(3);
  });
});
