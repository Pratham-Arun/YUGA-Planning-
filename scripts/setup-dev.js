// Setup development environment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure .env exists
if (!fs.existsSync('.env')) {
  console.log('Creating .env from .env.example...');
  fs.copyFileSync('.env.example', '.env');
}

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

// Build types
console.log('Building TypeScript types...');
execSync('npm run build:types', { stdio: 'inherit' });

// Start Docker services
console.log('Starting Docker services...');
execSync('docker-compose -f docker/docker-compose.yml up -d', { stdio: 'inherit' });

// Wait for services to be ready
console.log('Waiting for services to be ready...');
setTimeout(() => {
  // Run database migrations
  console.log('Running database migrations...');
  execSync('npm run migrate', { stdio: 'inherit' });

  console.log('\nDevelopment environment is ready!');
  console.log('\nYou can now run:');
  console.log('npm run dev     - Start development server');
  console.log('npm run build   - Build for production');
  console.log('npm run test    - Run tests');
}, 5000);