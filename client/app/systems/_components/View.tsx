'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { System } from '@/domains/models/System';

interface SystemViewProps {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (system: System) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value ?? '—'}</span>
    </div>
  );
}

export default function SystemView({ system, open, onClose, onEdit }: SystemViewProps) {

    
  if (!system) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {system.name}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                system.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {system.isActive ? 'Actif' : 'Inactif'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <DetailRow label="ID" value={<span className="font-mono text-xs">{system.id}</span>} />

          <DetailRow
            label="API Key"
            value={
              system.apiKey ? (
                <span className="font-mono">{system.apiKey.slice(0, 12)}•••</span>
              ) : (
                '—'
              )
            }
          />

          <DetailRow
            label="Webhook URL"
            value={
              system.webhookUrl ? (
                <span className="truncate block max-w-[180px]" title={system.webhookUrl}>
                  {system.webhookUrl}
                </span>
              ) : (
                '—'
              )
            }
          />

          <DetailRow label="Timeout" value={`${system.timeoutMs} ms`} />

          <DetailRow
            label="Tentatives max"
            value={system.retryPolicy?.maxAttempts ?? 3}
          />

          <DetailRow
            label="Délai retry"
            value={`${system.retryPolicy?.delayMs ?? 1000} ms`}
          />

          <DetailRow
            label="Backoff multiplier"
            value={system.retryPolicy?.backoffMultiplier ?? 2}
          />

          <DetailRow
            label="Créé le"
            value={
              system.createdAt
                ? new Date(system.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'
            }
          />

          <DetailRow
            label="Modifié le"
            value={
              system.updatedAt
                ? new Date(system.updatedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'
            }
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(system)}>Modifier</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}