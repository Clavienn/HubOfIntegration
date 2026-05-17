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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFiltersState] = useState<RouteFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const isMounted = useRef(true);
  const limitRef = useRef(filters.limit);
  limitRef.current = filters.limit;


  const fetchRoutes = useCallback(async (filtersToApply?: RouteFilters) => {
  if (!isMounted.current) return;
  setLoading(true);
  setError(null);
  try {
    const response = await routeRepo.getAll(filtersToApply ?? DEFAULT_FILTERS);
    if (!isMounted.current) return;

    // ✅ L'API peut retourner un tableau OU un objet paginé
    const routeList = Array.isArray(response)
      ? response
      : (response.routes ?? []);
    const totalCount = Array.isArray(response)
      ? response.length
      : (response.total ?? 0);
    const pages = Array.isArray(response)
      ? 1
      : (response.totalPages ?? Math.ceil(totalCount / (filtersToApply?.limit ?? 10)));

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
}, []);

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
        setTotal((prev) => {
          const next = prev + 1;
          setTotalPages(Math.ceil(next / limitRef.current));
          return next;
        });
      }
      return newRoute;
    } catch (err) {
      if (isMounted.current)
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

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

  // ✅ fetchRoutes stable (deps []) → cet effect ne boucle pas
  // filters passé directement en argument → zéro stale, zéro ref intermédiaire
  useEffect(() => {
    fetchRoutes(filters);
  }, [filters, fetchRoutes]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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