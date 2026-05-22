// domains/models/Ingest.ts
import { z } from 'zod';

// ─── Request ──────────────────────────────────────────────────────────────────
// FIX: payload est un objet quelconque, pas un tableau.
// FIX: sourceSystemId est résolu par le backend depuis le header x-api-key —
//      on ne l'envoie PLUS dans le body (sécurité).

export const IngestRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),       // { key: value, ... }
  destinationSystemId:  z.string().optional(),       // optionnel si une route existe
  correlationId:        z.string().optional(),       // idempotence
});
export type IngestRequest = z.infer<typeof IngestRequestSchema>;

// ─── Response ─────────────────────────────────────────────────────────────────

export const IngestResponseSchema = z.object({
  messageId:  z.string(),
  status:     z.enum(['pending', 'processing', 'success', 'failed', 'retry', 'dead']),
  timestamp:  z.coerce.date(),
});
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

// ─── Message Status (GET /ingest/status/:id) ──────────────────────────────────

export const MessageStatusResponseSchema = z.object({
  id:     z.string(),
  status: z.enum(['pending', 'processing', 'success', 'failed', 'retry', 'dead']),
  metadata: z.object({
    sourceSystemId:      z.string(),
    destinationSystemId: z.string().optional(),
    messageId:           z.string(),
    timestamp:           z.coerce.date(),
    retryCount:          z.number(),
    processingTime:      z.number().optional(),
  }),
  error:     z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MessageStatusResponse = z.infer<typeof MessageStatusResponseSchema>;

// ─── Dry-run Request ──────────────────────────────────────────────────────────
// Utilisé par l'endpoint POST /ingest/dry-run (debug routage)

export const DryRunRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});
export type DryRunRequest = z.infer<typeof DryRunRequestSchema>;

// ─── Replay Response ──────────────────────────────────────────────────────────

export const ReplayResponseSchema = z.object({
  messageId:  z.string(),
  status:     z.string(),
  timestamp:  z.coerce.date(),
});
export type ReplayResponse = z.infer<typeof ReplayResponseSchema>;