# Day 2: Backend Foundation

## 1. Backend Structure
```bash
/backend
  /src
    /controllers     # Request handlers
      ai.controller.ts
      project.controller.ts
      auth.controller.ts
    /services       # Business logic
      ai.service.ts
      project.service.ts
      auth.service.ts
    /routes         # API routes
      ai.routes.ts
      project.routes.ts
      auth.routes.ts
    /models         # Data models
      Project.ts
      User.ts
    /types          # TypeScript types
    /utils          # Utilities
    app.ts          # Express app
    server.ts       # Server entry
```

## 2. API Setup Tasks
- Initialize Express + TypeScript
- Set up middleware:
  - CORS
  - Body Parser
  - Authentication
  - Error Handling
- Create basic route structure
- Add mock AI generation endpoint

## 3. Mock Endpoints
```typescript
// Example mock response structure
{
  success: true,
  data: {
    files: [
      {
        path: "Assets/Scripts/Player.cs",
        content: "...",
        type: "create" | "modify"
      }
    ],
    explanation: "Created player movement script..."
  }
}
```

## 4. Development Tools
- Set up nodemon for development
- Configure TypeScript paths
- Add test framework
- Create basic API tests

## 5. Documentation
- Add API documentation
- Create Postman collection
- Document environment setup