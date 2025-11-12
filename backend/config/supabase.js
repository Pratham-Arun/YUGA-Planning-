const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  
  async createProject(userId, projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: userId,
        name: projectData.name,
        description: projectData.description,
        settings: projectData.settings,
        created_at: new Date()
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async getProject(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async saveAsset(projectId, assetData) {
    const { data, error } = await supabase
      .from('assets')
      .insert([{
        project_id: projectId,
        type: assetData.type,
        name: assetData.name,
        url: assetData.url,
        metadata: assetData.metadata
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  }
};
