// src/services/queue.service.ts
import { MessageModel } from '../models/Message';
import logger from '../utils/logger';

export class QueueService {
  private static instance: QueueService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private readonly BATCH_SIZE = 10;
  private readonly POLL_INTERVAL_MS = 1000; // 1 seconde

  private constructor() {
    this.startPolling();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    this.pollingInterval = setInterval(async () => {
      await this.processPendingMessages();
    }, this.POLL_INTERVAL_MS);

    logger.info('Queue polling service started');
  }

  private async processPendingMessages(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      // Trouver les messages en attente
      const messages = await MessageModel.find({
        status: 'pending',
      })
        .sort({ createdAt: 1 }) // FIFO
        .limit(this.BATCH_SIZE);

      for (const message of messages) {
        // Marquer comme en traitement
        message.status = 'processing';
        await message.save();

        // Mettre dans une file virtuelle (sera traité par le worker)
        // Le worker pourra récupérer ces messages via popFromQueue
        logger.debug(`Message ${message.id} ready for processing`);
      }
    } catch (error) {
      logger.error('Error processing pending messages:', error);
    } finally {
      this.isPolling = false;
    }
  }

  public async pushToQueue(messageId: string): Promise<void> {
    try {
      // Mettre à jour le statut du message
      await MessageModel.updateOne(
        { id: messageId },
        { 
          status: 'pending',
          $inc: { 'metadata.retryCount': 0 }
        }
      );
      logger.debug(`Message ${messageId} pushed to queue`);
    } catch (error) {
      logger.error('Failed to push message to queue:', error);
      throw error;
    }
  }

  public async popFromQueue(): Promise<string | null> {
    try {
      // Chercher un message en attente
      const message = await MessageModel.findOneAndUpdate(
        {
          status: 'pending',
        },
        {
          status: 'processing',
        },
        {
          sort: { createdAt: 1 }, // FIFO
          new: true,
        }
      );

      if (message) {
        logger.debug(`Message ${message.id} popped from queue`);
        return message.id;
      }

      return null;
    } catch (error) {
      logger.error('Failed to pop message from queue:', error);
      return null;
    }
  }

  public async moveToDeadLetter(messageId: string, error: string): Promise<void> {
    try {
      await MessageModel.updateOne(
        { id: messageId },
        {
          status: 'dead',
          error: error,
        }
      );
      logger.warn(`Message ${messageId} moved to dead letter queue: ${error}`);
    } catch (err) {
      logger.error('Failed to move message to dead letter:', err);
    }
  }

  public async retryMessage(messageId: string): Promise<void> {
    try {
      await MessageModel.updateOne(
        { id: messageId },
        {
          status: 'pending',
          error: undefined,
          'metadata.retryCount': 0,
        }
      );
      logger.info(`Message ${messageId} retried`);
    } catch (error) {
      logger.error('Failed to retry message:', error);
    }
  }

  public async removeFromProcessing(messageId: string): Promise<void> {
    // Pas nécessaire avec MongoDB, le status gère ça
    logger.debug(`Message ${messageId} removed from processing`);
  }

  public async getQueueLength(): Promise<number> {
    return await MessageModel.countDocuments({ status: 'pending' });
  }

  public async getDeadLetterMessages(): Promise<any[]> {
    return await MessageModel.find({ status: 'dead' }).lean();
  }

  public async healthCheck(): Promise<boolean> {
    try {
       await MessageModel.countDocuments();
      return true;
    } catch (error) {
      return false;
    }
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Queue polling service stopped');
    }
  }
}

export default QueueService.getInstance();