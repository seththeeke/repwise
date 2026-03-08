import type { AxiosInstance } from 'axios';

interface Resource {
  type: 'workout' | 'goal';
  id: string;
}

export class TeardownRegistry {
  private resources: Resource[] = [];
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  register(type: Resource['type'], id: string) {
    this.resources.push({ type, id });
  }

  remove(id: string) {
    this.resources = this.resources.filter((r) => r.id !== id);
  }

  async cleanup() {
    for (const resource of this.resources.reverse()) {
      if (resource.type === 'workout') {
        await this.client.patch(`/workout-instances/${resource.id}`, {
          status: 'cancelled',
        });
      }
      if (resource.type === 'goal') {
        await this.client.delete(`/goals/me/${resource.id}`);
      }
    }
    this.resources = [];
  }
}
