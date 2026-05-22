'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { routeRepo } from '@/infrastructures/repository/RouteRepoAPI';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import { CreateRoute, CreateRouteSchema, Route } from '@/domains/models/Route';
import { System } from '@/domains/models/System';
import { RouteFormFields } from './FormFields';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (created: Route) => void; // FIX: retourne la Route créée
}

export function CreateRouteModal({ open, onClose, onCreated }: Props) {
  const [systems, setSystems]           = useState<System[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(false);

  // FIX: charger les systèmes directement via repo, pas via hook
  useEffect(() => {
    if (!open) return;
    setSystemsLoading(true);
    systemRepo.getAll({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'asc' })
      .then((res) => setSystems(res.systems))
      .catch(() => setSystems([]))
      .finally(() => setSystemsLoading(false));
  }, [open]);

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateRoute>({
    defaultValues: {
      name: '', sourceSystemId: '', destinationSystemId: '',
      condition: '', transformationId: '', isActive: true, priority: 0,
    },
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: CreateRoute) => {
    const result = CreateRouteSchema.safeParse(data);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof CreateRoute;
        setError(field, { message: err.message });
      });
      return;
    }
    try {
      // FIX: appel direct au repo — pas de hook intermédiaire
      const created = await routeRepo.create(result.data);
      reset();
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Une erreur est survenue.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle route</DialogTitle>
          <DialogDescription>
            Créez une nouvelle route d&apos;intégration entre deux systèmes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <RouteFormFields
            register={register}
            errors={errors}
            control={control}
            systems={systems}
            systemsLoading={systemsLoading}
            isSubmitting={isSubmitting}
          />
          {errors.root && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {errors.root.message}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || systemsLoading}>
              {isSubmitting ? 'Création…' : 'Créer la route'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}