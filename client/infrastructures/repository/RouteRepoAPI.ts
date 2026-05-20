// repositories/RouteRepoAPI.ts
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/Endpoint';
import { 
  Route, 
  CreateRoute, 
  UpdateRoute,
  RouteFilters
} from '@/domains/models/Route';
import { RouteRepo } from '@/domains/interfaces/RouteRepo';

export class RouteRepoAPI implements RouteRepo {

    async getAll(filters?: RouteFilters) {
  const response = await httpClient.get<{
    routes: Route[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(API_ENDPOINTS.ROUTES, {
    params: {
      ...(filters?.sourceSystemId && { sourceSystemId: filters.sourceSystemId }),
      ...(filters?.destinationSystemId && { destinationSystemId: filters.destinationSystemId }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.search && { search: filters.search }),
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 10,
    },
  });  

  return response.data;
}

  async getById(id: string): Promise<Route> {
    const response = await httpClient.get<Route>(API_ENDPOINTS.ROUTE_BY_ID(id));
    return response.data;
  }

  async create(data: CreateRoute): Promise<Route> {
    const response = await httpClient.post<Route>(API_ENDPOINTS.ROUTES, data);

    console.log(response);
    
    return response.data;
  }

  async update(id: string, data: UpdateRoute): Promise<Route> {
    const response = await httpClient.put<Route>(API_ENDPOINTS.ROUTE_BY_ID(id), data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.ROUTE_BY_ID(id));
  }

  async enable(id: string): Promise<Route> {
    const response = await httpClient.patch<Route>(API_ENDPOINTS.ROUTE_ENABLE(id));
    return response.data;
  }

  async disable(id: string): Promise<Route> {
    const response = await httpClient.patch<Route>(API_ENDPOINTS.ROUTE_DISABLE(id));
    return response.data;
  }

  async getBySourceSystem(): Promise<Route[]> {
    const response = await this.getAll();
    return response.routes;
  }

  async getByDestinationSystem(): Promise<Route[]> {
    const response = await this.getAll();
    return response.routes;
  }
}

export const routeRepo = new RouteRepoAPI();