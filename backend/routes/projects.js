const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectService = require('../services/project');
const { authenticateToken } = require('./auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Create new project
router.post('/', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.createProject(req.user, req.body);
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get user's projects
router.get('/', authenticateToken, async (req, res) => {
    try {
        const projects = await projectService.getUserProjects(req.user.userId);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific project
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.getProject(req.params.id, req.user.userId);
        res.json(project);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.updateProject(
            req.params.id,
            req.user.userId,
            req.body
        );
        res.json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await projectService.deleteProject(req.params.id, req.user.userId);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add asset to project
router.post('/:id/assets', authenticateToken, upload.single('asset'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }
        
        const project = await projectService.addAsset(
            req.params.id,
            req.user.userId,
            req.file
        );
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add scene to project
router.post('/:id/scenes', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.addScene(
            req.params.id,
            req.user.userId,
            req.body
        );
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add script to project
router.post('/:id/scripts', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.addScript(
            req.params.id,
            req.user.userId,
            req.body
        );
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Log AI interaction
router.post('/:id/ai-history', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.logAIInteraction(
            req.params.id,
            req.user.userId,
            req.body
        );
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;