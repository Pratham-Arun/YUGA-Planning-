const axios = require('axios');

class MeshyAI {
  constructor() {
    this.apiKey = process.env.MESHY_API_KEY;
    this.baseUrl = 'https://api.meshy.ai/v1';
  }

  async textTo3D(prompt, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-3d`,
        {
          prompt: prompt,
          art_style: options.artStyle || 'realistic',
          negative_prompt: options.negativePrompt || '',
          resolution: options.resolution || 'medium'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        taskId: response.data.task_id,
        status: 'processing'
      };
    } catch (error) {
      console.error('Meshy 3D generation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getTaskStatus(taskId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        modelUrl: response.data.model_url,
        thumbnailUrl: response.data.thumbnail_url
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MeshyAI();
