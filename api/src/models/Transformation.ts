// src/models/Transformation.ts
import mongoose, { Schema, Document } from 'mongoose';
import { TransformationType, MessagePayload } from '../types';

export interface ITransformation extends Document {
  name: string;
  type: TransformationType;
  sourceSchema: MessagePayload;
  targetSchema: MessagePayload;
  mappingRules: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransformationSchema = new Schema<ITransformation>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['jsonata', 'template', 'jmespath'],
      required: true,
    },
    sourceSchema: {
      type: Schema.Types.Mixed,
      required: true,
    },
    targetSchema: {
      type: Schema.Types.Mixed,
      required: true,
    },
    mappingRules: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual pour exposer 'id'
TransformationSchema.virtual('id').get(function(this: ITransformation) {
  return this._id.toString();
});

TransformationSchema.index({ name: 1 });
TransformationSchema.index({ isActive: 1, type: 1 });

export const TransformationModel = mongoose.model<ITransformation>('Transformation', TransformationSchema);