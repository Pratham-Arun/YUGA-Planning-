// Load environment variables for tests
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Set test-specific env vars
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';