// src/controllers/route.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { RouteModel } from '../models/Routage';
import { SystemModel } from '../models/System';
import { AppError } from '../middlewares/error.middleware';
import { Route } from '../types';
import logger from '../utils/logger';

export class RouteController {
  /**
   * Trouve un système par _id (ObjectId) OU par son virtual id (= _id.toString()).
   * Le System n'a plus de champ uuid séparé — son id est toujours _id.toString().
   */
  private async findSystemById(systemId: string) {
    if (mongoose.Types.ObjectId.isValid(systemId)) {
      const system = await SystemModel.findById(systemId);
      if (system) return system;
    }
    // Fallback: le frontend peut envoyer l'id stringifié
    return SystemModel.findOne({ _id: systemId });
  }

  private async findRouteById(routeId: string) {
    if (mongoose.Types.ObjectId.isValid(routeId)) {
      const route = await RouteModel.findById(routeId);
      if (route) return route;
    }
    return null; // Route n'a pas d'uuid séparé — seul _id est utilisé
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  public async createRoute(
    req: Request<{}, {}, Omit<Route, 'id' | 'createdAt' | 'updatedAt'>>,
    res: Response
  ): Promise<void> {
    const { name, sourceSystemId, destinationSystemId, transformationId, condition, priority, isActive } = req.body;

    const sourceSystem = await this.findSystemById(sourceSystemId);
    if (!sourceSystem) {
      throw new AppError('SOURCE_NOT_FOUND', `Source system ${sourceSystemId} not found`, 404);
    }

    const destinationSystem = await this.findSystemById(destinationSystemId);
    if (!destinationSystem) {
      throw new AppError('DESTINATION_NOT_FOUND', `Destination system ${destinationSystemId} not found`, 404);
    }

    // FIX: on stocke les _id MongoDB (string) — plus de UUID séparé pour Route
    const route = await RouteModel.create({
      name,
      sourceSystemId:      sourceSystem._id.toString(),
      destinationSystemId: destinationSystem._id.toString(),
      transformationId,
      condition,
      priority:  priority ?? 0,
      isActive:  isActive ?? true,
    });

    logger.info(`Route created: ${name} (${route._id}) from ${sourceSystem.name} to ${destinationSystem.name}`);

    res.status(201).json(route.toObject());
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  public async getRoutes(
    req: Request<{}, {}, {}, {
      sourceSystemId?: string;
      destinationSystemId?: string;
      isActive?: string;
      search?: string;
      page?: string;
      limit?: string;
    }>,
    res: Response
  ): Promise<void> {
    const { sourceSystemId, destinationSystemId, isActive, search, page = '1', limit = '10' } = req.query;

    const query: Record<string, unknown> = {};
    if (sourceSystemId)      query.sourceSystemId = sourceSystemId;
    if (destinationSystemId) query.destinationSystemId = destinationSystemId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [routes, total] = await Promise.all([
      RouteModel.find(query).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      RouteModel.countDocuments(query),
    ]);

    res.json({
      routes: routes.map(r => ({ ...r, id: r._id.toString() })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  public async getRouteById(req: Request<{ id: string }>, res: Response): Promise<void> {
    const route = await this.findRouteById(req.params.id);
    if (!route) throw new AppError('ROUTE_NOT_FOUND', `Route ${req.params.id} not found`, 404);
    res.json(route.toObject());
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  public async updateRoute(req: Request<{ id: string }>, res: Response): Promise<void> {
    const route = await this.findRouteById(req.params.id);
    if (!route) throw new AppError('ROUTE_NOT_FOUND', `Route ${req.params.id} not found`, 404);

    const { name, transformationId, condition, priority, isActive } = req.body;
    if (name              !== undefined) route.name             = name;
    if (transformationId  !== undefined) route.transformationId = transformationId;
    if (condition         !== undefined) route.condition        = condition;
    if (priority          !== undefined) route.priority         = priority;
    if (isActive          !== undefined) route.isActive         = isActive;

    await route.save();
    logger.info(`Route updated: ${route.name} (${route._id})`);
    res.json(route.toObject());
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  public async deleteRoute(req: Request<{ id: string }>, res: Response): Promise<void> {
    const route = await this.findRouteById(req.params.id);
    if (!route) throw new AppError('ROUTE_NOT_FOUND', `Route ${req.params.id} not found`, 404);
    await route.deleteOne();
    logger.info(`Route deleted: ${route.name} (${route._id})`);
    res.status(204).send();
  }

  // ─── Enable / Disable ──────────────────────────────────────────────────────

  public async enableRoute(req: Request<{ id: string }>, res: Response): Promise<void> {
    const route = await this.findRouteById(req.params.id);
    if (!route) throw new AppError('ROUTE_NOT_FOUND', `Route ${req.params.id} not found`, 404);
    route.isActive = true;
    await route.save();
    res.json({ id: route._id.toString(), isActive: true });
  }

  public async disableRoute(req: Request<{ id: string }>, res: Response): Promise<void> {
    const route = await this.findRouteById(req.params.id);
    if (!route) throw new AppError('ROUTE_NOT_FOUND', `Route ${req.params.id} not found`, 404);
    route.isActive = false;
    await route.save();
    res.json({ id: route._id.toString(), isActive: false });
  }
}