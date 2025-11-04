import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    const [activeScene, setActiveScene] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [project, setProject] = useState(null);

    const value = {
        project,
        setProject,
        activeScene,
        setActiveScene,
        selectedObject,
        setSelectedObject,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}