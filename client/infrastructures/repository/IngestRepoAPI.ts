'use client' ;
/**
 * IngestRepoAPI
 *
 * Le backend lit sourceSystemId depuis req.body (ingest.controller.ts:43).
 * On l'envoie donc explicitement dans le body à chaque appel send().
 * La méthode send() accepte sourceSystemId en 3e paramètre.
 */
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';
import {
  IngestResponse,
  IngestResponseSchema,
  MessageStatusResponse,
  MessageStatusResponseSchema,
  ReplayResponse,
  ReplayResponseSchema,
} from '@/domains/models/Ingest';
import { DryRunResult, DryRunResultSchema } from '@/domains/models/Route';
import { IngestRepo } from '@/domains/interfaces';

export class IngestRepoAPI implements IngestRepo {

  // ─── Send ────────────────────────────────────────────────────────────────────
  // FIX: sourceSystemId envoyé dans le body — le backend le lit depuis req.body

  async send(
    payload:              Record<string, unknown>,
    destinationSystemId?: string,
    correlationId?:       string,
    sourceSystemId?:      string,
  ): Promise<IngestResponse> {
    const body: Record<string, unknown> = { payload };
    if (sourceSystemId)      body.sourceSystemId      = sourceSystemId;
    if (destinationSystemId) body.destinationSystemId = destinationSystemId;
    if (correlationId)       body.correlationId       = correlationId;
    const response = await httpClient.post<unknown>(API_ENDPOINTS.INGEST, body);
    return IngestResponseSchema.parse(response.data);
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getStatus(messageId: string): Promise<MessageStatusResponse> {
    const response = await httpClient.get<unknown>(API_ENDPOINTS.MESSAGE_STATUS(messageId));
    return MessageStatusResponseSchema.parse(response.data);
  }

  // ─── Replay ──────────────────────────────────────────────────────────────────

  async replay(messageId: string): Promise<ReplayResponse> {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.MESSAGE_REPLAY(messageId));
    return ReplayResponseSchema.parse(response.data);
  }

  // ─── Dry-run ──────────────────────────────────────────────────────────────────

  async dryRun(payload: Record<string, unknown>): Promise<DryRunResult> {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.INGEST_DRY_RUN, { payload });
    return DryRunResultSchema.parse(response.data);
  }
}

export const ingestRepo = new IngestRepoAPI();