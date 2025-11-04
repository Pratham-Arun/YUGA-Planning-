import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/auth';
import { validateRequest } from '../middleware/validate-request';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting middleware
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs for auth endpoints
});

// Validation middleware
const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('username').isLength({ min: 3, max: 50 }),
    validateRequest
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validateRequest
];

const resetPasswordValidation = [
    body('password').isLength({ min: 6 }),
    validateRequest
];

// Routes
router.post('/register', registerValidation, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username } = req.body;
        const user = await authService.register(email, password, username);
        res.status(201).json({ message: 'User registered successfully', userId: user._id });
    } catch (error) {
        next(error);
    }
});

router.post('/login', authLimiter, loginValidation, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await authService.login(email, password);
        res.json({
            message: 'Login successful',
            user: { id: user._id, email: user.email, username: user.username },
            tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const newAccessToken = await authService.refreshAccessToken(refreshToken);
        
        if (!newAccessToken) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password-request', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const resetToken = await authService.resetPasswordRequest(email);
        // In production, send this token via email
        res.json({ message: 'Password reset token generated', resetToken });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password/:token', resetPasswordValidation, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        await authService.resetPassword(token, password);
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };