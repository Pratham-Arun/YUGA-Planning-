import express from 'express';
import vectorDB from '../services/vectorDB.js';

const router = express.Router();

// Store project context
router.post('/store', async (req, res) => {
  const { projectId, files } = req.body;
  
  if (!projectId || !files || !Array.isArray(files)) {
    return res.status(400).json({ 
      error: 'projectId and files array are required' 
    });
  }
  
  try {
    const result = await vectorDB.storeProjectContext(projectId, files);
    res.json(result);
  } catch (error) {
    console.error('Error storing context:', error);
    res.status(500).json({ 
      error: 'Failed to store context',
      details: error.message 
    });
  }
});

// Query/retrieve context
router.post('/query', async (req, res) => {
  const { projectId, query, nResults, language, type } = req.body;
  
  if (!projectId || !query) {
    return res.status(400).json({ 
      error: 'projectId and query are required' 
    });
  }
  
  try {
    const context = await vectorDB.retrieveContext(projectId, query, {
      nResults: nResults || 5,
      language,
      type
    });
    
    res.json({ 
      projectId,
      query,
      results: context,
      count: context.length
    });
  } catch (error) {
    console.error('Error querying context:', error);
    res.status(500).json({ 
      error: 'Failed to query context',
      details: error.message 
    });
  }
});

// Update single file
router.put('/file', async (req, res) => {
  const { projectId, filePath, content } = req.body;
  
  if (!projectId || !filePath || !content) {
    return res.status(400).json({ 
      error: 'projectId, filePath, and content are required' 
    });
  }
  
  try {
    const result = await vectorDB.updateFile(projectId, filePath, content);
    res.json(result);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ 
      error: 'Failed to update file',
      details: error.message 
    });
  }
});

// Delete project context
router.delete('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const result = await vectorDB.deleteProjectContext(projectId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting context:', error);
    res.status(500).json({ 
      error: 'Failed to delete context',
      details: error.message 
    });
  }
});

// Get statistics
router.get('/stats/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const stats = await vectorDB.getStats(projectId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      details: error.message 
    });
  }
});

// Search similar code
router.post('/search', async (req, res) => {
  const { projectId, codeSnippet, limit } = req.body;
  
  if (!projectId || !codeSnippet) {
    return res.status(400).json({ 
      error: 'projectId and codeSnippet are required' 
    });
  }
  
  try {
    const results = await vectorDB.searchSimilarCode(
      projectId, 
      codeSnippet, 
      limit || 5
    );
    
    res.json({ 
      projectId,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching code:', error);
    res.status(500).json({ 
      error: 'Failed to search code',
      details: error.message 
    });
  }
});

export default router;
