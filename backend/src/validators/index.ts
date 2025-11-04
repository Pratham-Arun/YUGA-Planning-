// Project validation schemas
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { APIError } from '../middleware/error';

// Project schema
const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  engine: z.enum(['unity', 'bevy']),
});

// AI Generation schema
const aiGenerationSchema = z.object({
  projectId: z.string().uuid(),
  task: z.enum(['codegen', 'artgen', 'worldgen']),
  engine: z.enum(['unity', 'bevy']),
  language: z.enum(['csharp', 'cpp', 'rhai']),
  prompt: z.string().min(1).max(2000),
  model: z.enum(['gpt-4', 'claude-3', 'starcoder']),
  contextFiles: z.array(z.object({
    path: z.string(),
    snippet: z.string(),
  })).optional(),
  options: z.object({
    assetQuality: z.enum(['low', 'medium', 'high']).optional(),
    style: z.enum(['realistic', 'stylized']).optional(),
  }).optional(),
});

// Asset import schema
const assetImportSchema = z.object({
  projectId: z.string().uuid(),
  assetPath: z.string(),
  assetType: z.enum(['texture', '3dmodel', 'animation', 'audio']),
  metadata: z.record(z.unknown()).optional(),
});

// Validation middleware factory
const validateSchema = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, 'Validation failed', error.issues);
      }
      next(error);
    }
  };
};

// Export validators
export const projectValidator = validateSchema(projectSchema);
export const aiGenerationValidator = validateSchema(aiGenerationSchema);
export const assetImportValidator = validateSchema(assetImportSchema);