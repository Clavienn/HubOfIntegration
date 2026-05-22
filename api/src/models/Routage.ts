// src/models/Route.ts
import mongoose, { Schema, Document } from 'mongoose';
import { Route } from '../types';

export interface IRoute extends Omit<Route, 'id' | 'createdAt' | 'updatedAt'>, Document {}

const RouteSchema = new Schema<IRoute>(
  {
    name:               { type: String, required: true },

    sourceSystemId:      { type: String, required: true, index: true },
    destinationSystemId: { type: String, required: true },
    transformationId:    { type: String },
    // condition: expression JSONata ou JS à évaluer sur le payload
    // ex: "payload.type === 'order'" ou "payload.amount > 100"
    condition:  { type: String },
    isActive:   { type: Boolean, required: true, default: true },
    priority:   { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

RouteSchema.virtual('id').get(function (this: IRoute) {
  return this._id.toString();
});

RouteSchema.index({ sourceSystemId: 1, isActive: 1, priority: -1 });
RouteSchema.index({ name: 1 });

export const RouteModel = mongoose.model<IRoute>('Route', RouteSchema);