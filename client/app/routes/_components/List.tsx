'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Route, RouteFilters } from '@/domains/models/Route';
import { System, SystemFilters } from '@/domains/models/System';
import { routeRepo } from '@/infrastructures/repository/RouteRepoAPI';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import { CreateRouteModal } from './Create';
import { UpdateRouteModal } from './Update';
import { ViewRouteModal } from './View';
import { DeleteRouteModal } from './Delete';

const LIMIT = 10;

export default function RoutesPage() {
  // ── Données routes ──
  const [routes, setRoutes] = useState<Route[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<RouteFilters>({ page: 1, limit: LIMIT });
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Données systèmes (pour les selects + résolution noms) ──
  const [systems, setSystems] = useState<System[]>([]);
  const systemMap = new Map<string, System>(systems.map((s) => [s.id!, s]));

  // ── Modals ──
  const [createOpen, setCreateOpen] = useState(false);
  const [updateModal, setUpdateModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [toggleModal, setToggleModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch routes ──
  const fetchRoutes = useCallback(async (f: RouteFilters, isInitial = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const result = await routeRepo.getAll(f);
      setRoutes(result.routes);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? 1);
      setCurrentPage(result.page ?? 1);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Erreur lors du chargement des routes.');
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch systèmes en parallèle (silencieux) ──
  const fetchSystems = useCallback(async () => {
    try {
      const result = await systemRepo.getAll({ limit: 100 });
      setSystems(result.systems);
    } catch {
      // non-bloquant
    }
  }, []);

  // Chargement initial : routes + systèmes en parallèle
  useEffect(() => {
    fetchRoutes(filters, true);
    fetchSystems();
    return () => abortRef.current?.abort();
  }, []);

  const applyFilters = (partial: Partial<RouteFilters>) => {
    const updated = { ...filters, ...partial };
    setFiltersState(updated);
    fetchRoutes(updated);
  };

  const resetFilters = () => {
    const base: RouteFilters = { page: 1, limit: LIMIT };
    setFiltersState(base);
    fetchRoutes(base);
  };

  // ── Toggle activer / désactiver ──
  const handleToggleConfirm = async () => {
    const { route } = toggleModal;
    if (!route?.id) return;
    setToggleLoading(true);
    setToggleError(null);

    // Optimiste : inverser localement
    const toggled = { ...route, isActive: !route.isActive };
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? toggled : r)));
    setToggleModal({ open: false, route: null });

    try {
      const updated = route.isActive
        ? await routeRepo.disable(route.id)
        : await routeRepo.enable(route.id);
      setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      // Rollback
      setRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)));
      setToggleError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setToggleModal({ open: true, route });
    } finally {
      setToggleLoading(false);
    }
  };

  // ── Delete ──
  const handleDeleteConfirm = async (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setDeleteModal({ open: false, route: null });
    try {
      await routeRepo.delete(id);
    } catch {
      // Resync si erreur
      fetchRoutes(filters);
    }
  };

  // ── Callbacks modals ──
  const onCreated = (created: Route) => {
    setRoutes((prev) => [created, ...prev]);
    setTotal((t) => t + 1);
    setCreateOpen(false);
    fetchRoutes(filters);
  };

  const onUpdated = (updated: Route) => {
    setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setUpdateModal({ open: false, route: null });
    fetchRoutes(filters);
  };

  // ── Skeleton premier chargement uniquement ──
  if (initialLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-40 bg-muted rounded animate-pulse" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 h-20 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Routes d'intégration
          {refreshing && (
            <span className="ml-2 text-sm font-normal text-muted-foreground animate-pulse">
              Actualisation…
            </span>
          )}
        </h1>
        <Button onClick={() => setCreateOpen(true)}>+ Nouvelle Route</Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Input
          placeholder="Rechercher par nom..."
          value={filters.search ?? ''}
          onChange={(e) => applyFilters({ search: e.target.value, page: 1 })}
          className="max-w-sm"
        />

        <Select
          value={filters.sourceSystemId ?? 'all'}
          onValueChange={(val) => applyFilters({ sourceSystemId: val === 'all' ? undefined : val, page: 1 })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Système source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sources</SelectItem>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.destinationSystemId ?? 'all'}
          onValueChange={(val) => applyFilters({ destinationSystemId: val === 'all' ? undefined : val, page: 1 })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Système destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les destinations</SelectItem>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm">Actives uniquement :</span>
          <Switch
            checked={filters.isActive === true}
            onCheckedChange={(checked) =>
              applyFilters({ isActive: filters.isActive === checked ? undefined : checked, page: 1 })
            }
          />
        </div>

        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200 flex justify-between">
          <span>{error}</span>
          <button onClick={() => fetchRoutes(filters)} className="underline text-red-700 text-xs">
            Réessayer
          </button>
        </div>
      )}

      {/* Compteur */}
      <div className="text-sm text-muted-foreground mb-4">
        Affichage de {routes.length} sur {total} route{total > 1 ? 's' : ''}
      </div>

      {/* Liste — reste visible pendant refresh */}
      {routes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Aucune route trouvée
        </div>
      ) : (
        <div className={`grid gap-4 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          {routes.map((route) => {
            const src = systemMap.get(route.sourceSystemId);
            const dst = systemMap.get(route.destinationSystemId);

            return (
              <div
                key={route.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{route.name}</h3>
                      <Badge variant={route.isActive ? 'default' : 'secondary'}>
                        {route.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {src?.name ?? route.sourceSystemId}
                      {' → '}
                      {dst?.name ?? route.destinationSystemId}
                    </p>
                    {route.condition && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">
                        <span className="font-medium">Condition :</span> {route.condition}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">Priorité :</span> {route.priority}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setViewModal({ open: true, route })}>
                      Voir
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setUpdateModal({ open: true, route })}>
                      Modifier
                    </Button>
                    <Button
                      variant={route.isActive ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => setToggleModal({ open: true, route })}
                    >
                      {route.isActive ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, route })}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage <= 1 || refreshing}
            onClick={() => applyFilters({ page: currentPage - 1 })}
          >
            Précédent
          </Button>
          <span className="py-2 px-4 text-sm">Page {currentPage} sur {totalPages}</span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages || refreshing}
            onClick={() => applyFilters({ page: currentPage + 1 })}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* ── Modals ── */}
      <CreateRouteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />

      <UpdateRouteModal
        open={updateModal.open}
        route={updateModal.route}
        onClose={() => setUpdateModal({ open: false, route: null })}
        onUpdated={onUpdated}
      />

      <ViewRouteModal
        open={viewModal.open}
        route={viewModal.route}
        systems={systems}
        onClose={() => setViewModal({ open: false, route: null })}
        onEdit={(r) => setUpdateModal({ open: true, route: r })}
      />

      <DeleteRouteModal
        open={deleteModal.open}
        route={deleteModal.route}
        onClose={() => setDeleteModal({ open: false, route: null })}
        onConfirm={handleDeleteConfirm}
      />

      {/* Toggle modal */}
      {toggleModal.open && toggleModal.route && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">
              {toggleModal.route.isActive ? 'Désactiver' : 'Activer'} la route
            </h2>
            <p className="text-sm text-muted-foreground">
              {toggleModal.route.isActive
                ? `Voulez-vous désactiver "${toggleModal.route.name}" ? Les messages ne seront plus routés.`
                : `Voulez-vous activer "${toggleModal.route.name}" ?`}
            </p>
            {toggleError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{toggleError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={toggleLoading}
                onClick={() => { setToggleModal({ open: false, route: null }); setToggleError(null); }}
              >
                Annuler
              </Button>
              <Button
                variant={toggleModal.route.isActive ? 'destructive' : 'default'}
                disabled={toggleLoading}
                onClick={handleToggleConfirm}
              >
                {toggleLoading ? '...' : toggleModal.route.isActive ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}