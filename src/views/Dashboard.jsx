import React from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import ProjectCard from '../components/ProjectCard';

export default function Dashboard() {
    const { projects, loadProjects } = useProject();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const fetchProjects = async () => {
            try {
                await loadProjects();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [loadProjects]);

    const templates = [
        {
            id: 'blank',
            name: 'Blank Project',
            description: 'Start with a clean slate',
            icon: '🎯'
        },
        {
            id: '3d-adventure',
            name: '3D Adventure',
            description: 'Third-person adventure game template',
            icon: '🎮'
        },
        {
            id: 'arena',
            name: 'Arena',
            description: 'Multiplayer arena game template',
            icon: '⚔️'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded">
                    Error loading projects: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Your Projects</h1>
                <Link
                    to="/new-project"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <span>New Project</span>
                </Link>
            </div>

            {/* Recent Projects */}
            {projects && projects.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                </div>
            )}

            {/* Templates */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Start from a Template</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <Link
                            key={template.id}
                            to={`/new-project?template=${template.id}`}
                            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition-all"
                        >
                            <div className="text-4xl mb-4">{template.icon}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                            <p className="text-gray-400">{template.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}