// src/services/queue.service.ts
import { MessageModel } from '../models/Message';
import WebhookService from './webhook.service';
import logger from '../utils/logger';

export class QueueService {
  private static instance: QueueService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private readonly BATCH_SIZE     = 10;
  private readonly POLL_INTERVAL  = 2000; // ms
  private readonly MAX_RETRIES    = 3;

  private constructor() { this.startPolling(); }

  public static getInstance(): QueueService {
    if (!QueueService.instance) QueueService.instance = new QueueService();
    return QueueService.instance;
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(() => this.processPendingMessages(), this.POLL_INTERVAL);
    logger.info('Queue polling service started');
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Queue polling service stopped');
    }
  }

  // ── Traitement batch ───────────────────────────────────────────────────────

  private async processPendingMessages(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const messages = await MessageModel.find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(this.BATCH_SIZE);

      for (const message of messages) {
        // Marquer processing de façon atomique — évite les doublons
        const claimed = await MessageModel.findOneAndUpdate(
          { id: message.id, status: 'pending' },
          { status: 'processing' },
          { new: true }
        );
        if (!claimed) continue; // déjà pris par un autre cycle

        // Traiter sans bloquer le batch
        this.processMessage(claimed.id).catch((err) =>
          logger.error(`Unhandled error processing ${claimed.id}:`, err)
        );
      }
    } catch (error) {
      logger.error('Error in processPendingMessages:', error);
    } finally {
      this.isPolling = false;
    }
  }

  // ── Traitement d'un message ────────────────────────────────────────────────
  // FIX: c'est ici qu'on envoie réellement le webhook destination

  private async processMessage(messageId: string): Promise<void> {
    const startTime = Date.now();
    const message = await MessageModel.findOne({ id: messageId });
    if (!message) return;

    try {
      const { sourceSystemId, destinationSystemId } = message.metadata;

      if (!destinationSystemId) {
        throw new Error('No destination system on message');
      }

      // ── Envoi webhook vers la destination ──────────────────────────────
      await WebhookService.sendWebhook(
        destinationSystemId,
        'message.received',
        messageId,
        message.payload,
      );

      // ── Notification webhook vers la source ────────────────────────────
      await WebhookService.sendWebhook(
        sourceSystemId,
        'message.failed',
        messageId,
        message.payload,
      );

      // ── Succès ─────────────────────────────────────────────────────────
      const processingTime = Date.now() - startTime;
      await MessageModel.updateOne(
        { id: messageId },
        {
          status: 'success',
          error:  undefined,
          'metadata.processingTime': processingTime,
        }
      );

      logger.info(`Message ${messageId} processed in ${processingTime}ms`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Message ${messageId} failed: ${errMsg}`);

      const retryCount = (message.metadata.retryCount ?? 0) + 1;

      if (retryCount >= this.MAX_RETRIES) {
        // Dead letter
        await MessageModel.updateOne(
          { id: messageId },
          { status: 'dead', error: errMsg, 'metadata.retryCount': retryCount }
        );
        logger.warn(`Message ${messageId} moved to dead letter after ${retryCount} attempts`);
      } else {
        // Retry
        await MessageModel.updateOne(
          { id: messageId },
          { status: 'failed', error: errMsg, 'metadata.retryCount': retryCount }
        );
      }
    }
  }

  // ── API publique ───────────────────────────────────────────────────────────

  public async pushToQueue(messageId: string): Promise<void> {
    try {
      await MessageModel.updateOne(
        { id: messageId },
        { status: 'pending', error: undefined, 'metadata.retryCount': 0 }
      );
      logger.debug(`Message ${messageId} pushed to queue`);
    } catch (error) {
      logger.error('Failed to push message to queue:', error);
      throw error;
    }
  }

  public async moveToDeadLetter(messageId: string, error: string): Promise<void> {
    await MessageModel.updateOne(
      { id: messageId },
      { status: 'dead', error }
    );
    logger.warn(`Message ${messageId} moved to dead letter: ${error}`);
  }

  public async getQueueLength(): Promise<number> {
    return MessageModel.countDocuments({ status: 'pending' });
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await MessageModel.countDocuments();
      return true;
    } catch { return false; }
  }
}

export default QueueService.getInstance();