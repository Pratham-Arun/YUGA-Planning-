import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface GenerateCodeRequest {
  prompt: string;
  projectId: string;
  context?: {
    files?: string[];
    scene?: string;
  };
}

export interface GenerateCodeResponse {
  success: boolean;
  data: {
    files: {
      path: string;
      content: string;
      type: 'create' | 'modify';
    }[];
    explanation: string;
  };
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}