import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setCurrentPage,
    setSearch,
    setSort,
    setOrder,
    setPageSize
} from '../store/slices/projectSlice';
import type { Project, ProjectCreateParams } from '../types';

export function useProjects() {
    const dispatch = useAppDispatch();
    const {
        projects,
        currentProject,
        loading,
        error,
        totalProjects,
        currentPage,
        pageSize,
        search,
        sort,
        order,
        selectedProjectId,
        lastUpdated
    } = useAppSelector((state: { project: ProjectState }) => state.project);

    // Fetch projects when params change
    useEffect(() => {
        dispatch(fetchProjects({ 
            page: currentPage, 
            limit: pageSize,
            search,
            sort,
            order
        }));
    }, [dispatch, currentPage, pageSize, search, sort, order]);

    const handleCreateProject = useCallback(async (data: ProjectCreateParams) => {
        try {
            const resultAction = await dispatch(createProject(data)).unwrap();
            return resultAction;
        } catch (error) {
            console.error('Failed to create project:', error);
            throw error;
        }
    }, [dispatch]);

    const handleUpdateProject = useCallback(async (id: string, data: Partial<Project>) => {
        try {
            const resultAction = await dispatch(updateProject({ id, data })).unwrap();
            return resultAction;
        } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
        }
    }, [dispatch]);

    const handleDeleteProject = useCallback(async (id: string) => {
        try {
            await dispatch(deleteProject(id)).unwrap();
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    }, [dispatch]);

    const handleSelectProject = useCallback((project: Project | null) => {
        dispatch(setCurrentProject(project));
    }, [dispatch]);

    const handlePageChange = useCallback((page: number) => {
        dispatch(setCurrentPage(page));
    }, [dispatch]);

    const handleSearchChange = useCallback((searchTerm: string) => {
        dispatch(setSearch(searchTerm));
        dispatch(setCurrentPage(1)); // Reset to first page on search
    }, [dispatch]);

    const handleSortChange = useCallback((sortField: string, sortOrder: 'asc' | 'desc') => {
        dispatch(setSort(sortField));
        dispatch(setOrder(sortOrder));
    }, [dispatch]);

    const handlePageSizeChange = useCallback((size: number) => {
        dispatch(setPageSize(size));
        dispatch(setCurrentPage(1)); // Reset to first page when changing page size
    }, [dispatch]);

    return {
        // State
        projects,
        currentProject,
        loading,
        error,
        totalProjects,
        currentPage,
        pageSize,
        search,
        sort,
        order,
        selectedProjectId,
        lastUpdated,

        // Actions
        createProject: handleCreateProject,
        updateProject: handleUpdateProject,
        deleteProject: handleDeleteProject,
        selectProject: handleSelectProject,
        setPage: handlePageChange,
        setSearch: handleSearchChange,
        setSort: handleSortChange,
        setPageSize: handlePageSizeChange,

        // Computed
        totalPages: Math.ceil(totalProjects / pageSize),
        hasProjects: projects.length > 0,
        canLoadMore: currentPage * pageSize < totalProjects
    };
}