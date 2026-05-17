'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Route } from '@/domains/models/Route';

interface DeleteRouteModalProps {
  open: boolean;
  route: Route | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteRouteModal({
  open,
  route,
  onClose,
  onConfirm,
}: DeleteRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!route?.id) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(route.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Supprimer la route
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Vous êtes sur le point de supprimer définitivement la route{' '}
              <strong className="text-foreground">{route?.name}</strong>.
            </span>
            <span className="block text-red-600 font-medium text-xs bg-red-50 border border-red-200 rounded p-2 mt-2">
              ⚠️ Cette action est irréversible. Toutes les règles de routage associées seront perdues.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 mx-0">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={loading}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? 'Suppression...' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}