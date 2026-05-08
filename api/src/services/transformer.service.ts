// src/services/transformer.service.ts
import jsonata from 'jsonata';
import { Transformation, MessagePayload, TransformationType } from '../types';
import { TransformationModel } from '../models/Transformation';
import logger from '../utils/logger';

export class TransformerService {
  private static instance: TransformerService;

  private constructor() {}

  public static getInstance(): TransformerService {
    if (!TransformerService.instance) {
      TransformerService.instance = new TransformerService();
    }
    return TransformerService.instance;
  }

  public async transform(
    payload: MessagePayload,
    transformationId: string
  ): Promise<MessagePayload> {
    try {
      const transformation = await TransformationModel.findOne({ 
        id: transformationId, 
        isActive: true 
      });

      if (!transformation) {
        throw new Error(`Transformation ${transformationId} not found or inactive`);
      }

      let transformedPayload: MessagePayload;

      switch (transformation.type) {
        case 'jsonata':
          transformedPayload = await this.applyJsonata(payload, transformation.mappingRules);
          break;
        case 'template':
          transformedPayload = this.applyTemplate(payload, transformation.mappingRules);
          break;
        default:
          throw new Error(`Unsupported transformation type: ${transformation.type}`);
      }

      logger.debug(`Transformation ${transformationId} applied successfully`);
      return transformedPayload;

    } catch (error) {
      logger.error(`Transformation failed for ${transformationId}:`, error);
      throw error;
    }
  }

  private async applyJsonata(payload: MessagePayload, rules: string): Promise<MessagePayload> {
    try {
      const expression = jsonata(rules);
      const result = await expression.evaluate(payload);
      return result as MessagePayload;
    } catch (error) {
      throw new Error(`JSONata transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private applyTemplate(payload: MessagePayload, rules: string): MessagePayload {
    try {
      // Simple template engine: {{field.path}} replacement
      let result = rules;
      const matches = rules.match(/\{\{([^}]+)\}\}/g);
      
      if (matches) {
        matches.forEach((match: string) => {
          const path = match.slice(2, -2);
          const value = this.getValueByPath(payload, path);
          result = result.replace(match, JSON.stringify(value));
        });
      }

      return JSON.parse(result) as MessagePayload;
    } catch (error) {
      throw new Error(`Template transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getValueByPath(obj: MessagePayload, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  public async validateTransformation(
    transformationId: string,
    testPayload: MessagePayload
  ): Promise<{ valid: boolean; result?: MessagePayload; error?: string }> {
    try {
      const result = await this.transform(testPayload, transformationId);
      return { valid: true, result };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default TransformerService.getInstance();