const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');

class StorageService {
    constructor() {
        // Initialize Supabase client
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Initialize S3 client
        this.s3 = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    }

    async uploadToSupabase(file, bucket, path) {
        const { data, error } = await this.supabase
            .storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;
        return data;
    }

    async getFromSupabase(bucket, path) {
        const { data, error } = await this.supabase
            .storage
            .from(bucket)
            .download(path);

        if (error) throw error;
        return data;
    }

    async uploadToS3(file, key) {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: this.getContentType(key)
        });

        await this.s3.send(command);
        return this.getSignedS3Url(key);
    }

    async getSignedS3Url(key) {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        });

        return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }

    async uploadProjectFile(projectId, filePath, content) {
        // Try Supabase first, fallback to S3
        try {
            const path = `projects/${projectId}/${filePath}`;
            await this.uploadToSupabase(content, 'project-files', path);
            return await this.supabase.storage.from('project-files').getPublicUrl(path);
        } catch (error) {
            console.error('Supabase upload failed, falling back to S3:', error);
            return await this.uploadToS3(content, `projects/${projectId}/${filePath}`);
        }
    }

    async getProjectFile(projectId, filePath) {
        try {
            return await this.getFromSupabase('project-files', `projects/${projectId}/${filePath}`);
        } catch (error) {
            console.error('Supabase download failed, falling back to S3:', error);
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `projects/${projectId}/${filePath}`
            });
            const response = await this.s3.send(command);
            return await response.Body.transformToByteArray();
        }
    }

    async uploadAsset(file, key) {
        // Upload to both storages for redundancy
        const [supabaseUrl, s3Url] = await Promise.all([
            this.uploadToSupabase(file, 'assets', key)
                .then(() => this.supabase.storage.from('assets').getPublicUrl(key)),
            this.uploadToS3(file, key)
        ]);

        return {
            primary: supabaseUrl,
            backup: s3Url
        };
    }

    getContentType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.fbx': 'application/octet-stream',
            '.unity': 'text/plain',
            '.cs': 'text/plain',
            '.json': 'application/json'
        };
        return types[ext] || 'application/octet-stream';
    }
}

module.exports = new StorageService();