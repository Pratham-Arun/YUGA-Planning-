import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AssetType {
    Model = 'model',
    Texture = 'texture',
    Audio = 'audio',
    Script = 'script',
    Material = 'material',
    Animation = 'animation',
    Other = 'other'
}

export interface IAsset extends Document {
    name: string;
    type: AssetType;
    mimeType: string;
    size: number;
    hash: string;
    path: string;
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
        [key: string]: any;
    };
    thumbnail?: string;
    owner: Types.ObjectId;
    project: Types.ObjectId;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const assetSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: Object.values(AssetType),
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {}
    },
    thumbnail: String,
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Indexes
assetSchema.index({ owner: 1, project: 1, name: 1 }, { unique: true });
assetSchema.index({ hash: 1 });
assetSchema.index({ type: 1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ createdAt: -1 });

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);