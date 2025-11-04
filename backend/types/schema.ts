export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  engine: 'unity' | 'bevy';
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
};

export type AIJobTask = 'codegen' | 'artgen' | 'worldgen';
export type AIModel = 'gpt-4' | 'claude-3' | 'starcoder';
export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type AIJob = {
  id: string;
  project_id: string;
  user_id: string;
  task: AIJobTask;
  model: AIModel;
  prompt: string;
  request: Record<string, any>;
  response?: Record<string, any>;
  status: AIJobStatus;
  error?: string;
  created_at: string;
  updated_at: string;
};

export type AssetType = 'texture' | '3dmodel' | 'animation' | 'audio';

export type Asset = {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: AssetType;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
};

export type VectorStore = {
  id: string;
  project_id: string;
  file_path: string;
  cursor?: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Database = {
  projects: Project[];
  ai_jobs: AIJob[];
  assets: Asset[];
  vector_store: VectorStore[];
};