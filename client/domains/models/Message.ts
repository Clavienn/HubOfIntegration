// domains/models/Message.ts
import { z } from 'zod';

export const MessageStatusSchema = z.enum([
  'pending',
  'processing',
  'success',
  'failed',
  'retry',
  'dead',
]);

export const MessagePayloadSchema = z.string().max(1000); // Adjust the max length as needed

export const MessageMetadataSchema = z.object({
  sourceSystemId: z.string(),
  destinationSystemId: z.string().optional(),
  messageId: z.string(),
  timestamp: z.date(),
  retryCount: z.number().default(0),
  processingTime: z.number().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  payload: MessagePayloadSchema,
  metadata: MessageMetadataSchema,
  status: MessageStatusSchema,
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MessageFiltersSchema = z.object({
  status: MessageStatusSchema.optional(),
  sourceSystemId: z.string().optional(),
  destinationSystemId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  page: z.number().min(1).default(1),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(MessageSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
});

export const StatisticsResponseSchema = z.object({
  total: z.number(),
  byStatus: z.object({
    success: z.number(),
    failed: z.number(),
    pending: z.number(),
    processing: z.number(),
    dead: z.number(),
  }),
  last24h: z.object({
    total: z.number(),
    success: z.number(),
    successRate: z.number(),
  }),
  performance: z.object({
    avgProcessingTimeMs: z.number(),
    minProcessingTimeMs: z.number(),
    maxProcessingTimeMs: z.number(),
  }),
  overallSuccessRate: z.number(),
});

export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageFilters = z.infer<typeof MessageFiltersSchema>;
export type PaginatedResponse<T> = z.infer<typeof PaginatedResponseSchema> & { data: T[] };
export type StatisticsResponse = z.infer<typeof StatisticsResponseSchema>;

// Statut avec couleurs et icônes
export const statusConfig: Record<MessageStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  processing: { label: 'Traitement', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  success: { label: 'Succès', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: 'Échec', color: 'text-red-700', bgColor: 'bg-red-100' },
  retry: { label: 'Nouvelle tentative', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  dead: { label: 'Lettre morte', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};