import React from 'react';
import { useProject } from '../contexts/ProjectContext';

export default function PropertiesPanel() {
    const { selectedObject } = useProject();

    return (
        <div className="text-gray-300">
            <h2 className="text-lg font-semibold mb-4">Properties</h2>
            {selectedObject && (
                <div>
                    {/* Add property editors here */}
                </div>
            )}
        </div>
    );
}