// repositories/IngestRepoAPI.ts
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';
import { IngestRequest, IngestResponse, MessageStatusResponse } from '@/domains/models/Ingest';
import { IngestRepo } from '@/domains/interfaces/IngestRepo';

export class IngestRepoAPI implements IngestRepo {
  async send(payload: Record<string, any>, sourceSystemId: string, destinationSystemId?: string): Promise<IngestResponse> {
    const request: IngestRequest = {
      payload,
      sourceSystemId: sourceSystemId,
      destinationSystemId,
    };
    
    const response = await httpClient.post<IngestResponse>(API_ENDPOINTS.INGEST, request);
    return response.data;
  }

  async getStatus(messageId: string): Promise<MessageStatusResponse> {
    const response = await httpClient.get<MessageStatusResponse>(API_ENDPOINTS.MESSAGE_STATUS(messageId));
    return response.data;
  }

  async replay(messageId: string): Promise<{ messageId: string; status: string; timestamp: Date }> {
    const response = await httpClient.post<{ messageId: string; status: string; timestamp: Date }>(
      API_ENDPOINTS.MESSAGE_REPLAY(messageId)
    );
    return response.data;
  }
}

export const ingestRepo = new IngestRepoAPI();