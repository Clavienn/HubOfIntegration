import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import {
  System,
  CreateSystem,
  UpdateSystem,
  SystemFilters,
} from '@/domains/models/System';

interface UseSystemsReturn {
  systems: System[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: SystemFilters;
  fetchSystems: (filters?: SystemFilters) => Promise<void>;
  getSystem: (id: string) => Promise<System | null>;
  createSystem: (data: CreateSystem) => Promise<System | null>;
  updateSystem: (id: string, data: UpdateSystem) => Promise<System | null>;
  deleteSystem: (id: string) => Promise<boolean>;
  enableSystem: (id: string) => Promise<System | null>;
  disableSystem: (id: string) => Promise<System | null>;
  rotateApiKey: (id: string) => Promise<string | null>;
  testWebhook: (id: string) => Promise<{ success: boolean; message: string } | null>;
  setFilters: (filters: Partial<SystemFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SystemFilters = {
  isActive: undefined,
  search: undefined,
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function useSystems(initialFilters?: Partial<SystemFilters>): UseSystemsReturn {
  const stableInitialFilters = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...initialFilters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFiltersState] = useState<SystemFilters>(stableInitialFilters);

  const limitRef = useRef(filters.limit);
  limitRef.current = filters.limit;

  const fetchSystems = useCallback(async (filtersToApply?: SystemFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await systemRepo.getAll(filtersToApply ?? DEFAULT_FILTERS);
      setSystems(response.systems ?? []);
      setTotal(response.total ?? 0);
      setTotalPages(
        response.totalPages ??
          Math.ceil((response.total ?? 0) / (filtersToApply?.limit ?? 10))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du chargement des systèmes'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const getSystem = useCallback(async (id: string): Promise<System | null> => {
    setLoading(true);
    setError(null);
    try {
      return await systemRepo.getById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Système non trouvé');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSystem = useCallback(async (data: CreateSystem): Promise<System | null> => {
    setLoading(true);
    setError(null);
    try {
      const newSystem = await systemRepo.create(data);
      if (newSystem) {
        setSystems((prev) => [newSystem, ...prev]);
        setTotal((prev) => {
          const next = prev + 1;
          setTotalPages(Math.ceil(next / limitRef.current));
          return next;
        });
      }
      return newSystem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSystem = useCallback(
    async (id: string, data: UpdateSystem): Promise<System | null> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await systemRepo.update(id, data);
        if (updated)
          setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSystem = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await systemRepo.delete(id);
      setSystems((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => {
        const next = Math.max(0, prev - 1);
        setTotalPages(Math.ceil(next / limitRef.current));
        return next;
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const enableSystem = useCallback(async (id: string): Promise<System | null> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await systemRepo.enable(id);
      if (updated)
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const disableSystem = useCallback(async (id: string): Promise<System | null> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await systemRepo.disable(id);
      if (updated)
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la désactivation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const rotateApiKey = useCallback(async (id: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await systemRepo.rotateApiKey(id);
      if (result.apiKey)
        setSystems((prev) =>
          prev.map((s) => (s.id === id ? { ...s, apiKey: result.apiKey } : s))
        );
      return result.apiKey;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la rotation de la clé'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const testWebhook = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await systemRepo.testWebhook(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du test');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setFilters = useCallback((newFilters: Partial<SystemFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    fetchSystems(filters);
  }, [filters, fetchSystems]);

  return {
    systems,
    loading,
    error,
    total,
    currentPage: filters.page,
    totalPages,
    filters,
    fetchSystems,
    getSystem,
    createSystem,
    updateSystem,
    deleteSystem,
    enableSystem,
    disableSystem,
    rotateApiKey,
    testWebhook,
    setFilters,
    resetFilters,
  };
}