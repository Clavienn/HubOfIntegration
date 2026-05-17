'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { System } from '@/domains/models/System';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';

interface ModalToggleSystemProps {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onToggled: () => void;
}

export default function ModalToggleSystem({
  system,
  open,
  onClose,
  onToggled,
}: ModalToggleSystemProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!system) return null;

  const willEnable = !system.isActive;

  const handleConfirm = async () => {
    if (!system.id) return;
    setLoading(true);
    setError(null);
    try {
      if (willEnable) {
        await systemRepo.enable(system.id);
      } else {
        await systemRepo.disable(system.id);
      }
      onToggled();
      onClose();
    } catch (err: unknown) {
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
              : `Voulez-vous désactiver le système "${system.name}" ? Il ne traitera plus de requêtes.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-600 text-sm">{error}</div>
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
              ? willEnable
                ? 'Activation...'
                : 'Désactivation...'
              : willEnable
              ? 'Activer'
              : 'Désactiver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}