'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  System,
  UpdateSystem,
  UpdateSystemSchema,
} from '@/domains/models/System';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';

interface SystemUpdateProps {
  system: System | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function SystemUpdate({
  system,
  open,
  onClose,
  onUpdated,
}: SystemUpdateProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateSystem>();

  const isActive = watch('isActive');

  // Sync form values when system changes
  useEffect(() => {
    if (system) {
      reset({
        name: system.name,
        webhookUrl: system.webhookUrl ?? null,
        isActive: system.isActive,
        timeoutMs: system.timeoutMs,
        retryPolicy: system.retryPolicy,
      });
    }
  }, [system, reset]);

  const onSubmit = async (raw: UpdateSystem) => {
    if (!system?.id) return;
    setServerError(null);
    let data: UpdateSystem;
    try {
      data = UpdateSystemSchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setServerError(err.errors.map((e) => e.message).join(', '));
      }
      return;
    }
    try {
      await systemRepo.update(system.id, data);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  if (!system) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier — {system.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded bg-red-50 text-red-600 text-sm">{serverError}</div>
          )}

          {/* Nom */}
          <div className="space-y-1">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" {...register('name')} placeholder="Nom du système" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Webhook URL */}
          <div className="space-y-1">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              {...register('webhookUrl')}
              placeholder="https://example.com/webhook"
            />
            {errors.webhookUrl && (
              <p className="text-xs text-red-500">{errors.webhookUrl.message}</p>
            )}
          </div>

          {/* Timeout */}
          <div className="space-y-1">
            <Label htmlFor="timeoutMs">Timeout (ms)</Label>
            <Input
              id="timeoutMs"
              type="number"
              {...register('timeoutMs', { valueAsNumber: true })}
            />
            {errors.timeoutMs && (
              <p className="text-xs text-red-500">{errors.timeoutMs.message}</p>
            )}
          </div>

          {/* Retry Policy */}
          <fieldset className="border rounded-md p-3 space-y-3">
            <legend className="text-sm font-medium px-1">Politique de retry</legend>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="maxAttempts">Tentatives max</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  {...register('retryPolicy.maxAttempts', { valueAsNumber: true })}
                />
                {errors.retryPolicy?.maxAttempts && (
                  <p className="text-xs text-red-500">
                    {errors.retryPolicy.maxAttempts.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="delayMs">Délai (ms)</Label>
                <Input
                  id="delayMs"
                  type="number"
                  {...register('retryPolicy.delayMs', { valueAsNumber: true })}
                />
                {errors.retryPolicy?.delayMs && (
                  <p className="text-xs text-red-500">
                    {errors.retryPolicy.delayMs.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="backoffMultiplier">Backoff</Label>
                <Input
                  id="backoffMultiplier"
                  type="number"
                  step="0.1"
                  {...register('retryPolicy.backoffMultiplier', { valueAsNumber: true })}
                />
                {errors.retryPolicy?.backoffMultiplier && (
                  <p className="text-xs text-red-500">
                    {errors.retryPolicy.backoffMultiplier.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* isActive */}
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={isActive ?? false}
              onCheckedChange={(val) => setValue('isActive', val, { shouldDirty: true })}
            />
            <Label htmlFor="isActive">Système actif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}