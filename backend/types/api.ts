// API Types for YUGA Engine

// Common types
export type UUID = string;

// Auth types
export interface AuthToken {
  token: string;
  expires: number;
  refreshToken?: string;
}

// Project types
export interface Project {
  id: UUID;
  name: string;
  description: string;
  engine: 'unity' | 'bevy';
  userId: UUID;
  createdAt: number;
  updatedAt: number;
}

// AI Generation types
export type AITask = 'codegen' | 'artgen' | 'worldgen';
export type EngineType = 'unity' | 'bevy';
export type Language = 'csharp' | 'cpp' | 'rhai';
export type AIModel = 'gpt-4' | 'claude-3' | 'starcoder';
export type AssetQuality = 'low' | 'medium' | 'high';
export type ArtStyle = 'realistic' | 'stylized';

export interface ContextFile {
  path: string;
  snippet: string;
}

export interface GenerationOptions {
  assetQuality: AssetQuality;
  style: ArtStyle;
}

export interface AIGenerationRequest {
  userId: UUID;
  projectId: UUID;
  task: AITask;
  engine: EngineType;
  language: Language;
  prompt: string;
  model: AIModel;
  contextFiles: ContextFile[];
  options: GenerationOptions;
}

export interface Asset {
  name: string;
  url: string;
  type: 'texture' | '3dmodel' | 'animation' | 'audio';
}

export interface SceneEntity {
  name: string;
  prefab: string;
  position?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  components?: Record<string, unknown>;
}

export interface SceneSpec {
  entities: SceneEntity[];
}

export interface AIJobStatus {
  jobId: UUID;
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress?: number;
  explanation?: string;
  error?: string;
  diff?: string;
  assets?: Asset[];
  sceneSpec?: SceneSpec;
}

// Asset types
export interface AssetImportRequest {
  projectId: UUID;
  userId: UUID;
  assetPath: string;
  assetType: Asset['type'];
  metadata?: Record<string, unknown>;
}

// Compilation types
export interface CompileRequest {
  projectId: UUID;
  userId: UUID;
  engine: EngineType;
  target: 'windows' | 'mac' | 'linux' | 'web';
  debug?: boolean;
}

// Git types
export interface GitPushRequest {
  projectId: UUID;
  userId: UUID;
  branch?: string;
  message?: string;
}