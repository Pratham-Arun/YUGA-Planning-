import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ShareProject() {
    const { projectId } = useParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shareUrl, setShareUrl] = useState(null);
    const [expirationHours, setExpirationHours] = useState(24);

    const handleGitHubShare = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/share/github`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.action === 'authenticate') {
                    // Redirect to GitHub auth
                    window.location.href = '/auth/github';
                    return;
                }
                throw new Error(data.error);
            }

            window.open(data.repoUrl, '_blank');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/share/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ expirationHours })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            setShareUrl(data.url);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.location.href = `/api/projects/${projectId}/export`;
    };

    return (
        <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-8">
                        <h2 className="text-3xl font-bold text-white mb-6">Share Project</h2>

                        {error && (
                            <div className="mb-6 bg-red-600/20 border border-red-600 text-red-200 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="bg-gray-700/50 p-6 rounded-lg">
                                <h3 className="text-lg font-medium text-white mb-4">
                                    Share via GitHub
                                </h3>
                                <p className="text-gray-300 mb-4">
                                    Create a private GitHub repository with your project files
                                </p>
                                <button
                                    onClick={handleGitHubShare}
                                    disabled={loading}
                                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                        loading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? 'Sharing...' : 'Share on GitHub'}
                                </button>
                            </div>

                            <div className="bg-gray-700/50 p-6 rounded-lg">
                                <h3 className="text-lg font-medium text-white mb-4">
                                    Generate Shareable Link
                                </h3>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Link Expiration
                                    </label>
                                    <select
                                        value={expirationHours}
                                        onChange={(e) => setExpirationHours(Number(e.target.value))}
                                        className="mt-1 block w-full bg-gray-600 border-gray-500 rounded-md shadow-sm text-white"
                                    >
                                        <option value={24}>24 hours</option>
                                        <option value={72}>3 days</option>
                                        <option value={168}>7 days</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={loading}
                                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                        loading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? 'Generating...' : 'Generate Link'}
                                </button>

                                {shareUrl && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Shareable Link
                                        </label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                readOnly
                                                value={shareUrl}
                                                className="flex-1 bg-gray-600 border-gray-500 rounded-l-md text-white px-3 py-2"
                                            />
                                            <button
                                                onClick={() => navigator.clipboard.writeText(shareUrl)}
                                                className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-500"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-700/50 p-6 rounded-lg">
                                <h3 className="text-lg font-medium text-white mb-4">
                                    Export Project
                                </h3>
                                <p className="text-gray-300 mb-4">
                                    Download a ZIP file containing all project files
                                </p>
                                <button
                                    onClick={handleExport}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    Download Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}