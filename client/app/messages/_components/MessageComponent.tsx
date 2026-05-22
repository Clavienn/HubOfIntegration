'use client';

// ── MessagesComponents.tsx ────────────────────────────────────────────────────
// Sous-composants réutilisables de la page Messages

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw } from 'lucide-react';
import { Message, StatisticsResponse, statusConfig } from '@/domains/models/Message';
import { ingestRepo } from '@/infrastructures/repository/IngestRepoAPI';

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({
  title, value, icon, description,
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

// ── StatusBadge ───────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: Message['status'] }) {
  const cfg = statusConfig[status];
  return (
    <Badge className={`${cfg.bgColor} ${cfg.color} border-none`}>{cfg.label}</Badge>
  );
}

// ── StatusDistribution ────────────────────────────────────────────────────────

export function StatusDistribution({ stats }: { stats: StatisticsResponse }) {
  const items = [
    { key: 'success',    label: 'Succès',        cls: 'bg-green-50',  textCls: 'text-green-700' },
    { key: 'failed',     label: 'Échecs',        cls: 'bg-red-50',    textCls: 'text-red-700' },
    { key: 'pending',    label: 'En attente',    cls: 'bg-yellow-50', textCls: 'text-yellow-700' },
    { key: 'processing', label: 'Traitement',    cls: 'bg-blue-50',   textCls: 'text-blue-700' },
    { key: 'dead',       label: 'Lettres mortes',cls: 'bg-gray-50',   textCls: 'text-gray-700' },
  ] as const;

  return (
    <div className="grid gap-3 grid-cols-5 mb-6">
      {items.map(({ key, label, cls, textCls }) => (
        <Card key={key} className={cls}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${textCls}`}>
              {stats.byStatus[key] ?? 0}
            </div>
            <div className={`text-xs mt-1 ${textCls}`}>{label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── MessageDetailDialog ───────────────────────────────────────────────────────
// Affiche le détail d'un message + actions : replay, dry-run, voir statut live

export function MessageDetailDialog({
  message,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  message: Message | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChanged?: (id: string) => void;
}) {
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError,   setReplayError]   = useState<string | null>(null);
  const [replaySuccess, setReplaySuccess] = useState(false);
  const [liveStatus,    setLiveStatus]    = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  if (!message) return null;

  const canReplay = message.status === 'failed' || message.status === 'dead';

  const handleReplay = async () => {
    setReplayLoading(true);
    setReplayError(null);
    setReplaySuccess(false);
    try {
      await ingestRepo.replay(message.id);
      setReplaySuccess(true);
      if (onStatusChanged) onStatusChanged(message.id);
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : 'Erreur lors du rejeu');
    } finally {
      setReplayLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await ingestRepo.getStatus(message.id);
      setLiveStatus(s.status);
      if (onStatusChanged) onStatusChanged(message.id);
    } catch {
      setLiveStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setReplaySuccess(false); setReplayError(null); setLiveStatus(null); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Détail du message</DialogTitle>
          <DialogDescription className="font-mono text-xs">{message.id}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-2">
          <div className="space-y-5">

            {/* Statut */}
            <div className="flex items-center gap-3">
              <StatusBadge status={(liveStatus as Message['status']) ?? message.status} />
              <Button variant="ghost" size="sm" onClick={handleRefreshStatus} disabled={statusLoading}>
                {statusLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RefreshCw className="h-3 w-3" />}
                <span className="ml-1 text-xs">Rafraîchir statut</span>
              </Button>
            </div>

            {message.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{message.error}</p>
              </div>
            )}

            {/* Métadonnées */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Métadonnées</h4>
              <div className="bg-muted p-3 rounded-lg grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-medium">Source :</span> {message.metadata.sourceSystemId}</p>
                <p><span className="font-medium">Destination :</span> {message.metadata.destinationSystemId || '—'}</p>
                <p><span className="font-medium">Message ID :</span> <span className="font-mono text-xs">{message.metadata.messageId}</span></p>
                <p><span className="font-medium">Date :</span> {new Date(message.metadata.timestamp).toLocaleString('fr-FR')}</p>
                <p><span className="font-medium">Tentatives :</span> {message.metadata.retryCount}</p>
                {message.metadata.processingTime != null && (
                  <p><span className="font-medium">Temps de traitement :</span> {message.metadata.processingTime} ms</p>
                )}
                <p><span className="font-medium">Créé le :</span> {new Date(message.createdAt).toLocaleString('fr-FR')}</p>
                <p><span className="font-medium">Mis à jour :</span> {new Date(message.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>

            {/* Payload */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Payload</h4>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold text-sm mb-3">Actions</h4>

              {canReplay && (
                <Button onClick={handleReplay} disabled={replayLoading} className="w-full">
                  {replayLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rejeu en cours…</>
                    : <><RefreshCw className="h-4 w-4 mr-2" />Rejouer le message</>}
                </Button>
              )}

              {replaySuccess && (
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2 text-center">
                  Message remis en file d&apos;attente avec succès
                </p>
              )}
              {replayError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {replayError}
                </p>
              )}

              {!canReplay && (
                <p className="text-xs text-muted-foreground italic text-center">
                  Le rejeu est disponible uniquement pour les statuts &quot;Échec&quot; et &quot;Lettre morte&quot;
                </p>
              )}
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}