// src/controllers/route.controller.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RouteModel } from '../models/Route';
import { SystemModel } from '../models/System';
import { AppError } from '../middlewares/error.middleware';
import { Route } from '../types';
import logger from '../utils/logger';

export class RouteController {
  public async createRoute(
    req: Request<{}, {}, Omit<Route, 'id' | 'createdAt' | 'updatedAt'>>,
    res: Response
  ): Promise<void> {
    const { name, sourceSystemId, destinationSystemId, transformationId, condition, priority, isActive } = req.body;

    // Verify source system exists
    const sourceSystem = await SystemModel.findOne({ id: sourceSystemId });
    if (!sourceSystem) {
      throw new AppError('SOURCE_NOT_FOUND', `Source system ${sourceSystemId} not found`, 404);
    }

    // Verify destination system exists
    const destinationSystem = await SystemModel.findOne({ id: destinationSystemId });
    if (!destinationSystem) {
      throw new AppError('DESTINATION_NOT_FOUND', `Destination system ${destinationSystemId} not found`, 404);
    }

    const routeId = uuidv4();

    const route = await RouteModel.create({
      id: routeId,
      name,
      sourceSystemId,
      destinationSystemId,
      transformationId,
      condition,
      priority: priority || 0,
      isActive: isActive ?? true,
    });

    logger.info(`Route created: ${name} (${routeId}) from ${sourceSystemId} to ${destinationSystemId}`);

    res.status(201).json(route);
  }

  public async getRoutes(
    req: Request<{}, {}, {}, { sourceSystemId?: string; destinationSystemId?: string }>,
    res: Response
  ): Promise<void> {
    const query: Record<string, unknown> = {};
    
    if (req.query.sourceSystemId) {
      query.sourceSystemId = req.query.sourceSystemId;
    }
    
    if (req.query.destinationSystemId) {
      query.destinationSystemId = req.query.destinationSystemId;
    }

    const routes = await RouteModel.find(query).sort({ priority: -1 });
    res.json(routes);
  }

  public async getRouteById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await RouteModel.findOne({ id });

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    res.json(route);
  }

  public async updateRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { name, transformationId, condition, priority, isActive } = req.body;

    const route = await RouteModel.findOne({ id });

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    if (name) route.name = name;
    if (transformationId !== undefined) route.transformationId = transformationId;
    if (condition !== undefined) route.condition = condition;
    if (priority !== undefined) route.priority = priority;
    if (isActive !== undefined) route.isActive = isActive;

    await route.save();

    logger.info(`Route updated: ${route.name} (${id})`);

    res.json(route);
  }

  public async deleteRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await RouteModel.findOne({ id });

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    await route.deleteOne();

    logger.info(`Route deleted: ${route.name} (${id})`);

    res.status(204).send();
  }

  public async enableRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await RouteModel.findOne({ id });

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    route.isActive = true;
    await route.save();

    res.json({ id: route.id, isActive: true });
  }

  public async disableRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await RouteModel.findOne({ id });

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    route.isActive = false;
    await route.save();

    res.json({ id: route.id, isActive: false });
  }
}   