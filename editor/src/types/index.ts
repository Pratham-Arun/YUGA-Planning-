// Common types used across the application
export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt: string;
}

export interface User extends BaseEntity {
    username: string;
    email: string;
    avatar?: string;
}

export interface Project extends BaseEntity {
    name: string;
    description?: string;
    owner: string;
    collaborators: string[];
    isPublic: boolean;
    thumbnail?: string;
    tags: string[];
    settings: ProjectSettings;
}

export interface ProjectSettings {
    defaultScene?: string;
    renderQuality: 'low' | 'medium' | 'high';
    autoSave: boolean;
    autoSaveInterval: number; // in minutes
}

export interface Scene extends BaseEntity {
    name: string;
    projectId: string;
    thumbnail?: string;
    isActive: boolean;
}

export interface Asset extends BaseEntity {
    name: string;
    type: 'model' | 'texture' | 'audio' | 'script';
    projectId: string;
    url: string;
    thumbnail?: string;
    metadata: Record<string, any>;
}

// API Response types
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// Request types
export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface ProjectCreateParams {
    name: string;
    description?: string;
    isPublic?: boolean;
    tags?: string[];
    settings?: Partial<ProjectSettings>;
}