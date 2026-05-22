// infrastructures/repository/RouteRepoAPI.ts
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';
import {
  Route,
  CreateRoute,
  UpdateRoute,
  RouteFilters,
  RoutesListResponse,
  RoutesListResponseSchema,
  RouteSchema,
  RouteToggleResponseSchema,
  DryRunResult,
  DryRunResultSchema,
} from '@/domains/models/Route';
import { RouteRepo } from '@/domains/interfaces';

export class RouteRepoAPI implements RouteRepo {

  // ─── List ───────────────────────────────────────────────────────────────────

  async getAll(filters?: RouteFilters): Promise<RoutesListResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.sourceSystemId)                    params.sourceSystemId      = filters.sourceSystemId;
    if (filters?.destinationSystemId)               params.destinationSystemId = filters.destinationSystemId;
    if (filters?.isActive !== undefined)            params.isActive            = filters.isActive;
    if (filters?.search)                            params.search              = filters.search;
    params.page  = filters?.page  ?? 1;
    params.limit = filters?.limit ?? 10;

    const response = await httpClient.get<unknown>(API_ENDPOINTS.ROUTES, { params });
    return RoutesListResponseSchema.parse(response.data);
  }

  // ─── Get by ID ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Route> {
    const response = await httpClient.get<unknown>(API_ENDPOINTS.ROUTE_BY_ID(id));
    return RouteSchema.parse(response.data);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(data: CreateRoute): Promise<Route> {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.ROUTES, data);
    return RouteSchema.parse(response.data);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, data: UpdateRoute): Promise<Route> {
    const response = await httpClient.put<unknown>(API_ENDPOINTS.ROUTE_BY_ID(id), data);
    return RouteSchema.parse(response.data);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.ROUTE_BY_ID(id));
  }

  // ─── Enable ─────────────────────────────────────────────────────────────────
  // FIX: le backend renvoie seulement { id, isActive } — on fetche la route
  // complète après pour retourner un Route complet.

  async enable(id: string): Promise<Route> {
    const response = await httpClient.patch<unknown>(API_ENDPOINTS.ROUTE_ENABLE(id));
    const toggled = RouteToggleResponseSchema.parse(response.data);
    // Récupérer la route complète pour avoir tous les champs
    const full = await this.getById(toggled.id);
    return { ...full, isActive: toggled.isActive };
  }

  // ─── Disable ────────────────────────────────────────────────────────────────

  async disable(id: string): Promise<Route> {
    const response = await httpClient.patch<unknown>(API_ENDPOINTS.ROUTE_DISABLE(id));
    const toggled = RouteToggleResponseSchema.parse(response.data);
    const full = await this.getById(toggled.id);
    return { ...full, isActive: toggled.isActive };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  async getBySourceSystem(sourceSystemId: string): Promise<Route[]> {
    const response = await this.getAll({ sourceSystemId, page: 1, limit: 100 });
    return response.routes;
  }

  async getByDestinationSystem(destinationSystemId: string): Promise<Route[]> {
    const response = await this.getAll({ destinationSystemId, page: 1, limit: 100 });
    return response.routes;
  }

  // ─── Dry-run (debug routage) ─────────────────────────────────────────────────
  // POST /ingest/dry-run — évalue les conditions sans persister de message

  async dryRun(payload: Record<string, unknown>): Promise<DryRunResult> {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.INGEST_DRY_RUN, { payload });
    return DryRunResultSchema.parse(response.data);
  }
}

export const routeRepo = new RouteRepoAPI();