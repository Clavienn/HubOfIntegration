'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hourglass,
  Skull,
  Activity,
} from 'lucide-react';
import { Message, MessageFilters, StatisticsResponse, statusConfig } from '@/domains/models/Message';
import { System } from '@/domains/models/System';
import { messageRepo } from '@/infrastructures/repository/MessageRepoAPI';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';

const LIMIT = 20;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'Traitement' },
  { value: 'success', label: 'Succès' },
  { value: 'failed', label: 'Échec' },
  { value: 'retry', label: 'Nouvelle tentative' },
  { value: 'dead', label: 'Lettre morte' },
];

const DEFAULT_STATS: StatisticsResponse = {
  total: 0,
  byStatus: { success: 0, failed: 0, pending: 0, processing: 0, dead: 0 },
  last24h: { total: 0, success: 0, successRate: 0 },
  performance: { avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
  overallSuccessRate: 0,
};

// ── Sous-composants ──────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Message['status'] }) {
  const config = statusConfig[status];
  return (
    <Badge className={`${config.bgColor} ${config.color} border-none`}>
      {config.label}
    </Badge>
  );
}

function MessageDetailDialog({
  message,
  open,
  onOpenChange,
}: {
  message: Message | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!message) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Détail du message</DialogTitle>
          <DialogDescription>ID: {message.id}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Statut</h4>
              <StatusBadge status={message.status} />
              {message.error && (
                <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded">
                  <strong>Erreur:</strong> {message.error}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Métadonnées</h4>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>Source:</strong> {message.metadata.sourceSystemId}</p>
                <p><strong>Destination:</strong> {message.metadata.destinationSystemId || '-'}</p>
                <p><strong>Message ID:</strong> {message.metadata.messageId}</p>
                <p><strong>Date:</strong> {new Date(message.metadata.timestamp).toLocaleString()}</p>
                <p><strong>Tentatives:</strong> {message.metadata.retryCount}</p>
                {message.metadata.processingTime && (
                  <p><strong>Temps de traitement:</strong> {message.metadata.processingTime}ms</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Payload</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function MessagesPage() {
  // ── État messages ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<MessageFilters>({ page: 1, limit: LIMIT });
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Statistiques ──
  const [stats, setStats] = useState<StatisticsResponse>(DEFAULT_STATS);

  // ── Systèmes (pour résolution noms dans les selects) ──
  const [systems, setSystems] = useState<System[]>([]);
  const systemMap = new Map(systems.map((s) => [s.id, s]));

  // ── Modal détail ──
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (f: MessageFilters, isInitial = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const result = await messageRepo.getAll(f);
      setMessages(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? 1);
      setCurrentPage(f.page ?? 1);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError('Erreur lors du chargement des messages.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch stats (silencieux, non-bloquant) ──
  const fetchStats = useCallback(async () => {
    try {
      const result = await messageRepo.getStatistics();
      setStats(result);
    } catch {
      // non-bloquant
    }
  }, []);

  // ── Fetch systèmes (silencieux, non-bloquant) ──
  const fetchSystems = useCallback(async () => {
    try {
      const result = await systemRepo.getAll({ limit: 100 });
      setSystems(result.systems);
    } catch {
      // non-bloquant
    }
  }, []);

  // Chargement initial : tout en parallèle
  useEffect(() => {
    fetchMessages(filters, true);
    fetchStats();
    fetchSystems();
    return () => abortRef.current?.abort();
  }, []);

  const applyFilters = (partial: Partial<MessageFilters>) => {
    const updated = { ...filters, ...partial };
    setFiltersState(updated);
    fetchMessages(updated);
  };

  const resetFilters = () => {
    const base: MessageFilters = { page: 1, limit: LIMIT };
    setFiltersState(base);
    fetchMessages(base);
  };

  const handleRefresh = () => {
    fetchMessages(filters);
    fetchStats();
  };

  // ── Skeleton uniquement au premier rendu ──
  if (initialLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 border rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Messages
          {refreshing && (
            <span className="ml-2 text-sm font-normal text-muted-foreground animate-pulse">
              Actualisation…
            </span>
          )}
        </h1>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      {/* Statistiques KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total des messages"
          value={stats.total}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Taux de succès"
          value={`${stats.overallSuccessRate.toFixed(1)}%`}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Temps moyen"
          value={`${stats.performance.avgProcessingTimeMs}ms`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Messages 24h"
          value={stats.last24h.total}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.last24h.successRate.toFixed(1)}% de succès`}
        />
      </div>

      {/* Distribution par statut */}
      <div className="grid gap-4 grid-cols-5 mb-6">
        {[
          { key: 'success', label: 'Succès', icon: <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />, cls: 'bg-green-50', textCls: 'text-green-600', labelCls: 'text-green-700' },
          { key: 'failed', label: 'Échecs', icon: <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />, cls: 'bg-red-50', textCls: 'text-red-600', labelCls: 'text-red-700' },
          { key: 'pending', label: 'En attente', icon: <Hourglass className="h-5 w-5 text-yellow-600 mx-auto mb-1" />, cls: 'bg-yellow-50', textCls: 'text-yellow-600', labelCls: 'text-yellow-700' },
          { key: 'processing', label: 'Traitement', icon: <Loader2 className="h-5 w-5 text-blue-600 mx-auto mb-1 animate-spin" />, cls: 'bg-blue-50', textCls: 'text-blue-600', labelCls: 'text-blue-700' },
          { key: 'dead', label: 'Lettres mortes', icon: <Skull className="h-5 w-5 text-gray-600 mx-auto mb-1" />, cls: 'bg-gray-50', textCls: 'text-gray-600', labelCls: 'text-gray-700' },
        ].map(({ key, label, icon, cls, textCls, labelCls }) => (
          <Card key={key} className={cls}>
            <CardContent className="p-4 text-center">
              {icon}
              <div className={`text-2xl font-bold ${textCls}`}>
                {stats.byStatus[key as keyof typeof stats.byStatus] ?? 0}
              </div>
              <div className={`text-xs ${labelCls}`}>{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(val) =>
            applyFilters({ status: val === 'all' ? undefined : (val as Message['status']), page: 1 })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sourceSystemId ?? 'all'}
          onValueChange={(val) =>
            applyFilters({ sourceSystemId: val === 'all' ? undefined : val, page: 1 })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Système source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sources</SelectItem>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200 flex justify-between">
          <span>
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </span>
          <button onClick={() => fetchMessages(filters)} className="underline text-red-700 text-xs">
            Réessayer
          </button>
        </div>
      )}

      {/* Compteur */}
      <div className="text-sm text-muted-foreground mb-4">
        Affichage de {messages.length} sur {total} message{total > 1 ? 's' : ''}
      </div>

      {/* Liste — reste visible pendant refresh */}
      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Aucun message trouvé
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          {messages.map((message) => {
            const sourceSystem = systemMap.get(message.metadata.sourceSystemId);
            return (
              <div
                key={message.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <StatusBadge status={message.status} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {message.id.slice(0, 16)}...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">Source:</span>{' '}
                      {sourceSystem?.name || message.metadata.sourceSystemId}
                      {message.metadata.destinationSystemId && (
                        <> {' → '}<span className="font-medium">Destination:</span>{' '}
                          {systemMap.get(message.metadata.destinationSystemId)?.name || message.metadata.destinationSystemId}
                        </>
                      )}
                    </p>
                    {message.error && (
                      <p className="text-sm text-red-600 mt-1 truncate max-w-2xl">{message.error}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Tentatives: {message.metadata.retryCount}
                      {message.metadata.processingTime && (
                        <span className="ml-3">Temps: {message.metadata.processingTime}ms</span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedMessage(message); setDetailOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Voir le détail</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="py-2 px-4 text-sm">Page {currentPage} sur {totalPages}</span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages || refreshing}
            onClick={() => applyFilters({ page: currentPage + 1 })}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal détail */}
      <MessageDetailDialog
        message={selectedMessage}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}