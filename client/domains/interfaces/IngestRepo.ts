// repositories/IngestRepo.ts
import { IngestRequest, IngestResponse, MessageStatusResponse } from '@/domains/models/Ingest';

export interface IngestRepo {
  /**
   * Envoie un message à l'ESB
   */
  send(payload: Record<string, any>, destinationSystemId?: string): Promise<IngestResponse>;

  /**
   * Récupère le statut d'un message
   */
  getStatus(messageId: string): Promise<MessageStatusResponse>;

  /**
   * Rejoue un message échoué
   */
  replay(messageId: string): Promise<{ messageId: string; status: string; timestamp: Date }>;
}