import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const templates = [
    {
        id: 'blank',
        name: 'Blank Project',
        description: 'Start with a clean slate',
        icon: '📄'
    },
    {
        id: '3d-adventure',
        name: '3D Adventure',
        description: 'Third-person adventure game template with basic character controller',
        icon: '🎮'
    },
    {
        id: 'arena',
        name: 'Arena',
        description: 'Multiplayer arena game template with basic networking',
        icon: '⚔️'
    }
];

export default function NewProject() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        template: 'blank',
        engine: 'unity',
        language: 'csharp'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            const project = await response.json();
            navigate(`/projects/${project._id}`);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-8">
                        <h2 className="text-3xl font-bold text-white mb-6">Create New Project</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-600 text-white px-4 py-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Template
                                </label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {templates.map(template => (
                                        <div
                                            key={template.id}
                                            className={`relative rounded-lg border p-4 cursor-pointer hover:border-indigo-500 ${
                                                formData.template === template.id
                                                    ? 'border-indigo-500 bg-indigo-900/50'
                                                    : 'border-gray-700 bg-gray-800'
                                            }`}
                                            onClick={() => handleChange({
                                                target: { name: 'template', value: template.id }
                                            })}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">{template.icon}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {template.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {template.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Engine
                                    </label>
                                    <select
                                        name="engine"
                                        value={formData.engine}
                                        onChange={handleChange}
                                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white"
                                    >
                                        <option value="unity">Unity</option>
                                        <option value="bevy">Bevy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Language
                                    </label>
                                    <select
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white"
                                    >
                                        <option value="csharp">C#</option>
                                        <option value="cpp">C++</option>
                                        <option value="rhai">Rhai</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    className="mr-4 px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                        loading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}