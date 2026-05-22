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
  onDeleted: (id: string) => void; // FIX: on passe l'id pour que la page puisse filtrer localement
}

export default function ModalDeleteSystem({ system, open, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (!system) return null;

  const handleConfirm = async () => {
    if (!system.id) return;
    setLoading(true);
    setError(null);
    try {
      await systemRepo.delete(system.id);
      onDeleted(system.id);
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
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Note : un système référencé par des routes actives ne peut pas être supprimé.
            </span>
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
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}