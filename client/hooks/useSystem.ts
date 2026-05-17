import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFiltersState] = useState<SystemFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const isMounted = useRef(true);
  // ✅ Garde la limite courante accessible dans les callbacks sans dépendance
  const limitRef = useRef(filters.limit);
  limitRef.current = filters.limit;

  // ✅ fetchSystems accepte les filtres en paramètre obligatoire depuis l'effet
  // → jamais de capture stale, pas de ref sur filters
  const fetchSystems = useCallback(async (filtersToApply?: SystemFilters) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await systemRepo.getAll(filtersToApply ?? DEFAULT_FILTERS);
      if (!isMounted.current) return;
      setSystems(response.systems ?? []);
      setTotal(response.total ?? 0);
      setTotalPages(
        response.totalPages ?? Math.ceil((response.total ?? 0) / (filtersToApply?.limit ?? 10))
      );
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des systèmes');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []); // ✅ deps vides → stable, jamais recréée

  const getSystem = useCallback(async (id: string): Promise<System | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      return await systemRepo.getById(id);
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Système non trouvé');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const createSystem = useCallback(async (data: CreateSystem): Promise<System | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const newSystem = await systemRepo.create(data);
      if (isMounted.current && newSystem) {
        setSystems((prev) => [newSystem, ...prev]);
        setTotal((prev) => {
          const next = prev + 1;
          // ✅ limitRef.current : valeur fraîche sans capturer filters
          setTotalPages(Math.ceil(next / limitRef.current));
          return next;
        });
      }
      return newSystem;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const updateSystem = useCallback(
    async (id: string, data: UpdateSystem): Promise<System | null> => {
      if (!isMounted.current) return null;
      setLoading(true);
      setError(null);
      try {
        const updated = await systemRepo.update(id, data);
        if (isMounted.current && updated)
          setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
        return updated;
      } catch (err) {
        if (isMounted.current)
          setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
        return null;
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    []
  );

  const deleteSystem = useCallback(async (id: string): Promise<boolean> => {
    if (!isMounted.current) return false;
    setLoading(true);
    setError(null);
    try {
      await systemRepo.delete(id);
      if (isMounted.current) {
        setSystems((prev) => prev.filter((s) => s.id !== id));
        setTotal((prev) => {
          const next = Math.max(0, prev - 1);
          setTotalPages(Math.ceil(next / limitRef.current));
          return next;
        });
      }
      return true;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const enableSystem = useCallback(async (id: string): Promise<System | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await systemRepo.enable(id);
      if (isMounted.current && updated)
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : "Erreur lors de l'activation");
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const disableSystem = useCallback(async (id: string): Promise<System | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await systemRepo.disable(id);
      if (isMounted.current && updated)
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la désactivation');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const rotateApiKey = useCallback(async (id: string): Promise<string | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await systemRepo.rotateApiKey(id);
      if (isMounted.current && result.apiKey)
        setSystems((prev) =>
          prev.map((s) => (s.id === id ? { ...s, apiKey: result.apiKey } : s))
        );
      return result.apiKey;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la rotation de la clé');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const testWebhook = useCallback(async (id: string) => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      return await systemRepo.testWebhook(id);
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors du test');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
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

  // ✅ filters passé directement à fetchSystems → zéro ref, zéro stale, zéro cascade
  // fetchSystems est stable (deps []) donc l'effet ne boucle pas
  useEffect(() => {
    fetchSystems(filters);
  }, [filters, fetchSystems]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    systems,       // ✅ toujours un tableau, jamais undefined
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