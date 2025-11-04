import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AuthService } from '../services/auth';
import { User } from '../models/User';

describe('AuthService', () => {
    let mongod: MongoMemoryServer;
    let authService: AuthService;

    beforeEach(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        authService = new AuthService();
    });

    afterEach(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongod.stop();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser'
            };

            const user = await authService.register(
                userData.email,
                userData.password,
                userData.username
            );

            expect(user).toBeDefined();
            expect(user.email).toBe(userData.email);
            expect(user.username).toBe(userData.username);
            expect(user.password).not.toBe(userData.password); // Password should be hashed
        });

        it('should not register a user with existing email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser'
            };

            await authService.register(
                userData.email,
                userData.password,
                userData.username
            );

            await expect(
                authService.register(
                    userData.email,
                    'newpassword',
                    'newuser'
                )
            ).rejects.toThrow('Email already registered');
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            await authService.register(
                'test@example.com',
                'password123',
                'testuser'
            );
        });

        it('should login successfully with correct credentials', async () => {
            const result = await authService.login(
                'test@example.com',
                'password123'
            );

            expect(result.user).toBeDefined();
            expect(result.tokens).toBeDefined();
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it('should fail login with incorrect password', async () => {
            await expect(
                authService.login('test@example.com', 'wrongpassword')
            ).rejects.toThrow('Invalid credentials');
        });

        it('should fail login with non-existent email', async () => {
            await expect(
                authService.login('nonexistent@example.com', 'password123')
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('password reset', () => {
        let resetToken: string;

        beforeEach(async () => {
            await authService.register(
                'test@example.com',
                'password123',
                'testuser'
            );
            resetToken = await authService.resetPasswordRequest('test@example.com');
        });

        it('should generate reset token', async () => {
            expect(resetToken).toBeDefined();
        });

        it('should reset password with valid token', async () => {
            await authService.resetPassword(resetToken, 'newpassword123');
            const loginResult = await authService.login(
                'test@example.com',
                'newpassword123'
            );
            expect(loginResult.user).toBeDefined();
        });

        it('should not reset password with invalid token', async () => {
            await expect(
                authService.resetPassword('invalid-token', 'newpassword123')
            ).rejects.toThrow('Invalid or expired reset token');
        });
    });
});