'use client';

// ── MessagesPage.tsx ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw,
  TrendingUp, Clock, CheckCircle, Activity, AlertCircle,
} from 'lucide-react';
import { Message, MessageFilters, StatisticsResponse } from '@/domains/models/Message';
import { System } from '@/domains/models/System';
import { messageRepo } from '@/infrastructures/repository/MessageRepoAPI';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import {
  StatCard, StatusBadge, StatusDistribution, MessageDetailDialog,
} from './MessageComponent';

// ── Constantes ────────────────────────────────────────────────────────────────

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: 'all',        label: 'Tous les statuts' },
  { value: 'pending',    label: 'En attente' },
  { value: 'processing', label: 'Traitement' },
  { value: 'success',    label: 'Succès' },
  { value: 'failed',     label: 'Échec' },
  { value: 'retry',      label: 'Nouvelle tentative' },
  { value: 'dead',       label: 'Lettre morte' },
];

const DEFAULT_STATS: StatisticsResponse = {
  total: 0,
  byStatus: { success: 0, failed: 0, pending: 0, processing: 0, dead: 0 },
  last24h: { total: 0, success: 0, successRate: 0 },
  performance: { avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
  overallSuccessRate: 0,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  // ── Messages ────────────────────────────────────────────────────────────────
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [filters,      setFiltersState] = useState<MessageFilters>({ page: 1, limit: LIMIT });
  const [initialLoad,  setInitialLoad]  = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Stats & systèmes ────────────────────────────────────────────────────────
  const [stats,   setStats]   = useState<StatisticsResponse>(DEFAULT_STATS);
  const [systems, setSystems] = useState<System[]>([]);
  const systemMap = new Map(systems.map((s) => [s.id, s]));

  // ── Modal ───────────────────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState<Message | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Recherche rapide ────────────────────────────────────────────────────────
  const [searchId, setSearchId] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch messages ───────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (f: MessageFilters, isInitial = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (isInitial) setInitialLoad(true); else setRefreshing(true);
    setError(null);
    try {
      const result = await messageRepo.getAll(f);
      setMessages(result.data);
      setTotal(result.pagination.total);
      const pages = Math.ceil(result.pagination.total / LIMIT);
      setTotalPages(pages || 1);
      setCurrentPage(f.page ?? 1);
    } catch (err: unknown) {
      if ((err as any)?.name !== 'AbortError')
        setError('Erreur lors du chargement des messages.');
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try { setStats(await messageRepo.getStatistics()); } catch { /* silencieux */ }
  }, []);

  const fetchSystems = useCallback(async () => {
    try {
      const r = await systemRepo.getAll({ limit: 100 });
      setSystems(r.systems);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    fetchMessages(filters, true);
    fetchStats();
    fetchSystems();
    return () => abortRef.current?.abort();
  }, []);

  // ── Filtres ──────────────────────────────────────────────────────────────────

  const applyFilters = (partial: Partial<MessageFilters>) => {
    const updated = { ...filters, ...partial };
    setFiltersState(updated);
    fetchMessages(updated);
  };

  const resetFilters = () => {
    const base: MessageFilters = { page: 1, limit: LIMIT };
    setFiltersState(base);
    setSearchId('');
    fetchMessages(base);
  };

  const handleRefresh = () => { fetchMessages(filters); fetchStats(); };

  // ── Recherche par ID ─────────────────────────────────────────────────────────

  const handleSearchById = async () => {
    if (!searchId.trim()) return;
    try {
      const msg = await messageRepo.getById(searchId.trim());
      setSelected(msg);
      setDetailOpen(true);
    } catch {
      setError(`Message "${searchId}" introuvable.`);
    }
  };

  // ── Rafraîchir un message après action ──────────────────────────────────────

  const handleStatusChanged = async (messageId: string) => {
    try {
      const updated = await messageRepo.getById(messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      if (selected?.id === messageId) setSelected(updated);
      fetchStats();
    } catch { /* silencieux */ }
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (initialLoad) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 border rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6">

      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Messages
          {refreshing && (
            <span className="ml-2 text-sm font-normal text-muted-foreground animate-pulse">Actualisation…</span>
          )}
        </h1>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total"         value={stats.total}                              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Taux de succès" value={`${stats.overallSuccessRate.toFixed(1)}%`} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Temps moyen"   value={`${stats.performance.avgProcessingTimeMs}ms`} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Messages 24h"  value={stats.last24h.total}                      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.last24h.successRate.toFixed(1)}% de succès`} />
      </div>

      {/* Distribution statuts */}
      <StatusDistribution stats={stats} />

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        {/* Recherche par ID */}
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher par ID…"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
            className="w-56"
          />
          <Button variant="outline" onClick={handleSearchById} disabled={!searchId.trim()}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Statut */}
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            applyFilters({ status: v === 'all' ? undefined : (v as Message['status']), page: 1 })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source */}
        <Select
          value={filters.sourceSystemId ?? 'all'}
          onValueChange={(v) =>
            applyFilters({ sourceSystemId: v === 'all' ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Système source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sources</SelectItem>
            {systems.map((s) => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Destination */}
        <Select
          value={filters.destinationSystemId ?? 'all'}
          onValueChange={(v) =>
            applyFilters({ destinationSystemId: v === 'all' ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Système destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les destinations</SelectItem>
            {systems.map((s) => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200 flex justify-between">
          <span><AlertCircle className="h-4 w-4 inline mr-2" />{error}</span>
          <button onClick={() => { setError(null); fetchMessages(filters); }} className="underline text-xs">Réessayer</button>
        </div>
      )}

      {/* Compteur */}
      <p className="text-sm text-muted-foreground mb-4">
        {messages.length} sur {total} message{total > 1 ? 's' : ''}
      </p>

      {/* Liste */}
      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">Aucun message trouvé</div>
      ) : (
        <div className={`space-y-3 transition-opacity duration-200 ${refreshing ? 'opacity-60' : ''}`}>
          {messages.map((msg) => {
            const src = systemMap.get(msg.metadata.sourceSystemId);
            const dst = msg.metadata.destinationSystemId ? systemMap.get(msg.metadata.destinationSystemId) : null;
            return (
              <div key={msg.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <StatusBadge status={msg.status} />
                      <span className="text-xs font-mono text-muted-foreground">{msg.id.slice(0, 20)}…</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">Source :</span> {src?.name ?? msg.metadata.sourceSystemId}
                      {dst && <> → <span className="font-medium">Destination :</span> {dst.name ?? msg.metadata.destinationSystemId}</>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tentatives : {msg.metadata.retryCount}
                      {msg.metadata.processingTime != null && (
                        <span className="ml-3">Temps : {msg.metadata.processingTime} ms</span>
                      )}
                      <span className="ml-3">MàJ : {new Date(msg.updatedAt).toLocaleString('fr-FR')}</span>
                    </p>
                    {msg.error && (
                      <p className="text-xs text-red-600 mt-1 truncate max-w-2xl">{msg.error}</p>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => { setSelected(msg); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Voir le détail</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" disabled={currentPage <= 1 || refreshing}
            onClick={() => applyFilters({ page: currentPage - 1 })}>
            <ChevronLeft className="h-4 w-4" />Précédent
          </Button>
          <span className="py-2 px-4 text-sm">Page {currentPage} sur {totalPages}</span>
          <Button variant="outline" disabled={currentPage >= totalPages || refreshing}
            onClick={() => applyFilters({ page: currentPage + 1 })}>
            Suivant<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal détail */}
      <MessageDetailDialog
        message={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}