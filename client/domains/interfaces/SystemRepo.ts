import {
  System,
  CreateSystem,
  UpdateSystem,
  SystemsListResponse,
  SystemFilters,
} from '@/domains/models/System';

export interface SystemRepo {
  getAll(filters?: SystemFilters): Promise<SystemsListResponse>;
  getById(id: string): Promise<System>;
  create(data: CreateSystem): Promise<System>;
  update(id: string, data: UpdateSystem): Promise<System>;
  delete(id: string): Promise<void>;
  enable(id: string): Promise<System>;
  disable(id: string): Promise<System>;
  rotateApiKey(id: string): Promise<{ apiKey: string }>;
  testWebhook(id: string): Promise<{ success: boolean; message: string }>;
}