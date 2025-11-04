// Error handling middleware
import { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error('Unhandled error:', err);
  
  return res.status(500).json({
    error: {
      message: 'Internal server error',
    },
  });
};