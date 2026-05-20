// domains/models/Ingest.ts
import { z } from 'zod';

export const IngestRequestSchema = z.object({
  payload: z.array(z.any()),
  destinationSystemId: z.string().optional(),
  correlationId: z.string().optional(),
});

export const IngestResponseSchema = z.object({
  messageId: z.string(),
  status: z.enum(['pending', 'processing', 'success', 'failed', 'retry', 'dead']),
  timestamp: z.date(),
});

export const MessageStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'success', 'failed', 'retry', 'dead']),
  metadata: z.object({
    sourceSystemId: z.string(),
    destinationSystemId: z.string().optional(),
    messageId: z.string(),
    timestamp: z.date(),
    retryCount: z.number(),
    processingTime: z.number().optional(),
  }),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
export type MessageStatusResponse = z.infer<typeof MessageStatusSchema>;