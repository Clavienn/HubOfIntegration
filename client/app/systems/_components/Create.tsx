'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CreateSystem, CreateSystemSchema, System } from '@/domains/models/System';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (created: System) => void; // FIX: retourne le System créé (avec son id)
}

export default function SystemCreate({ open, onClose, onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting } } = useForm<CreateSystem>({
    defaultValues: {
      name: '', webhookUrl: null, isActive: true,
      timeoutMs: 30000,
      retryPolicy: { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
    },
  });

  const isActive = watch('isActive');

  const onSubmit = async (raw: CreateSystem) => {
    setServerError(null);
    let data: CreateSystem;
    try {
      data = CreateSystemSchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError)
        setServerError(err.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('\n'));
      return;
    }
    try {
      const created = await systemRepo.create(data); // FIX: on récupère le System créé
      reset();
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleClose = () => { reset(); setServerError(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouveau Système</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {serverError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" {...register('name')} placeholder="Nom du système" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input id="webhookUrl" {...register('webhookUrl')} placeholder="https://example.com/webhook" />
            {errors.webhookUrl && <p className="text-xs text-red-500">{errors.webhookUrl.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="timeoutMs">Timeout (ms)</Label>
            <Input id="timeoutMs" type="number" {...register('timeoutMs', { valueAsNumber: true })} />
            {errors.timeoutMs && <p className="text-xs text-red-500">{errors.timeoutMs.message}</p>}
          </div>

          <fieldset className="border rounded-md p-3 space-y-3">
            <legend className="text-sm font-medium px-1">Politique de retry</legend>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Tentatives max</Label>
                <Input type="number" {...register('retryPolicy.maxAttempts', { valueAsNumber: true })} />
                {errors.retryPolicy?.maxAttempts && <p className="text-xs text-red-500">{errors.retryPolicy.maxAttempts.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Délai (ms)</Label>
                <Input type="number" {...register('retryPolicy.delayMs', { valueAsNumber: true })} />
                {errors.retryPolicy?.delayMs && <p className="text-xs text-red-500">{errors.retryPolicy.delayMs.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Backoff</Label>
                <Input type="number" step="0.1" {...register('retryPolicy.backoffMultiplier', { valueAsNumber: true })} />
                {errors.retryPolicy?.backoffMultiplier && <p className="text-xs text-red-500">{errors.retryPolicy.backoffMultiplier.message}</p>}
              </div>
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <Switch id="isActive" checked={isActive} onCheckedChange={(v) => setValue('isActive', v)} />
            <Label htmlFor="isActive">Actif à la création</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}