const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authService = require('../services/auth');
const UserService = require('../services/user');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const userData = await authService.verifyToken(token);
        req.user = userData;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Email/password registration
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('displayName').trim().optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password, displayName } = req.body;
        const userService = new UserService(req.app.locals.db);
        const user = await userService.registerWithPassword(email, password, displayName);
        const tokens = authService.generateTokens(user);
        res.status(201).json({ user, ...tokens });
    } catch (error) {
        if (error.message === 'Email already registered') {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

// Email/password login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const userService = new UserService(req.app.locals.db);
        const user = await userService.loginWithPassword(email, password);
        const tokens = authService.generateTokens(user);
        res.json({ user, ...tokens });
    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Google OAuth login
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        const profile = await authService.verifyGoogleToken(token);
        const userService = new UserService(req.app.locals.db);
        const user = await userService.findOrCreateOAuthUser(profile, 'google');
        const tokens = authService.generateTokens(user);
        res.json({ user, ...tokens });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// GitHub OAuth login
router.get('/github/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const profile = await authService.handleGithubCallback(code);
        const userService = new UserService(req.app.locals.db);
        const user = await userService.findOrCreateOAuthUser(profile, 'github');
        const tokens = authService.generateTokens(user);
        res.json({ user, ...tokens });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const accessToken = await authService.refreshAccessToken(refreshToken);
        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Update user profile
router.patch('/me', authenticateToken, [
    body('displayName').trim().optional(),
    body('pictureUrl').isURL().optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userService = new UserService(req.app.locals.db);
        const result = await userService.updateUser(req.user.id, {
            display_name: req.body.displayName,
            picture_url: req.body.pictureUrl
        });

        if (!result) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        const user = userService.getUserById(req.user.id);
        res.json({
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            picture: user.picture_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get user profile
router.get('/me', authenticateToken, (req, res) => {
    const userService = new UserService(req.app.locals.db);
    const user = userService.getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        picture: user.picture_url
    });
});

module.exports = {
    router,
    authenticateToken
};