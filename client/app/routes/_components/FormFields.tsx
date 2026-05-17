'use client';

import { UseFormRegister, FieldErrors, Control, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { System } from '@/domains/models/System';
import { CreateRoute } from '@/domains/models/Route';

interface RouteFormFieldsProps {
  register: UseFormRegister<CreateRoute>;
  errors: FieldErrors<CreateRoute>;
  control: Control<CreateRoute>;
  systems: System[];
  isSubmitting: boolean;
}

export function RouteFormFields({
  register,
  errors,
  control,
  systems,
  isSubmitting,
}: RouteFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Nom */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de la route *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ex: CRM → ERP"
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Source */}
      <div className="space-y-1.5">
        <Label>Système source *</Label>
        <Controller
          name="sourceSystemId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la source" />
              </SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.sourceSystemId && (
          <p className="text-xs text-red-500">{errors.sourceSystemId.message}</p>
        )}
      </div>

      {/* Destination */}
      <div className="space-y-1.5">
        <Label>Système destination *</Label>
        <Controller
          name="destinationSystemId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la destination" />
              </SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.destinationSystemId && (
          <p className="text-xs text-red-500">{errors.destinationSystemId.message}</p>
        )}
      </div>

      {/* Condition */}
      <div className="space-y-1.5">
        <Label htmlFor="condition">Condition</Label>
        <Input
          id="condition"
          {...register('condition')}
          placeholder="Ex: payload.type === 'customer'"
          disabled={isSubmitting}
        />
      </div>

      {/* Priorité */}
      <div className="space-y-1.5">
        <Label htmlFor="priority">Priorité (0–100)</Label>
        <Input
          id="priority"
          type="number"
          min={0}
          max={100}
          {...register('priority', { valueAsNumber: true })}
          disabled={isSubmitting}
        />
        {errors.priority && <p className="text-xs text-red-500">{errors.priority.message}</p>}
      </div>

      {/* Transformation ID */}
      <div className="space-y-1.5">
        <Label htmlFor="transformationId">ID Transformation</Label>
        <Input
          id="transformationId"
          {...register('transformationId')}
          placeholder="Optionnel"
          disabled={isSubmitting}
        />
      </div>

      {/* Active */}
      <div className="flex items-center gap-3 pt-1">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />
        <Label htmlFor="isActive">Route active</Label>
      </div>
    </div>
  );
}