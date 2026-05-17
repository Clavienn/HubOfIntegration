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

interface ModalDeleteSystemProps {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function ModalDeleteSystem({
  system,
  open,
  onClose,
  onDeleted,
}: ModalDeleteSystemProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!system) return null;

  const handleConfirm = async () => {
    if (!system.id) return;
    setLoading(true);
    setError(null);
    try {
      await systemRepo.delete(system.id);
      onDeleted();
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
          <DialogTitle>Supprimer le système</DialogTitle>
          <DialogDescription>
            Cette action est <strong>irréversible</strong>. Le système{' '}
            <strong>&quot;{system.name}&quot;</strong> sera définitivement supprimé.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}