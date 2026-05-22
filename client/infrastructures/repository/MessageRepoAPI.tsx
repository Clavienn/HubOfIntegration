// infrastructures/repository/MessageRepoAPI.ts
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';
import {
  Message,
  MessageFilters,
  PaginatedResponse,
  StatisticsResponse,
  PaginatedResponseSchema,
  StatisticsResponseSchema,
  MessageSchema,
} from '@/domains/models/Message';
import { MessageRepo } from '@/domains/interfaces';

export class MessageRepoAPI implements MessageRepo {

  // ─── List ───────────────────────────────────────────────────────────────────

  async getAll(filters?: MessageFilters): Promise<PaginatedResponse<Message>> {
    const params: Record<string, string | number> = {};

    if (filters?.status)              params.status              = filters.status;
    if (filters?.sourceSystemId)      params.sourceSystemId      = filters.sourceSystemId;
    if (filters?.destinationSystemId) params.destinationSystemId = filters.destinationSystemId;
    if (filters?.fromDate)            params.fromDate            = filters.fromDate;
    if (filters?.toDate)              params.toDate              = filters.toDate;

    const limit  = filters?.limit  ?? 50;
    // FIX: le backend attend `offset`, calculé depuis page si non fourni
    const offset = filters?.offset ?? ((filters?.page ?? 1) - 1) * limit;

    params.limit  = limit;
    params.offset = offset;

    const response = await httpClient.get<unknown>(API_ENDPOINTS.MESSAGES, { params });
    return PaginatedResponseSchema.parse(response.data) as PaginatedResponse<Message>;
  }

  // ─── Get by ID ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Message> {
    const response = await httpClient.get<unknown>(API_ENDPOINTS.MESSAGE_BY_ID(id));
    return MessageSchema.parse(response.data);
  }

  // ─── Dead Letter ─────────────────────────────────────────────────────────────

  async getDeadLetter(filters?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Message>> {
    const params: Record<string, number> = {};
    if (filters?.limit)  params.limit  = filters.limit;
    if (filters?.offset) params.offset = filters.offset;

    const response = await httpClient.get<unknown>(API_ENDPOINTS.DEAD_LETTER, { params });
    return PaginatedResponseSchema.parse(response.data) as PaginatedResponse<Message>;
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  async getStatistics(): Promise<StatisticsResponse> {
    const response = await httpClient.get<unknown>(API_ENDPOINTS.STATISTICS);
    return StatisticsResponseSchema.parse(response.data);
  }
}

export const messageRepo = new MessageRepoAPI();