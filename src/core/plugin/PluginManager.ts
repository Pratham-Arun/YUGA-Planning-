import { Plugin, PluginHooks } from '@yuga/plugin-sdk';
import { logger } from '../monitoring';

export class PluginManager {
  private plugins: Plugin[] = [];
  private hooks: Map<string, Set<Function>> = new Map();

  // Load plugin from a directory
  async loadFromDirectory(dir: string) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const pluginDir = path.join(dir, entry.name);
        const manifestPath = path.join(pluginDir, 'plugin.json');
        
        try {
          // Load plugin manifest
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          // Validate manifest
          if (!this.validateManifest(manifest)) {
            logger.warn(`Invalid plugin manifest for ${entry.name}`);
            continue;
          }
          
          // Load plugin code
          const mainPath = path.join(pluginDir, manifest.main);
          const pluginModule = require(mainPath);
          const plugin = new pluginModule.default();
          
          // Register plugin
          await this.registerPlugin(plugin, manifest);
          
        } catch (error) {
          logger.error(`Failed to load plugin ${entry.name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to load plugins directory:', error);
      throw error;
    }
  }

  // Register a plugin and its hooks
  private async registerPlugin(plugin: Plugin, manifest: any) {
    try {
      // Initialize plugin
      await plugin.initialize();
      this.plugins.push(plugin);
      
      // Register hooks
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, new Set());
        }
        this.hooks.get(hookName)!.add(handler);
      }
      
      logger.info(`Registered plugin: ${manifest.name} v${manifest.version}`);
      
    } catch (error) {
      logger.error(`Failed to register plugin ${manifest.name}:`, error);
      throw error;
    }
  }

  // Execute a hook with provided arguments
  async executeHook(hookName: string, ...args: any[]) {
    const hooks = this.hooks.get(hookName);
    if (!hooks) return [];
    
    const results = [];
    
    for (const hook of hooks) {
      try {
        const result = await hook(...args);
        results.push(result);
      } catch (error) {
        logger.error(`Hook ${hookName} execution failed:`, error);
      }
    }
    
    return results;
  }

  // Validate plugin manifest
  private validateManifest(manifest: any): boolean {
    const required = ['name', 'version', 'main', 'hooks'];
    return required.every(field => manifest.hasOwnProperty(field));
  }

  // Unload all plugins
  async unloadAll() {
    for (const plugin of this.plugins) {
      try {
        await plugin.cleanup();
      } catch (error) {
        logger.error(`Failed to unload plugin:`, error);
      }
    }
    
    this.plugins = [];
    this.hooks.clear();
  }

  // Get loaded plugins
  getPlugins(): Plugin[] {
    return [...this.plugins];
  }

  // Check if a plugin is loaded
  isPluginLoaded(name: string): boolean {
    return this.plugins.some(p => p.name === name);
  }
}