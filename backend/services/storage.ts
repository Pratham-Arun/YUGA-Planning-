import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createError } from '../utils/error';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-key'
    },
    endpoint: process.env.S3_ENDPOINT, // For S3-compatible services like MinIO
    forcePathStyle: true // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET || 'yuga-assets';

export class StorageService {
    async uploadFile(filePath: string, key: string, metadata: Record<string, string> = {}): Promise<void> {
        const fileStream = fs.createReadStream(filePath);
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileStream,
            Metadata: metadata
        });

        try {
            await s3Client.send(command);
        } catch (error) {
            throw createError(`Failed to upload file: ${error.message}`, 500);
        }
    }

    async downloadFile(key: string, destinationPath: string): Promise<void> {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        try {
            const { Body } = await s3Client.send(command);
            if (!Body) {
                throw new Error('Empty response body');
            }

            await pipeline(
                Body as NodeJS.ReadableStream,
                fs.createWriteStream(destinationPath)
            );
        } catch (error) {
            throw createError(`Failed to download file: ${error.message}`, 500);
        }
    }

    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        try {
            await s3Client.send(command);
        } catch (error) {
            throw createError(`Failed to delete file: ${error.message}`, 500);
        }
    }

    async generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType
        });

        try {
            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
            throw createError(`Failed to generate upload URL: ${error.message}`, 500);
        }
    }

    async generatePresignedDownloadUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        try {
            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
            throw createError(`Failed to generate download URL: ${error.message}`, 500);
        }
    }

    async calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('error', reject);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    generateStorageKey(projectId: string, assetType: string, fileName: string): string {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(fileName);
        const sanitizedName = path.basename(fileName, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');

        return `${projectId}/${assetType}/${sanitizedName}-${timestamp}-${randomString}${ext}`;
    }
}

export const storageService = new StorageService();