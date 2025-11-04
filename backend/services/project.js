const Project = require('../models/Project');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

class ProjectService {
    constructor() {
        this.storage = new Storage({
            keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        });
        this.bucket = this.storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);
    }

    async createProject(userData, projectData) {
        const project = new Project({
            ...projectData,
            owner: userData.userId
        });

        // Initialize project structure based on template
        if (projectData.template !== 'blank') {
            await this.initializeTemplate(project, projectData.template);
        }

        return project.save();
    }

    async getProject(projectId, userId) {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        
        if (!project.isAccessibleBy(userId)) {
            throw new Error('Access denied');
        }

        return project;
    }

    async updateProject(projectId, userId, updates) {
        const project = await this.getProject(projectId, userId);
        
        Object.keys(updates).forEach(key => {
            if (key !== 'owner' && key !== '_id') { // Protect critical fields
                project[key] = updates[key];
            }
        });

        return project.save();
    }

    async deleteProject(projectId, userId) {
        const project = await this.getProject(projectId, userId);
        
        if (!project.owner.equals(userId)) {
            throw new Error('Only project owner can delete project');
        }

        // Delete associated assets from cloud storage
        for (const asset of project.assets) {
            if (asset.url) {
                const filename = path.basename(asset.url);
                try {
                    await this.bucket.file(filename).delete();
                } catch (error) {
                    console.error(`Failed to delete asset ${filename}:`, error);
                }
            }
        }

        return project.delete();
    }

    async getUserProjects(userId) {
        return Project.findUserProjects(userId);
    }

    async addAsset(projectId, userId, asset) {
        const project = await this.getProject(projectId, userId);
        
        // Upload asset to cloud storage
        const filename = `${projectId}/${Date.now()}-${asset.originalname}`;
        const file = this.bucket.file(filename);
        
        await new Promise((resolve, reject) => {
            const stream = file.createWriteStream({
                metadata: {
                    contentType: asset.mimetype
                }
            });
            
            stream.on('error', reject);
            stream.on('finish', resolve);
            stream.end(asset.buffer);
        });

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filename}`;

        // Add asset to project
        project.assets.push({
            name: asset.originalname,
            type: asset.mimetype,
            url: publicUrl,
            metadata: asset.metadata || {}
        });

        return project.save();
    }

    async addScene(projectId, userId, sceneData) {
        const project = await this.getProject(projectId, userId);
        
        project.scenes.push({
            ...sceneData,
            isMain: project.scenes.length === 0 // First scene is main by default
        });

        return project.save();
    }

    async addScript(projectId, userId, scriptData) {
        const project = await this.getProject(projectId, userId);
        
        project.scripts.push(scriptData);

        return project.save();
    }

    async logAIInteraction(projectId, userId, interaction) {
        const project = await this.getProject(projectId, userId);
        
        project.aiHistory.push({
            ...interaction,
            timestamp: new Date(),
            approved: false
        });

        return project.save();
    }

    async initializeTemplate(project, templateName) {
        // Load template data based on template name
        const templateData = require(`../templates/${templateName}.json`);
        
        // Apply template data to project
        project.scenes = templateData.scenes || [];
        project.scripts = templateData.scripts || [];
        project.assets = templateData.assets || [];
    }
}

module.exports = new ProjectService();