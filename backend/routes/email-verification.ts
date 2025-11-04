const { Router } = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const { validateRequest } = require('../middleware/validate-request');
const { EmailService } = require('../services/email');
const Database = require('better-sqlite3');
const path = require('path');

const router = Router();
const db = new Database(path.join(__dirname, '..', 'data', 'yuga.db'));
const emailService = new EmailService(db);

// Request email verification
router.post('/request-verification', 
    [body('email').isEmail()],
    validateRequest,
    async (req: Request, res: Response) => {
        const { email } = req.body;
        const user = db.prepare('SELECT id, verified FROM users WHERE email = ?').get(email) as { id: string; verified: number } | undefined;

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        await emailService.sendVerificationEmail(user.id, email);
        res.json({ message: 'Verification email sent' });
    }
);

// Verify email with token
router.post('/verify-email',
    [body('token').isString()],
    validateRequest,
    async (req: Request, res: Response) => {
        const { token } = req.body;
        const verified = await emailService.verifyEmail(token);

        if (!verified) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        res.json({ message: 'Email verified successfully' });
    }
);

// Request password reset
router.post('/forgot-password',
    [body('email').isEmail()],
    validateRequest,
    async (req: Request, res: Response) => {
        const { email } = req.body;
        const token = await emailService.sendPasswordResetEmail(email);

        // Don't reveal if email exists
        res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }
);

// Reset password with token
router.post('/reset-password',
    [
        body('token').isString(),
        body('newPassword').isString().isLength({ min: 8 })
    ],
    validateRequest,
    async (req: Request, res: Response) => {
        const { token, newPassword } = req.body;
        const userId = await emailService.validatePasswordResetToken(token);

        if (!userId) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        db.prepare('UPDATE users SET password = ? WHERE id = ?')
            .run(hashedPassword, userId);

        emailService.deletePasswordResetToken(token);
        res.json({ message: 'Password reset successful' });
    }
);

export default router;