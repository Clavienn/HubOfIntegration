// infrastructures/repository/SystemRepoAPI.ts
import {
  System,
  CreateSystem,
  UpdateSystem,
  SystemsListResponse,
  SystemFilters,
  SystemSchema,
  SystemsListResponseSchema,
  SystemToggleResponseSchema,
  buildQueryParams,
} from '@/domains/models/System';
import { SystemRepo } from '@/domains/interfaces';
import { httpClient } from '@/infrastructures/api/httpClient';
import { API_ENDPOINTS } from '@/infrastructures/api/Endpoint';

export class SystemRepoAPI implements SystemRepo {

  // ─── List ───────────────────────────────────────────────────────────────────

  async getAll(filters?: SystemFilters): Promise<SystemsListResponse> {
    const params = filters ? buildQueryParams(filters) : {};
    const response = await httpClient.get<unknown>(API_ENDPOINTS.SYSTEMS, { params });
    return SystemsListResponseSchema.parse(response.data);
  }

  // ─── Get by ID ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<System> {
    const response = await httpClient.get<unknown>(API_ENDPOINTS.SYSTEM_BY_ID(id));
    // Le backend inclut un champ `routes` ici — SystemSchema l'accepte en optionnel
    return SystemSchema.parse(response.data);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(data: CreateSystem): Promise<System> {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.SYSTEMS, data);
    return SystemSchema.parse(response.data);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, data: UpdateSystem): Promise<System> {
    const response = await httpClient.put<unknown>(API_ENDPOINTS.SYSTEM_BY_ID(id), data);
    return SystemSchema.parse(response.data);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.SYSTEM_BY_ID(id));
  }

  // ─── Enable ─────────────────────────────────────────────────────────────────
  // FIX: le backend renvoie { id, name, isActive, webhookUrl, retryPolicy, timeoutMs, updatedAt }
  // pas un System complet. On parse avec SystemToggleResponseSchema puis on retourne
  // un System partiel compat — l'UI doit merger avec les données locales si besoin.

  async enable(id: string): Promise<System> {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.SYSTEM_BY_ID(id)}/enable`
      // FIX: pas de body — le backend n'en attend pas
    );
    const toggled = SystemToggleResponseSchema.parse(response.data);
    // Retourner comme System en complétant les champs manquants avec des defaults
    return SystemSchema.parse({
      ...toggled,
      retryPolicy: toggled.retryPolicy ?? { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
      timeoutMs:   toggled.timeoutMs ?? 30000,
    });
  }

  // ─── Disable ────────────────────────────────────────────────────────────────

  async disable(id: string): Promise<System> {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.SYSTEM_BY_ID(id)}/disable`
    );
    const toggled = SystemToggleResponseSchema.parse(response.data);
    return SystemSchema.parse({
      ...toggled,
      retryPolicy: toggled.retryPolicy ?? { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
      timeoutMs:   toggled.timeoutMs ?? 30000,
    });
  }

  // ─── Rotate API Key ─────────────────────────────────────────────────────────
  // FIX: le backend renvoie { id, apiKey } — on type explicitement

  async rotateApiKey(id: string): Promise<{ id: string; apiKey: string }> {
    const response = await httpClient.post<{ id: string; apiKey: string }>(
      API_ENDPOINTS.SYSTEM_ROTATE_KEY(id)
    );
    return response.data;
  }

  // ─── Test Webhook ────────────────────────────────────────────────────────────

  async testWebhook(id: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      API_ENDPOINTS.SYSTEM_TEST_WEBHOOK(id)
    );
    return response.data;
  }
}

export const systemRepo = new SystemRepoAPI();