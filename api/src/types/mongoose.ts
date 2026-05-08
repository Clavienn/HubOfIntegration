// src/types/mongoose.ts
import { Document } from 'mongoose';

// Type utilitaire pour extraire les propriétés d'un document Mongoose
export type MongooseDocument<T> = Document & T & {
  _id: any;
  __v?: number;
  createdAt: Date;
  updatedAt: Date;
};

// Type pour les routes Mongoose
export type RouteDocument = MongooseDocument<{
  name: string;
  sourceSystemId: string;
  destinationSystemId: string;
  transformationId?: string;
  condition?: string;
  isActive: boolean;
  priority: number;
}>;