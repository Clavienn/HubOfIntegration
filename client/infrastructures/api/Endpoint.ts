// lib/endpoints.ts
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Systems
  SYSTEMS: '/v1/systems',
  SYSTEM_BY_ID: (id: string) => `/v1/systems/${id}`,
  SYSTEM_ROTATE_KEY: (id: string) => `/v1/systems/${id}/rotate-key`,
  SYSTEM_TEST_WEBHOOK: (id: string) => `/v1/systems/${id}/test-webhook`,

  // Routes
  ROUTES: '/v1/routes',
  ROUTE_BY_ID: (id: string) => `/v1/routes/${id}`,
  ROUTE_ENABLE: (id: string) => `/v1/routes/action/${id}/enable`,
  ROUTE_DISABLE: (id: string) => `/v1/routes/action/${id}/disable`,

  // Messages
  MESSAGES: '/v1/messages',
  MESSAGE_BY_ID: (id: string) => `/v1/messages/${id}`,
  MESSAGE_STATUS: (id: string) => `/v1/messages/${id}/status`,
  MESSAGE_REPLAY: (id: string) => `/v1/messages/${id}/replay`,
  DEAD_LETTER: '/v1/dead-letter',

  // Stats
  STATISTICS: '/v1/statistics',

  // Ingest
  INGEST: '/v1/ingest',
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];