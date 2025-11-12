/**
 * Asset Generation Pipeline
 * Handles texture, 3D model, and audio generation
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class AssetPipeline {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_assets');
    this.ensureTempDir();
  }
  
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Generate texture using Stable Diffusion
   */
  async generateTexture(prompt, options = {}) {
    const {
      width = 512,
      height = 512,
      style = 'realistic',
      format = 'png'
    } = options;
    
    try {
      // Option 1: Use Replicate API (free tier available)
      if (process.env.REPLICATE_API_TOKEN) {
        return await this._generateWithReplicate(prompt, { width, height });
      }
      
      // Option 2: Use Stability AI API
      if (process.env.STABILITY_API_KEY) {
        return await this._generateWithStabilityAI(prompt, { width, height });
      }
      
      // Option 3: Use local Stable Diffusion (if available)
      if (process.env.SD_LOCAL_URL) {
        return await this._generateWithLocalSD(prompt, { width, height });
      }
      
      // Fallback: Return placeholder
      return {
        success: false,
        message: 'No texture generation service configured',
        placeholder: true,
        url: `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(prompt)}`
      };
      
    } catch (error) {
      console.error('Texture generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate with Replicate (Stable Diffusion XL)
   */
  async _generateWithReplicate(prompt, options) {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:latest',
        input: {
          prompt,
          width: options.width,
          height: options.height
        }
      })
    });
    
    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
          }
        }
      );
      result = await pollResponse.json();
    }
    
    if (result.status === 'succeeded') {
      return {
        success: true,
        url: result.output[0],
        provider: 'replicate'
      };
    }
    
    throw new Error('Generation failed');
  }
  
  /**
   * Generate with Stability AI
   */
  async _generateWithStabilityAI(prompt, options) {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          height: options.height,
          width: options.width,
          samples: 1,
          steps: 30
        })
      }
    );
    
    const result = await response.json();
    
    if (result.artifacts && result.artifacts.length > 0) {
      const imageData = result.artifacts[0].base64;
      const filename = `texture_${Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
      
      return {
        success: true,
        filepath,
        filename,
        provider: 'stability-ai'
      };
    }
    
    throw new Error('No image generated');
  }
  
  /**
   * Generate with local Stable Diffusion
   */
  async _generateWithLocalSD(prompt, options) {
    const response = await fetch(`${process.env.SD_LOCAL_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        width: options.width,
        height: options.height,
        steps: 20
      })
    });
    
    const result = await response.json();
    
    if (result.images && result.images.length > 0) {
      const imageData = result.images[0];
      const filename = `texture_${Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
      
      return {
        success: true,
        filepath,
        filename,
        provider: 'local-sd'
      };
    }
    
    throw new Error('No image generated');
  }
  
  /**
   * Generate 3D model using Meshy.ai
   */
  async generate3DModel(prompt, options = {}) {
    const { style = 'realistic', format = 'glb' } = options;
    
    try {
      if (process.env.MESHY_API_KEY) {
        return await this._generateWithMeshy(prompt, { style, format });
      }
      
      // Fallback: Return placeholder
      return {
        success: false,
        message: 'No 3D model generation service configured',
        placeholder: true
      };
      
    } catch (error) {
      console.error('3D model generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate with Meshy.ai
   */
  async _generateWithMeshy(prompt, options) {
    // Create generation task
    const response = await fetch('https://api.meshy.ai/v1/text-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        art_style: options.style,
        output_format: options.format
      })
    });
    
    const task = await response.json();
    
    // Poll for completion (can take 2-5 minutes)
    let result = task;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (result.status !== 'SUCCEEDED' && result.status !== 'FAILED' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      
      const pollResponse = await fetch(
        `https://api.meshy.ai/v1/text-to-3d/${task.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MESHY_API_KEY}`
          }
        }
      );
      result = await pollResponse.json();
      attempts++;
    }
    
    if (result.status === 'SUCCEEDED') {
      return {
        success: true,
        url: result.model_url,
        thumbnail: result.thumbnail_url,
        provider: 'meshy'
      };
    }
    
    throw new Error('3D model generation failed or timed out');
  }
  
  /**
   * Generate audio/voice using ElevenLabs
   */
  async generateVoice(text, options = {}) {
    const { voice = 'default', model = 'eleven_monolingual_v1' } = options;
    
    try {
      if (process.env.ELEVENLABS_API_KEY) {
        return await this._generateWithElevenLabs(text, { voice, model });
      }
      
      return {
        success: false,
        message: 'No voice generation service configured'
      };
      
    } catch (error) {
      console.error('Voice generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate with ElevenLabs
   */
  async _generateWithElevenLabs(text, options) {
    const voiceId = options.voice || 'EXAVITQu4vr4xnSDxMaL'; // Default voice
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: options.model
        })
      }
    );
    
    const audioBuffer = await response.arrayBuffer();
    const filename = `voice_${Date.now()}.mp3`;
    const filepath = path.join(this.tempDir, filename);
    
    fs.writeFileSync(filepath, Buffer.from(audioBuffer));
    
    return {
      success: true,
      filepath,
      filename,
      provider: 'elevenlabs'
    };
  }
  
  /**
   * Optimize asset (compress, resize, etc.)
   */
  async optimizeAsset(filepath, type) {
    // TODO: Implement asset optimization
    // - Compress images
    // - Optimize 3D models
    // - Compress audio
    
    return {
      success: true,
      optimized: false,
      message: 'Optimization not yet implemented'
    };
  }
  
  /**
   * Clean up temporary files
   */
  cleanup() {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.tempDir, file));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Singleton instance
const assetPipeline = new AssetPipeline();

// Cleanup on exit
process.on('exit', () => assetPipeline.cleanup());

export default assetPipeline;
