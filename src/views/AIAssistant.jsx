import React, { useState } from 'react';
import { useAI } from '../contexts/AIContext';
import { useProject } from '../contexts/ProjectContext';

export default function AIAssistant() {
    const { generateScene } = useAI();
    const { project } = useProject();
    const [prompt, setPrompt] = useState('');
    const [options, setOptions] = useState({
        model: 'gpt-4',
        quality: 'high',
        assetStyle: 'realistic',
        language: 'C#',
        engine: project?.engine || 'Unity'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');
        setPreview(null);

        try {
            const result = await generateScene({
                projectId: project.id,
                prompt,
                options
            });
            setPreview(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!preview) return;

        setLoading(true);
        try {
            await preview.apply();
            // Redirect to editor with success message
        } catch (err) {
            setError('Failed to apply changes: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">AI Scene Generator</h1>

                {/* Prompt Form */}
                <form onSubmit={handleSubmit} className="mb-8">
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2">
                            Describe your scene
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows="4"
                            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Create a medieval forge scene with an NPC blacksmith and a sword-crafting interaction..."
                        />
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div>
                            <label className="block text-gray-300 mb-2">Model</label>
                            <select
                                value={options.model}
                                onChange={(e) => setOptions(prev => ({ ...prev, model: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
                            >
                                <option value="gpt-4">GPT-4 (Balanced)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo (Fast)</option>
                                <option value="claude-2">Claude 2 (Detailed)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Quality</label>
                            <select
                                value={options.quality}
                                onChange={(e) => setOptions(prev => ({ ...prev, quality: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
                            >
                                <option value="draft">Draft (Fast)</option>
                                <option value="standard">Standard</option>
                                <option value="high">High Quality</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Asset Style</label>
                            <select
                                value={options.assetStyle}
                                onChange={(e) => setOptions(prev => ({ ...prev, assetStyle: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
                            >
                                <option value="realistic">Realistic</option>
                                <option value="stylized">Stylized</option>
                                <option value="low-poly">Low Poly</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Language</label>
                            <select
                                value={options.language}
                                onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg"
                            >
                                <option value="C#">C# (Unity)</option>
                                <option value="C++">C++ (Unreal)</option>
                                <option value="Rust">Rust (Bevy)</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate Scene'}
                    </button>
                </form>

                {/* Preview */}
                {preview && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>

                        {/* Code Changes */}
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-white mb-2">Code Changes</h3>
                            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                                <code className="text-gray-300">{preview.codeDiff}</code>
                            </pre>
                        </div>

                        {/* Generated Assets */}
                        {preview.assets?.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-white mb-2">Generated Assets</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {preview.assets.map((asset, i) => (
                                        <div key={i} className="bg-gray-900 rounded-lg overflow-hidden">
                                            <img
                                                src={asset.previewUrl}
                                                alt={asset.name}
                                                className="w-full h-32 object-cover"
                                            />
                                            <div className="p-2">
                                                <p className="text-sm text-gray-400">{asset.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setPreview(null)}
                                className="px-4 py-2 text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {loading ? 'Applying...' : 'Apply Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}