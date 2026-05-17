import { z } from 'zod';

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  delayMs: z.number().min(100).max(60000).default(1000),
  backoffMultiplier: z.number().min(1).max(5).default(2),
});
export type RetryPolicy = z.output<typeof RetryPolicySchema>;

export const SystemSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  apiKey: z.string().optional(),
  webhookUrl: z.string().url('URL invalide').optional().nullable(),
  isActive: z.boolean().default(true),
  retryPolicy: RetryPolicySchema.default({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }),
  timeoutMs: z.number().min(1000).max(120000).default(30000),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).transform((data) => {
  // Destructure pour exclure _id du type de sortie
  const { _id, ...rest } = data;
  return {
    ...rest,
    id: rest.id ?? _id,
  };
});

export const CreateSystemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  webhookUrl: z.string().url('URL invalide').optional().nullable(),
  isActive: z.boolean().default(true),
  retryPolicy: RetryPolicySchema.default({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }),
  timeoutMs: z.number().min(1000).max(120000).default(30000),
});

export const UpdateSystemSchema = CreateSystemSchema.partial();

export const SystemFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

export const SystemsListResponseSchema = z.union([
  z.array(SystemSchema).transform((systems) => ({
    systems,
    total: systems.length,
    page: 1,
    limit: systems.length,
    totalPages: 1,
  })),
  z.object({
    systems: z.array(SystemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
]);

export type SystemsListResponse = z.output<typeof SystemsListResponseSchema>;

export type System = z.output<typeof SystemSchema>;
export type CreateSystem = z.output<typeof CreateSystemSchema>;
export type UpdateSystem = z.output<typeof UpdateSystemSchema>;
export type ApiResponse = z.output<typeof ApiResponseSchema>;

export type SystemFiltersInput = z.input<typeof SystemFiltersSchema>;
export type SystemFilters = z.output<typeof SystemFiltersSchema>;

export function normalizeFilters(filters?: Partial<SystemFiltersInput>): SystemFilters {
  return SystemFiltersSchema.parse(filters ?? {});
}

export function buildQueryParams(
  filters: SystemFilters
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.isActive !== undefined) params.isActive = filters.isActive;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  return params;
}

export function validateCreateSystem(data: unknown): CreateSystem {
  return CreateSystemSchema.parse(data);
}
export function validateUpdateSystem(data: unknown): UpdateSystem {
  return UpdateSystemSchema.parse(data);
}
export function validateApiResponse(data: unknown): ApiResponse {
  return ApiResponseSchema.parse(data);
}
export function validateFilters(data: unknown): SystemFilters {
  return SystemFiltersSchema.parse(data);
}