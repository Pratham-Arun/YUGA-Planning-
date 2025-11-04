const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Octokit } = require('@octokit/rest');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

class AuthService {
    constructor() {
        this.googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
        this.octokit = new Octokit();
    }

    async verifyGoogleToken(token) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            return {
                userId: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture
            };
        } catch (error) {
            throw new Error('Invalid Google token');
        }
    }

    async handleGithubCallback(code) {
        try {
            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code,
                }),
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error_description);
            }

            // Get user data with the access token
            this.octokit.auth = data.access_token;
            const { data: userData } = await this.octokit.users.getAuthenticated();

            return {
                userId: userData.id.toString(),
                email: userData.email,
                name: userData.name || userData.login,
                picture: userData.avatar_url,
                githubToken: data.access_token
            };
        } catch (error) {
            throw new Error('GitHub authentication failed');
        }
    }

    generateTokens(userData) {
        const accessToken = jwt.sign(userData, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: userData.userId }, JWT_SECRET, { expiresIn: '7d' });
        
        return { accessToken, refreshToken };
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    refreshAccessToken(refreshToken) {
        try {
            const payload = this.verifyToken(refreshToken);
            const accessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: '1h' });
            return accessToken;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
}

module.exports = new AuthService();