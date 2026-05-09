// src/services/router.service.ts
import { MessagePayload } from '../types';
import { RouteModel } from '../models/Route';
import logger from '../utils/logger';
import jsonata from 'jsonata';

export class RouterService {
  private static instance: RouterService;

  private constructor() {}

  public static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }

  public async getDestinationForMessage(
    sourceSystemId: string,
    payload: MessagePayload,
    suggestedDestination?: string
  ): Promise<string | null> {
    // If destination is explicitly provided, verify it's valid
    if (suggestedDestination) {
      const route = await RouteModel.findOne({
        sourceSystemId,
        destinationSystemId: suggestedDestination,
        isActive: true,
      }).lean();
      
      if (route) {
        return suggestedDestination;
      }
    }

    // Find all active routes for this source
    const routes = await RouteModel.find({
      sourceSystemId,
      isActive: true,
    })
      .sort({ priority: -1 })
      .lean();

    // Evaluate each route's condition
    for (const route of routes) {
      if (await this.evaluateCondition(route, payload)) {
        logger.debug(`Route ${route._id} matched for message from ${sourceSystemId}`);
        return route.destinationSystemId;
      }
    }

    logger.warn(`No route found for message from ${sourceSystemId}`);
    return null;
  }

  private async evaluateCondition(route: any, payload: MessagePayload): Promise<boolean> {
    if (!route.condition) {
      return true;
    }

    try {
      const expression = jsonata(route.condition);
      const result = await expression.evaluate(payload);
      return Boolean(result);
    } catch (error) {
      logger.error(`Condition evaluation failed for route ${route._id}:`, error);
      return false;
    }
  }

  public async getTransformationForRoute(
    sourceSystemId: string,
    destinationSystemId: string
  ): Promise<string | null> {
    const route = await RouteModel.findOne({
      sourceSystemId,
      destinationSystemId,
      isActive: true,
    }).lean();

    return route?.transformationId || null;
  }
}

export default RouterService
