// src/workers/message.worker.ts
import mongoose from 'mongoose';
import axios, { AxiosError } from 'axios';
import { MessageModel } from '../models/Message';
import { SystemModel } from '../models/System';
import QueueService from '../services/queue.service';
import TransformerService from '../services/transformer.service';
import WebhookService from '../services/webhook.service';
import logger from '../utils/logger';

class MessageWorker {
  private isProcessing: boolean = false;
  private intervalId?: NodeJS.Timeout;

  public async start(): Promise<void> {
    logger.info('Message worker started');
    
    // Process messages every 1 second
    this.intervalId = setInterval(async () => {
      await this.processNextMessage();
    }, 1000);
  }

  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.info('Message worker stopped');
  }

  private async processNextMessage(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const messageId = await QueueService.popFromQueue();
      
      if (!messageId) {
        return;
      }

      await this.processMessage(messageId);

    } catch (error) {
      logger.error('Error processing message:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMessage(messageId: string): Promise<void> {
    const message = await MessageModel.findOne({ id: messageId });
    
    if (!message) {
      logger.error(`Message ${messageId} not found in database`);
      await QueueService.removeFromProcessing(messageId);
      return;
    }

    // Update status to processing
    message.status = 'processing';
    await message.save();

    const startTime = Date.now();

    try {
      // Get destination system configuration
      const destinationSystemId = message.metadata.destinationSystemId;
      if (!destinationSystemId) {
        throw new Error('No destination system specified');
      }

      const destinationSystem = await SystemModel.findOne({ 
        id: destinationSystemId,
        isActive: true 
      });

      if (!destinationSystem) {
        throw new Error(`Destination system ${destinationSystemId} not found or inactive`);
      }

      // Apply transformation if configured
      let payloadToSend = message.payload;
      const route = await this.getRouteForMessage(
        message.metadata.sourceSystemId,
        destinationSystemId
      );

      if (route?.transformationId) {
        payloadToSend = await TransformerService.transform(
          message.payload,
          route.transformationId
        );
      }

      // Send to destination system
      if (destinationSystem.webhookUrl) {
        await this.sendToWebhook(destinationSystem.webhookUrl, payloadToSend);
      } else {
        // For systems without webhook, just log (will implement HTTP client later)
        logger.info(`Would send to ${destinationSystemId}:`, payloadToSend);
      }

      // Update message as success
      const processingTime = Date.now() - startTime;
      message.status = 'success';
      message.metadata.processingTime = processingTime;
      await message.save();

      // Send webhook notification
      await WebhookService.sendWebhook(
        message.metadata.sourceSystemId,
        'message.processed',
        messageId,
        payloadToSend
      );

      logger.info(`Message ${messageId} processed successfully in ${processingTime}ms`);

    } catch (error) {
      await this.handleFailure(message, error);
    } finally {
      await QueueService.removeFromProcessing(messageId);
    }
  }

  private async getRouteForMessage(
    sourceSystemId: string,
    destinationSystemId: string
  ): Promise<any> {
    const { RouteModel } = await import('../models/Routage');
    return await RouteModel.findOne({
      sourceSystemId,
      destinationSystemId,
      isActive: true,
    });
  }

  private async sendToWebhook(webhookUrl: string, payload: unknown): Promise<void> {
    try {
      await axios.post(webhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Webhook delivery failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async handleFailure(message: any, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Increment retry count
    const newRetryCount = (message.metadata.retryCount || 0) + 1;
    const maxRetries = 3; // Get from system config in production

    if (newRetryCount >= maxRetries) {
      // Move to dead letter queue
      message.status = 'dead';
      message.error = errorMessage;
      await message.save();
      
      await QueueService.moveToDeadLetter(message.id, errorMessage);
      
      // Send failure notification
      await WebhookService.sendWebhook(
        message.metadata.sourceSystemId,
        'message.failed',
        message.id,
        undefined,
        errorMessage
      );

      logger.error(`Message ${message.id} moved to dead letter queue after ${newRetryCount} attempts`);
    } else {
      // Retry
      message.status = 'retry';
      message.metadata.retryCount = newRetryCount;
      message.error = errorMessage;
      await message.save();
      
      // Re-queue with delay
      setTimeout(async () => {
        await QueueService.pushToQueue(message.id);
      }, this.getRetryDelay(newRetryCount));
      
      // Send retry notification
      await WebhookService.sendWebhook(
        message.metadata.sourceSystemId,
        'message.retry',
        message.id,
        undefined,
        `Retry attempt ${newRetryCount} of ${maxRetries}`
      );

      logger.warn(`Message ${message.id} failed, retry ${newRetryCount}/${maxRetries}: ${errorMessage}`);
    }
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, etc.
    return Math.min(1000 * Math.pow(2, retryCount - 1), 60000);
  }
}

// Initialize and start worker
async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hub-integration';
  
  await mongoose.connect(mongoUri);
  logger.info('Worker connected to MongoDB');
  
  const worker = new MessageWorker();
  await worker.start();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down worker...');
    await worker.stop();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Worker failed to start:', error);
  process.exit(1);
});