import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface CompilationResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  artifacts: string[];
}

export interface CompilationConfig {
  framework: 'unity' | 'unreal' | 'godot';
  version: string;
  platform: 'windows' | 'mac' | 'linux';
}

export class SandboxCompiler {
  private docker: Docker;
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.docker = new Docker();
    this.workspaceRoot = workspaceRoot;
  }

  async compile(files: { path: string; content: string }[], config: CompilationConfig): Promise<CompilationResult> {
    const sandboxId = uuidv4();
    const sandboxPath = path.join(this.workspaceRoot, 'sandbox', sandboxId);

    try {
      // Create sandbox directory
      await fs.mkdir(sandboxPath, { recursive: true });

      // Write files to sandbox
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(sandboxPath, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content);
        })
      );

      // Get appropriate container config
      const containerConfig = this.getContainerConfig(config);

      // Create and run container
      const container = await this.docker.createContainer({
        Image: containerConfig.image,
        Cmd: containerConfig.command,
        HostConfig: {
          Binds: [`${sandboxPath}:/workspace`],
          Memory: 4096 * 1024 * 1024, // 4GB
          MemorySwap: -1,
          CpuQuota: 100000, // 100% of CPU
          NetworkMode: 'none',
        },
      });

      // Start container and wait for completion
      await container.start();
      const output = await container.logs({ follow: true, stdout: true, stderr: true });
      const stats = await container.inspect();

      // Parse compilation results
      const result = await this.parseCompilationOutput(sandboxPath, output.toString(), stats.State.ExitCode === 0);

      // Cleanup
      await container.remove();
      await fs.rm(sandboxPath, { recursive: true, force: true });

      return result;
    } catch (error) {
      await fs.rm(sandboxPath, { recursive: true, force: true });
      throw error;
    }
  }

  private getContainerConfig(config: CompilationConfig): { image: string; command: string[] } {
    switch (config.framework) {
      case 'unity':
        return {
          image: `unity-builder:${config.version}`,
          command: ['unity-cli', 'build', '-quit', '-batchmode'],
        };
      case 'unreal':
        return {
          image: `unreal-builder:${config.version}`,
          command: ['UnrealBuildTool', 'Development', config.platform],
        };
      case 'godot':
        return {
          image: `godot-builder:${config.version}`,
          command: ['godot', '--export', config.platform],
        };
      default:
        throw new Error(`Unsupported framework: ${config.framework}`);
    }
  }

  private async parseCompilationOutput(
    sandboxPath: string,
    output: string,
    success: boolean
  ): Promise<CompilationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const artifacts: string[] = [];

    // Parse output for errors and warnings
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('error:')) {
        errors.push(line);
      } else if (line.includes('warning:')) {
        warnings.push(line);
      }
    }

    // Collect build artifacts
    if (success) {
      const buildDir = path.join(sandboxPath, 'build');
      if (await fs.stat(buildDir).catch(() => false)) {
        const files = await fs.readdir(buildDir);
        artifacts.push(...files);
      }
    }

    return {
      success,
      output,
      errors,
      warnings,
      artifacts,
    };
  }
}