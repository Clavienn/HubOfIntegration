// src/app.ts
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Database from './config/database';
import { authenticate } from './middlewares/auth.middleware';
import { errorHandler, AppError } from './middlewares/error.middleware';
import { validateIngestRequest, validateSystemConfig, validateRoute } from './middlewares/validation.middleware';
// import { IngestController } from './controllers/ingest.controller';
import { MessageController } from './controllers/message.controller';
import { SystemController } from './controllers/system.controller';
import { RouteController } from './controllers/route.controller';
import logger from './utils/logger';

dotenv.config();

class Application {
  public app: Express;
  private ingestController: IngestController;
  private messageController: MessageController;
  private systemController: SystemController;
  private routeController: RouteController;

  constructor() {
    this.app = express();
    this.ingestController = new IngestController();
    this.messageController = new MessageController();
    this.systemController = new SystemController();
    this.routeController = new RouteController();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
    });
    this.app.use(limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        database: Database.getConnectionStatus(),
      });
    });

    // Public routes (no auth required)
    this.app.get('/api/v1/systems', this.systemController.getSystems.bind(this.systemController));

    // Protected routes (auth required)
    this.app.post(
      '/api/v1/ingest',
      authenticate,
      validateIngestRequest,
      this.ingestController.ingest.bind(this.ingestController)
    );

    // Message routes
    this.app.get(
      '/api/v1/messages',
      authenticate,
      this.messageController.getMessages.bind(this.messageController)
    );
    
    this.app.get(
      '/api/v1/messages/:id',
      authenticate,
      this.messageController.getMessageById.bind(this.messageController)
    );
    
    this.app.get(
      '/api/v1/messages/:id/status',
      authenticate,
      this.ingestController.getMessageStatus.bind(this.ingestController)
    );
    
    this.app.post(
      '/api/v1/messages/:id/replay',
      authenticate,
      this.ingestController.replayMessage.bind(this.ingestController)
    );
    
    this.app.get(
      '/api/v1/dead-letter',
      authenticate,
      this.messageController.getDeadLetterMessages.bind(this.messageController)
    );
    
    this.app.get(
      '/api/v1/statistics',
      authenticate,
      this.messageController.getStatistics.bind(this.messageController)
    );

    // System management routes
    this.app.post(
      '/api/v1/systems',
      authenticate,
      validateSystemConfig,
      this.systemController.createSystem.bind(this.systemController)
    );
    
    this.app.get(
      '/api/v1/systems/:id',
      authenticate,
      this.systemController.getSystemById.bind(this.systemController)
    );
    
    this.app.put(
      '/api/v1/systems/:id',
      authenticate,
      validateSystemConfig,
      this.systemController.updateSystem.bind(this.systemController)
    );
    
    this.app.delete(
      '/api/v1/systems/:id',
      authenticate,
      this.systemController.deleteSystem.bind(this.systemController)
    );
    
    this.app.post(
      '/api/v1/systems/:id/rotate-key',
      authenticate,
      this.systemController.rotateApiKey.bind(this.systemController)
    );
    
    this.app.post(
      '/api/v1/systems/:id/test-webhook',
      authenticate,
      this.systemController.testWebhook.bind(this.systemController)
    );

    // Route management routes
    this.app.post(
      '/api/v1/routes',
      authenticate,
      validateRoute,
      this.routeController.createRoute.bind(this.routeController)
    );
    
    this.app.get(
      '/api/v1/routes',
      authenticate,
      this.routeController.getRoutes.bind(this.routeController)
    );
    
    this.app.get(
      '/api/v1/routes/:id',
      authenticate,
      this.routeController.getRouteById.bind(this.routeController)
    );
    
    this.app.put(
      '/api/v1/routes/:id',
      authenticate,
      this.routeController.updateRoute.bind(this.routeController)
    );
    
    this.app.delete(
      '/api/v1/routes/:id',
      authenticate,
      this.routeController.deleteRoute.bind(this.routeController)
    );
    
    this.app.post(
      '/api/v1/routes/:id/enable',
      authenticate,
      this.routeController.enableRoute.bind(this.routeController)
    );
    
    this.app.post(
      '/api/v1/routes/:id/disable',
      authenticate,
      this.routeController.disableRoute.bind(this.routeController)
    );
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date(),
        path: req.path,
      });
    });
    
    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await Database.connect();
      
      const port = parseInt(process.env.PORT || '3000');
      this.app.listen(port, () => {
        logger.info(`🚀 Hub Integration API running on port ${port}`);
        logger.info(`📊 Dashboard available at http://localhost:${port}/api/v1`);
        logger.info(`❤️  Health check: http://localhost:${port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

const application = new Application();
application.start().catch(console.error);

export default application;