import request from 'supertest';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { router as authRouter } from '../routes/auth';

describe('Auth Endpoints', () => {
    let app: express.Application;
    let db: Database.Database;
    
    beforeAll(() => {
        // Create in-memory SQLite database for testing
        db = new Database(':memory:');
        
        // Setup express app
        app = express();
        app.use(cors());
        app.use(express.json());
        
        // Make db available to routes
        app.locals.db = db;
        
        // Add auth routes
        app.use('/api/auth', authRouter);
        
        // Init tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                display_name TEXT,
                google_id TEXT UNIQUE,
                github_id TEXT UNIQUE,
                picture_url TEXT,
                created_at INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(owner_id) REFERENCES users(id)
            );
        `);
    });
    
    afterAll(() => {
        db.close();
    });
    
    beforeEach(() => {
        db.exec('DELETE FROM users');
        db.exec('DELETE FROM projects');
    });
    
    describe('POST /api/auth/register', () => {
        it('should create a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    displayName: 'Test User'
                });
            
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('test@example.com');
            expect(res.body.user.displayName).toBe('Test User');
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            
            // Verify user was created in DB
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');
            expect(user).toBeTruthy();
            expect(user.email).toBe('test@example.com');
            expect(user.display_name).toBe('Test User');
        });
        
        it('should not allow duplicate emails', async () => {
            // Create first user
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });
            
            // Try to create duplicate
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'different123'
                });
            
            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Email already registered');
        });
    });
    
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create test user
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    displayName: 'Test User'
                });
        });
        
        it('should login with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('test@example.com');
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });
        
        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrong123'
                });
            
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });
        
        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });
            
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });
    });
    
    describe('GET /api/auth/me', () => {
        let token: string;
        
        beforeEach(async () => {
            // Create and login test user
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    displayName: 'Test User'
                });
            
            token = res.body.accessToken;
        });
        
        it('should return user profile when authenticated', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body).toHaveProperty('displayName', 'Test User');
        });
        
        it('should reject requests without token', async () => {
            const res = await request(app)
                .get('/api/auth/me');
            
            expect(res.status).toBe(401);
        });
        
        it('should reject invalid tokens', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token.here');
            
            expect(res.status).toBe(403);
        });
    });
});