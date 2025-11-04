import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored tokens on mount
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken) {
            verifyStoredToken(accessToken, refreshToken);
        } else {
            setLoading(false);
        }
    }, []);

    const verifyStoredToken = async (accessToken, refreshToken) => {
        try {
            const response = await fetch('/api/auth/protected', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData.user);
            } else if (refreshToken) {
                // Try to refresh the token
                await refreshAccessToken(refreshToken);
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const refreshAccessToken = async (refreshToken) => {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const { accessToken } = await response.json();
                localStorage.setItem('accessToken', accessToken);
                // Verify the new token
                await verifyStoredToken(accessToken, refreshToken);
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
        }
    };

    const loginWithGoogle = async (googleToken) => {
        try {
            const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: googleToken })
            });

            if (response.ok) {
                const { accessToken, refreshToken } = await response.json();
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                await verifyStoredToken(accessToken, refreshToken);
            } else {
                throw new Error('Google login failed');
            }
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    };

    const loginWithGitHub = () => {
        const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user,repo`;
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        loginWithGitHub,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};