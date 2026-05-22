'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { System } from '@/domains/models/System';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';

interface Props {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onToggled: (updated: System) => void; // FIX: on retourne le System mis à jour
}

export default function ModalToggleSystem({ system, open, onClose, onToggled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (!system) return null;

  const willEnable = !system.isActive;

  const handleConfirm = async () => {
    if (!system.id) return;
    setLoading(true);
    setError(null);
    try {
      // FIX: enable/disable retournent un System (après fetch complet côté repo)
      const updated = willEnable
        ? await systemRepo.enable(system.id)
        : await systemRepo.disable(system.id);
      onToggled(updated);
      onClose();
    } catch (err: unknown) {
      // FIX: message d'erreur métier affiché (ex: "SYSTEM_HAS_ACTIVE_ROUTES")
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {willEnable ? 'Activer' : 'Désactiver'} le système
          </DialogTitle>
          <DialogDescription>
            {willEnable
              ? `Voulez-vous activer le système "${system.name}" ?`
              : `Voulez-vous désactiver "${system.name}" ? Il ne traitera plus de requêtes.`}
            {!willEnable && (
              <span className="text-xs text-muted-foreground mt-1 block">
                Attention : vous devez d'abord désactiver ses routes actives.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant={willEnable ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? willEnable ? 'Activation…' : 'Désactivation…'
              : willEnable ? 'Activer' : 'Désactiver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}