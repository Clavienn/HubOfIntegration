// hooks/useMessages.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { messageRepo } from '@/infrastructures/repository/MessageRepoAPI';
import { Message, MessageFilters, StatisticsResponse } from '@/domains/models/Message';

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: MessageFilters;
  statistics: StatisticsResponse | null;
  fetchMessages: (filters?: MessageFilters) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  getMessage: (id: string) => Promise<Message | null>;
  setFilters: (filters: Partial<MessageFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: MessageFilters = {
  status: undefined,
  sourceSystemId: undefined,
  destinationSystemId: undefined,
  fromDate: undefined,
  toDate: undefined,
  limit: 20,
  offset: 0,
  page: 1,
};

export function useMessages(initialFilters?: Partial<MessageFilters>): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [filters, setFiltersState] = useState<MessageFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const isMounted = useRef<boolean>(true);
  const initialFetchDone = useRef<boolean>(false);

  const fetchMessages = useCallback(async (filtersToApply?: MessageFilters) => {
    if (!isMounted.current) return;
    
    const params = filtersToApply || filters;
    setLoading(true);
    setError(null);
    
    try {
      const response = await messageRepo.getAll(params);
      if (!isMounted.current) return;
      
      setMessages(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.ceil(response.pagination.total / params.limit));
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des messages');
      setMessages([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filters]);

  const fetchStatistics = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const stats = await messageRepo.getStatistics();
      if (isMounted.current) {
        setStatistics(stats);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, []);

  const getMessage = useCallback(async (id: string): Promise<Message | null> => {
    if (!isMounted.current) return null;
    
    try {
      return await messageRepo.getById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message non trouvé');
      return null;
    }
  }, []);

  const setFilters = useCallback((newFilters: Partial<MessageFilters>) => {
    const newPage = newFilters.page !== undefined ? newFilters.page : 1;
    const newLimit = newFilters.limit || filters.limit;
    const newOffset = (newPage - 1) * newLimit;
    
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: newPage,
      offset: newOffset,
    }));
  }, [filters.limit]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    if (initialFetchDone.current) {
      fetchMessages();
      fetchStatistics();
    }
  }, [filters, fetchMessages, fetchStatistics]);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchMessages();
      fetchStatistics();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchMessages, fetchStatistics]);

  return {
    messages,
    loading,
    error,
    total,
    currentPage: filters.page,
    totalPages,
    filters,
    statistics,
    fetchMessages,
    fetchStatistics,
    getMessage,
    setFilters,
    resetFilters,
  };
}