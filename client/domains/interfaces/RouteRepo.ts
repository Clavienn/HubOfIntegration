// repositories/RouteRepo.ts
import { Route, CreateRoute, UpdateRoute, RouteFilters } from '@/domains/models/Route';

export interface RouteRepo {
  /**
   * Récupère toutes les routes avec filtres
   */
  getAll(filters?: RouteFilters): Promise<{
    routes: Route[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Récupère une route par son ID
   */
  getById(id: string): Promise<Route>;

  /**
   * Crée une nouvelle route
   */
  create(data: CreateRoute): Promise<Route>;

  /**
   * Met à jour une route existante
   */
  update(id: string, data: UpdateRoute): Promise<Route>;

  /**
   * Supprime une route
   */
  delete(id: string): Promise<void>;

  /**
   * Active une route
   */
  enable(id: string): Promise<Route>;

  /**
   * Désactive une route
   */
  disable(id: string): Promise<Route>;

  /**
   * Récupère les routes par système source
   */
  getBySourceSystem(sourceSystemId: string): Promise<Route[]>;

  /**
   * Récupère les routes par système destination
   */
  getByDestinationSystem(destinationSystemId: string): Promise<Route[]>;
}