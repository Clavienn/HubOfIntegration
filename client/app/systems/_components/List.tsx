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
  Plus, Search, RotateCcw, Pencil, Trash2, Eye,
  Power, PowerOff, Send, Key, Webhook, Timer,
  RefreshCw, AlertCircle, ServerCrash, CheckCircle2, XCircle,
} from 'lucide-react';
import SystemCreate    from './Create';
import SystemView      from './View';
import SystemUpdate    from './Update';
import ModalToggleSystem from './ToggleSystem';
import ModalDeleteSystem from './Delete';

type Modal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'view';   system: System }
  | { type: 'update'; system: System }
  | { type: 'toggle'; system: System }
  | { type: 'delete'; system: System };

const BASE: SystemFilters = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };

export default function SystemsPage() {
  const [systems, setSystems]           = useState<System[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [currentPage, setCurrentPage]   = useState(1);
  const [filters, setFilters]           = useState<SystemFilters>(BASE);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [modal, setModal]               = useState<Modal>({ type: 'none' });
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (f: SystemFilters, initial = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    initial ? setLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const res = await systemRepo.getAll(f);
      setSystems(res.systems);
      setTotal(res.total);
      setTotalPages(res.totalPages ?? 1);
      setCurrentPage(f.page ?? 1);
    } catch (err: any) {
      if (err?.name !== 'AbortError')
        setError('Erreur lors du chargement des systèmes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(filters, true); return () => abortRef.current?.abort(); }, []);

  const applyFilters = (patch: Partial<SystemFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    load(next);
  };

  const closeModal = () => setModal({ type: 'none' });

  // ── Callbacks sans refetch global — mise à jour locale + cohérence ────────
  const onCreated = (created: System) => {
    setSystems((p) => [created, ...p]); setTotal((t) => t + 1); closeModal();
  };
  const onUpdated = (updated: System) => {
    setSystems((p) => p.map((s) => (s.id === updated.id ? updated : s))); closeModal();
  };
  const onToggled = (toggled: System) => {
    setSystems((p) => p.map((s) => (s.id === toggled.id ? toggled : s))); closeModal();
  };
  const onDeleted = (id: string) => {
    setSystems((p) => p.filter((s) => s.id !== id));
    setTotal((t) => Math.max(0, t - 1)); closeModal();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 h-24 bg-muted animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Systèmes</h1>
          {refreshing && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Actualisation…
            </span>
          )}
        </div>
        <Button onClick={() => setModal({ type: 'create' })}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau Système
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={filters.search ?? ''}
            onChange={(e) => applyFilters({ search: e.target.value || undefined, page: 1 })}
            className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Actifs uniquement</span>
          <Switch checked={filters.isActive === true}
            onCheckedChange={(v) => applyFilters({ isActive: v || undefined, page: 1 })} />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setFilters(BASE); load(BASE); }}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Réinitialiser
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex justify-between items-center">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <button onClick={() => load(filters)} className="underline text-xs flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Réessayer
          </button>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        {systems.length} sur {total} système{total > 1 ? 's' : ''}
      </p>

      {/* List */}
      {systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ServerCrash className="h-10 w-10 opacity-30" /><p>Aucun système trouvé</p>
        </div>
      ) : (
        <div className={`grid gap-3 transition-opacity duration-200 ${refreshing ? 'opacity-60' : ''}`}>
          {systems.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <button type="button" className="text-left flex-1 min-w-0"
                  onClick={() => setModal({ type: 'view', system: s })}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-xs">
                      {s.isActive
                        ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Actif</span>
                        : <span className="flex items-center gap-1"><XCircle className="h-3 w-3" />Inactif</span>}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.apiKey && <span className="flex items-center gap-1 font-mono"><Key className="h-3 w-3" />{s.apiKey.slice(0, 12)}…</span>}
                    {s.webhookUrl && <span className="flex items-center gap-1 truncate max-w-xs"><Webhook className="h-3 w-3" />{s.webhookUrl}</span>}
                    <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{s.timeoutMs}ms</span>
                    <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />{s.retryPolicy?.maxAttempts ?? 3} tentatives</span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/messages/${s.id}`}><Send className="h-3.5 w-3.5 mr-1.5" />Message</Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setModal({ type: 'view', system: s })}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setModal({ type: 'update', system: s })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"
                    className={s.isActive ? 'text-orange-500' : 'text-green-500'}
                    onClick={() => setModal({ type: 'toggle', system: s })}>
                    {s.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500"
                    onClick={() => setModal({ type: 'delete', system: s })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={currentPage <= 1 || refreshing}
            onClick={() => applyFilters({ page: currentPage - 1 })}>Précédent</Button>
          <span className="text-sm text-muted-foreground px-2">Page {currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages || refreshing}
            onClick={() => applyFilters({ page: currentPage + 1 })}>Suivant</Button>
        </div>
      )}

      {/* Modals */}
      <SystemCreate open={modal.type === 'create'} onClose={closeModal} onCreated={onCreated} />
      <SystemView open={modal.type === 'view'} system={modal.type === 'view' ? modal.system : null}
        onClose={closeModal} onEdit={(s) => setModal({ type: 'update', system: s })} />
      <SystemUpdate open={modal.type === 'update'} system={modal.type === 'update' ? modal.system : null}
        onClose={closeModal} onUpdated={onUpdated} />
      <ModalToggleSystem open={modal.type === 'toggle'} system={modal.type === 'toggle' ? modal.system : null}
        onClose={closeModal} onToggled={onToggled} />
      <ModalDeleteSystem open={modal.type === 'delete'} system={modal.type === 'delete' ? modal.system : null}
        onClose={closeModal} onDeleted={onDeleted} />
    </div>
  );
}