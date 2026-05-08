// src/models/Message.ts
import mongoose, { Schema, Document } from 'mongoose';
import { MessageStatus, MessagePayload, MessageMetadata } from '../types';

export interface IMessage extends Document {
  id: string;
  payload: MessagePayload;
  metadata: MessageMetadata;
  status: MessageStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      sourceSystemId: { type: String, required: true },
      destinationSystemId: { type: String },
      messageId: { type: String, required: true },
      timestamp: { type: Date, required: true, default: Date.now },
      retryCount: { type: Number, required: true, default: 0 },
      processingTime: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'retry', 'dead'],
      required: true,
      default: 'pending',
      index: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

MessageSchema.index({ 'metadata.sourceSystemId': 1, createdAt: -1 });
MessageSchema.index({ status: 1, createdAt: 1 });
MessageSchema.index({ 'metadata.destinationSystemId': 1, status: 1 });

export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema);