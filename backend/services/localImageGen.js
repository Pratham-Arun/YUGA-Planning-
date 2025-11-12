const axios = require('axios');

/**
 * Local Image Generation Service
 * Integrates with Stable Diffusion WebUI (Automatic1111) and ComfyUI
 */
class LocalImageGenerator {
  constructor() {
    this.a1111Url = process.env.A1111_URL || 'http://localhost:7860';
    this.comfyUrl = process.env.COMFY_URL || 'http://localhost:8188';
    this.defaultModel = 'sd_xl_base_1.0';
  }

  /**
   * Generate texture from text prompt
   */
  async generateTexture(prompt, options = {}) {
    const payload = {
      prompt: prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
      steps: options.steps || 20,
      width: options.width || 512,
      height: options.height || 512,
      cfg_scale: options.cfgScale || 7,
      sampler_name: options.sampler || 'DPM++ 2M Karras',
      seed: options.seed || -1
    };

    try {
      const response = await axios.post(
        `${this.a1111Url}/sdapi/v1/txt2img`,
        payload,
        { timeout: 120000 } // 2 minute timeout
      );
      
      return {
        success: true,
        image: response.data.images[0], // Base64
        info: JSON.parse(response.data.info),
        seed: response.data.info.seed
      };
    } catch (error) {
      console.error('Local image generation failed:', error.message);
      
      // Fallback to cloud if local fails
      return {
        success: false,
        error: error.message,
        fallback: 'cloud'
      };
    }
  }

  /**
   * Image-to-image transformation
   */
  async img2img(imageBase64, prompt, options = {}) {
    const payload = {
      init_images: [imageBase64],
      prompt: prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality',
      denoising_strength: options.strength || 0.7,
      steps: options.steps || 20,
      width: options.width || 512,
      height: options.height || 512
    };

    try {
      const response = await axios.post(
        `${this.a1111Url}/sdapi/v1/img2img`,
        payload,
        { timeout: 120000 }
      );

      return {
        success: true,
        image: response.data.images[0]
      };
    } catch (error) {
      console.error('Image-to-image failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate seamless texture (tileable)
   */
  async generateSeamlessTexture(prompt, options = {}) {
    const enhancedPrompt = `${prompt}, seamless, tileable, pattern, texture`;
    
    return await this.generateTexture(enhancedPrompt, {
      ...options,
      width: options.width || 1024,
      height: options.height || 1024,
      steps: options.steps || 30
    });
  }

  /**
   * Check if local SD is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${this.a1111Url}/sdapi/v1/sd-models`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels() {
    try {
      const response = await axios.get(`${this.a1111Url}/sdapi/v1/sd-models`);
      return response.data.map(model => ({
        name: model.title,
        hash: model.hash,
        filename: model.filename
      }));
    } catch (error) {
      console.error('Failed to get models:', error.message);
      return [];
    }
  }

  /**
   * Set active model
   */
  async setModel(modelName) {
    try {
      await axios.post(`${this.a1111Url}/sdapi/v1/options`, {
        sd_model_checkpoint: modelName
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LocalImageGenerator();
