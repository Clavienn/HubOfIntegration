// src/services/router.service.ts
/**
 * RouterService — cœur du moteur de routage ESB
 *
 * Responsabilités :
 *  1. Trouver les routes actives pour un système source.
 *  2. Évaluer la condition de chaque route contre le payload entrant.
 *  3. Retourner l'id du système destination de la première route qui match
 *     (en respectant l'ordre de priorité décroissante).
 *
 * Format des conditions (champ `Route.condition`) :
 *   - Vide / null → route par défaut, toujours vraie
 *   - Expression JavaScript limitée évaluée avec Function() sandboxée :
 *       "payload.type === 'order'"
 *       "payload.amount > 1000 && payload.currency === 'USD'"
 *       "payload.status !== 'cancelled'"
 */

import { RouteModel } from '../models/Routage';
import { MessagePayload } from '../types';
import logger from '../utils/logger';

export class RouterService {
  private static instance: RouterService;

  private constructor() {}

  public static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }

  /**
   * Évalue une condition textuelle contre un payload.
   * Retourne true si la condition est vide (route catch-all).
   */
  public evaluateCondition(condition: string | undefined, payload: MessagePayload): boolean {
    if (!condition || condition.trim() === '') {
      return true; // route par défaut
    }

    try {
      // Sandbox minimal : on n'expose que `payload`
      // eslint-disable-next-line no-new-func
      const fn = new Function('payload', `"use strict"; return !!(${condition});`);
      const result = fn(payload);
      return Boolean(result);
    } catch (err) {
      logger.warn(`Condition evaluation failed for expression "${condition}": ${(err as Error).message}`);
      return false; // une condition invalide ne route pas
    }
  }

  /**
   * Retourne l'id (MongoDB string) du système destination pour un message entrant.
   *
   * @param sourceSystemId  _id.toString() du système source
   * @param payload         Corps du message
   */
  public async getDestinationForMessage(
    sourceSystemId: string,
    payload: MessagePayload
  ): Promise<string | null> {
    // Récupérer toutes les routes actives pour cette source, par priorité décroissante
    const routes = await RouteModel.find({
      sourceSystemId,
      isActive: true,
    }).sort({ priority: -1 });

    if (routes.length === 0) {
      logger.warn(`No active routes found for source system ${sourceSystemId}`);
      return null;
    }

    for (const route of routes) {
      const match = this.evaluateCondition(route.condition, payload);

      logger.debug(
        `Route "${route.name}" (priority=${route.priority}) condition="${route.condition ?? 'catch-all'}" → ${match ? 'MATCH' : 'skip'}`
      );

      if (match) {
        logger.info(`Routing to system ${route.destinationSystemId} via route "${route.name}"`);
        return route.destinationSystemId;
      }
    }

    logger.warn(`No matching route found for source system ${sourceSystemId}`);
    return null;
  }

  /**
   * Retourne toutes les routes candidates avec leur résultat d'évaluation.
   * Utile pour le debug / la page "test de routage" du frontend.
   */
  public async dryRun(
    sourceSystemId: string,
    payload: MessagePayload
  ): Promise<Array<{ routeId: string; name: string; priority: number; condition?: string; matched: boolean; destinationSystemId: string }>> {
    const routes = await RouteModel.find({ sourceSystemId, isActive: true }).sort({ priority: -1 });

    return routes.map(route => ({
      routeId:             route._id.toString(),
      name:                route.name,
      priority:            route.priority,
      condition:           route.condition,
      matched:             this.evaluateCondition(route.condition, payload),
      destinationSystemId: route.destinationSystemId,
    }));
  }
}

export default RouterService;