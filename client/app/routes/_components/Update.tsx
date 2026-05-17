'use client';

import { useEffect } from 'react';
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
import { CreateRoute, CreateRouteSchema, Route } from '@/domains/models/Route';
import { RouteFormFields } from './FormFields';

interface UpdateRouteModalProps {
  open: boolean;
  route: Route | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UpdateRouteModal({ open, route, onClose, onSuccess }: UpdateRouteModalProps) {
  const { updateRoute } = useRoutes();
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

  // Pré-remplir le formulaire quand la route change
  useEffect(() => {
    if (route) {
      reset({
        name: route.name,
        sourceSystemId: route.sourceSystemId,
        destinationSystemId: route.destinationSystemId,
        condition: route.condition ?? '',
        transformationId: route.transformationId ?? '',
        isActive: route.isActive,
        priority: route.priority,
      });
    }
  }, [route, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CreateRoute) => {
    if (!route?.id) return;
    try {
      const updated = await updateRoute(route.id, data);
      if (updated) {
        onSuccess?.();
        onClose();
      } else {
        setError('root', { message: 'Échec de la mise à jour.' });
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
          <DialogTitle>Modifier la route</DialogTitle>
          <DialogDescription>
            Modifiez les paramètres de la route{route ? ` "${route.name}"` : ''}.
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
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}