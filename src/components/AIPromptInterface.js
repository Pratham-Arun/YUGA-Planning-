import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Editor } from '@monaco-editor/react';

export default function AIPromptInterface() {
    const { projectId } = useParams();
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [preview, setPreview] = useState(null);
    const [selectedTab, setSelectedTab] = useState('code');
    const editorRef = useRef(null);
    const [error, setError] = useState(null);
    
    const handlePromptSubmit = async () => {
        setGenerating(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/projects/${projectId}/ai-generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    prompt,
                    context: {
                        selectedTab,
                        currentCode: editorRef.current?.getValue()
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate content');
            }

            const result = await response.json();
            setPreview(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async () => {
        if (!preview) return;

        try {
            const response = await fetch(`/api/projects/${projectId}/ai-apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(preview)
            });

            if (!response.ok) {
                throw new Error('Failed to apply changes');
            }

            // Clear the preview after successful application
            setPreview(null);
            setPrompt('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReject = () => {
        setPreview(null);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="flex-none p-4 bg-gray-800">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-start space-x-4">
                        <div className="flex-grow">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe what you want to create or modify..."
                                className="w-full h-24 px-4 py-2 text-white bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handlePromptSubmit}
                            disabled={generating || !prompt.trim()}
                            className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                generating || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {generating ? 'Generating...' : 'Generate'}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-200">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full max-w-4xl mx-auto p-4">
                    <div className="h-full rounded-lg bg-gray-800 overflow-hidden">
                        <div className="border-b border-gray-700">
                            <nav className="flex space-x-4 px-4">
                                <button
                                    onClick={() => setSelectedTab('code')}
                                    className={`py-3 px-4 text-sm font-medium ${
                                        selectedTab === 'code'
                                            ? 'text-indigo-400 border-b-2 border-indigo-500'
                                            : 'text-gray-400 hover:text-gray-300'
                                    }`}
                                >
                                    Code
                                </button>
                                <button
                                    onClick={() => setSelectedTab('assets')}
                                    className={`py-3 px-4 text-sm font-medium ${
                                        selectedTab === 'assets'
                                            ? 'text-indigo-400 border-b-2 border-indigo-500'
                                            : 'text-gray-400 hover:text-gray-300'
                                    }`}
                                >
                                    Assets
                                </button>
                                <button
                                    onClick={() => setSelectedTab('scene')}
                                    className={`py-3 px-4 text-sm font-medium ${
                                        selectedTab === 'scene'
                                            ? 'text-indigo-400 border-b-2 border-indigo-500'
                                            : 'text-gray-400 hover:text-gray-300'
                                    }`}
                                >
                                    Scene
                                </button>
                            </nav>
                        </div>

                        <div className="h-[calc(100%-3rem)] p-4">
                            {selectedTab === 'code' && (
                                <div className="h-full">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="csharp"
                                        theme="vs-dark"
                                        value={preview?.code || '// Generated code will appear here'}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false }
                                        }}
                                        onMount={(editor) => {
                                            editorRef.current = editor;
                                        }}
                                    />
                                </div>
                            )}

                            {selectedTab === 'assets' && preview?.assets && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {preview.assets.map((asset, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-700"
                                        >
                                            {asset.type.startsWith('image/') ? (
                                                <img
                                                    src={asset.url}
                                                    alt={asset.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <span className="text-4xl">📄</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                                                <p className="text-xs text-white truncate">
                                                    {asset.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTab === 'scene' && preview?.scene && (
                                <div className="h-full">
                                    <pre className="h-full overflow-auto p-4 rounded bg-gray-900 text-gray-300">
                                        {JSON.stringify(preview.scene, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {preview && (
                <div className="flex-none p-4 bg-gray-800 border-t border-gray-700">
                    <div className="max-w-4xl mx-auto flex justify-end space-x-4">
                        <button
                            onClick={handleReject}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                        >
                            Reject
                        </button>
                        <button
                            onClick={handleApprove}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                        >
                            Apply Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}