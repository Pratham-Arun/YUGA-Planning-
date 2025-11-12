/**
 * Smart AI Model Router
 * Selects the best AI model based on task complexity, cost, and availability
 */

class ModelRouter {
  constructor() {
    this.modelStats = new Map(); // Track performance metrics
    this.cache = new Map(); // Cache responses for identical prompts
  }
  
  /**
   * Select best model based on task requirements
   */
  selectBestModel(task, options = {}) {
    const {
      complexity = 'medium',
      language = 'csharp',
      maxCost = 'high',
      preferLocal = false,
      requireSpeed = false,
      contextSize = 'medium'
    } = options;
    
    // Check for speed requirement
    if (requireSpeed) {
      return this._selectFastModel(task, preferLocal);
    }
    
    // Model selection rules with fallbacks
    const rules = {
      // Code generation
      'code-simple': this._selectCodeModel('simple', maxCost, preferLocal, language),
      'code-medium': this._selectCodeModel('medium', maxCost, preferLocal, language),
      'code-complex': this._selectCodeModel('complex', maxCost, preferLocal, language),
      
      // Debugging
      'debug-simple': this._selectWithFallback(['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro']),
      'debug-complex': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro']),
      
      // Asset generation
      'texture': this._selectWithFallback(['stable-diffusion-xl', 'dall-e-3', 'midjourney']),
      '3d-model': this._selectWithFallback(['meshy-ai', 'tripo-ai']),
      'audio': this._selectWithFallback(['elevenlabs', 'google-tts']),
      
      // World building
      'world-generation': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro']),
      'npc-dialogue': this._selectWithFallback(['claude-3.5-sonnet', 'gpt-4', 'gemini-1.5-pro']),
      'quest-generation': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet']),
      
      // Documentation
      'documentation': this._selectWithFallback(['gpt-3.5-turbo', 'claude-3-haiku']),
      'comments': this._selectWithFallback(['gpt-3.5-turbo', 'gemini-pro']),
      
      // Refactoring
      'refactor': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet']),
      'optimize': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet']),
      
      // Testing
      'unit-tests': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet']),
      'integration-tests': this._selectWithFallback(['gpt-4', 'claude-3.5-sonnet'])
    };
    
    const taskKey = `${task}-${complexity}`;
    return rules[taskKey] || rules[task] || this._getDefaultModel(maxCost);
  }
  
  /**
   * Select model with fallback options
   */
  _selectWithFallback(models) {
    for (const model of models) {
      if (this._isModelAvailable(model)) {
        return model;
      }
    }
    return models[0]; // Return first as default
  }
  
  /**
   * Select fast model for speed-critical tasks
   */
  _selectFastModel(task, preferLocal) {
    if (preferLocal && this._isModelAvailable('starcoder')) {
      return 'starcoder';
    }
    
    // Fast cloud models
    const fastModels = ['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro'];
    return this._selectWithFallback(fastModels);
  }
  
  /**
   * Select code generation model
   */
  _selectCodeModel(complexity, maxCost, preferLocal, language) {
    // Local model preference
    if (preferLocal) {
      const localModels = {
        'csharp': 'starcoder',
        'cpp': 'codellama',
        'javascript': 'starcoder',
        'python': 'codellama'
      };
      return localModels[language] || 'starcoder';
    }
    
    // Language-specific optimizations
    const languagePreferences = {
      'csharp': ['gpt-4', 'claude-3.5-sonnet', 'gpt-3.5-turbo'],
      'cpp': ['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro'],
      'javascript': ['gpt-4', 'claude-3.5-sonnet', 'gpt-3.5-turbo'],
      'python': ['gpt-4', 'claude-3.5-sonnet', 'gpt-3.5-turbo'],
      'glsl': ['gpt-4', 'claude-3.5-sonnet'],
      'hlsl': ['gpt-4', 'claude-3.5-sonnet']
    };
    
    // Complexity-based selection
    if (complexity === 'simple' && maxCost === 'low') {
      return this._selectWithFallback(['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro']);
    }
    
    if (complexity === 'complex' || maxCost === 'high') {
      const preferredModels = languagePreferences[language] || ['gpt-4', 'claude-3.5-sonnet'];
      return this._selectWithFallback(preferredModels);
    }
    
    // Medium complexity
    return this._selectWithFallback(['gpt-4', 'gpt-3.5-turbo', 'claude-3.5-sonnet']);
  }
  
  /**
   * Get default model based on cost preference
   */
  _getDefaultModel(maxCost) {
    if (maxCost === 'low') {
      return 'gpt-3.5-turbo';
    }
    return 'gpt-4';
  }
  
  /**
   * Check if model is available (has API key)
   */
  _isModelAvailable(model) {
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes('gpt') || modelLower.includes('dall-e')) {
      return !!process.env.OPENAI_API_KEY;
    }
    if (modelLower.includes('claude')) {
      return !!process.env.ANTHROPIC_API_KEY;
    }
    if (modelLower.includes('gemini')) {
      return !!process.env.GOOGLE_API_KEY;
    }
    if (modelLower.includes('stable-diffusion')) {
      return !!process.env.STABILITY_API_KEY;
    }
    if (modelLower.includes('elevenlabs')) {
      return !!process.env.ELEVENLABS_API_KEY;
    }
    if (modelLower.includes('meshy') || modelLower.includes('tripo')) {
      return !!process.env.MESHY_API_KEY;
    }
    if (modelLower.includes('starcoder') || modelLower.includes('codellama')) {
      return true; // Local models always available if Ollama is running
    }
    return false;
  }
  
  /**
   * Analyze prompt complexity
   */
  analyzeComplexity(prompt) {
    const wordCount = prompt.split(/\s+/).length;
    const hasMultipleRequirements = prompt.split(/and|also|additionally|furthermore/i).length > 2;
    const hasCodeExamples = /```|code|example|implement/i.test(prompt);
    
    if (wordCount > 100 || hasMultipleRequirements) {
      return 'complex';
    }
    if (wordCount > 30 || hasCodeExamples) {
      return 'medium';
    }
    return 'simple';
  }
  
  /**
   * Get cached response if available
   */
  getCachedResponse(prompt, model) {
    const cacheKey = `${model}:${this._hashPrompt(prompt)}`;
    return this.cache.get(cacheKey);
  }
  
  /**
   * Cache response for future use
   */
  cacheResponse(prompt, model, response) {
    const cacheKey = `${model}:${this._hashPrompt(prompt)}`;
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Simple hash function for prompts
   */
  _hashPrompt(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Track model performance
   */
  recordPerformance(model, metrics) {
    if (!this.modelStats.has(model)) {
      this.modelStats.set(model, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalCost: 0
      });
    }
    
    const stats = this.modelStats.get(model);
    stats.totalRequests++;
    
    if (metrics.success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    
    // Update average response time
    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalRequests - 1) + metrics.responseTime) /
      stats.totalRequests
    );
    
    if (metrics.cost) {
      stats.totalCost += metrics.cost;
    }
    
    this.modelStats.set(model, stats);
  }
  
  /**
   * Get model statistics
   */
  getModelStats(model) {
    return this.modelStats.get(model) || null;
  }
  
  /**
   * Get all statistics
   */
  getAllStats() {
    const stats = {};
    for (const [model, data] of this.modelStats.entries()) {
      stats[model] = {
        ...data,
        successRate: data.totalRequests > 0 
          ? (data.successfulRequests / data.totalRequests * 100).toFixed(2) + '%'
          : '0%'
      };
    }
    return stats;
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const modelRouter = new ModelRouter();

export default modelRouter;

  /**
   * Estimate cost for a request
   */
  estimateCost(model, promptTokens, completionTokens) {
    const pricing = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'claude-3.5-sonnet': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
      'gemini-1.5-pro': { prompt: 0.0035, completion: 0.0105 },
      'gemini-pro': { prompt: 0.00025, completion: 0.0005 }
    };
    
    const modelPricing = pricing[model] || { prompt: 0, completion: 0 };
    return (promptTokens / 1000 * modelPricing.prompt) + 
           (completionTokens / 1000 * modelPricing.completion);
  }
  
  /**
   * Get recommended model based on budget
   */
  getModelByBudget(task, maxBudget) {
    const budgetTiers = {
      'low': ['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro'],
      'medium': ['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro'],
      'high': ['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro']
    };
    
    let tier = 'low';
    if (maxBudget > 0.01) tier = 'medium';
    if (maxBudget > 0.05) tier = 'high';
    
    return this._selectWithFallback(budgetTiers[tier]);
  }
  
  /**
   * Load balancing across models
   */
  getLoadBalancedModel(task, options = {}) {
    const availableModels = this._getAvailableModelsForTask(task);
    
    if (availableModels.length === 0) {
      return this._getDefaultModel(options.maxCost || 'high');
    }
    
    // Select model with lowest current load
    let bestModel = availableModels[0];
    let lowestLoad = this._getModelLoad(bestModel);
    
    for (const model of availableModels) {
      const load = this._getModelLoad(model);
      if (load < lowestLoad) {
        lowestLoad = load;
        bestModel = model;
      }
    }
    
    return bestModel;
  }
  
  /**
   * Get available models for a task
   */
  _getAvailableModelsForTask(task) {
    const taskModels = {
      'code': ['gpt-4', 'claude-3.5-sonnet', 'gpt-3.5-turbo', 'gemini-1.5-pro'],
      'debug': ['gpt-4', 'claude-3.5-sonnet', 'gpt-3.5-turbo'],
      'documentation': ['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro']
    };
    
    const models = taskModels[task] || taskModels['code'];
    return models.filter(model => this._isModelAvailable(model));
  }
  
  /**
   * Get current load for a model (based on recent requests)
   */
  _getModelLoad(model) {
    const stats = this.modelStats.get(model);
    if (!stats) return 0;
    
    // Simple load metric: failed requests / total requests
    return stats.failedRequests / Math.max(stats.totalRequests, 1);
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000,
      hitRate: this._calculateCacheHitRate()
    };
  }
  
  /**
   * Calculate cache hit rate
   */
  _calculateCacheHitRate() {
    // This would need to track hits/misses in production
    return '0%';
  }
}

// Singleton instance
const modelRouter = new ModelRouter();

export default modelRouter;
