// src/controllers/message.controller.ts
import { Request, Response } from 'express';
import { MessageModel } from '../models/Message';
import { AppError } from '../middlewares/error.middleware';
import { MessageStatus, MessageQueryFilters, PaginatedResponse, StatisticsResponse } from '../types';

export class MessageController {
  public async getMessages(
    req: Request<
      {},
      {},
      {},
      {
        limit?: string;
        offset?: string;
        status?: MessageStatus;
        sourceSystemId?: string;
        destinationSystemId?: string;
        fromDate?: string;
        toDate?: string;
      }
    >,
    res: Response<PaginatedResponse<any>>
  ): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit || '50'), 100);
    const offset = parseInt(req.query.offset || '0');
    
    const query: MessageQueryFilters = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.sourceSystemId) {
      query['metadata.sourceSystemId'] = req.query.sourceSystemId;
    }
    
    if (req.query.destinationSystemId) {
      query['metadata.destinationSystemId'] = req.query.destinationSystemId;
    }
    
    // Construction typée du filtre de dates
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    
    if (req.query.fromDate) {
      const fromDate = new Date(req.query.fromDate);
      if (!isNaN(fromDate.getTime())) {
        dateFilter.$gte = fromDate;
      }
    }
    
    if (req.query.toDate) {
      const toDate = new Date(req.query.toDate);
      if (!isNaN(toDate.getTime())) {
        dateFilter.$lte = toDate;
      }
    }
    
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    const [messages, total] = await Promise.all([
      MessageModel.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      MessageModel.countDocuments(query),
    ]);

    const response: PaginatedResponse<any> = {
      data: messages,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };

    res.json(response);
  }

  public async getMessageById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const message = await MessageModel.findOne({ id });

    if (!message) {
      throw new AppError('MESSAGE_NOT_FOUND', `Message ${id} not found`, 404);
    }

    res.json(message);
  }

  public async getDeadLetterMessages(
    req: Request<
      {},
      {},
      {},
      { limit?: string; offset?: string }
    >,
    res: Response<PaginatedResponse<any>>
  ): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit || '50'), 100);
    const offset = parseInt(req.query.offset || '0');

    const [messages, total] = await Promise.all([
      MessageModel.find({ status: 'dead' })
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit),
      MessageModel.countDocuments({ status: 'dead' }),
    ]);

    const response: PaginatedResponse<any> = {
      data: messages,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };

    res.json(response);
  }

  public async getStatistics(
    _req: Request,
    res: Response<StatisticsResponse>
  ): Promise<void> {
    const [
      totalMessages,
      successCount,
      failedCount,
      pendingCount,
      processingCount,
      deadCount,
    ] = await Promise.all([
      MessageModel.countDocuments(),
      MessageModel.countDocuments({ status: 'success' }),
      MessageModel.countDocuments({ status: 'failed' }),
      MessageModel.countDocuments({ status: 'pending' }),
      MessageModel.countDocuments({ status: 'processing' }),
      MessageModel.countDocuments({ status: 'dead' }),
    ]);

    // Get last 24 hours activity
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    
    const messagesLast24h = await MessageModel.countDocuments({
      createdAt: { $gte: last24h },
    });

    // Get success rate for last 24h
    const successLast24h = await MessageModel.countDocuments({
      createdAt: { $gte: last24h },
      status: 'success',
    });

    // Get average processing time
    const processingTimeAggregation = await MessageModel.aggregate([
      {
        $match: {
          'metadata.processingTime': { $exists: true, $ne: null },
          status: 'success',
        },
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$metadata.processingTime' },
          minProcessingTime: { $min: '$metadata.processingTime' },
          maxProcessingTime: { $max: '$metadata.processingTime' },
        },
      },
    ]);

    const avgProcessingTime = processingTimeAggregation[0]?.avgProcessingTime || 0;

    const response: StatisticsResponse = {
      total: totalMessages,
      byStatus: {
        success: successCount,
        failed: failedCount,
        pending: pendingCount,
        processing: processingCount,
        dead: deadCount,
      },
      last24h: {
        total: messagesLast24h,
        success: successLast24h,
        successRate: messagesLast24h > 0 ? (successLast24h / messagesLast24h) * 100 : 0,
      },
      performance: {
        avgProcessingTimeMs: Math.round(avgProcessingTime),
        minProcessingTimeMs: processingTimeAggregation[0]?.minProcessingTime || 0,
        maxProcessingTimeMs: processingTimeAggregation[0]?.maxProcessingTime || 0,
      },
      overallSuccessRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
    };

    res.json(response);
  }
}