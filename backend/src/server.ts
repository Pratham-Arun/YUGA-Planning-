// Main Express app configuration
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { aiRouter } from './routes/ai';
import { assetsRouter } from './routes/assets';
import { compileRouter } from './routes/compile';
import { gitRouter } from './routes/git';
import { errorHandler } from './middleware/error';
import { notFound } from './middleware/notFound';

// Load environment variables
config();

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/compile', compileRouter);
app.use('/api/v1/git', gitRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});