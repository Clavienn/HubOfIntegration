'use client';

import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { System } from '@/domains/models/System';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (system: System) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm break-all">{value ?? '—'}</span>
    </div>
  );
}

function fmt(d?: Date | string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SystemView({ system, open, onClose, onEdit }: Props) {
  if (!system) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {system.name}
            <Badge variant={system.isActive ? 'default' : 'secondary'} className="text-xs">
              {system.isActive
                ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Actif</span>
                : <span className="flex items-center gap-1"><XCircle className="h-3 w-3" />Inactif</span>}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <Row label="ID" value={<span className="font-mono text-xs">{system.id}</span>} />
          <Row
            label="API Key"
            value={system.apiKey
              ? <span className="font-mono text-xs">{system.apiKey.slice(0, 14)}•••</span>
              : '—'}
          />
          <div className="col-span-2">
            <Row
              label="Webhook URL"
              value={system.webhookUrl
                ? <a href={system.webhookUrl} target="_blank" rel="noreferrer"
                    className="text-blue-600 underline truncate block max-w-full">
                    {system.webhookUrl}
                  </a>
                : '—'}
            />
          </div>
          <Row label="Timeout" value={`${system.timeoutMs} ms`} />
          <Row label="Tentatives max" value={system.retryPolicy?.maxAttempts ?? 3} />
          <Row label="Délai retry" value={`${system.retryPolicy?.delayMs ?? 1000} ms`} />
          <Row label="Backoff" value={system.retryPolicy?.backoffMultiplier ?? 2} />
          <Row label="Créé le" value={fmt(system.createdAt)} />
          <Row label="Modifié le" value={fmt(system.updatedAt)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {onEdit && <Button onClick={() => onEdit(system)}>Modifier</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}