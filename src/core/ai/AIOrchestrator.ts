import { OpenAI } from 'langchain/llms/openai';
import { HuggingFaceInference } from 'langchain/llms/hf';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { HuggingFaceTransformers } from 'langchain/embeddings/hf';
import { Document } from 'langchain/document';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

export class AIOrchestrator {
  private primaryModel: OpenAI;
  private fallbackModel: HuggingFaceInference;
  private vectorStore: MemoryVectorStore;
  private embeddings: OpenAIEmbeddings | HuggingFaceTransformers;

  constructor(config: {
    openAIKey?: string;
    huggingFaceKey?: string;
    useLocalEmbeddings?: boolean;
  }) {
    // Initialize language models
    this.primaryModel = new OpenAI({
      openAIApiKey: config.openAIKey,
      modelName: 'gpt-4',
      temperature: 0.7,
    });

    this.fallbackModel = new HuggingFaceInference({
      apiKey: config.huggingFaceKey,
      model: 'bigcode/starcoder',
      temperature: 0.7,
    });

    // Initialize embeddings
    this.embeddings = config.useLocalEmbeddings
      ? new HuggingFaceTransformers()
      : new OpenAIEmbeddings({ openAIApiKey: config.openAIKey });

    // Initialize vector store
    this.vectorStore = new MemoryVectorStore(this.embeddings);
  }

  async generateCode(prompt: string, context: string[] = []): Promise<string> {
    const template = `Given the following context and requirements, generate code:
    Context:
    {context}
    
    Requirements:
    {prompt}
    
    Generate code that meets these requirements:`;

    const promptTemplate = new PromptTemplate({
      template,
      inputVariables: ['context', 'prompt'],
    });

    const chain = new LLMChain({
      llm: this.primaryModel,
      prompt: promptTemplate,
    });

    try {
      const result = await chain.call({
        context: context.join('\n'),
        prompt,
      });

      return result.text;
    } catch (error) {
      console.warn('Primary model failed, falling back to StarCoder:', error);
      
      const fallbackChain = new LLMChain({
        llm: this.fallbackModel,
        prompt: promptTemplate,
      });

      const result = await fallbackChain.call({
        context: context.join('\n'),
        prompt,
      });

      return result.text;
    }
  }

  async indexCode(code: string, metadata: Record<string, any> = {}): Promise<void> {
    const doc = new Document({
      pageContent: code,
      metadata,
    });

    await this.vectorStore.addDocuments([doc]);
  }

  async searchSimilarCode(query: string, k: number = 5): Promise<Document[]> {
    return this.vectorStore.similaritySearch(query, k);
  }

  async getEmbedding(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}