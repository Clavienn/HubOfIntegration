// src/controllers/system.controller.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { SystemModel } from '../models/System';
import { RouteModel } from '../models/Route';
import WebhookService from '../services/webhook.service';
import { AppError } from '../middlewares/error.middleware';
import { SystemConfig, RetryPolicy } from '../types';
import logger from '../utils/logger';

export class SystemController {
  private generateApiKey(): string {
    return `hk_${crypto.randomBytes(32).toString('hex')}`;
  }

  public async createSystem(
    req: Request<
      {},
      {},
      Omit<SystemConfig, 'id' | 'apiKey' | 'createdAt' | 'updatedAt'>
    >,
    res: Response
  ): Promise<void> {
    const { name, webhookUrl, retryPolicy, timeoutMs, isActive } = req.body;

    // Check if system name already exists
    const existingSystem = await SystemModel.findOne({ name });
    if (existingSystem) {
      throw new AppError('DUPLICATE_SYSTEM', `System with name ${name} already exists`, 409);
    }

    const systemId = uuidv4();
    const apiKey = this.generateApiKey();

    const defaultRetryPolicy: RetryPolicy = {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    };

    const system = await SystemModel.create({
      id: systemId,
      name,
      apiKey,
      webhookUrl,
      isActive: isActive ?? true,
      retryPolicy: retryPolicy || defaultRetryPolicy,
      timeoutMs: timeoutMs || 30000,
    });

    logger.info(`System created: ${name} (${systemId})`);

    res.status(201).json({
      id: system.id,
      name: system.name,
      apiKey: system.apiKey,
      webhookUrl: system.webhookUrl,
      isActive: system.isActive,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      createdAt: system.createdAt,
    });
  }

  public async getSystems(
    req: Request,
    res: Response
  ): Promise<void> {
    const systems = await SystemModel.find({}, { apiKey: 0 }); // Exclude API key
    res.json(systems);
  }

  public async getSystemById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const system = await SystemModel.findOne({ id }, { apiKey: 0 });

    if (!system) {
      throw new AppError('SYSTEM_NOT_FOUND', `System ${id} not found`, 404);
    }

    // Get routes for this system
    const routes = await RouteModel.find({
      $or: [
        { sourceSystemId: id },
        { destinationSystemId: id },
      ],
    });

    res.json({
      ...system.toObject(),
      routes,
    });
  }

  public async updateSystem(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { name, webhookUrl, isActive, retryPolicy, timeoutMs } = req.body;

    const system = await SystemModel.findOne({ id });

    if (!system) {
      throw new AppError('SYSTEM_NOT_FOUND', `System ${id} not found`, 404);
    }

    if (name && name !== system.name) {
      const existingSystem = await SystemModel.findOne({ name });
      if (existingSystem && existingSystem.id !== id) {
        throw new AppError('DUPLICATE_SYSTEM', `System with name ${name} already exists`, 409);
      }
      system.name = name;
    }

    if (webhookUrl !== undefined) system.webhookUrl = webhookUrl;
    if (isActive !== undefined) system.isActive = isActive;
    if (retryPolicy) system.retryPolicy = { ...system.retryPolicy, ...retryPolicy };
    if (timeoutMs !== undefined) system.timeoutMs = timeoutMs;

    await system.save();

    logger.info(`System updated: ${system.name} (${id})`);

    res.json({
      id: system.id,
      name: system.name,
      webhookUrl: system.webhookUrl,
      isActive: system.isActive,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      updatedAt: system.updatedAt,
    });
  }

  public async deleteSystem(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const system = await SystemModel.findOne({ id });

    if (!system) {
      throw new AppError('SYSTEM_NOT_FOUND', `System ${id} not found`, 404);
    }

    // Check if system is used in any routes
    const routes = await RouteModel.find({
      $or: [
        { sourceSystemId: id },
        { destinationSystemId: id },
      ],
    });

    if (routes.length > 0) {
      throw new AppError(
        'SYSTEM_IN_USE',
        `Cannot delete system ${id} because it is used in ${routes.length} route(s)`,
        409
      );
    }

    await system.deleteOne();

    logger.info(`System deleted: ${system.name} (${id})`);

    res.status(204).send();
  }

  public async rotateApiKey(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const system = await SystemModel.findOne({ id });

    if (!system) {
      throw new AppError('SYSTEM_NOT_FOUND', `System ${id} not found`, 404);
    }

    const newApiKey = this.generateApiKey();
    system.apiKey = newApiKey;
    await system.save();

    logger.info(`API key rotated for system: ${system.name} (${id})`);

    res.json({
      id: system.id,
      apiKey: newApiKey,
      message: 'API key rotated successfully. Old key is no longer valid.',
    });
  }

  public async testWebhook(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const system = await SystemModel.findOne({ id });

    if (!system) {
      throw new AppError('SYSTEM_NOT_FOUND', `System ${id} not found`, 404);
    }

    if (!system.webhookUrl) {
      throw new AppError('NO_WEBHOOK', 'System has no webhook configured', 400);
    }

    const result = await WebhookService.testWebhook(system.webhookUrl);

    res.json(result);
  }
}