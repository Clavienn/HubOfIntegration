// hooks/useIngest.ts
import { useState, useCallback } from 'react';
import { ingestRepo } from '@/infrastructures/repository/IngestRepoAPI';
import { IngestResponse, MessageStatusResponse } from '@/domains/models/Ingest';

interface UseIngestReturn {
  // États
  loading: boolean;
  error: string | null;
  lastResponse: IngestResponse | null;
  lastStatus: MessageStatusResponse | null;
  
  // Actions
  sendMessage: (payload: Record<string, any>, sourceSystemId: string, destinationSystemId?: string) => Promise<IngestResponse | null>;
  getStatus: (messageId: string) => Promise<MessageStatusResponse | null>;
  replayMessage: (messageId: string) => Promise<boolean>;
  reset: () => void;
}

export function useIngest(): UseIngestReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<IngestResponse | null>(null);
  const [lastStatus, setLastStatus] = useState<MessageStatusResponse | null>(null);

  const sendMessage = useCallback(async (
    payload: Record<string, any>,
    sourceSystemId: string,
    destinationSystemId?: string
  ): Promise<IngestResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ingestRepo.send(payload, sourceSystemId, destinationSystemId);
      setLastResponse(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi du message';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (messageId: string): Promise<MessageStatusResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await ingestRepo.getStatus(messageId);
      setLastStatus(status);
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la récupération du statut';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const replayMessage = useCallback(async (messageId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await ingestRepo.replay(messageId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du rejeu du message';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLastResponse(null);
    setLastStatus(null);
  }, []);

  return {
    loading,
    error,
    lastResponse,
    lastStatus,
    sendMessage,
    getStatus,
    replayMessage,
    reset,
  };
}