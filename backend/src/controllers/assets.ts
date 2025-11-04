import { Response } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest, UUID } from '../types/api';

export const assetsController = {
  async listAssets(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;

    try {
      const { data, error } = await supabase
        .storage
        .from('assets')
        .list(`${projectId}/`);

      if (error) throw error;

      res.json({ assets: data });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async uploadAsset(req: AuthenticatedRequest, res: Response) {
    const { projectId } = req.params;
    const file = req.files?.file;

    if (!file) {
      return res.status(400).json({
        error: 'No file provided',
      });
    }

    try {
      const { data, error } = await supabase
        .storage
        .from('assets')
        .upload(`${projectId}/${file.name}`, file.data, {
          contentType: file.mimetype,
        });

      if (error) throw error;

      res.json({ 
        url: data?.path,
        name: file.name,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async deleteAsset(req: AuthenticatedRequest, res: Response) {
    const { projectId, assetId } = req.params;

    try {
      const { error } = await supabase
        .storage
        .from('assets')
        .remove([`${projectId}/${assetId}`]);

      if (error) throw error;

      res.json({
        message: 'Asset deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async downloadAsset(req: AuthenticatedRequest, res: Response) {
    const { projectId, assetId } = req.params;

    try {
      const { data, error } = await supabase
        .storage
        .from('assets')
        .download(`${projectId}/${assetId}`);

      if (error) throw error;

      res.send(data);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
};