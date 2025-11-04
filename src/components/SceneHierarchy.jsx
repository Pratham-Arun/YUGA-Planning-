import React from 'react';
import { useProject } from '../contexts/ProjectContext';

export default function SceneHierarchy() {
    const { activeScene, setActiveScene } = useProject();

    return (
        <div className="text-gray-300">
            <h2 className="text-lg font-semibold mb-4">Scene Hierarchy</h2>
            {/* Add scene tree view here */}
        </div>
    );
}