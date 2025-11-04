import React from 'react';
import { useProject } from '../contexts/ProjectContext';

export default function AssetPanel() {
    const { project } = useProject();

    return (
        <div className="text-gray-300">
            <h2 className="text-lg font-semibold mb-4">Assets</h2>
            {/* Add asset grid here */}
        </div>
    );
}