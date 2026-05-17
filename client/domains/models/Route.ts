import { z } from 'zod';

// ─── Schémas ──────────────────────────────────────────────────────────────────

export const RouteSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
    sourceSystemId: z.string().min(1, 'Le système source est requis'),
    destinationSystemId: z.string().min(1, 'Le système destination est requis'),
    transformationId: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    priority: z.number().int().min(0).max(100).default(0),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .transform(({ _id, ...rest }) => ({
    ...rest,
    id: rest.id ?? _id,
  }));

export const RoutesListResponseSchema = z.union([
  z.array(RouteSchema).transform((routes) => ({
    routes,
    total: routes.length,
    page: 1,
    limit: routes.length,
    totalPages: 1,
  })),
  z.object({
    routes: z.array(RouteSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
]);

export const CreateRouteSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  sourceSystemId: z.string().min(1, 'Le système source est requis'),
  destinationSystemId: z.string().min(1, 'Le système destination est requis'),
  transformationId: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
});

export const UpdateRouteSchema = CreateRouteSchema.partial();

export const RouteFiltersSchema = z.object({
  sourceSystemId: z.string().optional(),
  destinationSystemId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export type Route = z.output<typeof RouteSchema>;
export type RoutesListResponse = z.output<typeof RoutesListResponseSchema>;
export type CreateRoute = z.output<typeof CreateRouteSchema>;
export type UpdateRoute = z.output<typeof UpdateRouteSchema>;
export type RouteFilters = z.output<typeof RouteFiltersSchema>;

export function validateCreateRoute(data: unknown): CreateRoute {
  return CreateRouteSchema.parse(data);
}
export function validateUpdateRoute(data: unknown): UpdateRoute {
  return UpdateRouteSchema.parse(data);
}
export function validateRouteFilters(data: unknown): RouteFilters {
  return RouteFiltersSchema.parse(data);
}