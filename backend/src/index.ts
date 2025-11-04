import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { initDb } from './db';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  await initDb();

  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);

  app.get('/', (_req, res) => res.json({ ok: true, name: 'yuga-backend' }));

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
})();
