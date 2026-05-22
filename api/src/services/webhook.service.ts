// src/services/webhook.service.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { WebhookPayload, MessagePayload } from '../types';
import { SystemModel } from '../models/System';
import logger from '../utils/logger';

export class WebhookService {
  private static instance: WebhookService;
  private httpClient: AxiosInstance;

  private constructor() {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) WebhookService.instance = new WebhookService();
    return WebhookService.instance;
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  // FIX: findById(systemId) — System n'a pas de champ id, seulement _id + virtual

  public async sendWebhook(
    systemId:  string,
    eventType: WebhookPayload['eventType'],
    messageId: string,
    payload?:  MessagePayload,
    error?:    string,
  ): Promise<void> {
    try {
      const system = await SystemModel.findById(systemId);

      if (!system?.isActive) {
        logger.debug(`System ${systemId} inactive or not found — skipping webhook`);
        return;
      }

      if (!system.webhookUrl) {
        logger.debug(`No webhook URL configured for system ${systemId}`);
        return;
      }

      const webhookPayload: WebhookPayload = {
        eventType,
        messageId,
        systemId,
        payload,
        error,
        timestamp: new Date(),
      };

      await this.httpClient.post(system.webhookUrl, webhookPayload);
      logger.info(`Webhook sent to ${system.name} (${systemId}) for event ${eventType}`);

    } catch (err) {
      // Ne jamais faire remonter — un échec webhook ne doit pas bloquer le message
      if (err instanceof AxiosError) {
        logger.error(`Webhook failed for ${systemId}: ${err.message}`);
      } else {
        logger.error(`Webhook failed for ${systemId}:`, err);
      }
    }
  }

  // ── Test ───────────────────────────────────────────────────────────────────

  public async testWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.httpClient.post(webhookUrl, {
        test:      true,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: 'Webhook test successful' };
    } catch (err) {
      const msg = err instanceof AxiosError ? err.message : 'Unknown error';
      return { success: false, message: `Webhook test failed: ${msg}` };
    }
  }
}

export default WebhookService.getInstance();