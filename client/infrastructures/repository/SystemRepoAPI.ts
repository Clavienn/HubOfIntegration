import { 
  System, 
  CreateSystem, 
  UpdateSystem, 
  SystemsListResponse,
  SystemFilters,
  SystemSchema,
  SystemsListResponseSchema,
  buildQueryParams,
} from '@/domains/models/System';
import { SystemRepo } from '@/domains/interfaces/SystemRepo';
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';

export class SystemRepoAPI implements SystemRepo {
  async getAll(filters?: SystemFilters): Promise<SystemsListResponse> {
    const params = filters ? buildQueryParams(filters) : {};
    const response = await httpClient.get<unknown>(
      API_ENDPOINTS.SYSTEMS,
      { params }
    );    

    const parsed = SystemsListResponseSchema.parse(response.data);
    return parsed;
  }

  async getById(id: string): Promise<System> {
    const response = await httpClient.get<unknown>(
      API_ENDPOINTS.SYSTEM_BY_ID(id)
    );

    return SystemSchema.parse(response.data);
  }

  async create(data: CreateSystem): Promise<System> {
    const response = await httpClient.post<unknown>(
      API_ENDPOINTS.SYSTEMS,
      data
    );
    return SystemSchema.parse(response.data);
  }

  async update(id: string, data: UpdateSystem): Promise<System> {
    const response = await httpClient.put<unknown>(
      API_ENDPOINTS.SYSTEM_BY_ID(id),
      data
    );
    return SystemSchema.parse(response.data);
  }

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.SYSTEM_BY_ID(id));
  }

  async enable(id: string): Promise<System> {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.SYSTEM_BY_ID(id)}/enable`,
      { isActive: true }
    );
    return SystemSchema.parse(response.data);
  }

  async disable(id: string): Promise<System> {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.SYSTEM_BY_ID(id)}/disable`,
      { isActive: false }
    );
    return SystemSchema.parse(response.data);
  }

  async rotateApiKey(id: string): Promise<{ apiKey: string }> {
    const response = await httpClient.post<{ apiKey: string }>(
      API_ENDPOINTS.SYSTEM_ROTATE_KEY(id)
    );
    return response.data;
  }

  async testWebhook(id: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      API_ENDPOINTS.SYSTEM_TEST_WEBHOOK(id)
    );
    return response.data;
  }
}

export const systemRepo = new SystemRepoAPI();