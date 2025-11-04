const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs').promises;
const path = require('path');

class StorageService {
    constructor() {
        // Initialize S3 client
        this.s3 = new S3Client({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
        });

        // Initialize Supabase client
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        this.vectorIndex = this.pinecone.index('project-context');
    }

    async uploadAsset(file, key) {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: this.getContentType(key),
        });

        await this.s3.send(command);

        // Generate signed URL for immediate use
        const getCommand = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        return await getSignedUrl(this.s3, getCommand, { expiresIn: 3600 });
    }

    async getAssetUrl(key) {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }

    async uploadProjectFile(projectId, filePath, content) {
        const key = `projects/${projectId}/${filePath}`;
        
        // Store in Supabase
        const { data, error } = await this.supabase
            .storage
            .from('project-files')
            .upload(key, content, {
                contentType: 'text/plain',
                upsert: true,
            });

        if (error) throw error;

        // Index content in vector DB if it's a code file
        if (this.isCodeFile(filePath)) {
            await this.indexFileContent(projectId, filePath, content);
        }

        return data.path;
    }

    async getProjectFile(projectId, filePath) {
        const key = `projects/${projectId}/${filePath}`;
        
        const { data, error } = await this.supabase
            .storage
            .from('project-files')
            .download(key);

        if (error) throw error;

        return data;
    }

    async indexFileContent(projectId, filePath, content) {
        // Generate embedding for the file content
        const embedding = await this.generateEmbedding(content);

        // Store in Pinecone
        await this.vectorIndex.upsert({
            vectors: [{
                id: `${projectId}:${filePath}`,
                values: embedding,
                metadata: {
                    projectId,
                    filePath,
                    content,
                    type: 'code',
                }
            }]
        });
    }

    async searchProjectContext(projectId, query, limit = 5) {
        // Generate embedding for the query
        const queryEmbedding = await this.generateEmbedding(query);

        // Search in vector DB
        const results = await this.vectorIndex.query({
            vector: queryEmbedding,
            filter: { projectId },
            topK: limit,
            includeMetadata: true,
        });

        return results.matches.map(match => match.metadata);
    }

    async generateEmbedding(text) {
        const { Configuration, OpenAIApi } = require('openai');
        const openai = new OpenAIApi(new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        }));

        const response = await openai.createEmbedding({
            model: 'text-embedding-ada-002',
            input: text,
        });

        return response.data.data[0].embedding;
    }

    getContentType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const contentTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.fbx': 'application/octet-stream',
            '.obj': 'text/plain',
            '.mtl': 'text/plain',
            '.unity': 'text/plain',
            '.cs': 'text/plain',
            '.json': 'application/json',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    isCodeFile(filePath) {
        const codeExtensions = ['.cs', '.js', '.ts', '.cpp', '.h', '.json'];
        return codeExtensions.includes(path.extname(filePath).toLowerCase());
    }
}

module.exports = new StorageService();