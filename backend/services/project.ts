import { Types } from 'mongoose';
import { Project, IProject } from '../models/Project';
import { createError } from '../utils/error';

export interface ProjectCreateData {
    name: string;
    description?: string;
    owner: Types.ObjectId;
    isPublic?: boolean;
    tags?: string[];
    settings?: Record<string, any>;
}

export interface ProjectUpdateData {
    name?: string;
    description?: string;
    isPublic?: boolean;
    tags?: string[];
    settings?: Record<string, any>;
}

export interface ProjectQuery {
    page?: number;
    limit?: number;
    search?: string;
    owner?: Types.ObjectId;
    tags?: string[];
    isPublic?: boolean;
}

class ProjectService {
    async create(data: ProjectCreateData): Promise<IProject> {
        const existingProject = await Project.findOne({
            owner: data.owner,
            name: data.name
        });

        if (existingProject) {
            throw createError('A project with this name already exists', 400);
        }

        const project = new Project(data);
        await project.save();
        return project;
    }

    async update(projectId: string, userId: Types.ObjectId, data: ProjectUpdateData): Promise<IProject> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.owner.equals(userId) && !project.collaborators.some(id => id.equals(userId))) {
            throw createError('Not authorized to update this project', 403);
        }

        if (data.name) {
            const existingProject = await Project.findOne({
                owner: project.owner,
                name: data.name,
                _id: { $ne: projectId }
            });

            if (existingProject) {
                throw createError('A project with this name already exists', 400);
            }
        }

        Object.assign(project, data);
        await project.save();
        return project;
    }

    async delete(projectId: string, userId: Types.ObjectId): Promise<void> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.owner.equals(userId)) {
            throw createError('Not authorized to delete this project', 403);
        }

        await project.deleteOne();
    }

    async findById(projectId: string, userId: Types.ObjectId): Promise<IProject> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.isPublic && 
            !project.owner.equals(userId) && 
            !project.collaborators.some(id => id.equals(userId))) {
            throw createError('Not authorized to view this project', 403);
        }

        return project;
    }

    async findAll(query: ProjectQuery): Promise<{ projects: IProject[]; total: number }> {
        const {
            page = 1,
            limit = 10,
            search,
            owner,
            tags,
            isPublic
        } = query;

        const filter: any = {};

        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }

        if (owner) {
            filter.owner = owner;
        }

        if (tags && tags.length > 0) {
            filter.tags = { $all: tags };
        }

        if (typeof isPublic === 'boolean') {
            filter.isPublic = isPublic;
        }

        const total = await Project.countDocuments(filter);
        const projects = await Project.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        return { projects, total };
    }

    async addCollaborator(projectId: string, userId: Types.ObjectId, collaboratorId: Types.ObjectId): Promise<IProject> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.owner.equals(userId)) {
            throw createError('Not authorized to add collaborators', 403);
        }

        if (!project.collaborators.some(id => id.equals(collaboratorId))) {
            project.collaborators.push(collaboratorId);
            await project.save();
        }

        return project;
    }

    async removeCollaborator(projectId: string, userId: Types.ObjectId, collaboratorId: Types.ObjectId): Promise<IProject> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.owner.equals(userId)) {
            throw createError('Not authorized to remove collaborators', 403);
        }

        project.collaborators = project.collaborators.filter(id => !id.equals(collaboratorId));
        await project.save();

        return project;
    }

    async duplicate(projectId: string, userId: Types.ObjectId, newName: string): Promise<IProject> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw createError('Project not found', 404);
        }

        if (!project.isPublic && 
            !project.owner.equals(userId) && 
            !project.collaborators.some(id => id.equals(userId))) {
            throw createError('Not authorized to duplicate this project', 403);
        }

        const existingProject = await Project.findOne({
            owner: userId,
            name: newName
        });

        if (existingProject) {
            throw createError('A project with this name already exists', 400);
        }

        const duplicateData = {
            name: newName,
            description: project.description,
            owner: userId,
            isPublic: false, // Set duplicated project as private by default
            tags: [...project.tags],
            settings: { ...project.settings.toObject() }
        };

        return this.create(duplicateData);
    }
}

export const projectService = new ProjectService();