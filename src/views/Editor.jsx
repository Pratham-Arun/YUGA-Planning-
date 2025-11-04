import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ThreeScene from '../components/ThreeScene';
import ScriptEditor from '../components/ScriptEditor';
import AssetPanel from '../components/AssetPanel';
import SceneHierarchy from '../components/SceneHierarchy';
import PropertiesPanel from '../components/PropertiesPanel';
import { useProject } from '../contexts/ProjectContext';

export default function Editor() {
    const navigate = useNavigate();
    const { project, activeScene } = useProject();

    // Redirect to dashboard if no project is loaded
    React.useEffect(() => {
        if (!project) {
            navigate('/');
        }
    }, [project, navigate]);

    return (
        <div className="flex h-screen">
            {/* Left sidebar - Scene Hierarchy */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
                <SceneHierarchy />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="h-12 bg-gray-800 border-b border-gray-700 p-2 flex items-center">
                    {/* Add toolbar buttons here */}
                </div>

                {/* Editor area */}
                <div className="flex-1 flex">
                    <Routes>
                        {/* 3D Scene view */}
                        <Route index element={
                            <div className="flex-1 bg-gray-900">
                                <ThreeScene />
                            </div>
                        } />
                        
                        {/* Script editor view */}
                        <Route path="script/:scriptId" element={
                            <div className="flex-1">
                                <ScriptEditor />
                            </div>
                        } />
                    </Routes>
                </div>
            </div>

            {/* Right sidebar - Properties and Assets */}
            <div className="w-80 bg-gray-800 border-l border-gray-700">
                {/* Properties Panel */}
                <div className="h-1/2 border-b border-gray-700 p-4">
                    <PropertiesPanel />
                </div>
                
                {/* Asset Panel */}
                <div className="h-1/2 p-4">
                    <AssetPanel />
                </div>
            </div>
        </div>
    );
}