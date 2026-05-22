// src/controllers/ingest.controller.ts
import { Response } from 'express';
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
   * Cherche un système par _id uniquement (pas d'uuid séparé sur System).
   */
  private async findSystemById(systemId: string) {
    if (!systemId) return null;
    if (mongoose.Types.ObjectId.isValid(systemId)) {
      return SystemModel.findById(systemId);
    }
    return null;
  }

  // ─── Ingest ────────────────────────────────────────────────────────────────

  public async ingest(req: AuthRequest, res: Response): Promise<void> {
    const { payload, destinationSystemId, correlationId }: IngestRequest = req.body;


    console.log(req.body);
    // FIX: sourceSystemId vient du middleware d'auth — pas du body
    const sourceSystemId =  req.body.sourceSystemId;
    if (!sourceSystemId) {
      throw new AppError('UNAUTHORIZED', 'Source system not identified', 401);
    }

    const messageId = correlationId || uuidv4();

    try {
      const sourceSystem = await this.findSystemById(sourceSystemId);
      if (!sourceSystem) {
        throw new AppError('SYSTEM_NOT_FOUND', `Source system ${sourceSystemId} not found`, 404);
      }

      logger.info(`Ingesting message from: ${sourceSystem.name} (${sourceSystemId})`);

      // ── Résolution de la destination ──────────────────────────────────────
      let finalDestinationSystemId: string | null = destinationSystemId || null;

      if (!finalDestinationSystemId) {
        // RouterService évalue les conditions des routes
        finalDestinationSystemId = await this.routerService.getDestinationForMessage(
          sourceSystemId,
          payload
        );
      }

      if (!finalDestinationSystemId) {
        throw new AppError('NO_ROUTE_FOUND', 'No route matched this message', 400);
      }

      // ── Vérification de la destination ────────────────────────────────────
      const destinationSystem = await this.findSystemById(finalDestinationSystemId);
      if (!destinationSystem || !destinationSystem.isActive) {
        throw new AppError(
          'DESTINATION_NOT_FOUND',
          `Destination system ${finalDestinationSystemId} not found or inactive`,
          404
        );
      }

      // ── Création du message ───────────────────────────────────────────────
      await MessageModel.create({
        id: messageId,
        payload,
        metadata: {
          sourceSystemId:      sourceSystem._id.toString(),
          destinationSystemId: destinationSystem._id.toString(),
          messageId,
          timestamp:   new Date(),
          retryCount:  0,
        },
        status: 'pending' as MessageStatus,
      });

      // ── File de traitement ─────────────────────────────────────────────────
      await QueueService.pushToQueue(messageId);

      // ── Notification webhook source ────────────────────────────────────────
      await WebhookService.sendWebhook(sourceSystemId, 'message.received', messageId, payload);

      const response: IngestResponse = {
        messageId,
        status: 'pending',
        timestamp: new Date(),
      };

      logger.info(`Message ${messageId} ingested: ${sourceSystem.name} → ${destinationSystem.name}`);
      res.status(202).json(response);

    } catch (error) {
      logger.error(`Ingest failed for message ${messageId}:`, error);

      // Marquer le message comme échoué s'il a été créé
      const existingMessage = await MessageModel.findOne({ id: messageId });
      if (existingMessage) {
        existingMessage.status = 'failed';
        existingMessage.error  = error instanceof Error ? error.message : 'Unknown error';
        await existingMessage.save();
      }

      if (error instanceof AppError) throw error;
      throw new AppError('INGEST_FAILED', error instanceof Error ? error.message : 'Failed to ingest message', 500);
    }
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  public async getMessageStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const message = await MessageModel.findOne({ id });
    if (!message) throw new AppError('MESSAGE_NOT_FOUND', `Message ${id} not found`, 404);

    res.json({
      id:        message.id,
      status:    message.status,
      metadata:  message.metadata,
      error:     message.error,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  // ─── Replay ────────────────────────────────────────────────────────────────

  public async replayMessage(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const message = await MessageModel.findOne({ id });
    if (!message) throw new AppError('MESSAGE_NOT_FOUND', `Message ${id} not found`, 404);

    if (message.status !== 'failed' && message.status !== 'dead') {
      throw new AppError('INVALID_STATUS', `Cannot replay message with status "${message.status}"`, 400);
    }

    message.status            = 'pending';
    message.error             = undefined;
    message.metadata.retryCount = 0;
    await message.save();

    await QueueService.pushToQueue(id);
    logger.info(`Message ${id} queued for replay`);

    res.json({ messageId: id, status: 'queued_for_replay', timestamp: new Date() });
  }

  // ─── Dry-run (debug routing) ───────────────────────────────────────────────

  /**
   * Endpoint de debug : évalue toutes les routes candidates sans persister de message.
   * POST /ingest/dry-run  { payload: {...} }
   */
  public async dryRun(req: AuthRequest, res: Response): Promise<void> {
    
    const sourceSystemId =  req.body.sourceSystemId;
    if (!sourceSystemId) throw new AppError('UNAUTHORIZED', 'Source system not identified', 401);

    const { payload } = req.body;
    const results = await this.routerService.dryRun(sourceSystemId, payload);

    res.json({ sourceSystemId, results });
  }
}