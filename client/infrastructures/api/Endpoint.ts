
export const API_ENDPOINTS = {
  // ── Systems ──────────────────────────────────────────────────────────────
  SYSTEMS:                   `/v1/systems`,
  SYSTEM_BY_ID:              (id: string) => `/v1/systems/${id}`,
  SYSTEM_ENABLE:             (id: string) => `/v1/systems/${id}/enable`,
  SYSTEM_DISABLE:            (id: string) => `/v1/systems/${id}/disable`,
  SYSTEM_ROTATE_KEY:         (id: string) => `/v1/systems/${id}/rotate-key`,
  SYSTEM_TEST_WEBHOOK:       (id: string) => `/v1/systems/${id}/test-webhook`,

  // ── Routes ───────────────────────────────────────────────────────────────
  ROUTES:                    `/v1/routes`,
  ROUTE_BY_ID:               (id: string) => `/v1/routes/${id}`,
  ROUTE_ENABLE:              (id: string) => `/v1/routes/${id}/enable`,
  ROUTE_DISABLE:             (id: string) => `/v1/routes/${id}/disable`,

  // ── Messages ─────────────────────────────────────────────────────────────
  MESSAGES:                  `/v1/messages`,
  MESSAGE_BY_ID:             (id: string) => `/v1/messages/${id}`,
  MESSAGE_STATUS:            (id: string) => `/v1/ingest/status/${id}`,
  MESSAGE_REPLAY:            (id: string) => `/v1/ingest/replay/${id}`,
  DEAD_LETTER:               `/v1/messages/dead-letter`,
  STATISTICS:                `/v1/messages/statistics`,

  // ── Ingest ───────────────────────────────────────────────────────────────
  INGEST:                    `/v1/ingest`,
  INGEST_DRY_RUN:            `/v1/ingest/dry-run`,
} as const;


export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];