import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { SystemModel } from '../models/System';
import { RouteModel } from '../models/Route';
import WebhookService from '../services/webhook.service';
import { AppError } from '../middlewares/error.middleware';
import { SystemConfig, RetryPolicy } from '../types';
import logger from '../utils/logger';

// ─── Utilitaire ────────────────────────────────────────────────────────────────

/**
 * Wraps an async controller method so that any thrown error
 * is forwarded to Express's next() instead of crashing the process.
 */
function asyncHandler(
  fn: (req: Request<any, any, any, any>, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

// ─── Controller ────────────────────────────────────────────────────────────────

export class SystemController {
  private generateApiKey(): string {
    return `hk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Finds a system by MongoDB _id (if valid ObjectId) or by the UUID `id` field.
   */
  private async findSystem(id: string) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const system = await SystemModel.findById(id);
      if (system) return system;
    }
    return SystemModel.findOne({ id });
  }

  private resolveId(system: { id?: string; _id: mongoose.Types.ObjectId }): string {
    return system.id ?? system._id.toString();
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  public createSystem = asyncHandler(async (
    req: Request<{}, {}, Omit<SystemConfig, 'id' | 'apiKey' | 'createdAt' | 'updatedAt'>>,
    res: Response,
  ) => {
    const { name, webhookUrl, retryPolicy, timeoutMs, isActive } = req.body;

    const existing = await SystemModel.findOne({ name });
    if (existing) {
      throw new AppError('DUPLICATE_SYSTEM', `A system named "${name}" already exists`, 409);
    }

    const system = await SystemModel.create({
      id: uuidv4(),
      name,
      apiKey: this.generateApiKey(),
      webhookUrl,
      isActive: isActive ?? true,
      retryPolicy: retryPolicy ?? DEFAULT_RETRY_POLICY,
      timeoutMs: timeoutMs ?? 30000,
    });

    logger.info(`System created: ${name} (${system.id})`);

    res.status(201).json({
      id: this.resolveId(system),
      name: system.name,
      apiKey: system.apiKey,
      webhookUrl: system.webhookUrl,
      isActive: system.isActive,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      createdAt: system.createdAt,
    });
  });

  // ─── List ─────────────────────────────────────────────────────────────────────

  public getSystems = asyncHandler(async (req: Request, res: Response) => {
    const { isActive, search, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;

    const query: mongoose.FilterQuery<typeof SystemModel> = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [systems, total] = await Promise.all([
      SystemModel.find(query).skip(skip).limit(limitNum).sort(sort),
      SystemModel.countDocuments(query),
    ]);

    res.json({
      systems: systems.map((s) => ({ ...s.toObject(), id: this.resolveId(s) })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  // ─── Get by ID ───────────────────────────────────────────────────────────────

  public getSystemById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const system = await this.findSystem(req.params.id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${req.params.id}" not found`, 404);

    const systemId = this.resolveId(system);
    const routes = await RouteModel.find({
      $or: [{ sourceSystemId: systemId }, { destinationSystemId: systemId }],
    });

    res.json({
      ...system.toObject(),
      id: systemId,
      apiKey: undefined, // never expose the API key here
      routes,
    });
  });

  // ─── Update ──────────────────────────────────────────────────────────────────

  public updateSystem = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { name, webhookUrl, isActive, retryPolicy, timeoutMs } = req.body;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    if (name && name !== system.name) {
      const duplicate = await SystemModel.findOne({ name });
      if (duplicate && this.resolveId(duplicate) !== this.resolveId(system)) {
        throw new AppError('DUPLICATE_SYSTEM', `A system named "${name}" already exists`, 409);
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
      id: this.resolveId(system),
      name: system.name,
      webhookUrl: system.webhookUrl,
      isActive: system.isActive,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      updatedAt: system.updatedAt,
    });
  });

  // ─── Delete ──────────────────────────────────────────────────────────────────

  public deleteSystem = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    const systemId = this.resolveId(system);
    const routeCount = await RouteModel.countDocuments({
      $or: [{ sourceSystemId: systemId }, { destinationSystemId: systemId }],
    });

    if (routeCount > 0) {
      throw new AppError(
        'SYSTEM_IN_USE',
        `Cannot delete "${system.name}": it is referenced by ${routeCount} route(s)`,
        409,
      );
    }

    await system.deleteOne();
    logger.info(`System deleted: ${system.name} (${id})`);

    res.status(204).send();
  });

  // ─── Enable / Disable ────────────────────────────────────────────────────────

  public enableSystem = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    if (system.isActive) {
      throw new AppError('SYSTEM_ALREADY_ACTIVE', `System "${system.name}" is already active`, 400);
    }

    system.isActive = true;
    await system.save();
    logger.info(`System enabled: ${system.name} (${id})`);

    res.json({
      id: this.resolveId(system),
      name: system.name,
      isActive: system.isActive,
      webhookUrl: system.webhookUrl,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      updatedAt: system.updatedAt,
    });
  });

  public disableSystem = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    if (!system.isActive) {
      throw new AppError('SYSTEM_ALREADY_DISABLED', `System "${system.name}" is already disabled`, 400);
    }

    const systemId = this.resolveId(system);
    const activeRouteCount = await RouteModel.countDocuments({
      $or: [{ sourceSystemId: systemId }, { destinationSystemId: systemId }],
      isActive: true,
    });

    if (activeRouteCount > 0) {
      throw new AppError(
        'SYSTEM_HAS_ACTIVE_ROUTES',
        `Cannot disable "${system.name}": it is used in ${activeRouteCount} active route(s). Disable those routes first.`,
        409,
      );
    }

    system.isActive = false;
    await system.save();
    logger.info(`System disabled: ${system.name} (${id})`);

    res.json({
      id: systemId,
      name: system.name,
      isActive: system.isActive,
      webhookUrl: system.webhookUrl,
      retryPolicy: system.retryPolicy,
      timeoutMs: system.timeoutMs,
      updatedAt: system.updatedAt,
    });
  });

  // ─── Rotate API Key ──────────────────────────────────────────────────────────

  public rotateApiKey = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    system.apiKey = this.generateApiKey();
    await system.save();
    logger.info(`API key rotated: ${system.name} (${id})`);

    res.json({
      id: this.resolveId(system),
      apiKey: system.apiKey,
    });
  });

  // ─── Test Webhook ─────────────────────────────────────────────────────────────

  public testWebhook = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const system = await this.findSystem(id);
    if (!system) throw new AppError('SYSTEM_NOT_FOUND', `System "${id}" not found`, 404);

    if (!system.webhookUrl) {
      throw new AppError('NO_WEBHOOK', 'This system has no webhook URL configured', 400);
    }

    const result = await WebhookService.testWebhook(system.webhookUrl);
    res.json(result);
  });
}