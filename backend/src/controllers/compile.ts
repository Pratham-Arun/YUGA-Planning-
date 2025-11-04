import { Response } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { SandboxCompiler } from '../services/compilation/sandbox';
import { queueService } from '../services/queue';

const compiler = new SandboxCompiler(process.cwd());

export const compileController = {
  async compileProject(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const { files, config } = req.body;

    try {
      const jobId = await queueService.addCompileJob({
        projectId,
        files,
        config,
      });

      res.json({
        jobId,
        status: 'queued',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async getCompileStatus(req: AuthenticatedRequest, res: Response) {
    const { projectId, jobId } = req.params;

    try {
      const status = await queueService.getJobStatus(jobId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async getCompileLogs(req: AuthenticatedRequest, res: Response) {
    const { projectId, jobId } = req.params;

    try {
      const logs = await queueService.getJobLogs(jobId);
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
};