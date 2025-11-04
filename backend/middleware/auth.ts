import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/error';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
            };
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        throw createError('Authentication required', 401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };
        next();
    } catch (error) {
        throw createError('Invalid token', 401);
    }
};