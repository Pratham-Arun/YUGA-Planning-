import { Response } from 'express';
import { AuthenticatedRequest } from '../types/api';
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

export const gitController = {
  async initRepo(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    const git: SimpleGit = simpleGit(projectPath);

    try {
      await git.init();
      await git.add('./*');
      await git.commit('Initial commit');

      res.json({
        message: 'Git repository initialized',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async commit(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const { message } = req.body;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    const git: SimpleGit = simpleGit(projectPath);

    try {
      await git.add('./*');
      const result = await git.commit(message);

      res.json({
        hash: result.commit,
        message: 'Changes committed successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async push(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    const git: SimpleGit = simpleGit(projectPath);

    try {
      await git.push('origin', 'main');

      res.json({
        message: 'Changes pushed successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async status(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    const git: SimpleGit = simpleGit(projectPath);

    try {
      const status = await git.status();

      res.json(status);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async log(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    const git: SimpleGit = simpleGit(projectPath);

    try {
      const log = await git.log();

      res.json(log);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
};