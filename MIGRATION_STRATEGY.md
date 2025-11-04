# YUGA Engine Migration Strategy

## Track 1: Web-First Prototype

### Current Stack
- Frontend: React + Three.js
- Backend: Node.js + Express
- Storage: SQLite → Supabase
- AI: OpenAI + Vector DB

### Core Features
1. Code Generation
   - Web-based Monaco editor
   - AI-assisted completion
   - Project file management

2. Scene Composition
   - Three.js scene editor
   - Basic transforms and components
   - Scene serialization

3. Asset Generation
   - DALL-E integration
   - Basic 3D model import
   - Material editor

4. Project Management
   - Project CRUD
   - Asset organization
   - Version control

## Track 2: Native Engine Migration

### Target Stack
- Core Engine: Rust
- Editor: Unity Plugin
- Build System: Docker
- Storage: Hybrid (local + cloud)

### Migration Strategy

1. Modular Architecture
   - Keep AI services platform-agnostic
   - Use REST APIs for all operations
   - Implement plugin system early

2. Phase 1: Plugin Bridge
   - Create Unity plugin that works with web services
   - Mirror web functionality in native UI
   - Maintain compatibility with Track 1

3. Phase 2: Core Services
   - Migrate services to Rust one by one
   - Add native compilation support
   - Keep web interface as alternative

4. Phase 3: Full Native
   - Complete Unity editor integration
   - Optional web interface for quick edits
   - Full offline support

### Compatibility Layer
```typescript
// Plugin interface that works with both tracks
interface IYugaPlugin {
  // Core operations
  generateCode(prompt: string): Promise<string>;
  generateAsset(prompt: string): Promise<Asset>;
  composeScene(spec: SceneSpec): Promise<Scene>;
  
  // Track-specific implementations
  useNativeCompilation?: boolean;
  preferredInterface?: 'web' | 'native';
  
  // Migration helpers
  exportToNative(): Promise<void>;
  importFromWeb(): Promise<void>;
}
```

### Timeline
1. Track 1: 2-3 months
   - Focus on core features
   - Build user base
   - Gather requirements

2. Track 2: 6-12 months
   - Gradual migration
   - Maintain both versions
   - Phase out web-only features

### Decision Points
- User base growth
- Performance requirements
- Resource availability
- Community feedback