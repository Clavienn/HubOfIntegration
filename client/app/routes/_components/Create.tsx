'use client';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRoutes } from '@/hooks/useRoute';  // ✅ Correction: useRoutes (pluriel)
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
  const { systems, loading: systemsLoading } = useSystems({ limit: 100 });

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateRoute>({
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
    const result = CreateRouteSchema.safeParse(data);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof CreateRoute;
        setError(field, { message: err.message });
      });
      return;
    }
    try {
      const created = await createRoute(result.data);
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
              {isSubmitting ? 'Création...' : 'Créer la route'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}