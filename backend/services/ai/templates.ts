import { z } from 'zod';

// Prompt template schema
export const PromptTemplateSchema = z.object({
  version: z.string(),
  name: z.string(),
  description: z.string(),
  template: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array']),
    description: z.string(),
    required: z.boolean().default(true),
  })),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

// Base templates
export const templates: Record<string, PromptTemplate> = {
  'game-logic-v1': {
    version: '1.0.0',
    name: 'Game Logic Generator',
    description: 'Generates game logic code with standard patterns',
    template: `You are tasked with generating game logic code.
Context: {context}
Requirements: {requirements}
Target Language: {language}
Please generate code following these patterns:
- Use dependency injection
- Follow SOLID principles
- Include XML documentation
- Add unit tests
Code:`,
    parameters: [
      {
        name: 'context',
        type: 'string',
        description: 'Existing codebase context',
        required: true,
      },
      {
        name: 'requirements',
        type: 'string',
        description: 'Specific requirements',
        required: true,
      },
      {
        name: 'language',
        type: 'string',
        description: 'Target programming language',
        required: true,
      },
    ],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  
  'art-generation-v1': {
    version: '1.0.0',
    name: 'Art Asset Generator',
    description: 'Generates prompts for art asset creation',
    template: `Generate a game art asset.
Style Reference: {style}
Requirements: {requirements}
Resolution: {resolution}
Please create an image with:
- Consistent art style
- Game-ready composition
- Clear focal points
Description:`,
    parameters: [
      {
        name: 'style',
        type: 'string',
        description: 'Art style reference',
        required: true,
      },
      {
        name: 'requirements',
        type: 'string',
        description: 'Asset requirements',
        required: true,
      },
      {
        name: 'resolution',
        type: 'string',
        description: 'Target resolution',
        required: true,
      },
    ],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
};

// Template manager
export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    // Load built-in templates
    Object.entries(templates).forEach(([key, template]) => {
      this.templates.set(key, template);
    });
  }

  async getTemplate(name: string, version?: string): Promise<PromptTemplate> {
    const key = version ? `${name}-v${version}` : name;
    const template = this.templates.get(key);
    if (!template) {
      throw new Error(`Template not found: ${key}`);
    }
    return template;
  }

  async addTemplate(template: PromptTemplate): Promise<void> {
    const parsed = PromptTemplateSchema.parse(template);
    const key = `${parsed.name}-v${parsed.version}`;
    this.templates.set(key, parsed);
  }

  async listTemplates(): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values());
  }

  async validateTemplate(template: unknown): Promise<boolean> {
    try {
      PromptTemplateSchema.parse(template);
      return true;
    } catch {
      return false;
    }
  }
}