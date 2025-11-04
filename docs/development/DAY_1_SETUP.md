# Day 1: Project Structure & Frontend Setup

## 1. Create Project Structure
```bash
/YUGA
  /src
    /components      # React components
    /pages          # Page components
    /hooks          # Custom React hooks  
    /services       # API services
    /styles         # Global styles
    /types          # TypeScript types
  /backend
    /src            # Backend source
    /api            # API routes  
    /services       # Business logic
    /models         # Data models
  /unity-plugin     # Unity Editor plugin
    /Editor         # Unity editor scripts
    /Runtime        # Runtime scripts
  /docs            # Documentation
```

## 2. Frontend Setup Tasks
- Initialize Vite + React project
- Install key dependencies:
  - Monaco Editor
  - TailwindCSS
  - React Router
  - Supabase Client
- Create base layout components
- Set up basic routing

## 3. Initial Components
- Create AppLayout component
- Build basic dashboard structure 
- Add Monaco editor component
- Create prompt input interface

## 4. Configuration
- Set up TypeScript config
- Configure Vite
- Add ESLint + Prettier
- Create environment configs

## 5. Git Setup
- Initialize repository
- Create .gitignore
- Set up branch protection
- Configure GitHub Actions