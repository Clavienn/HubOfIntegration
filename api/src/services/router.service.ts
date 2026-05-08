// src/services/router.service.ts
import { Route, MessagePayload } from '../types';
import { RouteModel } from '../models/Route';
import { RouteDocument } from '../types/mongoose';
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

  private convertToRoute(doc: RouteDocument): Route {
    return {
      id: doc._id.toString(),
      name: doc.name,
      sourceSystemId: doc.sourceSystemId,
      destinationSystemId: doc.destinationSystemId,
      transformationId: doc.transformationId,
      condition: doc.condition,
      isActive: doc.isActive,
      priority: doc.priority,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // public async getDestinationForMessage(
  //   sourceSystemId: string,
  //   payload: MessagePayload,
  //   suggestedDestination?: string
  // ): Promise<string | null> {
  //   if (suggestedDestination) {
  //     const routeDoc = await RouteModel.findOne({
  //       sourceSystemId,
  //       destinationSystemId: suggestedDestination,
  //       isActive: true,
  //     }) as RouteDocument | null;
      
  //     if (routeDoc) {
  //       return suggestedDestination;
  //     }
  //   }

  //   const routeDocs = await RouteModel.find({
  //     sourceSystemId,
  //     isActive: true,
  //   }).sort({ priority: -1 }) as RouteDocument[];

  //   for (const routeDoc of routeDocs) {
  //     const route = this.convertToRoute(routeDoc);
  //     if (await this.evaluateCondition(route, payload)) {
  //       logger.debug(`Route ${route.id} matched for message from ${sourceSystemId}`);
  //       return route.destinationSystemId;
  //     }
  //   }

  //   logger.warn(`No route found for message from ${sourceSystemId}`);
  //   return null;
  // }

  private async evaluateCondition(route: Route, payload: MessagePayload): Promise<boolean> {
    if (!route.condition) {
      return true;
    }

    try {
      const expression = jsonata(route.condition);
      const result = await expression.evaluate(payload);
      return Boolean(result);
    } catch (error) {
      logger.error(`Condition evaluation failed for route ${route.id}:`, error);
      return false;
    }
  }

  public async getTransformationForRoute(
    sourceSystemId: string,
    destinationSystemId: string
  ): Promise<string | null> {
    const routeDoc = await RouteModel.findOne({
      sourceSystemId,
      destinationSystemId,
      isActive: true,
    }) as RouteDocument | null;

    return routeDoc?.transformationId || null;
  }
}

export default RouterService.getInstance();