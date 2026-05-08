// src/services/queue.service.ts
import Redis from 'ioredis';
import logger from '../utils/logger';

export class QueueService {
  private static instance: QueueService;
  private redis: Redis;
  private readonly QUEUE_KEY = 'message:queue';
  private readonly DLQ_KEY = 'message:deadletter';
  private readonly PROCESSING_KEY = 'message:processing';

  private constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error: Error) => {
      logger.error('Redis connection error:', error);
    });
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async pushToQueue(messageId: string): Promise<void> {
    try {
      await this.redis.lpush(this.QUEUE_KEY, messageId);
      logger.debug(`Message ${messageId} pushed to queue`);
    } catch (error) {
      logger.error('Failed to push message to queue:', error);
      throw error;
    }
  }

  public async popFromQueue(): Promise<string | null> {
    try {
      const messageId = await this.redis.rpop(this.QUEUE_KEY);
      if (messageId) {
        await this.redis.sadd(this.PROCESSING_KEY, messageId);
        logger.debug(`Message ${messageId} popped from queue`);
      }
      return messageId;
    } catch (error) {
      logger.error('Failed to pop message from queue:', error);
      throw error;
    }
  }

  public async moveToDeadLetter(messageId: string, error: string): Promise<void> {
    try {
      await this.redis.hset(this.DLQ_KEY, messageId, error);
      await this.removeFromProcessing(messageId);
      logger.warn(`Message ${messageId} moved to dead letter queue: ${error}`);
    } catch (error) {
      logger.error('Failed to move message to dead letter:', error);
      throw error;
    }
  }

  public async retryMessage(messageId: string): Promise<void> {
    try {
      await this.redis.lpush(this.QUEUE_KEY, messageId);
      await this.redis.hdel(this.DLQ_KEY, messageId);
      logger.info(`Message ${messageId} retried`);
    } catch (error) {
      logger.error('Failed to retry message:', error);
      throw error;
    }
  }

  public async removeFromProcessing(messageId: string): Promise<void> {
    await this.redis.srem(this.PROCESSING_KEY, messageId);
  }

  public async getQueueLength(): Promise<number> {
    return await this.redis.llen(this.QUEUE_KEY);
  }

  public async getDeadLetterMessages(): Promise<Record<string, string>> {
    return await this.redis.hgetall(this.DLQ_KEY);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default QueueService.getInstance();