import React, { createContext, useContext, useCallback } from 'react';
import api from '../api';

const AIContext = createContext();

export function useAI() {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
}

export function AIProvider({ children }) {
    const generateScene = useCallback(async ({ projectId, prompt, options }) => {
        const response = await api.post('/ai/generate', {
            projectId,
            prompt,
            options
        });

        // Return a preview object with the generation results
        const { codeDiff, assets, explanation } = response.data;
        
        return {
            codeDiff,
            assets,
            explanation,
            // Method to apply the changes
            async apply() {
                await api.post(`/ai/apply/${response.data.jobId}`);
            }
        };
    }, []);

    const refineScene = useCallback(async ({ projectId, prompt, previousJobId }) => {
        const response = await api.post('/ai/refine', {
            projectId,
            prompt,
            previousJobId
        });

        return {
            codeDiff: response.data.codeDiff,
            assets: response.data.assets,
            explanation: response.data.explanation,
            async apply() {
                await api.post(`/ai/apply/${response.data.jobId}`);
            }
        };
    }, []);

    const debugScene = useCallback(async ({ projectId, errors }) => {
        const response = await api.post('/ai/debug', {
            projectId,
            errors
        });

        return {
            suggestions: response.data.suggestions,
            codeFixes: response.data.codeFixes,
            async apply() {
                await api.post(`/ai/apply/${response.data.jobId}`);
            }
        };
    }, []);

    const value = {
        generateScene,
        refineScene,
        debugScene
    };

    return (
        <AIContext.Provider value={value}>
            {children}
        </AIContext.Provider>
    );
}