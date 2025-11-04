// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from './error';
import { UUID } from '../types/api';

// Extend Express Request type
declare module 'express' {
  interface Request {
    user?: {
      id: UUID;
      email: string;
    };
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new APIError(401, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: UUID;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    throw new APIError(401, 'Invalid token');
  }
};