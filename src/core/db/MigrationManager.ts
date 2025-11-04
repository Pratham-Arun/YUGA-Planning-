import knex, { Knex } from 'knex';
import { logger } from '../monitoring';

interface MigrationConfig {
  directory: string;
  tableName?: string;
  schemaName?: string;
}

export class MigrationManager {
  private knex: Knex;
  private config: MigrationConfig;

  constructor(dbConfig: Knex.Config, migrationConfig: MigrationConfig) {
    this.knex = knex(dbConfig);
    this.config = {
      tableName: 'migrations',
      ...migrationConfig
    };
  }

  // Run pending migrations
  async migrate(): Promise<void> {
    try {
      logger.info('Starting database migration');
      
      await this.knex.migrate.latest({
        directory: this.config.directory,
        tableName: this.config.tableName,
        schemaName: this.config.schemaName
      });
      
      const version = await this.getCurrentVersion();
      logger.info(`Migration completed. Current version: ${version}`);
      
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  // Rollback last migration
  async rollback(): Promise<void> {
    try {
      logger.info('Rolling back last migration');
      
      await this.knex.migrate.rollback({
        directory: this.config.directory,
        tableName: this.config.tableName,
        schemaName: this.config.schemaName
      });
      
      const version = await this.getCurrentVersion();
      logger.info(`Rollback completed. Current version: ${version}`);
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  // Get current migration version
  async getCurrentVersion(): Promise<string> {
    const result = await this.knex(this.config.tableName!)
      .orderBy('id', 'desc')
      .first();
    return result ? result.name : 'No migrations';
  }

  // Get pending migrations
  async getPendingMigrations(): Promise<string[]> {
    return await this.knex.migrate.list({
      directory: this.config.directory,
      tableName: this.config.tableName,
      schemaName: this.config.schemaName
    });
  }

  // Create a new migration file
  async createMigration(name: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/\D/g, '');
      const filename = `${timestamp}_${name}.ts`;
      
      const template = `
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Implementation
}

export async function down(knex: Knex): Promise<void> {
  // Rollback implementation
}
      `.trim();

      const fs = require('fs').promises;
      const path = require('path');
      
      await fs.writeFile(
        path.join(this.config.directory, filename),
        template
      );
      
      logger.info(`Created migration: ${filename}`);
      
    } catch (error) {
      logger.error('Failed to create migration:', error);
      throw error;
    }
  }

  // Run migration tests
  async testMigration(name: string): Promise<boolean> {
    try {
      // Create temporary database for testing
      const tempDb = await this.createTempDatabase();
      
      // Run migration up
      await tempDb.migrate.up({
        directory: this.config.directory,
        tableName: this.config.tableName,
        name
      });
      
      // Run migration down
      await tempDb.migrate.down({
        directory: this.config.directory,
        tableName: this.config.tableName,
        name
      });
      
      // Cleanup
      await this.dropTempDatabase(tempDb);
      
      return true;
    } catch (error) {
      logger.error(`Migration test failed for ${name}:`, error);
      return false;
    }
  }

  private async createTempDatabase(): Promise<Knex> {
    const config = { ...this.knex.client.config };
    config.connection.database += '_test';
    
    const tempDb = knex(config);
    await tempDb.raw('CREATE DATABASE ??', [config.connection.database]);
    
    return tempDb;
  }

  private async dropTempDatabase(tempDb: Knex): Promise<void> {
    const dbName = tempDb.client.config.connection.database;
    await tempDb.raw('DROP DATABASE ??', [dbName]);
    await tempDb.destroy();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.knex.destroy();
  }
}