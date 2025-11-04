import { api } from './api';
import type {
    Project,
    ProjectCreateParams,
    PaginatedResponse,
    PaginationParams
} from '../types';

export class ProjectService {
    private static readonly BASE_PATH = '/api/projects';

    static async getProjects(params: PaginationParams = {}): Promise<PaginatedResponse<Project>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.order) queryParams.append('order', params.order);

        return api.get<PaginatedResponse<Project>>(`${this.BASE_PATH}?${queryParams}`);
    }

    static async getProject(id: string): Promise<Project> {
        return api.get<Project>(`${this.BASE_PATH}/${id}`);
    }

    static async createProject(data: ProjectCreateParams): Promise<Project> {
        return api.post<Project>(this.BASE_PATH, data);
    }

    static async updateProject(id: string, data: Partial<Project>): Promise<Project> {
        return api.put<Project>(`${this.BASE_PATH}/${id}`, data);
    }

    static async deleteProject(id: string): Promise<void> {
        return api.delete<void>(`${this.BASE_PATH}/${id}`);
    }

    static async getProjectThumbnail(id: string): Promise<string> {
        const response = await api.get<{ url: string }>(`${this.BASE_PATH}/${id}/thumbnail`);
        return response.url;
    }

    static async uploadProjectThumbnail(id: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
        return api.upload(`${this.BASE_PATH}/${id}/thumbnail`, file, onProgress);
    }

    static async duplicateProject(id: string, newName: string): Promise<Project> {
        return api.post<Project>(`${this.BASE_PATH}/${id}/duplicate`, { name: newName });
    }

    static async addCollaborator(projectId: string, userId: string): Promise<Project> {
        return api.post<Project>(`${this.BASE_PATH}/${projectId}/collaborators`, { userId });
    }

    static async removeCollaborator(projectId: string, userId: string): Promise<Project> {
        return api.delete<Project>(`${this.BASE_PATH}/${projectId}/collaborators/${userId}`);
    }

    static async updateProjectSettings(projectId: string, settings: Partial<Project['settings']>): Promise<Project> {
        return api.put<Project>(`${this.BASE_PATH}/${projectId}/settings`, settings);
    }
}