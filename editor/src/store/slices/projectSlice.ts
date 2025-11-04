import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ProjectService } from '../../services/project';
import { ApiError } from '../../services/api';
import type {
    Project,
    PaginatedResponse,
    PaginationParams,
    ProjectCreateParams
} from '../../types';

interface ProjectState {
    projects: Project[];
    currentProject: Project | null;
    loading: boolean;
    error: string | null;
    totalProjects: number;
    currentPage: number;
    pageSize: number;
    search: string;
    sort: string;
    order: 'asc' | 'desc';
    selectedProjectId: string | null;
    lastUpdated: number | null;
}

const initialState: ProjectState = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    totalProjects: 0,
    currentPage: 1,
    pageSize: 10,
    search: '',
    sort: 'updatedAt',
    order: 'desc',
    selectedProjectId: null,
    lastUpdated: null
};

export const fetchProjects = createAsyncThunk(
    'project/fetchProjects',
    async ({ page, limit, search }: { page?: number; limit?: number; search?: string }) => {
        const response = await ProjectService.getProjects({ page, limit, search });
        return response;
    }
);

export const createProject = createAsyncThunk(
    'project/createProject',
    async (data: { name: string; description?: string; isPublic?: boolean; tags?: string[] }) => {
        const response = await ProjectService.createProject(data);
        return response;
    }
);

export const updateProject = createAsyncThunk(
    'project/updateProject',
    async ({ id, data }: { id: string; data: Partial<Project> }) => {
        const response = await ProjectService.updateProject(id, data);
        return response;
    }
);

export const deleteProject = createAsyncThunk(
    'project/deleteProject',
    async (id: string) => {
        await ProjectService.deleteProject(id);
        return id;
    }
);

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        setCurrentProject: (state: ProjectState, action: PayloadAction<Project | null>) => {
            state.currentProject = action.payload;
            state.selectedProjectId = action.payload?.id || null;
        },
        clearProjectError: (state: ProjectState) => {
            state.error = null;
        },
        setCurrentPage: (state: ProjectState, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },
        setSearch: (state: ProjectState, action: PayloadAction<string>) => {
            state.search = action.payload;
        },
        setSort: (state: ProjectState, action: PayloadAction<string>) => {
            state.sort = action.payload;
        },
        setOrder: (state: ProjectState, action: PayloadAction<'asc' | 'desc'>) => {
            state.order = action.payload;
        },
        setPageSize: (state: ProjectState, action: PayloadAction<number>) => {
            state.pageSize = action.payload;
        }
    },
    extraReducers: (builder) => {
        // Fetch Projects
        builder
            .addCase(fetchProjects.pending, (state: ProjectState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProjects.fulfilled, (state: ProjectState, action: PayloadAction<{ projects: Project[]; total: number }>) => {
                state.loading = false;
                state.projects = action.payload.projects;
                state.totalProjects = action.payload.total;
            })
            .addCase(fetchProjects.rejected, (state: ProjectState, action: { error: { message?: string } }) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch projects';
            });

        // Create Project
        builder
            .addCase(createProject.pending, (state: ProjectState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createProject.fulfilled, (state: ProjectState, action: PayloadAction<Project>) => {
                state.loading = false;
                state.projects.unshift(action.payload);
                state.totalProjects += 1;
            })
            .addCase(createProject.rejected, (state: ProjectState, action: { error: { message?: string } }) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create project';
            });

        // Update Project
        builder
            .addCase(updateProject.pending, (state: ProjectState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProject.fulfilled, (state: ProjectState, action: PayloadAction<Project>) => {
                state.loading = false;
                const index = state.projects.findIndex((p: Project) => p.id === action.payload.id);
                if (index !== -1) {
                    state.projects[index] = action.payload;
                }
                if (state.currentProject?.id === action.payload.id) {
                    state.currentProject = action.payload;
                }
            })
            .addCase(updateProject.rejected, (state: ProjectState, action: { error: { message?: string } }) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update project';
            });

        // Delete Project
        builder
            .addCase(deleteProject.pending, (state: ProjectState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteProject.fulfilled, (state: ProjectState, action: PayloadAction<string>) => {
                state.loading = false;
                state.projects = state.projects.filter((p: Project) => p.id !== action.payload);
                state.totalProjects -= 1;
                if (state.currentProject?.id === action.payload) {
                    state.currentProject = null;
                }
            })
            .addCase(deleteProject.rejected, (state: ProjectState, action: { error: { message?: string } }) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to delete project';
            });
    }
});

export const { setCurrentProject, clearProjectError, setCurrentPage } = projectSlice.actions;
export default projectSlice.reducer;