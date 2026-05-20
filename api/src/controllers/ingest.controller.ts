// src/controllers/ingest.controller.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MessageModel } from '../models/Message';
import { SystemModel } from '../models/System';
import QueueService from '../services/queue.service';
import WebhookService from '../services/webhook.service';
import RouterService from '../services/router.service';
import { IngestRequest, IngestResponse, MessageStatus } from '../types';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

export class IngestController {
  private routerService: RouterService;

  constructor() {
    this.routerService = RouterService.getInstance();
  }

  /**
   * Helper function to find a system by either id (UUID) or _id (MongoDB ObjectId)
   */
  private async findSystemById(systemId: string): Promise<any | null> {
    if (!systemId) return null;
    
    // Si c'est un ObjectId MongoDB valide
    if (mongoose.Types.ObjectId.isValid(systemId)) {
      const system = await SystemModel.findById(systemId);
      if (system) return system;
    }
    
    // Chercher par le champ id (UUID)
    return await SystemModel.findOne({ id: systemId });
  }

  public async ingest(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    const { payload, destinationSystemId, correlationId }: IngestRequest = req.body;
    
    // Utiliser l'ID du système depuis l'authentification
    const sourceSystemId =  req.body.sourceSystemId;
    
    if (!sourceSystemId) {
      throw new AppError('UNAUTHORIZED', 'Source system not identified', 401);
    }

    const messageId = correlationId || uuidv4();

    try {
      // Get source system configuration
      const sourceSystem = await this.findSystemById(sourceSystemId);
      if (!sourceSystem) {
        throw new AppError('SYSTEM_NOT_FOUND', `Source system ${sourceSystemId} not found`, 404);
      }

      logger.info(`Processing message from system: ${sourceSystem.name} (${sourceSystemId})`);

      // Determine destination system
      let finalDestinationSystemId = destinationSystemId || null;
      
      if (!finalDestinationSystemId) {
        finalDestinationSystemId = await this.routerService.getDestinationForMessage(
          sourceSystemId,
          payload
        );
      }

      if (!finalDestinationSystemId) {
        throw new AppError(
          'NO_ROUTE_FOUND',
          'No route configured for this message',
          400
        );
      }

      // Verify destination system exists and is active
      const destinationSystem = await this.findSystemById(finalDestinationSystemId);
      if (!destinationSystem || !destinationSystem.isActive) {
        throw new AppError(
          'DESTINATION_NOT_FOUND',
          `Destination system ${finalDestinationSystemId} not found or inactive`,
          404
        );
      }

      // Create message record
      await MessageModel.create({
        id: messageId,
        payload,
        metadata: {
          sourceSystemId: sourceSystem._id.toString(),
          destinationSystemId: destinationSystem._id.toString(),
          messageId,
          timestamp: new Date(),
          retryCount: 0,
        },
        status: 'pending' as MessageStatus,
      });

      // Push to queue for processing
      await QueueService.pushToQueue(messageId);

      // Send webhook notification
      await WebhookService.sendWebhook(
        sourceSystemId,
        'message.received',
        messageId,
        payload
      );

      const response: IngestResponse = {
        messageId,
        status: 'pending',
        timestamp: new Date(),
      };

      logger.info(`Message ${messageId} ingested from ${sourceSystem.name} to ${destinationSystem.name}`);
      res.status(202).json(response);

    } catch (error) {
      logger.error(`Ingest failed for message ${messageId}:`, error);
      
      // Save error in message if created
      const existingMessage = await MessageModel.findOne({ id: messageId });
      if (existingMessage) {
        existingMessage.status = 'failed';
        existingMessage.error = error instanceof Error ? error.message : 'Unknown error';
        await existingMessage.save();
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'INGEST_FAILED',
        error instanceof Error ? error.message : 'Failed to ingest message',
        500
      );
    }
  }

  public async getMessageStatus(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const message = await MessageModel.findOne({ id });

    if (!message) {
      throw new AppError('MESSAGE_NOT_FOUND', `Message ${id} not found`, 404);
    }

    res.json({
      id: message.id,
      status: message.status,
      metadata: message.metadata,
      error: message.error,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  public async replayMessage(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const message = await MessageModel.findOne({ id });

    if (!message) {
      throw new AppError('MESSAGE_NOT_FOUND', `Message ${id} not found`, 404);
    }

    if (message.status !== 'failed' && message.status !== 'dead') {
      throw new AppError(
        'INVALID_STATUS',
        `Cannot replay message with status ${message.status}`,
        400
      );
    }

    // Reset message
    message.status = 'pending';
    message.error = undefined;
    message.metadata.retryCount = 0;
    await message.save();

    // Re-queue
    await QueueService.pushToQueue(id);

    logger.info(`Message ${id} queued for replay`);
    res.json({
      messageId: id,
      status: 'queued_for_replay',
      timestamp: new Date(),
    });
  }
}