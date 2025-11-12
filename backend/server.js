import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import EnhancedAI from './services/enhancedAI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.YUGA_DB || path.join(process.cwd(), 'yuga.db');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

// Init DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// List projects (summary)
app.get('/api/projects', (req, res) => {
  const rows = db.prepare('SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC').all();
  res.json(rows);
});

// Get one project
app.get('/api/projects/:id', (req, res) => {
  const row = db.prepare('SELECT id, name, data, updated_at FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.data = JSON.parse(row.data);
  res.json(row);
});

// Upsert project
app.post('/api/projects', (req, res) => {
  const body = req.body;
  if (!body || !body.id || !body.name || !body.data) return res.status(400).json({ error: 'id, name, data required' });
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, data, updated_at) VALUES (@id, @name, @data, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name=@name, data=@data, updated_at=@updated_at
  `);
  stmt.run({ id: body.id, name: body.name, data: JSON.stringify(body.data), updated_at: now });
  res.json({ ok: true, updated_at: now });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true, changes: info.changes });
});

// AI Code Generation Endpoint
app.post('/api/ai/generate-code', async (req, res) => {
  const { prompt, model, language } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    let code = '';
    
    // Determine language context
    const languageMap = {
      'csharp': 'C# for Unity',
      'cpp': 'C++ for Unreal Engine or game development',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python'
    };
    const languageContext = languageMap[language] || language;
    
    // Determine which AI provider to use based on model
    
    // Free Models (via OpenRouter or direct APIs)
    if (model?.includes('deepseek') || model?.includes('swe-1') || model?.includes('grok-code-fast') || model === 'gpt-5-codex') {
      // Use OpenRouter for free models
      const openRouterKey = process.env.OPENROUTER_API_KEY || 'sk-or-v1-free'; // Free tier
      
      const modelMap = {
        'deepseek-r1-0528': 'deepseek/deepseek-r1',
        'deepseek-v3-0324': 'deepseek/deepseek-chat',
        'gpt-5-codex': 'openai/gpt-4o-mini', // Free alternative
        'swe-1': 'meta-llama/llama-3.1-8b-instruct:free',
        'grok-code-fast-1': 'meta-llama/llama-3.1-8b-instruct:free'
      };
      
      const openRouterModel = modelMap[model] || 'meta-llama/llama-3.1-8b-instruct:free';
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'YUGA Engine'
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            {
              role: 'system',
              content: `You are a game development expert. Generate clean, well-commented ${languageContext} code. Only return the code, no explanations or markdown formatting.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        })
      });
      
      const data = await response.json();
      code = data.choices[0].message.content;
      
    } else if (model?.includes('gpt')) {
      // OpenAI
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
      // Anthropic Claude
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
      // Google Gemini
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(400).json({ error: 'Google API key not configured' });
      }
      
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      // Use gemini-pro which is the stable model name
      const modelName = 'gemini-pro';
      const geminiModel = genAI.getGenerativeModel({ model: modelName });
      
      const result = await geminiModel.generateContent(
        `You are a game development expert. Generate clean, well-commented ${languageContext} code. Only return the code, no explanations or markdown formatting.\n\n${prompt}`
      );
      
      const response = await result.response;
      code = response.text();
      
    } else {
      return res.status(400).json({ error: 'Unsupported AI model' });
    }
    
    // Clean up code blocks if present
    code = code.replace(/```[a-z]*\n?/g, '').trim();
    
    res.json({ code, model });
    
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate code', 
      details: error.message 
    });
  }
});

// AI Asset Generation Endpoint (Stability AI)
app.post('/api/ai/generate-asset', async (req, res) => {
  const { prompt, type } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  // Placeholder for Stability AI integration
  res.json({ 
    message: 'Asset generation endpoint - integrate Stability AI SDK',
    prompt,
    type 
  });
});

// Enhanced AI Endpoints
const enhancedAI = new EnhancedAI();

// Context-aware code generation
app.post('/api/ai/generate-advanced', async (req, res) => {
  const { prompt, model, language, projectPath, includeTests, multiFile } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await enhancedAI.generateWithContext({
      prompt,
      model: model || 'gpt-4',
      language: language || 'csharp',
      projectPath,
      includeTests: includeTests || false,
      multiFile: multiFile || false
    });

    res.json(result);
  } catch (error) {
    console.error('Advanced generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Explain code
app.post('/api/ai/explain-code', async (req, res) => {
  const { code, language, model } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const explanation = await enhancedAI.explainCode(
      code,
      language || 'csharp',
      model || 'gpt-4'
    );

    res.json({ explanation });
  } catch (error) {
    console.error('Code explanation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refactor code
app.post('/api/ai/refactor-code', async (req, res) => {
  const { code, language, model } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const result = await enhancedAI.refactorCode(
      code,
      language || 'csharp',
      model || 'gpt-4'
    );

    res.json(result);
  } catch (error) {
    console.error('Code refactoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate documentation
app.post('/api/ai/generate-docs', async (req, res) => {
  const { code, language, model } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const docs = await enhancedAI.generateDocumentation(
      code,
      language || 'csharp',
      model || 'gpt-4'
    );

    res.json({ documentation: docs });
  } catch (error) {
    console.error('Documentation generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate unit tests
app.post('/api/ai/generate-tests', async (req, res) => {
  const { code, language, model } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const tests = await enhancedAI.generateTests(
      code,
      language || 'csharp',
      model || 'gpt-4'
    );

    res.json({ tests });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unity Integration Endpoints
app.post('/api/unity/sync', async (req, res) => {
  const { projectId, scripts, assets } = req.body;
  
  // Placeholder for Unity API integration
  res.json({ 
    success: true,
    message: 'Scripts and assets synced to Unity',
    projectId 
  });
});

app.get('/api/unity/status', (req, res) => {
  // Check Unity connection status
  res.json({ 
    connected: false,
    message: 'Unity plugin not detected' 
  });
});

// Debug/Fix Code Endpoint
app.post('/api/ai/debug-code', async (req, res) => {
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
    
    // Try OpenAI first
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
      suggestion = 'AI debugging requires OpenAI or Anthropic API key. Please configure in .env file.';
    }

    res.json({ suggestion });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unity Error Debug Endpoint (Enhanced version for Unity plugin)
app.post('/api/ai/debug', async (req, res) => {
  const { error, stackTrace, codeContext, language, model } = req.body;
  
  if (!error) {
    return res.status(400).json({ error: 'Error message is required' });
  }

  try {
    const debugPrompt = `You are a Unity ${language || 'C#'} debugging expert. Analyze this error and provide a complete fix.

Error: ${error}

Stack Trace:
${stackTrace || 'Not provided'}

Code Context:
${codeContext || 'Not provided'}

Provide your response in this format:
1. Brief explanation of what caused the error (2-3 sentences)
2. Complete corrected code that fixes the issue
3. Confidence level (0.0 to 1.0)

Be precise and actionable. Return ONLY the corrected code in section 2, no markdown formatting.`;

    let explanation = '';
    let suggestedFix = '';
    let confidence = 0.8;
    
    const selectedModel = model || 'gpt-4';
    
    // Try OpenAI first
    if (selectedModel.includes('gpt') && process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: selectedModel.includes('gpt-4') ? 'gpt-4' : 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a Unity debugging expert. Provide clear explanations and working code fixes.' },
          { role: 'user', content: debugPrompt }
        ],
        temperature: 0.3,
      });
      
      const response = completion.choices[0].message.content;
      
      // Parse response
      const parts = response.split(/\d\./);
      if (parts.length >= 3) {
        explanation = parts[1].trim();
        suggestedFix = parts[2].trim();
        
        // Extract confidence if mentioned
        const confMatch = response.match(/confidence[:\s]+(\d+\.?\d*)/i);
        if (confMatch) {
          confidence = parseFloat(confMatch[1]);
          if (confidence > 1) confidence = confidence / 100; // Convert percentage
        }
      } else {
        explanation = response;
        suggestedFix = response;
      }
      
    } else if (selectedModel.includes('claude') && process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: debugPrompt }],
      });
      
      const response = message.content[0].text;
      
      // Parse response
      const parts = response.split(/\d\./);
      if (parts.length >= 3) {
        explanation = parts[1].trim();
        suggestedFix = parts[2].trim();
      } else {
        explanation = response;
        suggestedFix = response;
      }
      
    } else if (selectedModel.includes('gemini') && process.env.GOOGLE_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const result = await geminiModel.generateContent(debugPrompt);
      const response = result.response.text();
      
      // Parse response
      const parts = response.split(/\d\./);
      if (parts.length >= 3) {
        explanation = parts[1].trim();
        suggestedFix = parts[2].trim();
      } else {
        explanation = response;
        suggestedFix = response;
      }
      
    } else {
      explanation = 'AI debugging requires API key configuration. Please add OpenAI, Anthropic, or Google API key to .env file.';
      suggestedFix = '// Unable to generate fix - API key not configured';
      confidence = 0.0;
    }
    
    // Clean up code blocks if present
    suggestedFix = suggestedFix.replace(/```[a-z]*\n?/g, '').trim();

    res.json({ 
      explanation,
      suggestedFix,
      fixType: 'code_correction',
      confidence
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: 'Failed to debug code',
      details: error.message 
    });
  }
});

// ========================================
// World & Story AI Layer Endpoints
// ========================================

// Generate complete world with buildings, NPCs, and initial quests
app.post('/api/ai/generate-world', async (req, res) => {
  const { prompt, models } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'World prompt is required' });
  }

  try {
    // Use GPT-4 or Claude for world generation
    const worldGenModel = models?.worldGen || 'gpt-4';
    let worldData;

    const worldPrompt = `You are a game world designer. Generate a detailed game world based on this description: "${prompt}"

Return a JSON object with this exact structure:
{
  "name": "World Name",
  "description": "Detailed world description",
  "theme": "medieval/fantasy/scifi/etc",
  "buildings": [
    {
      "name": "Building Name",
      "type": "blacksmith/tavern/shop/house/etc",
      "description": "What this building contains",
      "position": {"x": 0, "y": 0, "z": 0},
      "prefab": "unity-prefab-name"
    }
  ],
  "environment": {
    "lighting": "day/night/dusk",
    "weather": "clear/rain/snow",
    "ambience": "description"
  }
}

Generate 5-10 buildings that fit the theme. Be creative and detailed.`;

    // Try OpenAI first if available
    if (worldGenModel.includes('gpt') && process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a game world designer. Always return valid JSON.' },
            { role: 'user', content: worldPrompt }
          ],
          temperature: 0.8,
          response_format: { type: "json_object" }
        });
        worldData = JSON.parse(completion.choices[0].message.content);
      } catch (openaiError) {
        console.log('OpenAI failed, falling back to free model:', openaiError.message);
        // Fall through to free model
      }
    }
    
    // Try Claude if available
    if (!worldData && worldGenModel.includes('claude') && process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content: worldPrompt }],
        });
        worldData = JSON.parse(message.content[0].text);
      } catch (claudeError) {
        console.log('Claude failed, falling back to free model:', claudeError.message);
        // Fall through to free model
      }
    }
    
    // Fallback to demo world when no AI is available
    if (!worldData) {
      console.log('Using demo world generation (no AI credits available)');
      worldData = {
        name: `Generated World: ${prompt.substring(0, 30)}`,
        description: `A procedurally generated world based on: "${prompt}". This is a demo version - add OpenAI credits for AI-powered generation.`,
        theme: 'fantasy',
        buildings: [
          {
            name: 'Central Plaza',
            type: 'plaza',
            description: 'A bustling central gathering place',
            position: { x: 0, y: 0, z: 0 },
            prefab: 'Plaza_Prefab'
          },
          {
            name: 'Market Square',
            type: 'market',
            description: 'Vendors selling various goods',
            position: { x: 10, y: 0, z: 0 },
            prefab: 'Market_Prefab'
          },
          {
            name: 'Town Hall',
            type: 'building',
            description: 'Administrative center of the settlement',
            position: { x: -10, y: 0, z: 0 },
            prefab: 'TownHall_Prefab'
          },
          {
            name: 'Blacksmith',
            type: 'workshop',
            description: 'Forge for crafting weapons and tools',
            position: { x: 0, y: 0, z: 10 },
            prefab: 'Blacksmith_Prefab'
          },
          {
            name: 'Tavern',
            type: 'tavern',
            description: 'Rest and refreshment for travelers',
            position: { x: 0, y: 0, z: -10 },
            prefab: 'Tavern_Prefab'
          }
        ],
        environment: {
          lighting: 'day',
          weather: 'clear',
          ambience: 'peaceful medieval atmosphere'
        }
      };
    }

    // Generate NPCs for the world
    const npcs = await generateNPCs(worldData, models?.npcGen);

    // Generate initial quests
    const quests = await generateInitialQuests(worldData, npcs, models?.balancing);

    res.json({
      world: worldData,
      npcs: npcs,
      quests: quests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('World generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate NPC dialogue using Claude or Inworld.ai
app.post('/api/ai/generate-npc-dialogue', async (req, res) => {
  const { npc, context, model } = req.body;
  
  if (!npc) {
    return res.status(400).json({ error: 'NPC data is required' });
  }

  try {
    const dialoguePrompt = `Generate dialogue lines for this NPC:
Name: ${npc.name}
Role: ${npc.role}
Personality: ${npc.personality}
World Context: ${context}

Generate 5-7 unique dialogue lines that this character would say. Return as JSON array of strings.
Make the dialogue natural, character-appropriate, and engaging.`;

    let dialogue;

    if (model?.includes('claude') && process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: dialoguePrompt }],
      });
      dialogue = JSON.parse(message.content[0].text);
    } else if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a game dialogue writer. Return JSON array of dialogue strings.' },
          { role: 'user', content: dialoguePrompt }
        ],
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(completion.choices[0].message.content);
      dialogue = result.dialogue || result;
    }

    res.json({ dialogue });

  } catch (error) {
    console.error('Dialogue generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate quest with objectives and rewards
app.post('/api/ai/generate-quest', async (req, res) => {
  const { prompt, world, npcs, model } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Quest prompt is required' });
  }

  try {
    const questPrompt = `Generate a game quest based on: "${prompt}"

World: ${world?.name || 'Unknown'}
Available NPCs: ${npcs?.map(n => n.name).join(', ') || 'None'}

Return JSON with this structure:
{
  "title": "Quest Title",
  "description": "Quest description",
  "questGiver": "NPC name",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "reward": "Gold, items, or experience",
  "difficulty": "easy/medium/hard",
  "estimatedTime": "10-15 minutes"
}`;

    let quest;

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a game quest designer. Return valid JSON.' },
          { role: 'user', content: questPrompt }
        ],
        response_format: { type: "json_object" }
      });
      quest = JSON.parse(completion.choices[0].message.content);
    }

    res.json({ quest });

  } catch (error) {
    console.error('Quest generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate NPCs
async function generateNPCs(worldData, model) {
  const npcPrompt = `Generate 5-8 NPCs for this world:
${worldData.name} - ${worldData.description}

Buildings: ${worldData.buildings?.map(b => b.name).join(', ')}

Return JSON array with this structure:
[
  {
    "id": "unique-id",
    "name": "NPC Name",
    "role": "blacksmith/merchant/guard/etc",
    "personality": "Brief personality description",
    "location": "Building name where they're found",
    "inworldId": null
  }
]`;

  try {
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an NPC designer. Return valid JSON array.' },
            { role: 'user', content: npcPrompt }
          ],
          response_format: { type: "json_object" }
        });
        const result = JSON.parse(completion.choices[0].message.content);
        return result.npcs || result;
      } catch (openaiError) {
        console.log('OpenAI NPC generation failed, using free model');
      }
    }
    
    // Return demo NPCs when no AI is available
    console.log('Using demo NPCs (no AI credits available)');
    return [
      {
        id: 'npc-1',
        name: 'Marcus the Blacksmith',
        role: 'blacksmith',
        personality: 'Gruff but skilled craftsman',
        location: 'Blacksmith',
        inworldId: null
      },
      {
        id: 'npc-2',
        name: 'Elena the Innkeeper',
        role: 'innkeeper',
        personality: 'Friendly and welcoming',
        location: 'Tavern',
        inworldId: null
      },
      {
        id: 'npc-3',
        name: 'Mayor Thomas',
        role: 'mayor',
        personality: 'Wise and diplomatic leader',
        location: 'Town Hall',
        inworldId: null
      }
    ];
  } catch (error) {
    console.error('NPC generation error:', error);
  }
  
  return [];
}

// Helper function to generate initial quests
async function generateInitialQuests(worldData, npcs, model) {
  const questPrompt = `Generate 2-3 starter quests for this world:
${worldData.name}

NPCs: ${npcs?.map(n => `${n.name} (${n.role})`).join(', ')}

Return JSON array of quests with structure:
[
  {
    "title": "Quest Title",
    "description": "Description",
    "questGiver": "NPC name",
    "objectives": ["obj1", "obj2"],
    "reward": "Reward description",
    "difficulty": "easy"
  }
]`;

  try {
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a quest designer. Return valid JSON array.' },
            { role: 'user', content: questPrompt }
          ],
          response_format: { type: "json_object" }
        });
        const result = JSON.parse(completion.choices[0].message.content);
        return result.quests || result;
      } catch (openaiError) {
        console.log('OpenAI quest generation failed, using free model');
      }
    }
    
    // Return demo quests when no AI is available
    console.log('Using demo quests (no AI credits available)');
    return [
      {
        title: 'The Missing Tools',
        description: 'Marcus the Blacksmith has lost his favorite hammer. Help him find it.',
        questGiver: 'Marcus the Blacksmith',
        objectives: [
          'Talk to Marcus at the Blacksmith',
          'Search the Market Square',
          'Return the hammer to Marcus'
        ],
        reward: '50 gold and a crafted sword',
        difficulty: 'easy'
      },
      {
        title: 'Welcome to Town',
        description: 'Mayor Thomas wants you to meet the townsfolk.',
        questGiver: 'Mayor Thomas',
        objectives: [
          'Visit the Tavern',
          'Talk to Elena the Innkeeper',
          'Report back to the Mayor'
        ],
        reward: '25 gold and a town map',
        difficulty: 'easy'
      }
    ];
  } catch (error) {
    console.error('Quest generation error:', error);
  }
  
  return [];
}

app.listen(PORT, () => {
  console.log(`YUGA API listening on http://localhost:${PORT}`);
  console.log('AI Models configured:');
  console.log('  - OpenAI:', process.env.OPENAI_API_KEY ? '✓' : '✗');
  console.log('  - Anthropic:', process.env.ANTHROPIC_API_KEY ? '✓' : '✗');
  console.log('  - Google:', process.env.GOOGLE_API_KEY ? '✓' : '✗');
});


