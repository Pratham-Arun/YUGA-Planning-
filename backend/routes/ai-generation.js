const express = require('express');
const router = express.Router();
const aiGenerationService = require('../services/ai-generation');
const projectService = require('../services/project');
const { authenticateToken } = require('./auth');

// Generate content based on prompt
router.post('/projects/:id/ai-generate', authenticateToken, async (req, res) => {
    try {
        // Verify project access
        const project = await projectService.getProject(req.params.id, req.user.userId);
        
        const { prompt, context } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const result = await aiGenerationService.handleGenerationRequest(
            req.params.id,
            prompt,
            context
        );

        // Log the AI interaction
        await projectService.logAIInteraction(req.params.id, req.user.userId, {
            prompt,
            response: result
        });

        if (result.errors?.length) {
            return res.status(400).json({
                message: 'Some generations failed',
                errors: result.errors,
                result
            });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Apply generated changes to project
router.post('/projects/:id/ai-apply', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.getProject(req.params.id, req.user.userId);
        
        // Update project based on generated content
        const updates = { $set: {} };
        
        if (req.body.code) {
            updates.$push = {
                scripts: {
                    name: 'Generated_Script.cs',
                    content: req.body.code,
                    language: 'csharp'
                }
            };
        }
        
        if (req.body.assets?.length) {
            updates.$push = updates.$push || {};
            updates.$push.assets = { $each: req.body.assets };
        }
        
        if (req.body.scene) {
            updates.$push = updates.$push || {};
            updates.$push.scenes = {
                name: 'Generated_Scene',
                data: req.body.scene,
                isMain: false
            };
        }

        // Find and update the latest AI interaction to mark it as approved
        const interaction = project.aiHistory[project.aiHistory.length - 1];
        if (interaction) {
            updates.$set[`aiHistory.${project.aiHistory.length - 1}.approved`] = true;
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;