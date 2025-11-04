const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

class UserService {
    constructor(db) {
        this.db = db;
        this.initTables();
    }

    initTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                display_name TEXT,
                google_id TEXT UNIQUE,
                github_id TEXT UNIQUE,
                picture_url TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
            CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
        `);
    }

    async registerWithPassword(email, password, displayName) {
        const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuid();
        const now = Date.now();

        this.db.prepare(`
            INSERT INTO users (id, email, password_hash, display_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, email, hashedPassword, displayName || null, now);

        return { id, email, displayName };
    }

    async loginWithPassword(email, password) {
        const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !user.password_hash) {
            throw new Error('Invalid credentials');
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        return {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            picture: user.picture_url
        };
    }

    async findOrCreateOAuthUser(profile, provider) {
        const idField = `${provider}_id`;
        let user = this.db.prepare(`SELECT * FROM users WHERE ${idField} = ?`).get(profile.userId);

        if (!user) {
            // Try to find by email first
            user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email);

            if (user) {
                // Link OAuth account to existing user
                this.db.prepare(`UPDATE users SET ${idField} = ? WHERE id = ?`)
                    .run(profile.userId, user.id);
            } else {
                // Create new user
                const id = uuid();
                const now = Date.now();

                this.db.prepare(`
                    INSERT INTO users (
                        id, email, display_name, picture_url, ${idField}, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `).run(id, profile.email, profile.name, profile.picture, profile.userId, now);

                user = { id, email: profile.email, display_name: profile.name };
            }
        }

        return {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            picture: user.picture_url
        };
    }

    getUserById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    updateUser(id, updates) {
        const allowedFields = ['display_name', 'picture_url'];
        const validUpdates = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                validUpdates[key] = value;
            }
        }

        if (Object.keys(validUpdates).length === 0) {
            return null;
        }

        const setClauses = Object.keys(validUpdates)
            .map(key => `${key} = @${key}`)
            .join(', ');

        return this.db.prepare(`
            UPDATE users
            SET ${setClauses}
            WHERE id = @id
        `).run({ ...validUpdates, id });
    }
}

module.exports = UserService;