// domains/models/System.ts
import { z } from 'zod';

// ─── Retry Policy ─────────────────────────────────────────────────────────────

export const RetryPolicySchema = z.object({
  maxAttempts:       z.number().min(1).max(10).default(3),
  delayMs:           z.number().min(100).max(60000).default(1000),
  backoffMultiplier: z.number().min(1).max(5).default(2),
});
export type RetryPolicy = z.output<typeof RetryPolicySchema>;

// ─── System ───────────────────────────────────────────────────────────────────
// FIX: Le backend renvoie uniquement _id (ObjectId stringifié) comme identifiant.
// Plus de champ uuid séparé. Le transform fusionne _id → id pour le front.

export const SystemSchema = z
  .object({
    id:         z.string().optional(),   // virtual côté Mongoose (_id.toString())
    _id:        z.string().optional(),   // présent selon le path (toObject vs lean)
    name:       z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
    apiKey:     z.string().optional(),   // exposé seulement sur create / rotateApiKey
    webhookUrl: z.string().url('URL invalide').optional().nullable(),
    isActive:   z.boolean().default(true),
    retryPolicy: RetryPolicySchema.default({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }),
    timeoutMs:  z.number().min(1000).max(120000).default(30000),
    createdAt:  z.coerce.date().optional(),
    updatedAt:  z.coerce.date().optional(),
    // getSystemById inclut un tableau de routes — on l'accepte en optionnel
    routes:     z.array(z.unknown()).optional(),
  })
  .transform(({ _id, ...rest }) => ({
    ...rest,
    // Priorité : id (virtual Mongoose) → _id (raw) → undefined
    id: rest.id ?? _id,
  }));

export type System = z.output<typeof SystemSchema>;

// ─── Create / Update ──────────────────────────────────────────────────────────

export const CreateSystemSchema = z.object({
  name:        z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  webhookUrl:  z.string().url('URL invalide').optional().nullable(),
  isActive:    z.boolean().default(true),
  retryPolicy: RetryPolicySchema.default({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }),
  timeoutMs:   z.number().min(1000).max(120000).default(30000),
});
export const UpdateSystemSchema = CreateSystemSchema.partial();

export type CreateSystem = z.output<typeof CreateSystemSchema>;
export type UpdateSystem  = z.output<typeof UpdateSystemSchema>;

// ─── Filters ──────────────────────────────────────────────────────────────────

export const SystemFiltersSchema = z.object({
  isActive:   z.boolean().optional(),
  search:     z.string().optional(),
  page:       z.number().int().min(1).default(1),
  limit:      z.number().int().min(1).max(100).default(10),
  sortBy:     z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

export type SystemFilters      = z.output<typeof SystemFiltersSchema>;
export type SystemFiltersInput = z.input<typeof SystemFiltersSchema>;

// ─── API Responses ────────────────────────────────────────────────────────────

export const SystemsListResponseSchema = z.union([
  // Cas où l'API retourne directement un tableau (rare mais défensif)
  z.array(SystemSchema).transform((systems) => ({
    systems,
    total:      systems.length,
    page:       1,
    limit:      systems.length,
    totalPages: 1,
  })),
  // Cas normal : objet paginé
  z.object({
    systems:    z.array(SystemSchema),
    total:      z.number(),
    page:       z.number(),
    limit:      z.number(),
    totalPages: z.number(),
  }),
]);
export type SystemsListResponse = z.output<typeof SystemsListResponseSchema>;

// FIX: enableSystem / disableSystem renvoient un objet partiel (pas apiKey)
// On réutilise SystemSchema qui accepte les champs optionnels.
export const SystemToggleResponseSchema = z.object({
  id:          z.string(),
  name:        z.string().optional(),
  isActive:    z.boolean(),
  webhookUrl:  z.string().nullable().optional(),
  retryPolicy: RetryPolicySchema.optional(),
  timeoutMs:   z.number().optional(),
  updatedAt:   z.coerce.date().optional(),
});
export type SystemToggleResponse = z.output<typeof SystemToggleResponseSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildQueryParams(filters: SystemFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.isActive  !== undefined) params.isActive  = filters.isActive;
  if (filters.search)                  params.search    = filters.search;
  if (filters.page      !== undefined) params.page      = filters.page;
  if (filters.limit     !== undefined) params.limit     = filters.limit;
  if (filters.sortBy)                  params.sortBy    = filters.sortBy;
  if (filters.sortOrder)               params.sortOrder = filters.sortOrder;
  return params;
}

export function normalizeFilters(filters?: Partial<SystemFiltersInput>): SystemFilters {
  return SystemFiltersSchema.parse(filters ?? {});
}

export function validateCreateSystem(data: unknown): CreateSystem {
  return CreateSystemSchema.parse(data);
}

export function validateUpdateSystem(data: unknown): UpdateSystem {
  return UpdateSystemSchema.parse(data);
}