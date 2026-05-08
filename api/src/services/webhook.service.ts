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
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  public async sendWebhook(
    systemId: string,
    eventType: WebhookPayload['eventType'],
    messageId: string,
    payload?: MessagePayload,
    error?: string
  ): Promise<void> {
    try {
      const system = await SystemModel.findOne({ id: systemId, isActive: true });
      
      if (!system?.webhookUrl) {
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
      logger.info(`Webhook sent to ${systemId} for event ${eventType}`);

    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error(`Webhook failed for ${systemId}: ${error.message}`);
      } else {
        logger.error(`Webhook failed for ${systemId}:`, error);
      }
      // Don't throw - webhook failures shouldn't break the main flow
    }
  }

  public async testWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.httpClient.post(webhookUrl, {
        test: true,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: 'Webhook test successful' };
    } catch (error) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          message: `Webhook test failed: ${error.message}` 
        };
      }
      return { 
        success: false, 
        message: 'Webhook test failed: Unknown error' 
      };
    }
  }
}

export default WebhookService.getInstance();