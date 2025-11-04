import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { AssetType } from '../models/Asset';
import { createError } from '../utils/error';

const execAsync = promisify(exec);

interface ImportOptions {
    generateThumbnail?: boolean;
    extractMetadata?: boolean;
    normalize?: boolean;
}

interface ImportResult {
    normalizedPath?: string;
    thumbnailPath?: string;
    metadata: Record<string, any>;
}

export class AssetImporter {
    private readonly SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tga', '.bmp'];
    private readonly SUPPORTED_MODEL_FORMATS = ['.gltf', '.glb', '.obj', '.fbx', '.dae'];
    private readonly SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    private readonly SUPPORTED_SCRIPT_FORMATS = ['.js', '.ts'];
    private readonly THUMBNAIL_SIZE = 256;

    async importAsset(filePath: string, assetType: AssetType, options: ImportOptions = {}): Promise<ImportResult> {
        const ext = path.extname(filePath).toLowerCase();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yuga-import-'));

        try {
            const result: ImportResult = {
                metadata: {}
            };

            // Basic file validation
            await this.validateFile(filePath, assetType);

            // Extract metadata if requested
            if (options.extractMetadata) {
                result.metadata = await this.extractMetadata(filePath, assetType);
            }

            // Generate thumbnail if requested
            if (options.generateThumbnail) {
                result.thumbnailPath = await this.generateThumbnail(filePath, assetType, tempDir);
            }

            // Normalize asset if requested
            if (options.normalize) {
                result.normalizedPath = await this.normalizeAsset(filePath, assetType, tempDir);
            }

            return result;
        } catch (error: any) {
            if (error instanceof Error) {
                throw createError(`Failed to import asset: ${error.message}`, 500);
            }
            throw createError('Failed to import asset: Unknown error', 500);
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }

    private async validateFile(filePath: string, assetType: AssetType): Promise<void> {
        const ext = path.extname(filePath).toLowerCase();
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
            throw createError('Not a valid file', 400);
        }

        switch (assetType) {
            case AssetType.Model:
                if (!this.SUPPORTED_MODEL_FORMATS.includes(ext)) {
                    throw createError(`Unsupported model format: ${ext}`, 400);
                }
                break;

            case AssetType.Texture:
                if (!this.SUPPORTED_IMAGE_FORMATS.includes(ext)) {
                    throw createError(`Unsupported image format: ${ext}`, 400);
                }
                break;

            case AssetType.Audio:
                if (!this.SUPPORTED_AUDIO_FORMATS.includes(ext)) {
                    throw createError(`Unsupported audio format: ${ext}`, 400);
                }
                break;

            case AssetType.Script:
                if (!this.SUPPORTED_SCRIPT_FORMATS.includes(ext)) {
                    throw createError(`Unsupported script format: ${ext}`, 400);
                }
                break;
        }
    }

    private async extractMetadata(filePath: string, assetType: AssetType): Promise<Record<string, any>> {
        const ext = path.extname(filePath).toLowerCase();
        const metadata: Record<string, any> = {};

        switch (assetType) {
            case AssetType.Texture:
                try {
                    const imageInfo = await sharp(filePath).metadata();
                    metadata.width = imageInfo.width;
                    metadata.height = imageInfo.height;
                    metadata.channels = imageInfo.channels;
                    metadata.format = imageInfo.format;
                } catch (error) {
                    console.error('Failed to extract image metadata:', error);
                }
                break;

            case AssetType.Model:
                try {
                    if (ext === '.gltf') {
                        const content = await fs.readFile(filePath, 'utf-8');
                        const gltf = JSON.parse(content);
                        metadata.version = gltf.asset?.version;
                        metadata.generator = gltf.asset?.generator;
                        metadata.meshCount = gltf.meshes?.length || 0;
                        metadata.materialCount = gltf.materials?.length || 0;
                        metadata.textureCount = gltf.textures?.length || 0;
                    } else if (ext === '.obj') {
                        const { stdout } = await execAsync(`wc -l "${filePath}"`);
                        metadata.lineCount = parseInt(stdout.trim().split(' ')[0]);
                    }
                } catch (error) {
                    console.error('Failed to extract model metadata:', error);
                }
                break;

            case AssetType.Audio:
                return new Promise((resolve, reject) => {
                    ffmpeg.ffprobe(filePath, (err, data) => {
                        if (err) {
                            console.error('Failed to extract audio metadata:', err);
                            resolve({});
                            return;
                        }

                        const audioStream = data.streams.find(s => s.codec_type === 'audio');
                        if (audioStream) {
                            metadata.duration = data.format.duration;
                            metadata.bitRate = data.format.bit_rate;
                            metadata.sampleRate = audioStream.sample_rate;
                            metadata.channels = audioStream.channels;
                            metadata.codec = audioStream.codec_name;
                        }
                        resolve(metadata);
                    });
                });
                break;

            case AssetType.Script:
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    metadata.lineCount = content.split('\n').length;
                    // You could add more analysis here, like detecting imports/exports
                } catch (error) {
                    console.error('Failed to extract script metadata:', error);
                }
                break;
        }

        return metadata;
    }

    private async generateThumbnail(filePath: string, assetType: AssetType, tempDir: string): Promise<string | undefined> {
        const thumbnailPath = path.join(tempDir, 'thumbnail.webp');
        const ext = path.extname(filePath).toLowerCase();

        try {
            switch (assetType) {
                case AssetType.Texture:
                    await sharp(filePath)
                        .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .webp({ quality: 80 })
                        .toFile(thumbnailPath);
                    return thumbnailPath;

                case AssetType.Model:
                    // For models, you would need a 3D renderer to generate thumbnails
                    // This could be implemented using Three.js, Babylon.js, or similar
                    // For now, we'll return a placeholder
                    return undefined;

                case AssetType.Audio:
                    // Generate waveform visualization
                    // This would require additional audio processing libraries
                    return undefined;

                default:
                    return undefined;
            }
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            return undefined;
        }
    }

    private async normalizeAsset(filePath: string, assetType: AssetType, tempDir: string): Promise<string | undefined> {
        const ext = path.extname(filePath).toLowerCase();
        const normalizedPath = path.join(tempDir, `normalized${ext}`);

        try {
            switch (assetType) {
                case AssetType.Texture:
                    // Convert to standardized format (e.g., webp for web, png for engine)
                    await sharp(filePath)
                        .png({
                            quality: 100,
                            compressionLevel: 9
                        })
                        .toFile(normalizedPath);
                    return normalizedPath;

                case AssetType.Audio:
                    // Convert to standardized format (e.g., mp3 or ogg)
                    return new Promise((resolve, reject) => {
                        ffmpeg(filePath)
                            .toFormat('mp3')
                            .audioBitrate(192)
                            .on('end', () => resolve(normalizedPath))
                            .on('error', (err) => {
                                console.error('Error normalizing audio:', err);
                                resolve(undefined);
                            })
                            .save(normalizedPath);
                    });

                case AssetType.Model:
                    if (ext === '.obj' || ext === '.fbx' || ext === '.dae') {
                        // Convert to glTF using tools like obj2gltf, fbx2gltf, etc.
                        // This would require additional 3D format conversion tools
                        return undefined;
                    }
                    return undefined;

                case AssetType.Script:
                    // For scripts, you might want to run them through a formatter/linter
                    // or compile TypeScript to JavaScript
                    return undefined;

                default:
                    return undefined;
            }
        } catch (error) {
            console.error('Failed to normalize asset:', error);
            return undefined;
        }
    }
}

export const assetImporter = new AssetImporter();