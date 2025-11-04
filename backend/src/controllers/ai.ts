// AI Controller implementation
import { Request, Response } from 'express';
import { LangChain } from 'langchain';
import { AIService } from '../services/ai';
import { AIGenerationRequest, AIJobStatus } from '../types/api';
import { APIError } from '../middleware/error';

export class AIController {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  generate = async (req: Request, res: Response) => {
    const request: AIGenerationRequest = req.body;
    
    if (!req.user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Validate user has access to project
    await this.aiService.validateProjectAccess(request.projectId, req.user.id);

    // Start generation job
    const jobId = await this.aiService.startGenerationJob(request);

    res.json({
      jobId,
      status: 'pending',
    });
  };

  getJobStatus = async (req: Request, res: Response) => {
    const { jobId } = req.params;

    if (!req.user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get job status
    const status: AIJobStatus = await this.aiService.getJobStatus(jobId);

    res.json(status);
  };

  debug = async (req: Request, res: Response) => {
    const { jobId, logs } = req.body;

    if (!req.user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Process debug logs and get fix
    const fix = await this.aiService.processDebugLogs(jobId, logs);

    res.json({
      jobId,
      fix,
    });
  };
}