const mongoose = require('mongoose');

const aiJobSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    options: {
        model: String,
        quality: String,
        assetStyle: String,
        language: String,
        engine: String
    },
    sceneSpec: Object,
    codeDiff: String,
    assets: [{
        type: String,
        name: String,
        url: String
    }],
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'applied'],
        default: 'pending'
    },
    error: String,
    created: {
        type: Date,
        default: Date.now
    },
    completed: Date,
    appliedAt: Date
});

aiJobSchema.index({ projectId: 1 });
aiJobSchema.index({ status: 1 });

module.exports = mongoose.model('AIJob', aiJobSchema);