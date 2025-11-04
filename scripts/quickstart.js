#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const steps = [
  {
    name: 'Install Dependencies',
    command: 'npm install',
  },
  {
    name: 'Setup Environment',
    action: () => {
      if (!fs.existsSync('.env')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('Created .env file from template');
      }
    },
  },
  {
    name: 'Start Docker Services',
    command: 'docker-compose up -d',
  },
  {
    name: 'Build Frontend',
    command: 'npm run build',
  },
  {
    name: 'Start Development Servers',
    command: 'npm run dev',
  },
];

async function runSetup() {
  console.log('🚀 Setting up YUGA development environment...\n');

  for (const step of steps) {
    console.log(`📦 ${step.name}...`);
    
    try {
      if (step.command) {
        execSync(step.command, { stdio: 'inherit' });
      } else if (step.action) {
        await step.action();
      }
      console.log(`✅ ${step.name} completed\n`);
    } catch (error) {
      console.error(`❌ ${step.name} failed:`, error);
      process.exit(1);
    }
  }

  console.log(`
🎉 Setup complete! Get started with:

1. Open Unity and import the YUGA plugin
2. Configure your environment variables in .env
3. Start coding!

Documentation: /docs/development/
API Docs: http://localhost:3000/api-docs
`);
}

runSetup().catch(console.error);