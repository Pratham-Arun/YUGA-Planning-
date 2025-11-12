const axios = require('axios');

/**
 * Local LLM Service
 * Integrates with Ollama and LM Studio for offline AI
 */
class LocalLLM {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.lmStudioUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234';
    this.defaultModel = 'llama3.2';
  }

  /**
   * Generate NPC dialogue
   */
  async generateDialogue(context, character, options = {}) {
    const prompt = `You are ${character.name}, a ${character.role} in a game.
Context: ${context}
Personality: ${character.personality}

Generate a natural dialogue response (max 2 sentences):`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: options.model || this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.8,
          top_p: 0.9,
          max_tokens: 100
        }
      });

      return {
        success: true,
        dialogue: response.data.response.trim(),
        model: options.model || this.defaultModel
      };
    } catch (error) {
      console.error('Local LLM generation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate quest description
   */
  async generateQuestDescription(questType, difficulty) {
    const prompt = `Generate a ${difficulty} difficulty ${questType} quest for a fantasy RPG.
Format as JSON with: title, description, objectives (array), rewards (array)`;

    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: this.defaultModel,
      prompt: prompt,
      stream: false
    });

    return JSON.parse(response.data.response);
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new LocalLLM();
