// repositories/MessageRepo.ts
import { Message, MessageFilters, PaginatedResponse, StatisticsResponse } from '@/domains/models/Message';

export interface MessageRepo {
  getAll(filters?: MessageFilters): Promise<PaginatedResponse<Message>>;
  getById(id: string): Promise<Message>;
  getDeadLetter(filters?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Message>>;
  getStatistics(): Promise<StatisticsResponse>;
}