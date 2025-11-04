import { Types } from 'mongoose';
import { Asset, IAsset, AssetType } from '../models/Asset';
import { storageService } from './storage';
import { createError } from '../utils/error';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';

export interface AssetCreateData {
    name: string;
    type: AssetType;
    filePath: string;
    owner: Types.ObjectId;
    project: Types.ObjectId;
    tags?: string[];
}

export interface AssetUpdateData {
    name?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface AssetQuery {
    page?: number;
    limit?: number;
    search?: string;
    type?: AssetType;
    project?: Types.ObjectId;
    tags?: string[];
}

class AssetService {
    private readonly THUMBNAIL_SIZE = 256;
    private readonly SUPPORTED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    private readonly SUPPORTED_MODEL_TYPES = ['.gltf', '.glb', '.obj', '.fbx'];
    private readonly SUPPORTED_AUDIO_TYPES = ['.mp3', '.wav', '.ogg', '.m4a'];

    async create(data: AssetCreateData): Promise<IAsset> {
        const { name, type, filePath, owner, project, tags } = data;

        // Calculate file hash
        const hash = await storageService.calculateFileHash(filePath);

        // Check for duplicate assets in the same project
        const existingAsset = await Asset.findOne({
            project,
            hash
        });

        if (existingAsset) {
            throw createError('Asset already exists in this project', 400);
        }

        // Get file stats
        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = this.getMimeType(ext);

        // Generate storage key
        const key = storageService.generateStorageKey(project.toString(), type, name);

        // Create temporary directory for processing
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yuga-'));
        let thumbnailPath: string | undefined;

        try {
            // Generate thumbnail if possible
            thumbnailPath = await this.generateThumbnail(filePath, type, tempDir);

            // Upload original file
            await storageService.uploadFile(filePath, key, {
                originalName: name,
                contentType: mimeType
            });

            // Upload thumbnail if generated
            let thumbnailKey: string | undefined;
            if (thumbnailPath) {
                thumbnailKey = `thumbnails/${path.basename(key)}.webp`;
                await storageService.uploadFile(thumbnailPath, thumbnailKey);
            }

            // Extract metadata
            const metadata = await this.extractMetadata(filePath, type);

            // Create asset record
            const asset = new Asset({
                name,
                type,
                mimeType,
                size: stats.size,
                hash,
                path: key,
                metadata,
                thumbnail: thumbnailKey,
                owner,
                project,
                tags: tags || []
            });

            await asset.save();
            return asset;
        } finally {
            // Cleanup temporary files
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    async update(assetId: string, userId: Types.ObjectId, data: AssetUpdateData): Promise<IAsset> {
        const asset = await Asset.findById(assetId);
        if (!asset) {
            throw createError('Asset not found', 404);
        }

        if (!asset.owner.equals(userId)) {
            throw createError('Not authorized to update this asset', 403);
        }

        if (data.name) {
            const existingAsset = await Asset.findOne({
                project: asset.project,
                name: data.name,
                _id: { $ne: assetId }
            });

            if (existingAsset) {
                throw createError('An asset with this name already exists in the project', 400);
            }
        }

        Object.assign(asset, data);
        await asset.save();
        return asset;
    }

    async delete(assetId: string, userId: Types.ObjectId): Promise<void> {
        const asset = await Asset.findById(assetId);
        if (!asset) {
            throw createError('Asset not found', 404);
        }

        if (!asset.owner.equals(userId)) {
            throw createError('Not authorized to delete this asset', 403);
        }

        // Delete from storage
        await storageService.deleteFile(asset.path);
        if (asset.thumbnail) {
            await storageService.deleteFile(asset.thumbnail);
        }

        await asset.deleteOne();
    }

    async findById(assetId: string, userId: Types.ObjectId): Promise<IAsset> {
        const asset = await Asset.findById(assetId);
        if (!asset) {
            throw createError('Asset not found', 404);
        }

        // Check project access (implement this based on your project permissions)
        // This is a simplified check
        if (!asset.owner.equals(userId)) {
            throw createError('Not authorized to access this asset', 403);
        }

        return asset;
    }

    async findAll(query: AssetQuery): Promise<{ assets: IAsset[]; total: number }> {
        const {
            page = 1,
            limit = 50,
            search,
            type,
            project,
            tags
        } = query;

        const filter: any = {};

        if (search) {
            filter.name = new RegExp(search, 'i');
        }

        if (type) {
            filter.type = type;
        }

        if (project) {
            filter.project = project;
        }

        if (tags && tags.length > 0) {
            filter.tags = { $all: tags };
        }

        const total = await Asset.countDocuments(filter);
        const assets = await Asset.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        return { assets, total };
    }

    async generateDownloadUrl(assetId: string, userId: Types.ObjectId): Promise<string> {
        const asset = await this.findById(assetId, userId);
        return storageService.generatePresignedDownloadUrl(asset.path);
    }

    private async generateThumbnail(filePath: string, type: AssetType, tempDir: string): Promise<string | undefined> {
        const ext = path.extname(filePath).toLowerCase();
        const thumbnailPath = path.join(tempDir, 'thumbnail.webp');

        try {
            if (this.SUPPORTED_IMAGE_TYPES.includes(ext)) {
                await sharp(filePath)
                    .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp()
                    .toFile(thumbnailPath);
                return thumbnailPath;
            }

            if (type === AssetType.Model) {
                // Implement model thumbnail generation
                // This could involve using a renderer to capture a preview
                return undefined;
            }

            if (type === AssetType.Audio) {
                // Generate waveform image
                // This would require additional audio processing libraries
                return undefined;
            }

            return undefined;
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            return undefined;
        }
    }

    private async extractMetadata(filePath: string, type: AssetType): Promise<Record<string, any>> {
        const ext = path.extname(filePath).toLowerCase();
        const metadata: Record<string, any> = {};

        try {
            if (this.SUPPORTED_IMAGE_TYPES.includes(ext)) {
                const imageInfo = await sharp(filePath).metadata();
                metadata.width = imageInfo.width;
                metadata.height = imageInfo.height;
                metadata.format = imageInfo.format;
                metadata.space = imageInfo.space;
                metadata.channels = imageInfo.channels;
            }

            if (type === AssetType.Audio) {
                // Add audio metadata extraction
                // This would require additional audio processing libraries
            }

            if (type === AssetType.Model) {
                // Add model metadata extraction
                // This would require parsing different 3D file formats
            }
        } catch (error) {
            console.error('Metadata extraction failed:', error);
        }

        return metadata;
    }

    private getMimeType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.gltf': 'model/gltf+json',
            '.glb': 'model/gltf-binary',
            '.obj': 'model/obj',
            '.fbx': 'application/octet-stream',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }
}

export const assetService = new AssetService();