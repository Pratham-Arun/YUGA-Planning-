import React from 'react';
import { useProjects } from '../hooks/useProjects';
import type { Project } from '../types';

export const ProjectList: React.FC = () => {
    const {
        projects,
        loading,
        error,
        currentPage,
        pageSize,
        search,
        sort,
        order,
        totalPages,
        setPage,
        setSearch,
        setSort,
        setPageSize,
        createProject,
        deleteProject,
        selectProject
    } = useProjects();

    const handleCreateNewProject = async () => {
        try {
            await createProject({
                name: 'New Project',
                description: 'A new project created from the project list',
                isPublic: false,
                tags: ['game']
            });
        } catch (error) {
            // Error is already logged by the hook
        }
    };

    const handleSortChange = (field: string) => {
        const newOrder = field === sort && order === 'asc' ? 'desc' : 'asc';
        setSort(field, newOrder);
    };

    if (loading && projects.length === 0) {
        return <div className="loading">Loading projects...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="project-list">
            <div className="project-list-header">
                <div className="search-bar">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects..."
                    />
                </div>
                <button onClick={handleCreateNewProject}>New Project</button>
            </div>

            <div className="project-list-controls">
                <div className="sort-controls">
                    <button 
                        onClick={() => handleSortChange('name')}
                        className={sort === 'name' ? 'active' : ''}
                    >
                        Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                    </button>
                    <button 
                        onClick={() => handleSortChange('updatedAt')}
                        className={sort === 'updatedAt' ? 'active' : ''}
                    >
                        Last Updated {sort === 'updatedAt' && (order === 'asc' ? '↑' : '↓')}
                    </button>
                </div>
                <select 
                    value={pageSize} 
                    onChange={(e) => setPageSize(Number(e.target.value))}
                >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                </select>
            </div>

            <div className="project-grid">
                {projects.map((project: Project) => (
                    <div 
                        key={project.id} 
                        className="project-card"
                        onClick={() => selectProject(project)}
                    >
                        {project.thumbnail && (
                            <img 
                                src={project.thumbnail} 
                                alt={project.name} 
                                className="project-thumbnail"
                            />
                        )}
                        <div className="project-info">
                            <h3>{project.name}</h3>
                            {project.description && (
                                <p className="description">{project.description}</p>
                            )}
                            <div className="meta">
                                <span>Last updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                {project.isPublic && <span className="public">Public</span>}
                            </div>
                            <div className="tags">
                                {project.tags.map((tag: string) => (
                                    <span key={tag} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <button
                            className="delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.id);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};