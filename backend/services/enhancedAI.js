import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { HfInference } from '@huggingface/inference';
import { ChromaClient } from 'chromadb';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import fetch from 'node-fetch';
import ProjectAnalyzer from './projectAnalyzer.js';

// Model provider interface
class ModelProvider {
  async generateText(prompt, options = {}) { throw new Error('Not implemented'); }
  async generateCode(prompt, options = {}) { throw new Error('Not implemented'); }
  async generateImage(prompt, options = {}) { throw new Error('Not implemented'); }
  async generate3D(prompt, options = {}) { throw new Error('Not implemented'); }
  async embedText(text) { throw new Error('Not implemented'); }
}

// OpenAI Provider
class OpenAIProvider extends ModelProvider {
  constructor(apiKey) {
    super();
    this.client = new OpenAI({ apiKey });
    this.embeddings = new OpenAIEmbeddings({ apiKey });
  }

  async generateText(prompt, options = {}) {
    const completion = await this.client.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7
    });
    return completion.choices[0].message.content;
  }

  async generateCode(prompt, options = {}) {
    return this.generateText(prompt, { ...options, temperature: 0.2 });
  }

  async embedText(text) {
    return await this.embeddings.embedQuery(text);
  }
}

// Mistral Provider (via Ollama)
class MistralProvider extends ModelProvider {
  constructor(endpoint = 'http://localhost:11434') {
    super();
    this.endpoint = endpoint;
  }

  async generateText(prompt, options = {}) {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'mixtral',
        prompt,
        stream: false
      })
    });
    const data = await response.json();
    return data.response;
  }

  async generateCode(prompt, options = {}) {
    return this.generateText(`Generate code for: ${prompt}`, options);
  }
}

// HuggingFace Provider
class HuggingFaceProvider extends ModelProvider {
  constructor(apiKey) {
    super();
    this.client = new HfInference(apiKey);
  }

  async generateCode(prompt, options = {}) {
    const result = await this.client.textGeneration({
      model: options.model || 'bigcode/starcoder',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.2,
        return_full_text: false
      }
    });
    return result.generated_text;
  }

  async generateImage(prompt, options = {}) {
    const result = await this.client.textToImage({
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      inputs: prompt,
      parameters: options
    });
    return result;
  }
}

// Replicate Provider
class ReplicateProvider extends ModelProvider {
  constructor(apiToken) {
    super();
    this.apiToken = apiToken;
  }

  async generateImage(prompt, options = {}) {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt,
          ...options
        }
      })
    });
    const prediction = await response.json();
    return prediction.urls.get;
  }

  async generate3D(prompt, options = {}) {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
        input: {
          prompt,
          ...options
        }
      })
    });
    const prediction = await response.json();
    return prediction.urls.get;
  }
}

/**
 * Enhanced AI Service
 * Provides context-aware code generation, explanation, and multi-file support
 * with support for multiple AI providers and local models
 */
class EnhancedAI {
  constructor() {
    // Initialize providers
    this.providers = new Map();
    
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }
    
    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.set('huggingface', new HuggingFaceProvider(process.env.HUGGINGFACE_API_KEY));
    }
    
    if (process.env.REPLICATE_API_KEY) {
      this.providers.set('replicate', new ReplicateProvider(process.env.REPLICATE_API_KEY));
    }

    // Local models via Ollama
    this.providers.set('mistral', new MistralProvider());

    // Vector stores
    this.setupVectorStores();
  }

  /**
   * Generate code with project context
   */
  async generateWithContext(options) {
    const {
      prompt,
      model,
      language,
      projectPath,
      includeTests = false,
      multiFile = false
    } = options;

    // Analyze project if path provided
    let context = null;
    if (projectPath) {
      const analyzer = new ProjectAnalyzer(projectPath);
      await analyzer.analyze();
      context = analyzer.getContextSummary();
    }

    // Build enhanced prompt
    const enhancedPrompt = this.buildEnhancedPrompt({
      prompt,
      language,
      context,
      includeTests,
      multiFile
    });

    // Generate with selected AI
    const result = await this.generate(model, enhancedPrompt, language);

    // Parse response
    return this.parseResponse(result, { includeTests, multiFile });
  }

  /**
   * Build enhanced prompt with context
   */
  buildEnhancedPrompt(options) {
    const { prompt, language, context, includeTests, multiFile } = options;

    const languageMap = {
      'csharp': 'C# for Unity',
      'cpp': 'C++ for Unreal Engine or game development',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python'
    };

    const languageContext = languageMap[language] || language;

    let enhancedPrompt = `You are an expert game developer specializing in ${languageContext}.

`;

    // Add project context if available
    if (context) {
      enhancedPrompt += `PROJECT CONTEXT:
- Total Classes: ${context.totalClasses}
- Total Functions: ${context.totalFunctions}
- Frameworks: ${context.frameworks.join(', ') || 'None detected'}
- Naming Convention: ${context.style.namingConvention}
- Existing Classes: ${context.existingClasses.join(', ')}
- Common Imports: ${context.commonImports.join(', ')}

`;
    }

    enhancedPrompt += `REQUIREMENTS:
1. Generate clean, well-commented ${languageContext} code
2. Follow ${context?.style.namingConvention || 'standard'} naming conventions
3. Include proper error handling
4. Add inline documentation
5. Follow game development best practices
${includeTests ? '6. Include unit tests\n' : ''}${multiFile ? '7. Generate multiple related files if needed\n' : ''}
USER REQUEST:
${prompt}

`;

    if (multiFile) {
      enhancedPrompt += `
FORMAT YOUR RESPONSE AS JSON:
{
  "files": [
    {
      "name": "FileName.ext",
      "content": "file content here",
      "description": "what this file does"
    }
  ],
  "explanation": "overall explanation"
}
`;
    } else {
      enhancedPrompt += `
Return ONLY the code, no markdown formatting, no explanations outside the code comments.
`;
    }

    return enhancedPrompt;
  }

  /**
   * Generate code using selected AI model
   */
  async setupVectorStores() {
    // Setup Supabase for production
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      this.vectorStore = new SupabaseVectorStore(
        new OpenAIEmbeddings(),
        { 
          url: process.env.SUPABASE_URL,
          key: process.env.SUPABASE_KEY,
          tableName: 'embeddings'
        }
      );
    }

    // Setup local Chroma for offline/development
    this.localVectorStore = new ChromaClient();
  }

  // Get best provider for task
  getProvider(task, preferredProvider = null) {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider);
    }

    // Default provider selection
    switch (task) {
      case 'code':
        return this.providers.get('openai') || 
               this.providers.get('mistral') || 
               this.providers.get('huggingface');
      case 'image':
        return this.providers.get('replicate') ||
               this.providers.get('huggingface');
      case '3d':
        return this.providers.get('replicate');
      default:
        return this.providers.get('openai') ||
               this.providers.get('mistral');
    }
  }

  // Log model usage for analytics
  async logModelUsage(provider, task, success, duration) {
    if (this.vectorStore) {
      await this.vectorStore.client.from('model_analytics').insert({
        provider,
        task,
        success,
        duration,
        timestamp: new Date()
      });
    }
  }

  async generate(model, prompt, language) {
    const startTime = Date.now();
    let success = false;
    let result = null;

    try {
      // Determine provider based on model name
      let provider;
      if (model?.includes('gpt')) {
        provider = this.getProvider('code', 'openai');
      } else if (model?.includes('starcoder')) {
        provider = this.getProvider('code', 'huggingface');
      } else if (model?.includes('mistral')) {
        provider = this.getProvider('code', 'mistral');
      } else {
        provider = this.getProvider('code');
      }

      if (!provider) {
        throw new Error('No suitable provider found for: ' + model);
      }

      result = await provider.generateCode(prompt, { language });
      success = true;
      return result;

    } finally {
      await this.logModelUsage(
        model,
        'code_generation',
        success,
        Date.now() - startTime
      );
    }
  }

  /**
   * Generate with OpenAI
   */
  async generateWithOpenAI(model, prompt) {
    if (!this.openai) throw new Error('OpenAI API key not configured');

    const completion = await this.openai.chat.completions.create({
      model: model || 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert game development AI assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    return completion.choices[0].message.content;
  }

  /**
   * Generate with Claude
   */
  async generateWithClaude(model, prompt) {
    if (!this.anthropic) throw new Error('Anthropic API key not configured');

    const message = await this.anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return message.content[0].text;
  }

  /**
   * Generate with Gemini
   */
  async generateWithGemini(model, prompt) {
    if (!this.google) throw new Error('Google API key not configured');

    const geminiModel = this.google.getGenerativeModel({ 
      model: model || 'gemini-1.5-pro' 
    });

    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Parse AI response
   */
  parseResponse(response, options) {
    const { includeTests, multiFile } = options;

    // Try to parse as JSON for multi-file
    if (multiFile) {
      try {
        // Extract JSON from markdown code blocks if present
        let jsonStr = response;
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr);
        return {
          files: parsed.files || [],
          explanation: parsed.explanation || ''
        };
      } catch (error) {
        // Fallback: treat as single file
        return {
          files: [{
            name: 'GeneratedCode.cs',
            content: this.cleanCode(response),
            description: 'Generated code'
          }],
          explanation: 'Code generated successfully'
        };
      }
    }

    // Single file response
    return {
      code: this.cleanCode(response),
      explanation: 'Code generated successfully'
    };
  }

  /**
   * Clean code from markdown formatting
   */
  cleanCode(code) {
    // Remove markdown code blocks
    code = code.replace(/```[a-z]*\n?/g, '');
    code = code.trim();
    return code;
  }

  /**
   * Explain existing code
   */
  async explainCode(code, language, model = 'gpt-4') {
    const prompt = `Explain this ${language} game development code in detail:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. **Overview**: What does this code do?
2. **Key Components**: Explain each major part
3. **Best Practices**: What's done well?
4. **Improvements**: What could be better?
5. **Usage**: How to use this code?

Format your response in markdown.`;

    const explanation = await this.generate(model, prompt, language);
    return explanation;
  }

  /**
   * Refactor code with suggestions
   */
  async refactorCode(code, language, model = 'gpt-4') {
    const prompt = `Refactor this ${language} game code following best practices:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Refactored code with improvements
2. List of changes made
3. Explanation of why each change improves the code

Return as JSON:
{
  "refactoredCode": "improved code here",
  "changes": ["change 1", "change 2"],
  "explanation": "overall explanation"
}`;

    const result = await this.generate(model, prompt, language);
    
    try {
      const parsed = JSON.parse(this.cleanCode(result));
      return parsed;
    } catch (error) {
      return {
        refactoredCode: this.cleanCode(result),
        changes: [],
        explanation: 'Code refactored'
      };
    }
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(code, language, model = 'gpt-4') {
    const prompt = `Generate comprehensive documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Summary
2. Class/Function descriptions
3. Parameters and return values
4. Usage examples
5. Notes and warnings

Format as markdown.`;

    const docs = await this.generate(model, prompt, language);
    return docs;
  }

  /**
   * Generate unit tests
   */
  async generateTests(code, language, model = 'gpt-4') {
    const testFrameworks = {
      'csharp': 'NUnit',
      'cpp': 'Google Test',
      'javascript': 'Jest',
      'typescript': 'Jest',
      'python': 'pytest'
    };

    const framework = testFrameworks[language] || 'standard testing framework';

    const prompt = `Generate unit tests for this ${language} code using ${framework}:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Test setup
2. Test cases for main functionality
3. Edge case tests
4. Error handling tests

Return complete test file.`;

    const tests = await this.generate(model, prompt, language);
    return this.cleanCode(tests);
  }
}

export default EnhancedAI;
