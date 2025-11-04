const nodemailer = require('nodemailer');
const { randomBytes } = require('crypto');
const Database = require('better-sqlite3');

class EmailService {
    constructor(db) {
        this.db = db;
        this.from = process.env.EMAIL_FROM || 'noreply@yuga.dev';
        this.db = db;
        this.from = process.env.EMAIL_FROM || 'noreply@yuga.dev';

        // Initialize email tables
        this.initTables();

        // Setup nodemailer
        if (process.env.NODE_ENV === 'production') {
            // Production SMTP config
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        } else {
            // Development "ethereal.email" setup
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: 'ethereal.user@ethereal.email',
                    pass: 'ethereal.pass'
                }
            });
        }
    }

    private initTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            -- Add verified column to users if not exists
            PRAGMA table_info(users);
        `);

        // Check if verified column exists
        const columns = this.db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
        if (!columns.find(col => col.name === 'verified')) {
            this.db.exec('ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0');
        }
    }

    async sendVerificationEmail(userId: string, email: string): Promise<string> {
        const token = randomBytes(32).toString('hex');
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

        this.db.prepare(`
            INSERT INTO email_verification_tokens (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `).run(token, userId, expiresAt, now);

        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        await this.transporter.sendMail({
            from: this.from,
            to: email,
            subject: 'Verify your YUGA account',
            text: `Please verify your email by clicking: ${verifyUrl}`,
            html: `
                <h3>Welcome to YUGA!</h3>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="${verifyUrl}">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
            `
        });

        return token;
    }

    async verifyEmail(token: string): Promise<boolean> {
        const verification = this.db.prepare(`
            SELECT user_id, expires_at 
            FROM email_verification_tokens 
            WHERE token = ?
        `).get(token) as { user_id: string; expires_at: number } | undefined;

        if (!verification || verification.expires_at < Date.now()) {
            return false;
        }

        this.db.prepare('UPDATE users SET verified = 1 WHERE id = ?')
            .run(verification.user_id);
        
        this.db.prepare('DELETE FROM email_verification_tokens WHERE token = ?')
            .run(token);

        return true;
    }

    async sendPasswordResetEmail(email: string): Promise<string | null> {
        const user = this.db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as { id: string; email: string } | undefined;
        if (!user) return null;

        const token = randomBytes(32).toString('hex');
        const now = Date.now();
        const expiresAt = now + (1 * 60 * 60 * 1000); // 1 hour

        this.db.prepare(`
            INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `).run(token, user.id, expiresAt, now);

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await this.transporter.sendMail({
            from: this.from,
            to: email,
            subject: 'Reset your YUGA password',
            text: `Reset your password by clicking: ${resetUrl}`,
            html: `
                <h3>Password Reset Request</h3>
                <p>Someone requested a password reset for your YUGA account.</p>
                <p>If this was you, click the link below to reset your password:</p>
                <p><a href="${resetUrl}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        return token;
    }

    async validatePasswordResetToken(token: string): Promise<string | null> {
        const reset = this.db.prepare(`
            SELECT user_id, expires_at 
            FROM password_reset_tokens 
            WHERE token = ?
        `).get(token) as { user_id: string; expires_at: number } | undefined;

        if (!reset || reset.expires_at < Date.now()) {
            return null;
        }

        return reset.user_id;
    }

    deletePasswordResetToken(token: string): void {
        this.db.prepare('DELETE FROM password_reset_tokens WHERE token = ?')
            .run(token);
    }
}