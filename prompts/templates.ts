// Common prompt types
export type CompletionPrompt = {
  text: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
};

export type ChatPrompt = {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  maxTokens?: number;
};

// Base prompt template interface
export interface PromptTemplate<T = any> {
  name: string;
  description: string;
  version: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  build: (params: T) => CompletionPrompt | ChatPrompt;
}

// Example templates
export const gameLogicTemplate: PromptTemplate<{
  concept: string;
  language: string;
  framework?: string;
}> = {
  name: 'Game Logic Generator',
  description: 'Generates game logic code based on natural language description',
  version: '1.0.0',
  parameters: {
    concept: {
      type: 'string',
      description: 'Description of the game mechanic to implement',
      required: true
    },
    language: {
      type: 'string',
      description: 'Target programming language',
      required: true
    },
    framework: {
      type: 'string',
      description: 'Game framework being used'
    }
  },
  build: (params) => ({
    messages: [
      {
        role: 'system',
        content: `You are an expert game developer specializing in ${params.language}${
          params.framework ? ` and ${params.framework}` : ''
        }. Generate clean, well-documented code following best practices.`
      },
      {
        role: 'user',
        content: `Create game logic for: ${params.concept}\n\nProvide the implementation in ${
          params.language
        } with comments explaining the code.`
      }
    ]
  })
};

export const artGenerationTemplate: PromptTemplate<{
  concept: string;
  style: string;
  format: 'image' | '3d';
}> = {
  name: 'Game Art Generator',
  description: 'Generates game art assets based on description',
  version: '1.0.0',
  parameters: {
    concept: {
      type: 'string',
      description: 'Description of the art to generate',
      required: true
    },
    style: {
      type: 'string',
      description: 'Art style (e.g., pixel art, realistic, cartoon)',
      required: true
    },
    format: {
      type: 'string',
      description: 'Output format (image or 3d model)',
      required: true
    }
  },
  build: (params) => ({
    text: `Create a ${params.style} ${params.format === '3d' ? '3D model' : 'image'} of: ${
      params.concept
    }

Art style details:
- Style: ${params.style}
- Format: ${params.format}
${params.format === '3d' ? '- Optimize for game engine usage\n- Include proper UV mapping' : ''}
- Maintain consistent style with game art direction
- Focus on clear silhouette and readability
- Consider performance and optimization

Additional requirements:
- Clean topology${params.format === '3d' ? '\n- Game-ready mesh' : ''}
- Proper scale and proportions
- Attention to detail
- Suitable for game implementation`
  })
};

export const worldGenTemplate: PromptTemplate<{
  theme: string;
  size: string;
  features: string[];
}> = {
  name: 'Game World Generator',
  description: 'Generates game world layouts and content',
  version: '1.0.0',
  parameters: {
    theme: {
      type: 'string',
      description: 'Theme or setting of the world',
      required: true
    },
    size: {
      type: 'string',
      description: 'Size/scale of the world',
      required: true
    },
    features: {
      type: 'array',
      description: 'Key features to include',
      required: true
    }
  },
  build: (params) => ({
    messages: [
      {
        role: 'system',
        content: 'You are an expert game world designer focusing on layout, progression, and player engagement.'
      },
      {
        role: 'user',
        content: `Generate a ${params.size} game world with theme: ${params.theme}

Required features:
${params.features.map(f => `- ${f}`).join('\n')}

Include:
1. World layout description
2. Key locations and their purpose
3. Progression path
4. Points of interest
5. Environmental storytelling elements
6. Recommended player flow`
      }
    ]
  })
};

// Helper to validate parameters
export function validatePromptParams<T>(
  template: PromptTemplate<T>,
  params: Partial<T>
): params is T {
  for (const [key, config] of Object.entries(template.parameters)) {
    if (config.required && !(key in params)) {
      throw new Error(`Missing required parameter: ${key}`);
    }
  }
  return true;
}

// Helper to build prompt
export function buildPrompt<T>(
  template: PromptTemplate<T>,
  params: T
): CompletionPrompt | ChatPrompt {
  if (validatePromptParams(template, params)) {
    return template.build(params);
  }
  throw new Error('Invalid parameters');
}