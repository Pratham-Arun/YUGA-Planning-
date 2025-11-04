const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    template: {
        type: String,
        enum: ['blank', '3d-adventure', 'arena'],
        default: 'blank'
    },
    settings: {
        engine: {
            type: String,
            enum: ['unity', 'bevy'],
            default: 'unity'
        },
        language: {
            type: String,
            enum: ['csharp', 'cpp', 'rhai'],
            default: 'csharp'
        }
    },
    assets: [{
        name: String,
        type: String,
        url: String,
        metadata: mongoose.Schema.Types.Mixed
    }],
    scenes: [{
        name: String,
        data: mongoose.Schema.Types.Mixed,
        isMain: Boolean
    }],
    scripts: [{
        name: String,
        content: String,
        language: String
    }],
    aiHistory: [{
        prompt: String,
        response: mongoose.Schema.Types.Mixed,
        timestamp: Date,
        approved: Boolean
    }]
}, {
    timestamps: true
});

// Add indexes for faster queries
projectSchema.index({ owner: 1 });
projectSchema.index({ collaborators: 1 });
projectSchema.index({ 'assets.name': 1 });
projectSchema.index({ 'scenes.name': 1 });

// Add instance methods
projectSchema.methods.addCollaborator = function(userId) {
    if (!this.collaborators.includes(userId)) {
        this.collaborators.push(userId);
    }
    return this.save();
};

projectSchema.methods.removeCollaborator = function(userId) {
    this.collaborators = this.collaborators.filter(id => !id.equals(userId));
    return this.save();
};

projectSchema.methods.isAccessibleBy = function(userId) {
    return this.owner.equals(userId) || 
           this.collaborators.some(id => id.equals(userId));
};

// Add static methods
projectSchema.statics.findUserProjects = function(userId) {
    return this.find({
        $or: [
            { owner: userId },
            { collaborators: userId }
        ]
    }).sort('-updatedAt');
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;