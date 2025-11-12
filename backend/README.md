# YUGA Backend - Modular Architecture

Refactored backend with clean separation of concerns, middleware, and services.

## Architecture Overview

```
backend/
├── server.js                 # Legacy monolithic server (deprecated)
├── server-refactored.js      # New modular server (recommended)
├── routes/                   # API route handlers
│   ├── ai.routes.js         # AI generation endpoints
│   ├── project.routes.js    # Project CRUD operations
│   └── unity.routes.js      # Unity integration endpoints
├── services/                 # Business logic
│   ├── modelRouter.js       # Smart AI model selection
│   ├── enhancedAI.js        # Advanced AI features
│   └── projectAnalyzer.js   # Code analysis
├── middleware/               # Express middleware
│   ├── auth.js              # Authentication (JWT)
│   ├── rateLimiter.js       # Rate limiting
│   └── errorHandler.js      # Error handling
└── config/                   # Configuration files
    └── models.config.js     # AI model settings
```

## Features

### ✅ Modular Route Structure
- Separated routes by domain (AI, Projects, Unity)
- Easy to maintain and test
- Clear API organization

### ✅ Smart Model Routing
- Automatic complexity analysis
- Cost-based model selection
- Performance tracking
- Response caching

### ✅ Rate Limiting
- General API: 60 requests/minute
- AI endpoints: 10 requests/minute
- Per-IP tracking
- Graceful error messages

### ✅ Error Handling
- Global error handler
- Consistent error responses
- Detailed error logging
- 404 handler for undefined routes

### ✅ Authentication (Planned)
- JWT-based authentication
- API key support for Unity plugin
- Role-based access control
- OAuth integration ready

## API Endpoints

### Health Check
```
GET /health
Response: { ok: true, timestamp: "...", version: "2.0.0" }
```

### Projects
```
GET    /api/projects          # List all projects
GET    /api/projects/:id      # Get project by ID
POST   /api/projects          # Create/update project
DELETE /api/projects/:id      # Delete project
```

### AI Generation
```
POST /api/ai/generate-code    # Generate code from prompt
POST /api/ai/debug            # Debug errors
POST /api/ai/generate-asset   # Generate assets (planned)
```

### Unity Integration
```
POST /api/unity/sync          # Sync scripts to Unity
GET  /api/unity/status        # Check Unity connection
GET  /api/unity/project-info  # Get Unity project info
```

### Statistics
```
GET /api/stats/models         # Get model performance stats
```

## Model Router

The `modelRouter` service intelligently selects the best AI model based on:

- **Task complexity**: Analyzes prompt length and requirements
- **Cost constraints**: Respects budget preferences
- **Model availability**: Checks for API keys
- **Performance history**: Tracks success rates and response times

### Usage Example

```javascript
import modelRouter from './services/modelRouter.js';

// Analyze prompt complexity
const complexity = modelRouter.analyzeComplexity(prompt);
// Returns: 'simple', 'medium', or 'complex'

// Select best model
const model = modelRouter.selectBestModel('code', {
  complexity: 'medium',
  language: 'csharp',
  maxCost: 'high',
  preferLocal: false
});
// Returns: 'gpt-4', 'claude-3.5-sonnet', etc.

// Check cache
const cached = modelRouter.getCachedResponse(prompt, model);
if (cached) {
  return cached.response;
}

// Cache response
modelRouter.cacheResponse(prompt, model, response);

// Track performance
modelRouter.recordPerformance(model, {
  success: true,
  responseTime: 2500,
  cost: 0.05
});

// Get statistics
const stats = modelRouter.getAllStats();
```

## Rate Limiting

### General API Limits
- 60 requests per minute per IP
- Applies to all non-AI endpoints
- Headers included in response:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

### AI API Limits
- 10 requests per minute per IP
- Applies to `/api/ai/*` endpoints
- Stricter limits due to cost
- Headers included:
  - `X-AI-RateLimit-Limit`
  - `X-AI-RateLimit-Remaining`

### Rate Limit Response
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Maximum 60 requests per minute.",
  "retryAfter": 60
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2025-11-08T18:00:00.000Z"
}
```

### Error Types
- `400` - Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Authentication (Planned)

### JWT Authentication
```javascript
// Protect route with authentication
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
```

### API Key Authentication
```javascript
// For Unity plugin
router.post('/unity/generate', authenticateApiKey, (req, res) => {
  // req.apiKey available
});
```

## Migration from Legacy Server

### Step 1: Update Start Script
```json
// package.json
{
  "scripts": {
    "api": "node backend/server-refactored.js",
    "api:legacy": "node backend/server.js"
  }
}
```

### Step 2: Test New Server
```bash
npm run api
```

### Step 3: Verify Endpoints
```bash
# Health check
curl http://localhost:4000/health

# Generate code
curl -X POST http://localhost:4000/api/ai/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a player controller","language":"csharp"}'

# Get model stats
curl http://localhost:4000/api/stats/models
```

### Step 4: Update Frontend
No changes needed - API endpoints remain the same!

## Performance Optimizations

### Response Caching
- Identical prompts return cached responses
- 1-hour cache duration
- Reduces API costs
- Faster response times

### Model Performance Tracking
- Success/failure rates
- Average response times
- Total costs
- Helps optimize model selection

### Request Debouncing
- Prevents duplicate requests
- Reduces unnecessary API calls
- Improves user experience

## Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
YUGA_DB=./yuga.db

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Authentication (planned)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
AI_RATE_LIMIT_MAX_REQUESTS=10
```

## Development

### Run Development Server
```bash
npm run api
```

### Run with Auto-Reload
```bash
npm install -g nodemon
nodemon backend/server-refactored.js
```

### Debug Mode
```bash
DEBUG=* node backend/server-refactored.js
```

## Testing

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:4000/health

# Test rate limiting (run 61 times)
for i in {1..61}; do curl http://localhost:4000/health; done

# Test AI generation
curl -X POST http://localhost:4000/api/ai/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a cube","language":"csharp","model":"gpt-3.5-turbo"}'
```

### Automated Testing (Future)
```bash
npm test
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable authentication
- [ ] Configure CORS for production domain
- [ ] Set up Redis for rate limiting
- [ ] Enable HTTPS
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure logging (Winston, Pino)

### Deploy to Railway
```bash
railway up
```

### Deploy to Render
```yaml
# render.yaml
services:
  - type: web
    name: yuga-backend
    env: node
    buildCommand: npm install
    startCommand: node backend/server-refactored.js
```

## Monitoring

### Model Statistics
```bash
curl http://localhost:4000/api/stats/models
```

Response:
```json
{
  "gpt-4": {
    "totalRequests": 150,
    "successfulRequests": 148,
    "failedRequests": 2,
    "averageResponseTime": 3500,
    "totalCost": 7.50,
    "successRate": "98.67%"
  },
  "gpt-3.5-turbo": {
    "totalRequests": 300,
    "successfulRequests": 295,
    "failedRequests": 5,
    "averageResponseTime": 1200,
    "totalCost": 1.50,
    "successRate": "98.33%"
  }
}
```

## Future Enhancements

### Phase 3: Vector Database (RAG)
- ChromaDB or Pinecone integration
- Project context storage
- Semantic code search
- Context-aware generation

### Phase 4: Advanced Features
- WebSocket support for real-time updates
- Batch processing for multiple files
- Code validation sandbox
- Asset generation pipeline

### Phase 5: Enterprise Features
- Multi-tenancy support
- Team collaboration
- Usage analytics
- Custom model fine-tuning

## Contributing

1. Create feature branch
2. Add tests
3. Update documentation
4. Submit pull request

## License

MIT License - See LICENSE file

---

**Status**: ✅ Phase 2 Complete
**Version**: 2.0.0
**Last Updated**: November 8, 2025
