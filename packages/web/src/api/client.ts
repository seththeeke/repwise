import axios, { type InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    const status = error.response?.status;
    const isRetryable =
      (status >= 500 && status < 600) ||
      error.code === 'ECONNABRTED' ||
      error.code === 'ERR_NETWORK';

    const retryCount = config._retryCount ?? 0;
    if (isRetryable && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      await sleep(RETRY_DELAYS_MS[retryCount]);
      return apiClient(config);
    }

    if (error.response?.data?.message) {
      error.friendlyMessage = 'Something went wrong. Please try again.';
    } else {
      error.friendlyMessage = 'Something went wrong. Please try again.';
    }
    return Promise.reject(error);
  }
);
