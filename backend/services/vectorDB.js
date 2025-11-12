/**
 * Vector Database Service for RAG (Retrieval-Augmented Generation)
 * Uses ChromaDB for storing and retrieving code context
 */

// ChromaDB is optional - gracefully handle if not installed
let ChromaClient;
try {
  const chromaModule = await import('chromadb-default-embed');
  ChromaClient = chromaModule.ChromaClient;
} catch (error) {
  console.warn('ChromaDB not installed - RAG features will be limited');
  ChromaClient = null;
}

import { OpenAI } from 'openai';

class VectorDB {
  constructor() {
    this.client = null;
    this.openai = null;
    this.collections = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize ChromaDB client
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (!ChromaClient) {
        console.warn('⚠ ChromaDB not available - install with: npm install chromadb-default-embed');
        this.initialized = false;
        return;
      }
      
      // Initialize ChromaDB client (local instance)
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });
      
      // Initialize OpenAI for embeddings
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
      
      this.initialized = true;
      console.log('✓ Vector DB initialized');
    } catch (error) {
      console.warn('⚠ Vector DB not available (optional feature):', error.message);
      this.initialized = false;
    }
  }
  
  /**
   * Get or create collection for a project
   */
  async getCollection(projectId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.client) {
      throw new Error('Vector DB not initialized');
    }
    
    const collectionName = `project_${projectId}`;
    
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName);
    }
    
    try {
      // Try to get existing collection
      const collection = await this.client.getOrCreateCollection({
        name: collectionName,
        metadata: { projectId }
      });
      
      this.collections.set(collectionName, collection);
      return collection;
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }
  
  /**
   * Create embeddings for text using OpenAI
   */
  async createEmbeddings(texts) {
    if (!this.openai) {
      // Fallback: Use simple hash-based embeddings (not ideal but works)
      return texts.map(text => this._simpleEmbedding(text));
    }
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error creating embeddings:', error);
      // Fallback to simple embeddings
      return texts.map(text => this._simpleEmbedding(text));
    }
  }
  
  /**
   * Simple embedding fallback (hash-based)
   */
  _simpleEmbedding(text) {
    // Create a simple 384-dimensional embedding based on text features
    const embedding = new Array(384).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % 384;
      embedding[index] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }
  
  /**
   * Store project context (files, classes, functions)
   */
  async storeProjectContext(projectId, files) {
    try {
      const collection = await this.getCollection(projectId);
      
      const documents = [];
      const metadatas = [];
      const ids = [];
      
      for (const file of files) {
        const docId = `${projectId}_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        documents.push(file.content);
        metadatas.push({
          path: file.path,
          language: file.language || 'unknown',
          type: file.type || 'code',
          timestamp: Date.now()
        });
        ids.push(docId);
      }
      
      // Create embeddings
      const embeddings = await this.createEmbeddings(documents);
      
      // Store in ChromaDB
      await collection.add({
        ids,
        documents,
        metadatas,
        embeddings
      });
      
      console.log(`✓ Stored ${files.length} files for project ${projectId}`);
      return { success: true, count: files.length };
    } catch (error) {
      console.error('Error storing project context:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(projectId, query, options = {}) {
    const {
      nResults = 5,
      language = null,
      type = null
    } = options;
    
    try {
      const collection = await this.getCollection(projectId);
      
      // Create query embedding
      const queryEmbedding = (await this.createEmbeddings([query]))[0];
      
      // Build where filter
      const where = {};
      if (language) where.language = language;
      if (type) where.type = type;
      
      // Query ChromaDB
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        where: Object.keys(where).length > 0 ? where : undefined
      });
      
      // Format results
      const context = results.documents[0].map((doc, i) => ({
        content: doc,
        path: results.metadatas[0][i].path,
        language: results.metadatas[0][i].language,
        distance: results.distances[0][i]
      }));
      
      return context;
    } catch (error) {
      console.error('Error retrieving context:', error);
      return [];
    }
  }
  
  /**
   * Update file in project context
   */
  async updateFile(projectId, filePath, content) {
    try {
      const collection = await this.getCollection(projectId);
      const docId = `${projectId}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const embedding = (await this.createEmbeddings([content]))[0];
      
      await collection.update({
        ids: [docId],
        documents: [content],
        embeddings: [embedding],
        metadatas: [{
          path: filePath,
          timestamp: Date.now()
        }]
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating file:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete project context
   */
  async deleteProjectContext(projectId) {
    try {
      const collectionName = `project_${projectId}`;
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting project context:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get collection statistics
   */
  async getStats(projectId) {
    try {
      const collection = await this.getCollection(projectId);
      const count = await collection.count();
      
      return {
        projectId,
        documentCount: count,
        collectionName: `project_${projectId}`
      };
    } catch (error) {
      return {
        projectId,
        documentCount: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Search for similar code
   */
  async searchSimilarCode(projectId, codeSnippet, limit = 5) {
    return await this.retrieveContext(projectId, codeSnippet, {
      nResults: limit,
      type: 'code'
    });
  }
}

// Singleton instance
const vectorDB = new VectorDB();

export default vectorDB;
