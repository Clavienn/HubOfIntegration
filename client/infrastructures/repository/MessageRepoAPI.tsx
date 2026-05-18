// repositories/MessageRepoAPI.ts
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';
import { Message, MessageFilters, PaginatedResponse, StatisticsResponse } from '@/domains/models/Message';
import { MessageRepo } from '@/domains/interfaces/MessageRepo';

export class MessageRepoAPI implements MessageRepo {
  async getAll(filters?: MessageFilters): Promise<PaginatedResponse<Message>> {
    const params: Record<string, string | number | undefined> = {};
    
    if (filters?.status) params.status = filters.status;
    if (filters?.sourceSystemId) params.sourceSystemId = filters.sourceSystemId;
    if (filters?.destinationSystemId) params.destinationSystemId = filters.destinationSystemId;
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    
    const limit = filters?.limit || 50;
    const offset = filters?.offset || ((filters?.page || 1) - 1) * limit;
    
    params.limit = limit;
    params.offset = offset;

    const response = await httpClient.get<PaginatedResponse<Message>>(API_ENDPOINTS.MESSAGES, { params });
    return response.data;
  }

  async getById(id: string): Promise<Message> {
    const response = await httpClient.get<Message>(API_ENDPOINTS.MESSAGE_BY_ID(id));
    return response.data;
  }

  async getDeadLetter(filters?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Message>> {
    const params: Record<string, string | number | undefined> = {};
    
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.offset) params.offset = filters.offset;

    const response = await httpClient.get<PaginatedResponse<Message>>(API_ENDPOINTS.DEAD_LETTER, { params });
    return response.data;
  }

  async getStatistics(): Promise<StatisticsResponse> {
    const response = await httpClient.get<StatisticsResponse>(API_ENDPOINTS.STATISTICS);
    return response.data;
  }
}

export const messageRepo = new MessageRepoAPI();