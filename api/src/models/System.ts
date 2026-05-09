// src/models/System.ts
import mongoose, { Schema, Document } from 'mongoose';
import { RetryPolicy } from '../types';

export interface ISystem extends Document {
  name: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const RetryPolicySchema = new Schema<RetryPolicy>({
  maxAttempts: { type: Number, required: true, default: 3 },
  delayMs: { type: Number, required: true, default: 1000 },
  backoffMultiplier: { type: Number, required: true, default: 2 },
});

const SystemSchema = new Schema<ISystem>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    webhookUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    retryPolicy: {
      type: RetryPolicySchema,
      required: true,
      default: () => ({
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
      }),
    },
    timeoutMs: {
      type: Number,
      required: true,
      default: 30000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SystemSchema.index({ isActive: 1 }); // Seul index supplémentaire nécessaire

// Virtual pour exposer 'id'
SystemSchema.virtual('id').get(function(this: ISystem) {
  return this._id.toString();
});

export const SystemModel = mongoose.model<ISystem>('System', SystemSchema);