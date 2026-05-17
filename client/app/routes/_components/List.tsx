'use client';

import { useState } from 'react';
import { useRoutes } from '@/hooks/useRoute';
import { useSystems } from '@/hooks/useSystem';
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
import { Route } from '@/domains/models/Route';
import { System } from '@/domains/models/System';
import { CreateRouteModal } from './Create';
import { UpdateRouteModal } from './Update';
import { ViewRouteModal } from './View';
import { DeleteRouteModal } from './Delete';

type ToggleModal = { open: boolean; route: Route | null };

export default function RoutesPage() {
  const {
    routes,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    filters,
    deleteRoute,
    enableRoute,
    disableRoute,
    setFilters,
    resetFilters,
  } = useRoutes({ limit: 10 });

  const { systems = [] } = useSystems({ limit: 100 });

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [updateModal, setUpdateModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [toggleModal, setToggleModal] = useState<ToggleModal>({ open: false, route: null });
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const systemMap = new Map<string, System>(systems.map((s) => [s.id as string, s]));

  // Filters
  const handleSearch = (search: string) => setFilters({ search, page: 1 });
  const handleSourceFilter = (val: string) =>
    setFilters({ sourceSystemId: val === 'all' ? undefined : val, page: 1 });
  const handleDestFilter = (val: string) =>
    setFilters({ destinationSystemId: val === 'all' ? undefined : val, page: 1 });
  const handleActiveFilter = (checked: boolean) =>
    setFilters({ isActive: checked === filters.isActive ? undefined : checked, page: 1 });
  const handlePageChange = (page: number) => setFilters({ page });

  // Toggle (activer/désactiver) — modal shadcn simple via Dialog inline
  const handleToggleConfirm = async () => {
    const { route } = toggleModal;
    if (!route?.id) return;
    setToggleLoading(true);
    setToggleError(null);
    try {
      if (route.isActive) {
        await disableRoute(route.id);
      } else {
        await enableRoute(route.id);
      }
      setToggleModal({ open: false, route: null });
    } catch (err: unknown) {
      setToggleError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setToggleLoading(false);
    }
  };

  // Delete
  const handleDeleteConfirm = async (id: string) => {
    await deleteRoute(id);
  };

  if (loading && routes.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Routes d'intégration</h1>
          <Button disabled>+ Nouvelle Route</Button>
        </div>
        <div className="text-center py-12 text-muted-foreground">Chargement des routes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Routes d'intégration</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Nouvelle Route</Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Input
          placeholder="Rechercher par nom..."
          value={filters.search ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />

        <Select value={filters.sourceSystemId ?? 'all'} onValueChange={handleSourceFilter}>
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

        <Select value={filters.destinationSystemId ?? 'all'} onValueChange={handleDestFilter}>
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
          <Switch checked={filters.isActive === true} onCheckedChange={handleActiveFilter} />
        </div>

        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Compteur */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading
          ? 'Mise à jour...'
          : `Affichage de ${routes.length} sur ${total} route${total > 1 ? 's' : ''}`}
      </div>

      {/* Liste */}
      {routes.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Aucune route trouvée
        </div>
      ) : (
        <div className={`grid gap-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {routes.map((route) => {
            const src = systemMap.get(route.sourceSystemId);
            const dst = systemMap.get(route.destinationSystemId);

            return (
              <div
                key={route.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex justify-between items-start flex-wrap gap-4">
                  {/* Infos */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewModal({ open: true, route })}
                    >
                      Voir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUpdateModal({ open: true, route })}
                    >
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
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Précédent
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Créer */}
      <CreateRouteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Modifier */}
      <UpdateRouteModal
        open={updateModal.open}
        route={updateModal.route}
        onClose={() => setUpdateModal({ open: false, route: null })}
      />

      {/* Voir */}
      <ViewRouteModal
        open={viewModal.open}
        route={viewModal.route}
        systems={systems}
        onClose={() => setViewModal({ open: false, route: null })}
        onEdit={(r) => setUpdateModal({ open: true, route: r })}
      />

      {/* Supprimer */}
      <DeleteRouteModal
        open={deleteModal.open}
        route={deleteModal.route}
        onClose={() => setDeleteModal({ open: false, route: null })}
        onConfirm={handleDeleteConfirm}
      />

      {/* Toggle activer/désactiver — AlertDialog inline */}
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
                onClick={() => { setToggleModal({ open: false, route: null }); setToggleError(null); }}
                disabled={toggleLoading}
              >
                Annuler
              </Button>
              <Button
                variant={toggleModal.route.isActive ? 'destructive' : 'default'}
                onClick={handleToggleConfirm}
                disabled={toggleLoading}
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