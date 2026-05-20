// hooks/useRoutes.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { routeRepo } from '@/infrastructures/repository/RouteRepoAPI';
import { Route, CreateRoute, UpdateRoute, RouteFilters } from '@/domains/models/Route';

interface UseRoutesReturn {
  routes: Route[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: RouteFilters;
  fetchRoutes: (filters?: RouteFilters) => Promise<void>;
  getRoute: (id: string) => Promise<Route | null>;
  createRoute: (data: CreateRoute) => Promise<Route | null>;
  updateRoute: (id: string, data: UpdateRoute) => Promise<Route | null>;
  deleteRoute: (id: string) => Promise<boolean>;
  enableRoute: (id: string) => Promise<Route | null>;
  disableRoute: (id: string) => Promise<Route | null>;
  setFilters: (filters: Partial<RouteFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: RouteFilters = {
  sourceSystemId: undefined,
  destinationSystemId: undefined,
  isActive: undefined,
  search: undefined,
  page: 1,
  limit: 10,
};

export function useRoutes(initialFilters?: Partial<RouteFilters>): UseRoutesReturn {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [filters, setFiltersState] = useState<RouteFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const isMounted = useRef<boolean>(true);
  const initialFetchDone = useRef<boolean>(false);

  const fetchRoutes = useCallback(async (filtersToApply?: RouteFilters) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await routeRepo.getAll(filtersToApply ?? filters);
      if (!isMounted.current) return;

      const routeList = response?.routes ?? [];
      const totalCount = response?.total ?? 0;
      const pages = response?.totalPages ?? Math.ceil(totalCount / (filtersToApply?.limit ?? filters.limit));

      setRoutes(routeList);
      setTotal(totalCount);
      setTotalPages(pages);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des routes');
      setRoutes([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filters]);

  const getRoute = useCallback(async (id: string): Promise<Route | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      return await routeRepo.getById(id);
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Route non trouvée');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const createRoute = useCallback(async (data: CreateRoute): Promise<Route | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const newRoute = await routeRepo.create(data);
      if (isMounted.current && newRoute) {
        setRoutes((prev) => [newRoute, ...prev]);
        setTotal((prev) => prev + 1);
        setTotalPages(Math.ceil((total + 1) / filters.limit));
      }
      return newRoute;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filters.limit, total]);

  const updateRoute = useCallback(async (id: string, data: UpdateRoute): Promise<Route | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await routeRepo.update(id, data);
      if (isMounted.current && updated)
        setRoutes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    if (!isMounted.current) return false;
    setLoading(true);
    setError(null);
    try {
      await routeRepo.delete(id);
      if (isMounted.current) {
        setRoutes((prev) => prev.filter((r) => r.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        setTotalPages(Math.ceil((total - 1) / filters.limit));
      }
      return true;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filters.limit, total]);

  const enableRoute = useCallback(async (id: string): Promise<Route | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await routeRepo.enable(id);
      if (isMounted.current && updated)
        setRoutes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : "Erreur lors de l'activation");
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const disableRoute = useCallback(async (id: string): Promise<Route | null> => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await routeRepo.disable(id);
      if (isMounted.current && updated)
        setRoutes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la désactivation');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const setFilters = useCallback((newFilters: Partial<RouteFilters>) => {
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
    if (initialFetchDone.current) {
      fetchRoutes();
    }
  }, [filters, fetchRoutes]);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchRoutes();
    }
    return () => {
      isMounted.current = false;
    };
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    total,
    currentPage: filters.page,
    totalPages,
    filters,
    fetchRoutes,
    getRoute,
    createRoute,
    updateRoute,
    deleteRoute,
    enableRoute,
    disableRoute,
    setFilters,
    resetFilters,
  };
}