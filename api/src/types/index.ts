// src/types/index.ts
export type MessageStatus = 'pending' | 'processing' | 'success' | 'failed' | 'retry' | 'dead';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type TransformationType = 'jsonata' | 'template' | 'jmespath';

export interface MessagePayload {
  [key: string]: unknown;
}

export interface MessageMetadata {
  sourceSystemId: string;
  destinationSystemId?: string;
  messageId: string;
  timestamp: Date;
  retryCount: number;
  processingTime?: number;
}

export interface Message {
  id: string;
  payload: MessagePayload;
  metadata: MessageMetadata;
  status: MessageStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

// src/types/index.ts
export interface Route {
  id: string;
  name: string;
  sourceSystemId: string;
  destinationSystemId: string;
  transformationId?: string;
  condition?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transformation {
  id: string;
  name: string;
  type: TransformationType;
  sourceSchema: MessagePayload;
  targetSchema: MessagePayload;
  mappingRules: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngestRequest {
  payload: MessagePayload;
  destinationSystemId?: string;
  correlationId?: string;
}

export interface IngestResponse {
  messageId: string;
  status: MessageStatus;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  path?: string;
}

export interface WebhookPayload {
  eventType: 'message.received' | 'message.processed' | 'message.failed' | 'message.retry';
  messageId: string;
  systemId: string;
  payload?: MessagePayload;
  error?: string;
  timestamp: Date;
}

// Query filters for messages
export interface MessageQueryFilters {
  status?: MessageStatus;
  'metadata.sourceSystemId'?: string;
  'metadata.destinationSystemId'?: string;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

// Pagination parameters
export interface PaginationParams {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationParams;
}

// Date range filter
export interface DateRangeFilter {
  fromDate?: Date;
  toDate?: Date;
}

// Statistics response
export interface StatisticsResponse {
  total: number;
  byStatus: {
    success: number;
    failed: number;
    pending: number;
    processing: number;
    dead: number;
  };
  last24h: {
    total: number;
    success: number;
    successRate: number;
  };
  performance: {
    avgProcessingTimeMs: number;
    minProcessingTimeMs: number;
    maxProcessingTimeMs: number;
  };
  overallSuccessRate: number;
}

// System creation request
export interface CreateSystemRequest {
  name: string;
  webhookUrl?: string;
  isActive?: boolean;
  retryPolicy?: Partial<RetryPolicy>;
  timeoutMs?: number;
}

// System update request
export interface UpdateSystemRequest {
  name?: string;
  webhookUrl?: string;
  isActive?: boolean;
  retryPolicy?: Partial<RetryPolicy>;
  timeoutMs?: number;
}

// Route creation request
export interface CreateRouteRequest {
  name: string;
  sourceSystemId: string;
  destinationSystemId: string;
  transformationId?: string;
  condition?: string;
  isActive?: boolean;
  priority?: number;
}

// Route update request
export interface UpdateRouteRequest {
  name?: string;
  transformationId?: string;
  condition?: string;
  isActive?: boolean;
  priority?: number;
}

// Transformation creation request
export interface CreateTransformationRequest {
  name: string;
  type: TransformationType;
  sourceSchema: MessagePayload;
  targetSchema: MessagePayload;
  mappingRules: string;
  isActive?: boolean;
}

// Transformation update request
export interface UpdateTransformationRequest {
  name?: string;
  sourceSchema?: MessagePayload;
  targetSchema?: MessagePayload;
  mappingRules?: string;
  isActive?: boolean;
}

// Health check response
export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  timestamp: Date;
  database: boolean;
  redis?: boolean;
  uptime?: number;
  version?: string;
}

// Webhook test request
export interface WebhookTestRequest {
  webhookUrl: string;
}

// Webhook test response
export interface WebhookTestResponse {
  success: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
}

// API Key rotation response
export interface ApiKeyRotationResponse {
  id: string;
  apiKey: string;
  message: string;
}

// System response (without sensitive data)
export interface SystemResponse {
  id: string;
  name: string;
  webhookUrl?: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}

// Message replay request
export interface MessageReplayRequest {
  messageId: string;
}

// Message replay response
export interface MessageReplayResponse {
  messageId: string;
  status: 'queued_for_replay' | 'replayed';
  timestamp: Date;
}

// Bulk ingest request
export interface BulkIngestRequest {
  messages: IngestRequest[];
}

// Bulk ingest response
export interface BulkIngestResponse {
  successful: IngestResponse[];
  failed: Array<{
    message: IngestRequest;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// Error codes enumeration
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_NOT_FOUND = 'SYSTEM_NOT_FOUND',
  DESTINATION_NOT_FOUND = 'DESTINATION_NOT_FOUND',
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',
  INGEST_FAILED = 'INGEST_FAILED',
  DUPLICATE_SYSTEM = 'DUPLICATE_SYSTEM',
  SYSTEM_IN_USE = 'SYSTEM_IN_USE',
  TRANSFORMATION_FAILED = 'TRANSFORMATION_FAILED',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  QUEUE_ERROR = 'QUEUE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_STATUS = 'INVALID_STATUS',
  NO_WEBHOOK = 'NO_WEBHOOK',
}