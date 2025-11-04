import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../types/api';

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      res.json({
        token: data.session?.access_token,
        user: data.user,
      });
    } catch (error: any) {
      res.status(401).json({
        error: error.message,
      });
    }
  },

  async register(req: Request, res: Response) {
    const { email, password } = req.body;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      res.json({
        message: 'Registration successful',
        user: data.user,
      });
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;

      res.json({ user });
    } catch (error: any) {
      res.status(401).json({
        error: error.message,
      });
    }
  },
};