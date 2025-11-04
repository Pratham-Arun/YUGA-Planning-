import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { loginWithGoogle, loginWithGitHub } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-xl shadow-2xl">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        Welcome to YUGA Engine
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Sign in to start creating amazing games
                    </p>
                </div>
                
                <div className="mt-8 space-y-4">
                    <button
                        onClick={loginWithGoogle}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M12.545,12.151L12.545,12.151c0,1.054,0.947,1.909,2.111,1.909c1.163,0,2.111-0.854,2.111-1.909c0-1.055-0.947-1.91-2.111-1.91C13.492,10.241,12.545,11.096,12.545,12.151z M12.545,12.151"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        onClick={loginWithGitHub}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                            />
                        </svg>
                        Continue with GitHub
                    </button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-400">
                        By signing in, you agree to our{' '}
                        <a href="/terms" className="text-indigo-400 hover:text-indigo-300">
                            Terms of Service
                        </a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-indigo-400 hover:text-indigo-300">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}