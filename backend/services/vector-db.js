const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const config = require('../config');

class VectorDBService {
    constructor() {
        this.pinecone = new PineconeClient();
        this.openai = new OpenAI({
            apiKey: config.ai.openai.apiKey
        });
        this.indexName = 'yuga-context';
        this.initialize();
    }

    async initialize() {
        await this.pinecone.init({
            environment: config.vectorDb.pinecone.environment,
            apiKey: config.vectorDb.pinecone.apiKey
        });

        // Create index if it doesn't exist
        const indices = await this.pinecone.listIndexes();
        if (!indices.includes(this.indexName)) {
            await this.pinecone.createIndex({
                createRequest: {
                    name: this.indexName,
                    dimension: 1536, // OpenAI ada-002 embedding dimension
                    metric: 'cosine'
                }
            });
        }

        this.index = this.pinecone.Index(this.indexName);
    }

    async generateEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text
        });
        return response.data[0].embedding;
    }

    async indexProjectFile(projectId, filePath, content) {
        const embedding = await this.generateEmbedding(content);
        
        await this.index.upsert({
            vectors: [{
                id: `${projectId}:${filePath}`,
                values: embedding,
                metadata: {
                    projectId,
                    filePath,
                    content,
                    type: this.getFileType(filePath),
                    timestamp: new Date().toISOString()
                }
            }]
        });
    }

    async indexProjectContext(projectId, context) {
        const vectors = await Promise.all(
            Object.entries(context).map(async ([key, value]) => {
                const content = typeof value === 'string' ? value : JSON.stringify(value);
                const embedding = await this.generateEmbedding(content);
                
                return {
                    id: `${projectId}:context:${key}`,
                    values: embedding,
                    metadata: {
                        projectId,
                        contextType: key,
                        content,
                        type: 'context',
                        timestamp: new Date().toISOString()
                    }
                };
            })
        );

        await this.index.upsert({ vectors });
    }

    async searchProjectContext(projectId, query, options = {}) {
        const queryEmbedding = await this.generateEmbedding(query);
        
        const results = await this.index.query({
            queryRequest: {
                vector: queryEmbedding,
                topK: options.limit || 5,
                filter: { projectId },
                includeMetadata: true
            }
        });

        return results.matches.map(match => ({
            score: match.score,
            ...match.metadata
        }));
    }

    async getRelevantContext(projectId, query) {
        const results = await this.searchProjectContext(projectId, query);
        
        // Group results by type
        const grouped = results.reduce((acc, result) => {
            acc[result.type] = acc[result.type] || [];
            acc[result.type].push(result);
            return acc;
        }, {});

        // Format context based on type
        return {
            code: grouped.code?.map(r => r.content).join('\n\n'),
            documentation: grouped.documentation?.map(r => r.content).join('\n\n'),
            context: grouped.context?.reduce((acc, r) => {
                acc[r.contextType] = r.content;
                return acc;
            }, {})
        };
    }

    async deleteProjectContext(projectId) {
        await this.index.delete({
            deleteRequest: {
                filter: { projectId }
            }
        });
    }

    async updateFileContext(projectId, filePath, content) {
        // Delete existing entry
        await this.index.delete({
            deleteRequest: {
                filter: { 
                    projectId,
                    filePath
                }
            }
        });

        // Index new content
        await this.indexProjectFile(projectId, filePath, content);
    }

    getFileType(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const typeMap = {
            cs: 'code',
            js: 'code',
            ts: 'code',
            cpp: 'code',
            h: 'code',
            rs: 'code',
            md: 'documentation',
            txt: 'documentation',
            json: 'configuration'
        };
        return typeMap[ext] || 'unknown';
    }

    async getProjectEmbedding(projectId) {
        const results = await this.index.query({
            queryRequest: {
                filter: { projectId },
                includeMetadata: true,
                topK: 100
            }
        });

        // Combine all context into a single embedding
        const combinedContent = results.matches
            .map(match => match.metadata.content)
            .join('\n\n');

        return await this.generateEmbedding(combinedContent);
    }
}

module.exports = new VectorDBService();