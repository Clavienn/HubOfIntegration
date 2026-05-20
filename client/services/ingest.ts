// services/ingest.service.ts
import { IngestResponse, MessageStatusResponse } from '@/domains/models/Ingest';

export interface MessageTemplate {
  id: string;
  name: string;
  template: Record<string, any>;
}

export class IngestService {
  /**
   * Valide un payload avant envoi
   */
  static validatePayload(payload: Record<string, any>, requiredFields?: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!payload || typeof payload !== 'object') {
      errors.push('Le payload doit être un objet');
      return { valid: false, errors };
    }
    
    if (requiredFields) {
      for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null) {
          errors.push(`Le champ "${field}" est requis`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Prépare un payload à partir d'un template
   */
  static prepareFromTemplate(template: MessageTemplate, data: Record<string, any>): Record<string, any> {
    const result = { ...template.template };
    
    // Remplacer les placeholders {{variable}}
    const replacePlaceholders = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(replacePlaceholders);
      }
      if (obj && typeof obj === 'object') {
        const newObj: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          newObj[key] = replacePlaceholders(value);
        }
        return newObj;
      }
      return obj;
    };
    
    return replacePlaceholders(result);
  }

  /**
   * Formate le statut pour l'affichage
   */
  static formatStatusForDisplay(status: string): { label: string; color: string; icon: string } {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'En attente', color: 'text-yellow-600', icon: '🕒' },
      processing: { label: 'Traitement', color: 'text-blue-600', icon: '⚙️' },
      success: { label: 'Succès', color: 'text-green-600', icon: '✅' },
      failed: { label: 'Échec', color: 'text-red-600', icon: '❌' },
      retry: { label: 'Nouvelle tentative', color: 'text-orange-600', icon: '🔄' },
      dead: { label: 'Lettre morte', color: 'text-gray-600', icon: '💀' },
    };
    
    return statusMap[status] || { label: status, color: 'text-gray-600', icon: '❓' };
  }

  /**
   * Calcule le temps écoulé depuis la création
   */
  static getElapsedTime(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(createdAt).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffHour > 0) return `${diffHour}h`;
    if (diffMin > 0) return `${diffMin}min`;
    if (diffSec > 0) return `${diffSec}s`;
    return `${diffMs}ms`;
  }
}