import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { createError } from '../utils/error';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const SALT_ROUNDS = 10;

export class AuthService {
    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        return bcrypt.hash(password, salt);
    }

    async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    generateTokens(userId: string): { accessToken: string; refreshToken: string } {
        const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }

    async refreshAccessToken(refreshToken: string): Promise<string | null> {
        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
            const accessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '15m' });
            return accessToken;
        } catch (error) {
            return null;
        }
    }

    async register(email: string, password: string, username: string): Promise<User> {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw createError('Email already registered', 400);
        }

        const hashedPassword = await this.hashPassword(password);
        const user = new User({
            email,
            password: hashedPassword,
            username
        });

        await user.save();
        return user;
    }

    async login(email: string, password: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
        const user = await User.findOne({ email });
        if (!user) {
            throw createError('Invalid credentials', 401);
        }

        const isValidPassword = await this.comparePasswords(password, user.password);
        if (!isValidPassword) {
            throw createError('Invalid credentials', 401);
        }

        const tokens = this.generateTokens(user._id);
        return { user, tokens };
    }

    async resetPasswordRequest(email: string): Promise<string> {
        const user = await User.findOne({ email });
        if (!user) {
            throw createError('User not found', 404);
        }

        const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        return resetToken;
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw createError('Invalid or expired reset token', 400);
        }

        const hashedPassword = await this.hashPassword(newPassword);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
    }
}

export const authService = new AuthService();