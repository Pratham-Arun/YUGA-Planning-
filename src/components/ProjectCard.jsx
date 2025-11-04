import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectCard({ project }) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/editor?project=${project.id}`);
    };

    return (
        <div 
            onClick={handleClick}
            className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-all"
        >
            {/* Preview Image */}
            {project.previewUrl ? (
                <img 
                    src={project.previewUrl} 
                    alt={project.name}
                    className="w-full h-40 object-cover"
                />
            ) : (
                <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl">🎮</span>
                </div>
            )}

            {/* Project Info */}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{project.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Last edited {formatDistanceToNow(new Date(project.updatedAt))} ago</span>
                    <span>{project.engine}</span>
                </div>
            </div>
        </div>
    );
}