import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';

const router = express.Router();

// Initialize database connection
let db;

export function initializeDatabase(dbPath) {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

// List all projects (summary)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC').all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project by ID
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT id, name, data, updated_at FROM projects WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    row.data = JSON.parse(row.data);
    res.json(row);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create or update project
router.post('/', (req, res) => {
  try {
    const body = req.body;
    
    if (!body || !body.id || !body.name || !body.data) {
      return res.status(400).json({ error: 'id, name, and data are required' });
    }
    
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO projects (id, name, data, updated_at) VALUES (@id, @name, @data, @updated_at)
      ON CONFLICT(id) DO UPDATE SET name=@name, data=@data, updated_at=@updated_at
    `);
    
    stmt.run({ 
      id: body.id, 
      name: body.name, 
      data: JSON.stringify(body.data), 
      updated_at: now 
    });
    
    res.json({ ok: true, updated_at: now });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ ok: true, changes: info.changes });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
