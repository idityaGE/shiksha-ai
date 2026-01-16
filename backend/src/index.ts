import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { checkDatabaseConnection } from './db/supabase.ts';

// Import routes
import authRoutes from './routes/auth.routes.ts';
import profileRoutes from './routes/profile.routes.ts';
import tutorRoutes from './routes/tutor.routes.ts';
import quizRoutes from './routes/quiz.routes.ts';
import plannerRoutes from './routes/planner.routes.ts';
import statsRoutes from './routes/stats.routes.ts';

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseConnection();
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Shiksha-AI Backend API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/docs',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Shiksha-AI Backend Server');
  console.log('=================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});