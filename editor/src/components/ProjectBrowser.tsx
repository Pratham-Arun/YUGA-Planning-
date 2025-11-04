import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProjects, createProject, deleteProject, setCurrentProject, setCurrentPage } from '../store/slices/projectSlice';
import type { RootState } from '../store';
import type { Project } from '../services/project';

export const ProjectBrowser: React.FC = () => {
    const dispatch = useAppDispatch();
    const { 
        projects, 
        currentProject, 
        loading, 
        error, 
        totalProjects, 
        currentPage 
    } = useAppSelector((state: RootState) => state.project);

    useEffect(() => {
        dispatch(fetchProjects({ page: currentPage, limit: 10 }));
    }, [dispatch, currentPage]);

    const handleCreateProject = async () => {
        try {
            await dispatch(createProject({
                name: 'New Project',
                description: 'A new project',
                isPublic: false,
                tags: ['game']
            })).unwrap();
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            await dispatch(deleteProject(projectId)).unwrap();
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    const handleSelectProject = (project: Project) => {
        dispatch(setCurrentProject(project));
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="project-browser">
            <div className="header">
                <h2>Projects</h2>
                <button onClick={handleCreateProject}>New Project</button>
            </div>
            <div className="projects-list">
                {projects.map((project: Project) => (
                    <div 
                        key={project.id} 
                        className={`project-item ${currentProject?.id === project.id ? 'selected' : ''}`}
                        onClick={() => handleSelectProject(project)}
                    >
                        <div className="project-info">
                            <h3>{project.name}</h3>
                            <p>{project.description}</p>
                            <div className="project-meta">
                                <span>Last updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                {project.tags.map((tag: string) => (
                                    <span key={tag} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <button 
                            className="delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
            {totalProjects > 10 && (
                <div className="pagination">
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage}</span>
                    <button 
                        disabled={currentPage * 10 >= totalProjects} 
                        onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};