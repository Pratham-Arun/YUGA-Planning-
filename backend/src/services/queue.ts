// Job queue system using Bull
import Queue from 'bull';
import { AIGenerationRequest, AIJobStatus, UUID } from '../types/api';
import { AIService } from './ai';

// Queue types
type JobData = {
  request: AIGenerationRequest;
  userId: UUID;
};

type JobResult = {
  status: AIJobStatus['status'];
  explanation?: string;
  error?: string;
  diff?: string;
  assets?: AIJobStatus['assets'];
  sceneSpec?: AIJobStatus['sceneSpec'];
};

export class JobQueueService {
  private generationQueue: Queue.Queue<JobData>;
  private aiService: AIService;

  constructor() {
    // Create Bull queue with Redis
    this.generationQueue = new Queue('ai-generation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
      },
    });

    this.aiService = new AIService();

    // Process jobs
    this.generationQueue.process(async (job) => {
      const { request, userId } = job.data;
      
      try {
        // Update job progress
        job.progress(10);

        // Get relevant context
        const context = await this.aiService.getContext(request);
        job.progress(30);

        // Generate content based on task
        const result = await this.processGeneration(request, context);
        job.progress(90);

        // Store result
        await this.storeResult(job.id.toString(), result);
        job.progress(100);

        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    });

    // Handle failed jobs
    this.generationQueue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, error);
    });
  }

  async addJob(request: AIGenerationRequest, userId: UUID): Promise<string> {
    const job = await this.generationQueue.add({
      request,
      userId,
    });

    return job.id.toString();
  }

  async getJobStatus(jobId: string): Promise<AIJobStatus> {
    const job = await this.generationQueue.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    const status = await job.getState();
    const progress = await job.progress();
    const result = job.returnvalue as JobResult | undefined;

    return {
      jobId,
      status: this.mapBullStateToJobStatus(status),
      progress,
      ...(result || {}),
    };
  }

  private async processGeneration(
    request: AIGenerationRequest,
    context: any
  ): Promise<JobResult> {
    switch (request.task) {
      case 'codegen':
        return this.aiService.generateCode(request, context);
      case 'artgen':
        return this.aiService.generateArt(request, context);
      case 'worldgen':
        return this.aiService.generateWorld(request, context);
      default:
        throw new Error(`Unknown task type: ${request.task}`);
    }
  }

  private async storeResult(jobId: string, result: JobResult) {
    // TODO: Store result in database if needed
  }

  private mapBullStateToJobStatus(
    state: string
  ): AIJobStatus['status'] {
    switch (state) {
      case 'completed':
        return 'done';
      case 'failed':
        return 'failed';
      default:
        return 'processing';
    }
  }
}