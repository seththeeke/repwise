import { apiClient } from './client';
import type { FeedItem } from '@/types';

export const feedApi = {
  list: (limit = 20, lastKey?: string) =>
    apiClient
      .get<{ items: FeedItem[]; nextToken?: string }>('/feed', {
        params: { limit, lastKey },
      })
      .then((r) => r.data),
};
