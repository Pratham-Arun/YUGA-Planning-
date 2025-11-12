import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import aiRoutes from './routes/ai.routes.js';
import projectRoutes, { initializeDatabase } from './routes/project.routes.js';
import unityRoutes from './routes/unity.routes.js';
import memoryRoutes from './routes/memory.routes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimiter, aiRateLimiter } from './middleware/rateLimiter.js';
import { optionalAuth } from './middleware/auth.js';

// Import services
import modelRouter from './services/modelRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.YUGA_DB || path.join(process.cwd(), 'yuga.db');

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(optionalAuth); // Add user context if authenticated

// Apply rate limiting to all routes
app.use(rateLimiter);

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'YUGA Engine API',
    version: '2.0.0',
    status: 'operational',
    documentation: 'https://github.com/Pratham-Arun/YUGA-Yielding-Unified-Game-Automation',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      ai: '/api/ai',
      unity: '/api/unity',
      memory: '/api/memory',
      stats: '/api/stats/models'
    },
    features: [
      'AI Code Generation',
      'Smart Model Routing',
      'Context-Aware Generation (RAG)',
      'Asset Generation',
      'Code Validation',
      'Rate Limiting',
      'Performance Tracking'
    ]
  });
});

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Initialize database
initializeDatabase(DB_PATH);

// Mount routes
app.use('/api/projects', projectRoutes);
app.use('/api/unity', unityRoutes);
app.use('/api/memory', memoryRoutes);

// AI routes with stricter rate limiting
app.use('/api/ai', aiRateLimiter, aiRoutes);

// Model router stats endpoint
app.get('/api/stats/models', (req, res) => {
  const stats = modelRouter.getAllStats();
  res.json(stats);
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 YUGA API Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`💾 Database: ${DB_PATH}`);
  console.log(`\n🤖 AI Models configured:`);
  console.log(`  - OpenAI:    ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Google:    ${process.env.GOOGLE_API_KEY ? '✓' : '✗'}`);
  console.log(`\n📊 Features:`);
  console.log(`  - Rate Limiting: ✓ (60 req/min, 10 AI req/min)`);
  console.log(`  - Error Handling: ✓`);
  console.log(`  - Model Routing: ✓`);
  console.log(`  - Caching: ✓`);
  console.log(`  - Vector DB (RAG): ✓`);
  console.log(`  - Asset Pipeline: ✓`);
  console.log(`  - Code Sandbox: ✓`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

export default app;
