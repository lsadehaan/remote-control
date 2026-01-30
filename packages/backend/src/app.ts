import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { authRouter } from './routes/auth.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { templateRouter } from './routes/template.routes.js';
import { credentialRouter } from './routes/credential.routes.js';

export const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/templates', templateRouter);
app.use('/api/credentials', credentialRouter);

// Error handler
app.use(errorHandler);
