'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRoutes } from '@/hooks/useRoute';
import { useSystems } from '@/hooks/useSystem';
import { CreateRoute, CreateRouteSchema } from '@/domains/models/Route';
import { RouteFormFields } from './FormFields';

interface CreateRouteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateRouteModal({ open, onClose, onSuccess }: CreateRouteModalProps) {
  const { createRoute } = useRoutes();
  const { systems = [] } = useSystems({ limit: 100 });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateRoute>({
    resolver: zodResolver(CreateRouteSchema),
    defaultValues: {
      name: '',
      sourceSystemId: '',
      destinationSystemId: '',
      condition: '',
      transformationId: '',
      isActive: true,
      priority: 0,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CreateRoute) => {
    try {
      const created = await createRoute(data);
      if (created) {
        reset();
        onSuccess?.();
        onClose();
      } else {
        setError('root', { message: 'Échec de la création de la route.' });
      }
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
            Créez une nouvelle route d'intégration entre deux systèmes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <RouteFormFields
            register={register}
            errors={errors}
            control={control}
            systems={systems}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer la route'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}