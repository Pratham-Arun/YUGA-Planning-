const express = require('express');
const router = express.Router();
const sharingService = require('../services/sharing');
const projectService = require('../services/project');
const { authenticateToken } = require('./auth');

// Share project via GitHub
router.post('/projects/:id/share/github', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.getProject(req.params.id, req.user.userId);
        
        if (!req.user.githubToken) {
            return res.status(400).json({
                error: 'GitHub authentication required',
                action: 'authenticate',
                provider: 'github'
            });
        }

        const result = await sharingService.shareViaGitHub(
            req.params.id,
            project.path,
            {
                githubToken: req.user.githubToken,
                githubUsername: req.user.githubUsername
            }
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate shareable link
router.post('/projects/:id/share/link', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.getProject(req.params.id, req.user.userId);
        const { expirationHours } = req.body;

        const result = await sharingService.generateShareableLink(
            req.params.id,
            expirationHours
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export project
router.get('/projects/:id/export', authenticateToken, async (req, res) => {
    try {
        const project = await projectService.getProject(req.params.id, req.user.userId);
        
        const exportPath = await sharingService.exportProject(
            req.params.id,
            project.path
        );

        res.download(exportPath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;