// src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Database from './config/database';
import { errorHandler } from './middlewares/error.middleware';
import { registerRoutes } from './routes';
import logger from './utils/logger';

dotenv.config();

class Application {
  public app: Express;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // ✅ Configuration CORS complète pour résoudre les problèmes
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Origines autorisées
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://client:3000',
          'http://esb-client:3000',
        ];
        
        // En développement, accepter toutes les origines
        if (process.env.NODE_ENV === 'development' || !origin) {
          callback(null, true);
          return;
        }
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(null, true); // Temporaire pour debug
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
      ],
      exposedHeaders: ['Content-Length', 'X-Request-Id'],
      maxAge: 86400,
      optionsSuccessStatus: 200,
    };

    // Appliquer CORS avant tout
    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));
    
    // Security (avec configuration CORS compatible)
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "unsafe-none" },
      crossOriginEmbedderPolicy: false,
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP',
      skipSuccessfulRequests: true,
    });
    this.app.use(limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging CORS pour debug
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        origin: req.get('origin'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        database: Database.getConnectionStatus(),
      });
    });

    // ✅ Utiliser registerRoutes pour toutes les routes API
    registerRoutes(this.app);
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
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
      
      const port = parseInt(process.env.PORT || '5000');
      this.app.listen(port, () => {
        logger.info(`🚀 Hub Integration API running on port ${port}`);
        logger.info(`📊 API available at http://localhost:${port}/api/v1`);
        logger.info(`❤️  Health check: http://localhost:${port}/health`);
        logger.info(`🌐 CORS enabled for http://localhost:3000`);
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