import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

export default function ProjectCreator() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const templateId = searchParams.get('template');
    const { createProject } = useProject();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        engine: 'Unity',
        template: templateId || 'blank'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const project = await createProject(formData);
            navigate(`/editor?project=${project.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <h1 className="text-2xl font-bold text-white mb-6">Create New Project</h1>

                {error && (
                    <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-300 mb-2" htmlFor="name">
                            Project Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2" htmlFor="description">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2" htmlFor="engine">
                            Game Engine
                        </label>
                        <select
                            id="engine"
                            name="engine"
                            value={formData.engine}
                            onChange={handleChange}
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Unity">Unity</option>
                            <option value="Bevy">Bevy</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2" htmlFor="template">
                            Template
                        </label>
                        <select
                            id="template"
                            name="template"
                            value={formData.template}
                            onChange={handleChange}
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="blank">Blank Project</option>
                            <option value="3d-adventure">3D Adventure</option>
                            <option value="arena">Arena</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="px-4 py-2 text-gray-300 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}