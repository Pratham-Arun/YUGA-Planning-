// Project controller with Supabase integration
import { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, UUID } from '../types/api';
import { APIError } from '../middleware/error';

export class ProjectController {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  listProjects = async (req: Request, res: Response) => {
    if (!req.user) throw new APIError(401, 'Unauthorized');

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('userId', req.user.id);

    if (error) throw new APIError(500, 'Database error', error);

    res.json(projects);
  };

  getProject = async (req: Request, res: Response) => {
    if (!req.user) throw new APIError(401, 'Unauthorized');

    const { id } = req.params;
    const { data: project, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('userId', req.user.id)
      .single();

    if (error) throw new APIError(404, 'Project not found');

    res.json(project);
  };

  createProject = async (req: Request, res: Response) => {
    if (!req.user) throw new APIError(401, 'Unauthorized');

    const projectData: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = req.body;

    const { data: project, error } = await this.supabase
      .from('projects')
      .insert([
        {
          ...projectData,
          userId: req.user.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
      .single();

    if (error) throw new APIError(500, 'Failed to create project', error);

    // Create project storage bucket
    await this.supabase
      .storage
      .createBucket(`project-${project.id}`, {
        public: false,
        allowedMimeTypes: ['image/*', 'model/*', 'application/json'],
      });

    res.status(201).json(project);
  };

  updateProject = async (req: Request, res: Response) => {
    if (!req.user) throw new APIError(401, 'Unauthorized');

    const { id } = req.params;
    const updates = req.body;

    const { data: project, error } = await this.supabase
      .from('projects')
      .update({
        ...updates,
        updatedAt: Date.now(),
      })
      .eq('id', id)
      .eq('userId', req.user.id)
      .single();

    if (error) throw new APIError(404, 'Project not found');

    res.json(project);
  };

  deleteProject = async (req: Request, res: Response) => {
    if (!req.user) throw new APIError(401, 'Unauthorized');

    const { id } = req.params;

    // Delete project storage bucket first
    await this.supabase
      .storage
      .deleteBucket(`project-${id}`);

    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('userId', req.user.id);

    if (error) throw new APIError(404, 'Project not found');

    res.status(204).end();
  };
}