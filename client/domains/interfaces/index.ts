// domains/interfaces/SystemRepo.ts
import { System, CreateSystem, UpdateSystem, SystemsListResponse, SystemFilters } from '@/domains/models/System';

export interface SystemRepo {
  getAll(filters?: SystemFilters): Promise<SystemsListResponse>;
  getById(id: string): Promise<System>;
  create(data: CreateSystem): Promise<System>;
  update(id: string, data: UpdateSystem): Promise<System>;
  delete(id: string): Promise<void>;
  enable(id: string): Promise<System>;
  disable(id: string): Promise<System>;
  rotateApiKey(id: string): Promise<{ id: string; apiKey: string }>;
  testWebhook(id: string): Promise<{ success: boolean; message: string }>;
}

// domains/interfaces/RouteRepo.ts
import { Route, CreateRoute, UpdateRoute, RouteFilters, RoutesListResponse, DryRunResult } from '@/domains/models/Route';

export interface RouteRepo {
  getAll(filters?: RouteFilters): Promise<RoutesListResponse>;
  getById(id: string): Promise<Route>;
  create(data: CreateRoute): Promise<Route>;
  update(id: string, data: UpdateRoute): Promise<Route>;
  delete(id: string): Promise<void>;
  enable(id: string): Promise<Route>;
  disable(id: string): Promise<Route>;
  // Filtre côté client via getAll (le backend expose les params sourceSystemId/destinationSystemId)
  getBySourceSystem(sourceSystemId: string): Promise<Route[]>;
  getByDestinationSystem(destinationSystemId: string): Promise<Route[]>;
  dryRun(payload: Record<string, unknown>): Promise<DryRunResult>;
}

// domains/interfaces/MessageRepo.ts
import { Message, MessageFilters, PaginatedResponse, StatisticsResponse } from '@/domains/models/Message';

export interface MessageRepo {
  getAll(filters?: MessageFilters): Promise<PaginatedResponse<Message>>;
  getById(id: string): Promise<Message>;
  getDeadLetter(filters?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Message>>;
  getStatistics(): Promise<StatisticsResponse>;
}

// domains/interfaces/IngestRepo.ts
import { IngestResponse, MessageStatusResponse, ReplayResponse } from '@/domains/models/Ingest';

export interface IngestRepo {
  /** Envoie un message. sourceSystemId est résolu par le backend depuis x-api-key. */
  send(payload: Record<string, unknown>, destinationSystemId?: string, correlationId?: string): Promise<IngestResponse>;
  getStatus(messageId: string): Promise<MessageStatusResponse>;
  replay(messageId: string): Promise<ReplayResponse>;
  /** Debug : évalue les routes sans persister de message */
  dryRun(payload: Record<string, unknown>): Promise<import('@/domains/models/Route').DryRunResult>;
}