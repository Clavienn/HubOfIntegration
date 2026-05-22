// domains/models/Route.ts
import { z } from 'zod';

// ─── Route ────────────────────────────────────────────────────────────────────
// FIX: sourceSystemId / destinationSystemId sont des _id MongoDB (ObjectId string).
// Le backend ne stocke plus de uuid séparé pour les routes.

export const RouteSchema = z
  .object({
    id:                  z.string().optional(),
    _id:                 z.string().optional(),
    name:                z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
    sourceSystemId:      z.string().min(1, 'Le système source est requis'),
    destinationSystemId: z.string().min(1, 'Le système destination est requis'),
    transformationId:    z.string().optional().nullable(),
    // condition: expression JS évaluée côté backend sur le payload
    // ex: "payload.type === 'order'" ou "" (catch-all)
    condition:           z.string().optional().nullable(),
    isActive:            z.boolean().default(true),
    priority:            z.number().int().min(0).max(100).default(0),
    createdAt:           z.coerce.date().optional(),
    updatedAt:           z.coerce.date().optional(),
  })
  .transform(({ _id, ...rest }) => ({
    ...rest,
    id: rest.id ?? _id,
  }));

export type Route = z.output<typeof RouteSchema>;

// ─── Create / Update ──────────────────────────────────────────────────────────

export const CreateRouteSchema = z.object({
  name:                z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  sourceSystemId:      z.string().min(1, 'Le système source est requis'),
  destinationSystemId: z.string().min(1, 'Le système destination est requis'),
  transformationId:    z.string().optional().nullable(),
  // Condition vide = route catch-all (toujours vraie)
  // Exemples valides: "payload.type === 'order'", "payload.amount > 1000"
  condition:           z.string().optional().nullable(),
  isActive:            z.boolean().default(true),
  priority:            z.number().int().min(0).max(100).default(0),
});
export const UpdateRouteSchema = CreateRouteSchema.partial();

export type CreateRoute = z.output<typeof CreateRouteSchema>;
export type UpdateRoute = z.output<typeof UpdateRouteSchema>;

// ─── Filters ──────────────────────────────────────────────────────────────────

export const RouteFiltersSchema = z.object({
  sourceSystemId:      z.string().optional(),
  destinationSystemId: z.string().optional(),
  isActive:            z.boolean().optional(),
  search:              z.string().optional(),
  page:                z.number().int().min(1).default(1),
  limit:               z.number().int().min(1).max(100).default(10),
});

export type RouteFilters = z.output<typeof RouteFiltersSchema>;

// ─── API Response ─────────────────────────────────────────────────────────────

export const RoutesListResponseSchema = z.union([
  z.array(RouteSchema).transform((routes) => ({
    routes,
    total:      routes.length,
    page:       1,
    limit:      routes.length,
    totalPages: 1,
  })),
  z.object({
    routes:     z.array(RouteSchema),
    total:      z.number(),
    page:       z.number(),
    limit:      z.number(),
    totalPages: z.number(),
  }),
]);
export type RoutesListResponse = z.output<typeof RoutesListResponseSchema>;

// FIX: enable/disable renvoient { id, isActive } — on valide avec un schéma souple
// puis on merge avec la route existante côté UI.
export const RouteToggleResponseSchema = z.object({
  id:       z.string(),
  isActive: z.boolean(),
});
export type RouteToggleResponse = z.output<typeof RouteToggleResponseSchema>;

// ─── Dry-run (debug routage) ──────────────────────────────────────────────────

export const DryRunResultSchema = z.object({
  sourceSystemId: z.string(),
  results: z.array(z.object({
    routeId:             z.string(),
    name:                z.string(),
    priority:            z.number(),
    condition:           z.string().optional(),
    matched:             z.boolean(),
    destinationSystemId: z.string(),
  })),
});
export type DryRunResult = z.output<typeof DryRunResultSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function validateCreateRoute(data: unknown): CreateRoute {
  return CreateRouteSchema.parse(data);
}
export function validateUpdateRoute(data: unknown): UpdateRoute {
  return UpdateRouteSchema.parse(data);
}
export function validateRouteFilters(data: unknown): RouteFilters {
  return RouteFiltersSchema.parse(data);
}