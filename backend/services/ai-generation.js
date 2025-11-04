const OpenAI = require('openai');
const config = require('../config');
const vectorDb = require('./vector-db');
const storageService = require('./storage-multi');
const fetch = require('node-fetch');
const path = require('path');

class AIGenerationService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.ai.openai.apiKey
        });
    }

    async generateCode(prompt, projectId, context) {
        // Get relevant context from vector DB
        const relevantContext = await vectorDb.getRelevantContext(projectId, prompt);

        const messages = [
            {
                role: 'system',
                content: `You are an expert game developer with deep knowledge of Unity, C#, and game development patterns. 
                Generate clean, efficient, and well-documented code based on the user's request. Follow best practices and include XML comments.
                
                Project Context:
                ${relevantContext.context ? JSON.stringify(relevantContext.context, null, 2) : 'No context available'}
                
                Relevant Code:
                ${relevantContext.code || 'No relevant code found'}`
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        return response.choices[0].message.content;
    }

    async generateAsset(prompt, type = 'image') {
        if (type === 'image') {
            const response = await this.openai.images.generate({
                model: 'dall-e-3',
                prompt,
                size: '1024x1024',
                quality: 'standard',
                n: 1
            });

            const imageUrl = response.data[0].url;
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.buffer();

            // Upload to storage service
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const urls = await storageService.uploadAsset(imageBuffer, filename);

            return {
                name: filename,
                type: 'image/png',
                url: urls.primary,
                backupUrl: urls.backup
            };
        }

        throw new Error('Unsupported asset type');
    }

    async generateScene(prompt, projectId, context) {
        // Get relevant context from vector DB
        const relevantContext = await vectorDb.getRelevantContext(projectId, prompt);

        const messages = [
            {
                role: 'system',
                content: `You are an expert in Unity scene composition and game level design. 
                Generate a detailed scene specification in JSON format based on the user's request. 
                Include positions, rotations, scales, and component properties for all objects.
                
                Project Context:
                ${relevantContext.context ? JSON.stringify(relevantContext.context, null, 2) : 'No context available'}
                
                Existing Scenes:
                ${relevantContext.documentation || 'No scene documentation found'}`
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        try {
            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            throw new Error('Failed to generate valid scene specification');
        }
    }

    async generateAnimation(prompt, projectId, context) {
        // Get relevant context from vector DB
        const relevantContext = await vectorDb.getRelevantContext(projectId, prompt);

        const messages = [
            {
                role: 'system',
                content: `You are an expert in Unity animation creation and rigging.
                Generate a detailed animation specification in JSON format based on the user's request.
                Include keyframe data, curves, events and other animation properties.
                
                Project Context:
                ${relevantContext.context ? JSON.stringify(relevantContext.context, null, 2) : 'No context available'}
                
                Existing Animations:
                ${relevantContext.documentation || 'No animation documentation found'}`
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        try {
            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            throw new Error('Failed to generate valid animation specification');
        }
    }

    async handleGenerationRequest(projectId, prompt, context) {
        const tasks = [];

        // Determine what needs to be generated based on the prompt
        const needsCode = prompt.toLowerCase().includes('code') || 
                         prompt.toLowerCase().includes('script') ||
                         context.selectedTab === 'code';
                         
        const needsAssets = prompt.toLowerCase().includes('asset') || 
                           prompt.toLowerCase().includes('model') ||
                           prompt.toLowerCase().includes('texture') ||
                           context.selectedTab === 'assets';
                           
        const needsScene = prompt.toLowerCase().includes('scene') || 
                          prompt.toLowerCase().includes('level') ||
                          context.selectedTab === 'scene';

        const needsAnimation = prompt.toLowerCase().includes('animation') ||
                             prompt.toLowerCase().includes('animate') ||
                             context.selectedTab === 'animation';

        // Generate everything in parallel
        if (needsCode) {
            tasks.push(this.generateCode(prompt, projectId, context)
                .then(code => ({ code }))
                .catch(error => ({ error: `Code generation failed: ${error.message}` })));
        }

        if (needsAssets) {
            tasks.push(this.generateAsset(prompt)
                .then(asset => ({ assets: [asset] }))
                .catch(error => ({ error: `Asset generation failed: ${error.message}` })));
        }

        if (needsScene) {
            tasks.push(this.generateScene(prompt, projectId, context)
                .then(scene => ({ scene }))
                .catch(error => ({ error: `Scene generation failed: ${error.message}` })));
        }

        if (needsAnimation) {
            tasks.push(this.generateAnimation(prompt, projectId, context)
                .then(animation => ({ animation }))
                .catch(error => ({ error: `Animation generation failed: ${error.message}` })));
        }

        const results = await Promise.all(tasks);
        
        // Combine all results
        return results.reduce((acc, result) => {
            if (result.error) {
                acc.errors = acc.errors || [];
                acc.errors.push(result.error);
            } else {
                Object.assign(acc, result);
            }
            return acc;
        }, {});
    }
}

module.exports = new AIGenerationService();