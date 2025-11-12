import express from 'express';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import modelRouter from '../services/modelRouter.js';

const router = express.Router();

// Track request timing for performance metrics
function trackPerformance(model, startTime, success, error = null) {
  const responseTime = Date.now() - startTime;
  modelRouter.recordPerformance(model, {
    success,
    responseTime,
    error
  });
}

// Code Generation
router.post('/generate-code', async (req, res) => {
  const { prompt, model, language } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const startTime = Date.now();
  
  try {
    // Check cache first
    const cached = modelRouter.getCachedResponse(prompt, model || 'auto');
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      console.log('📦 Returning cached response');
      return res.json({ 
        code: cached.response, 
        model: model || 'cached',
        cached: true 
      });
    }
    
    // Analyze complexity and select best model if not specified
    const complexity = modelRouter.analyzeComplexity(prompt);
    const selectedModel = model || modelRouter.selectBestModel('code', { 
      complexity, 
      language 
    });
    
    console.log(`🤖 Using model: ${selectedModel} (complexity: ${complexity})`);
    
    let code = '';
    
    const languageMap = {
      'csharp': 'C# for Unity',
      'cpp': 'C++ for Unreal Engine or game development',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python'
    };
    const languageContext = languageMap[language] || language;
    
    if (model?.includes('gpt')) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
      }
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a game development expert. Generate clean, well-commented ${languageContext} code. Only return the code, no explanations or markdown formatting.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      });
      
      code = completion.choices[0].message.content;
      
    } else if (model?.includes('claude')) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ error: 'Anthropic API key not configured' });
      }
      
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a game development expert. Generate clean, well-commented ${languageContext} code. Only return the code, no explanations or markdown formatting.\n\n${prompt}`
          }
        ],
      });
      
      code = message.content[0].text;
      
    } else if (model?.includes('gemini')) {
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(400).json({ error: 'Google API key not configured' });
      }
      
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-pro' });
      
      const result = await geminiModel.generateContent(
        `You are a game development expert. Generate clean, well-commented ${languageContext} code. Only return the code, no explanations or markdown formatting.\n\n${prompt}`
      );
      
      code = result.response.text();
      
    } else {
      return res.status(400).json({ error: 'Unsupported AI model' });
    }
    
    code = code.replace(/```[a-z]*\n?/g, '').trim();
    
    // Cache the response
    modelRouter.cacheResponse(prompt, selectedModel, code);
    
    // Track performance
    trackPerformance(selectedModel, startTime, true);
    
    res.json({ 
      code, 
      model: selectedModel,
      complexity,
      cached: false,
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('AI generation error:', error);
    trackPerformance(model || 'unknown', startTime, false, error.message);
    res.status(500).json({ 
      error: 'Failed to generate code', 
      details: error.message 
    });
  }
});

// Debug Code
router.post('/debug-code', async (req, res) => {
  const { error, stackTrace, language } = req.body;
  
  if (!error) {
    return res.status(400).json({ error: 'Error message is required' });
  }

  try {
    const debugPrompt = `You are a Unity C# debugging expert. Analyze this error and provide a fix:

Error: ${error}
Stack Trace: ${stackTrace || 'Not provided'}

Provide:
1. What caused the error
2. How to fix it
3. Code example if applicable

Be concise and actionable.`;

    let suggestion = '';
    
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a Unity debugging expert.' },
          { role: 'user', content: debugPrompt }
        ],
        temperature: 0.3,
      });
      suggestion = completion.choices[0].message.content;
    } else if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: debugPrompt }],
      });
      suggestion = message.content[0].text;
    } else {
      suggestion = 'AI debugging requires OpenAI or Anthropic API key.';
    }

    res.json({ suggestion });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
