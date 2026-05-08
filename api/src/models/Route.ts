// src/models/Route.ts
import mongoose, { Schema, Document } from 'mongoose';
import { Route } from '../types';

// Interface Mongoose sans le champ id conflictuel
export interface IRoute extends Omit<Route, 'id' | 'createdAt' | 'updatedAt'>, Document {
  // Le champ _id de Mongoose fait office d'id
}

const RouteSchema = new Schema<IRoute>(
  {
    name: {
      type: String,
      required: true,
    },
    sourceSystemId: {
      type: String,
      required: true,
      index: true,
    },
    destinationSystemId: {
      type: String,
      required: true,
    },
    transformationId: {
      type: String,
    },
    condition: {
      type: String,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual pour exposer 'id' à la place de '_id'
RouteSchema.virtual('id').get(function(this: IRoute) {
  return this._id.toString();
});

// Indexes
RouteSchema.index({ sourceSystemId: 1, isActive: 1, priority: -1 });
RouteSchema.index({ name: 1 });

export const RouteModel = mongoose.model<IRoute>('Route', RouteSchema);