import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProject extends Document {
    name: string;
    description?: string;
    owner: Types.ObjectId;
    collaborators: Types.ObjectId[];
    isPublic: boolean;
    thumbnail?: string;
    tags: string[];
    assets: Types.ObjectId[];
    scenes: Types.ObjectId[];
    settings: {
        resolution: {
            width: number;
            height: number;
        };
        [key: string]: any;
    };
    version: string;
    lastModified: Date;
    createdAt: Date;
}

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 1000
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    thumbnail: String,
    tags: [{
        type: String,
        trim: true
    }],
    assets: [{
        type: Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    scenes: [{
        type: Schema.Types.ObjectId,
        ref: 'Scene'
    }],
    settings: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {
            resolution: {
                width: 1920,
                height: 1080
            }
        }
    },
    version: {
        type: String,
        required: true,
        default: '1.0.0'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
projectSchema.index({ owner: 1, name: 1 }, { unique: true });
projectSchema.index({ collaborators: 1 });
projectSchema.index({ isPublic: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);