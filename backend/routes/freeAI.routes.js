const express = require('express');
const router = express.Router();
const localImageGen = require('../services/localImageGen');
const localLLM = require('../services/localLLM');

/**
 * Free AI Tools Routes
 * Integrates local AI tools (Ollama, Stable Diffusion, etc.)
 */

// Local image generation
router.post('/image/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await localImageGen.generateTexture(prompt, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seamless texture generation
router.post('/image/seamless', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const result = await localImageGen.generateSeamlessTexture(prompt, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Image-to-image transformation
router.post('/image/transform', async (req, res) => {
  try {
    const { image, prompt, options } = req.body;
    const result = await localImageGen.img2img(image, prompt, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Local LLM dialogue generation
router.post('/dialogue/generate', async (req, res) => {
  try {
    const { context, character, options } = req.body;
    
    if (!context || !character) {
      return res.status(400).json({ error: 'Context and character are required' });
    }

    const result = await localLLM.generateDialogue(context, character, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quest generation
router.post('/quest/generate', async (req, res) => {
  try {
    const { questType, difficulty } = req.body;
    const result = await localLLM.generateQuestDescription(questType, difficulty);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check service availability
router.get('/status', async (req, res) => {
  const status = {
    ollama: await localLLM.isAvailable(),
    stableDiffusion: await localImageGen.isAvailable()
  };
  res.json(status);
});

// List available models
router.get('/models', async (req, res) => {
  try {
    const [llmModels, sdModels] = await Promise.all([
      localLLM.listModels(),
      localImageGen.getModels()
    ]);
    
    res.json({
      llm: llmModels,
      stableDiffusion: sdModels
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
