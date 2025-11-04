import { PluginManager } from '@yuga/plugin-sdk';
import { ModelProviderInterface, StorageProviderInterface } from '@yuga/core';
import { FeatureFlags } from './feature-flags';
import { logger } from './monitoring';

export interface ProviderConfig {
  type: string;
  config: Record<string, any>;
}

export interface YUGAConfig {
  modelProvider: ProviderConfig;
  storageProvider: ProviderConfig;
  featureFlags: Record<string, boolean>;
  localMode?: boolean;
}

export class YUGACore {
  private modelProvider: ModelProviderInterface;
  private storageProvider: StorageProviderInterface;
  private pluginManager: PluginManager;
  private features: FeatureFlags;
  private config: YUGAConfig;

  constructor(config: YUGAConfig) {
    this.config = config;
    this.features = new FeatureFlags(config.featureFlags);
    this.pluginManager = new PluginManager();
    
    // Initialize providers based on config
    this.initializeProviders();
  }

  private async initializeProviders() {
    // Dynamic provider loading
    const modelModule = await import(`./providers/model/${this.config.modelProvider.type}`);
    const storageModule = await import(`./providers/storage/${this.config.storageProvider.type}`);

    this.modelProvider = new modelModule.default(this.config.modelProvider.config);
    this.storageProvider = new storageModule.default(this.config.storageProvider.config);

    // Local mode overrides
    if (this.config.localMode) {
      const { LocalModelProvider } = await import('./providers/model/local');
      const { LocalStorageProvider } = await import('./providers/storage/local');
      
      this.modelProvider = new LocalModelProvider();
      this.storageProvider = new LocalStorageProvider();
    }
  }

  // Plugin Management
  async loadPlugins(pluginDir: string) {
    try {
      await this.pluginManager.loadFromDirectory(pluginDir);
      logger.info(`Loaded ${this.pluginManager.plugins.length} plugins`);
    } catch (error) {
      logger.error('Failed to load plugins', error);
    }
  }

  async callPluginHook(hookName: string, ...args: any[]) {
    return this.pluginManager.executeHook(hookName, ...args);
  }

  // Feature Flag Management
  isFeatureEnabled(featureKey: string, userId?: string): boolean {
    return this.features.isEnabled(featureKey, userId);
  }

  async setFeatureFlag(featureKey: string, enabled: boolean, percentage?: number) {
    await this.features.setFlag(featureKey, enabled, percentage);
  }

  // Provider Access (with type safety)
  getModelProvider<T extends ModelProviderInterface>(): T {
    return this.modelProvider as T;
  }

  getStorageProvider<T extends StorageProviderInterface>(): T {
    return this.storageProvider as T;
  }

  // Provider Hot-Swapping
  async swapModelProvider(newConfig: ProviderConfig) {
    const newModule = await import(`./providers/model/${newConfig.type}`);
    const newProvider = new newModule.default(newConfig.config);
    
    // Ensure new provider is ready before swapping
    await newProvider.healthCheck();
    
    this.modelProvider = newProvider;
    this.config.modelProvider = newConfig;
    
    logger.info(`Swapped model provider to ${newConfig.type}`);
  }

  async swapStorageProvider(newConfig: ProviderConfig) {
    const newModule = await import(`./providers/storage/${newConfig.type}`);
    const newProvider = new newModule.default(newConfig.config);
    
    // Migrate data if needed
    if (this.storageProvider.supportsMigration) {
      await this.storageProvider.migrateToProvider(newProvider);
    }
    
    this.storageProvider = newProvider;
    this.config.storageProvider = newConfig;
    
    logger.info(`Swapped storage provider to ${newConfig.type}`);
  }

  // Graceful Shutdown
  async shutdown() {
    await this.pluginManager.unloadAll();
    await this.modelProvider.cleanup();
    await this.storageProvider.cleanup();
    logger.info('YUGA Core shut down successfully');
  }
}