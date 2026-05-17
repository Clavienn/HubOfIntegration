// src/controllers/route.controller.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { RouteModel } from '../models/Route';
import { SystemModel } from '../models/System';
import { AppError } from '../middlewares/error.middleware';
import { Route } from '../types';
import logger from '../utils/logger';

export class RouteController {
  /**
   * Helper function to find a route by either id (UUID) or _id (MongoDB ObjectId)
   */
  private async findRouteById(routeId: string): Promise<any | null> {
    if (mongoose.Types.ObjectId.isValid(routeId)) {
      const route = await RouteModel.findById(routeId);
      if (route) return route;
    }
    return await RouteModel.findOne({ id: routeId });
  }

  /**
   * Helper function to find a system by either id (UUID) or _id (MongoDB ObjectId)
   */
  private async findSystemById(systemId: string): Promise<any | null> {
    if (mongoose.Types.ObjectId.isValid(systemId)) {
      const system = await SystemModel.findById(systemId);
      if (system) return system;
    }
    return await SystemModel.findOne({ id: systemId });
  }

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

    const routeId = uuidv4();

    const route = await RouteModel.create({
      id: routeId,
      name,
      sourceSystemId: sourceSystem._id.toString(),
      destinationSystemId: destinationSystem._id.toString(),
      transformationId,
      condition,
      priority: priority || 0,
      isActive: isActive ?? true,
    });

    logger.info(`Route created: ${name} (${routeId}) from ${sourceSystem.name} to ${destinationSystem.name}`);

    // Retourner la route avec l'ID formaté
    const routeObj = route.toObject();
    res.status(201).json({
      ...routeObj,
      id: routeObj._id.toString(),
    });
  }

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
    const { 
      sourceSystemId, 
      destinationSystemId, 
      isActive, 
      search,
      page = '1', 
      limit = '10' 
    } = req.query;

    const query: Record<string, unknown> = {};
    
    if (sourceSystemId) {
      query.sourceSystemId = sourceSystemId;
    }
    
    if (destinationSystemId) {
      query.destinationSystemId = destinationSystemId;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [routes, total] = await Promise.all([
      RouteModel.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RouteModel.countDocuments(query),
    ]);

    // Transformer les routes pour exposer l'ID correctement
    const routesWithId = routes.map(route => ({
      ...route,
      id: route._id.toString(),
    }));

    console.log(`Retrieved ${routes.length} routes (total: ${total})`);

    // ⚠️ CRUCIAL: Retourner la structure attendue par le frontend
    res.json({
      routes: routesWithId,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  public async getRouteById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await this.findRouteById(id);

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    const routeObj = route.toObject();
    res.json({
      ...routeObj,
      id: routeObj._id.toString(),
    });
  }

  public async updateRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { name, transformationId, condition, priority, isActive } = req.body;

    const route = await this.findRouteById(id);

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

    const routeObj = route.toObject();
    res.json({
      ...routeObj,
      id: routeObj._id.toString(),
    });
  }

  public async deleteRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await this.findRouteById(id);

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

    const route = await this.findRouteById(id);

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    route.isActive = true;
    await route.save();

    res.json({ 
      id: route._id.toString(), 
      isActive: true 
    });
  }

  public async disableRoute(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const route = await this.findRouteById(id);

    if (!route) {
      throw new AppError('ROUTE_NOT_FOUND', `Route ${id} not found`, 404);
    }

    route.isActive = false;
    await route.save();

    res.json({ 
      id: route._id.toString(), 
      isActive: false 
    });
  }
}