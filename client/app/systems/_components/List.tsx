'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { System, SystemFilters } from '@/domains/models/System';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import {
  Plus,
  Search,
  RotateCcw,
  Pencil,
  Trash2,
  Eye,
  Power,
  PowerOff,
  Send,
  Key,
  Webhook,
  Timer,
  RefreshCw,
  AlertCircle,
  ServerCrash,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import SystemCreate from './Create';
import SystemView from './View';
import SystemUpdate from './Update';
import ModalToggleSystem from './ToggleSystem';
import ModalDeleteSystem from './Delete';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'view'; system: System }
  | { type: 'update'; system: System }
  | { type: 'toggle'; system: System }
  | { type: 'delete'; system: System };

const LIMIT = 10;

export default function SystemsPage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<SystemFilters>({ page: 1, limit: LIMIT });
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const abortRef = useRef<AbortController | null>(null);

  const fetchSystems = useCallback(async (f: SystemFilters, isInitial = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const result = await systemRepo.getAll(f);
      setSystems(result.systems);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? 1);
      setCurrentPage(f.page ?? 1);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Erreur lors du chargement des systèmes.');
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSystems(filters, true);
    return () => abortRef.current?.abort();
  }, []);

  const applyFilters = (partial: Partial<SystemFilters>) => {
    const updated = { ...filters, ...partial };
    setFiltersState(updated);
    fetchSystems(updated);
  };

  const resetFilters = () => {
    const base: SystemFilters = { page: 1, limit: LIMIT };
    setFiltersState(base);
    fetchSystems(base);
  };

  const closeModal = () => setModal({ type: 'none' });

  const onCreated = (created: System) => {
    setSystems((prev) => [created, ...prev]);
    setTotal((t) => t + 1);
    closeModal();
    fetchSystems(filters);
  };

  const onUpdated = (updated: System) => {
    setSystems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    closeModal();
    fetchSystems(filters);
  };

  const onToggled = (toggled: System) => {
    setSystems((prev) => prev.map((s) => (s.id === toggled.id ? toggled : s)));
    closeModal();
    fetchSystems(filters);
  };

  const onDeleted = (id: string) => {
    setSystems((prev) => prev.filter((s) => s.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    closeModal();
    fetchSystems(filters);
  };

  // Skeleton au premier chargement
  if (initialLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 h-24 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Systèmes</h1>
          {refreshing && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Actualisation…
            </span>
          )}
        </div>
        <Button onClick={() => setModal({ type: 'create' })}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Système
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search ?? ''}
            onChange={(e) => applyFilters({ search: e.target.value, page: 1 })}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Actifs uniquement</span>
          <Switch
            checked={filters.isActive === true}
            onCheckedChange={(checked) =>
              applyFilters({ isActive: filters.isActive === checked ? undefined : checked, page: 1 })
            }
          />
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Réinitialiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex justify-between items-center">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <button
            onClick={() => fetchSystems(filters)}
            className="flex items-center gap-1 underline text-red-700 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Réessayer
          </button>
        </div>
      )}

      {/* Compteur */}
      <p className="text-sm text-muted-foreground mb-4">
        {systems.length} sur {total} système{total > 1 ? 's' : ''}
      </p>

      {/* Liste */}
      {systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ServerCrash className="h-10 w-10 opacity-30" />
          <p>Aucun système trouvé</p>
        </div>
      ) : (
        <div
          className={`grid gap-3 transition-opacity duration-200 ${
            refreshing ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {systems.map((system) => (
            <div
              key={system.id}
              className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                {/* Infos système — cliquable pour voir le détail */}
                <button
                  type="button"
                  className="text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  onClick={() => setModal({ type: 'view', system })}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{system.name}</h3>
                    <Badge
                      variant={system.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {system.isActive ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Inactif
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {system.apiKey && (
                      <span className="flex items-center gap-1 font-mono">
                        <Key className="h-3 w-3" />
                        {system.apiKey.slice(0, 12)}…
                      </span>
                    )}
                    {system.webhookUrl && (
                      <span className="flex items-center gap-1 truncate max-w-xs">
                        <Webhook className="h-3 w-3" />
                        {system.webhookUrl}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {system.timeoutMs}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {system.retryPolicy?.maxAttempts ?? 3} tentatives
                    </span>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* ✅ Lien vers /message/:id pour déclencher un message */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/messages/${system.id}`} title="Envoyer un message">
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Message
                    </Link>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Voir"
                    onClick={() => setModal({ type: 'view', system })}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Modifier"
                    onClick={() => setModal({ type: 'update', system })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title={system.isActive ? 'Désactiver' : 'Activer'}
                    onClick={() => setModal({ type: 'toggle', system })}
                    className={
                      system.isActive
                        ? 'text-orange-500 hover:text-orange-600'
                        : 'text-green-500 hover:text-green-600'
                    }
                  >
                    {system.isActive ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Supprimer"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setModal({ type: 'delete', system })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1 || refreshing}
            onClick={() => applyFilters({ page: currentPage - 1 })}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages || refreshing}
            onClick={() => applyFilters({ page: currentPage + 1 })}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modals */}
      <SystemCreate
        open={modal.type === 'create'}
        onClose={closeModal}
        onCreated={onCreated}
      />
      <SystemView
        open={modal.type === 'view'}
        system={modal.type === 'view' ? modal.system : null}
        onClose={closeModal}
        onEdit={(system) => setModal({ type: 'update', system })}
      />
      <SystemUpdate
        open={modal.type === 'update'}
        system={modal.type === 'update' ? modal.system : null}
        onClose={closeModal}
        onUpdated={onUpdated}
      />
      <ModalToggleSystem
        open={modal.type === 'toggle'}
        system={modal.type === 'toggle' ? modal.system : null}
        onClose={closeModal}
        onToggled={onToggled}
      />
      <ModalDeleteSystem
        open={modal.type === 'delete'}
        system={modal.type === 'delete' ? modal.system : null}
        onClose={closeModal}
        onDeleted={() =>
          onDeleted(modal.type === 'delete' ? modal.system.id : '')
        }
      />
    </div>
  );
}