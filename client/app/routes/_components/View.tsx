'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Route } from '@/domains/models/Route';
import { System } from '@/domains/models/System';

interface ViewRouteModalProps {
  open: boolean;
  route: Route | null;
  systems: System[];
  onClose: () => void;
  onEdit?: (route: Route) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2">
      <span className="text-sm text-muted-foreground w-40 shrink-0 font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function ViewRouteModal({
  open,
  route,
  systems,
  onClose,
  onEdit,
}: ViewRouteModalProps) {
  if (!route) return null;

  const systemMap = new Map<string, System>(systems.map((s) => [s.id as string, s]));
  const src = systemMap.get(route.sourceSystemId);
  const dst = systemMap.get(route.destinationSystemId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{route.name}</DialogTitle>
            <Badge variant={route.isActive ? 'default' : 'secondary'}>
              {route.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <DialogDescription>Détails de la route d&apos;intégration</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <InfoRow label="Système source" value={src?.name ?? route.sourceSystemId} />
          <Separator />
          <InfoRow label="Système destination" value={dst?.name ?? route.destinationSystemId} />
          <Separator />
          <InfoRow
            label="Condition"
            value={
              route.condition ? (
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {route.condition}
                </code>
              ) : (
                <span className="text-muted-foreground italic text-xs">Aucune</span>
              )
            }
          />
          <Separator />
          <InfoRow label="Priorité" value={route.priority} />
          <Separator />
          <InfoRow
            label="Transformation"
            value={
              route.transformationId ?? (
                <span className="text-muted-foreground italic text-xs">Aucune</span>
              )
            }
          />
          <Separator />
          <InfoRow
            label="Créée le"
            value={
              route.createdAt
                ? new Date(route.createdAt).toLocaleString('fr-FR')
                : '—'
            }
          />
          <Separator />
          <InfoRow
            label="Mise à jour"
            value={
              route.updatedAt
                ? new Date(route.updatedAt).toLocaleString('fr-FR')
                : '—'
            }
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onEdit && (
            <Button onClick={() => { onEdit(route); onClose(); }}>
              Modifier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}