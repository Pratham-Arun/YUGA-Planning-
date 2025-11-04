const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');

const docker = new Docker();

// Base validator class for different engines
class EngineValidator {
    async validate() { throw new Error('Not implemented'); }
    async format() { throw new Error('Not implemented'); }
    async analyze() { throw new Error('Not implemented'); }
    async compile() { throw new Error('Not implemented'); }
}

// Bevy/Rust validator
class BevyValidator extends EngineValidator {
    async format(sandboxDir) {
        return this.runInContainer(sandboxDir, 'rust:latest', [
            'cargo fmt --all -- --check',
            'rustfmt --check src/**/*.rs'
        ]);
    }

    async analyze(sandboxDir) {
        return this.runInContainer(sandboxDir, 'rust:latest', [
            'cargo clippy -- -D warnings',
            'cargo check --all-features'
        ]);
    }

    async compile(sandboxDir) {
        return this.runInContainer(sandboxDir, 'rust:latest', [
            'cargo build --release'
        ]);
    }

    async validate(sandboxDir) {
        const steps = [
            { name: 'format', fn: () => this.format(sandboxDir) },
            { name: 'analyze', fn: () => this.analyze(sandboxDir) },
            { name: 'compile', fn: () => this.compile(sandboxDir) }
        ];

        for (const step of steps) {
            const result = await step.fn();
            if (!result.success) {
                return {
                    success: false,
                    stage: step.name,
                    error: result.error
                };
            }
        }

        return { success: true };
    }

    async runInContainer(sandboxDir, image, commands) {
        try {
            const container = await docker.createContainer({
                Image: image,
                Cmd: ['sh', '-c', commands.join(' && ')],
                HostConfig: {
                    Binds: [`${sandboxDir}:/workspace`],
                    AutoRemove: true
                },
                WorkingDir: '/workspace'
            });

            await container.start();
            const output = await container.logs({
                follow: true,
                stdout: true,
                stderr: true
            });

            const exitCode = await new Promise((resolve) => {
                container.wait((err, data) => resolve(data.StatusCode));
            });

            return {
                success: exitCode === 0,
                error: exitCode !== 0 ? output.toString() : null
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Unity validator
class UnityValidator extends EngineValidator {
    async format(sandboxDir) {
        return this.runInContainer(sandboxDir, 'mcr.microsoft.com/dotnet/sdk:6.0', [
            'dotnet tool install -g dotnet-format',
            'dotnet format --verify-no-changes ./Assets/**/*.cs'
        ]);
    }

    async analyze(sandboxDir) {
        return this.runInContainer(sandboxDir, 'mcr.microsoft.com/dotnet/sdk:6.0', [
            'dotnet tool install -g dotnet-format',
            'dotnet format --verify-no-changes',
            'dotnet analyze'
        ]);
    }

    async compile(sandboxDir) {
        // Using Unity editor in batch mode
        const unityPath = process.env.UNITY_EDITOR_PATH;
        return new Promise((resolve) => {
            exec(
                `"${unityPath}" -batchmode -projectPath "${sandboxDir}" -executeMethod Build.PerformBuild -quit -logFile -`,
                (error, stdout, stderr) => {
                    resolve({
                        success: !error,
                        error: error ? (stderr || stdout) : null
                    });
                }
            );
        });
    }

    async validate(sandboxDir) {
        const steps = [
            { name: 'format', fn: () => this.format(sandboxDir) },
            { name: 'analyze', fn: () => this.analyze(sandboxDir) },
            { name: 'compile', fn: () => this.compile(sandboxDir) }
        ];

        for (const step of steps) {
            const result = await step.fn();
            if (!result.success) {
                return {
                    success: false,
                    stage: step.name,
                    error: result.error
                };
            }
        }

        return { success: true };
    }

    async runInContainer(sandboxDir, image, commands) {
        try {
            const container = await docker.createContainer({
                Image: image,
                Cmd: ['sh', '-c', commands.join(' && ')],
                HostConfig: {
                    Binds: [`${sandboxDir}:/workspace`],
                    AutoRemove: true
                },
                WorkingDir: '/workspace'
            });

            await container.start();
            const output = await container.logs({
                follow: true,
                stdout: true,
                stderr: true
            });

            const exitCode = await new Promise((resolve) => {
                container.wait((err, data) => resolve(data.StatusCode));
            });

            return {
                success: exitCode === 0,
                error: exitCode !== 0 ? output.toString() : null
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class PatchApplicationService {
    constructor() {
        this.sandboxPath = path.join(process.cwd(), 'sandboxes');
        this.validators = {
            bevy: new BevyValidator(),
            unity: new UnityValidator()
        };
    }

    async initialize() {
        await fs.mkdir(this.sandboxPath, { recursive: true });
        
        // Pull required Docker images
        await Promise.all([
            docker.pull('rust:latest'),
            docker.pull('mcr.microsoft.com/dotnet/sdk:6.0')
        ]);
    }

    async createSandbox(projectId) {
        const sandboxId = uuidv4();
        const sandboxDir = path.join(this.sandboxPath, sandboxId);
        
        await fs.mkdir(sandboxDir, { recursive: true });
        return sandboxDir;
    }

    async cleanupSandbox(sandboxDir) {
        try {
            await fs.rm(sandboxDir, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to cleanup sandbox ${sandboxDir}:`, error);
        }
    }

    async applyPatch(projectPath, changes) {
        const sandboxDir = await this.createSandbox(projectPath);
        
        try {
            // Copy project files to sandbox
            await this.copyProjectToSandbox(projectPath, sandboxDir);

            // Apply changes in sandbox
            await this.applyChanges(sandboxDir, changes);

            // Run validation
            await this.validateChanges(sandboxDir);

            // If validation passes, apply changes to actual project
            await this.copyChangesToProject(sandboxDir, projectPath, changes);

            return { success: true };
        } catch (error) {
            throw new Error(`Failed to apply patch: ${error.message}`);
        } finally {
            await this.cleanupSandbox(sandboxDir);
        }
    }

    async copyProjectToSandbox(projectPath, sandboxDir) {
        // Copy only necessary files for validation
        const filesToCopy = [
            'Assets/**/*',
            'ProjectSettings/**/*',
            'Packages/**/*',
            '*.csproj',
            '*.sln'
        ];

        for (const pattern of filesToCopy) {
            await new Promise((resolve, reject) => {
                exec(`robocopy "${projectPath}" "${sandboxDir}" "${pattern}" /E /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`,
                    (error, stdout, stderr) => {
                        if (error && error.code !== 1) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    }
                );
            });
        }
    }

    async applyChanges(sandboxDir, changes) {
        // Apply code changes
        if (changes.code) {
            const scriptPath = path.join(sandboxDir, 'Assets', 'Scripts', 'Generated_Script.cs');
            await fs.mkdir(path.dirname(scriptPath), { recursive: true });
            await fs.writeFile(scriptPath, changes.code, 'utf8');
        }

        // Copy assets
        if (changes.assets?.length) {
            for (const asset of changes.assets) {
                const assetPath = path.join(sandboxDir, 'Assets', 'Generated', path.basename(asset.url));
                await fs.mkdir(path.dirname(assetPath), { recursive: true });
                
                // Download asset from URL and save to sandbox
                const response = await fetch(asset.url);
                const buffer = await response.buffer();
                await fs.writeFile(assetPath, buffer);
            }
        }

        // Apply scene changes
        if (changes.scene) {
            const scenePath = path.join(sandboxDir, 'Assets', 'Scenes', 'Generated_Scene.unity');
            await fs.mkdir(path.dirname(scenePath), { recursive: true });
            
            // Convert scene JSON to Unity scene format
            const sceneContent = await this.convertJsonToUnityScene(changes.scene);
            await fs.writeFile(scenePath, sceneContent, 'utf8');
        }
    }

    async validateChanges(sandboxDir, engine = 'unity') {
        const validator = this.validators[engine];
        if (!validator) {
            throw new Error(`Unsupported engine: ${engine}`);
        }

        const result = await validator.validate(sandboxDir);
        if (!result.success) {
            throw new Error(`Validation failed at ${result.stage}: ${result.error}`);
        }
    }

    async copyChangesToProject(sandboxDir, projectPath, changes) {
        // Copy validated files back to project
        const filesToCopy = [];

        if (changes.code) {
            filesToCopy.push('Assets/Scripts/Generated_Script.cs');
        }

        if (changes.assets?.length) {
            filesToCopy.push('Assets/Generated/*');
        }

        if (changes.scene) {
            filesToCopy.push('Assets/Scenes/Generated_Scene.unity');
        }

        for (const pattern of filesToCopy) {
            await new Promise((resolve, reject) => {
                exec(`robocopy "${sandboxDir}" "${projectPath}" "${pattern}" /E /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`,
                    (error, stdout, stderr) => {
                        if (error && error.code !== 1) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    }
                );
            });
        }
    }

    async convertJsonToUnityScene(sceneJson) {
        // Convert scene JSON to Unity YAML format
        // This is a simplified example - you'll need to implement proper Unity scene format conversion
        const sceneYaml = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_OcclusionBakeSettings:
    smallestOccluder: 5
    smallestHole: 0.25
    backfaceThreshold: 100
  m_SceneGUID: ${uuidv4()}
  m_OcclusionCullingData: {fileID: 0}
--- !u!104 &2
RenderSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 9
  m_Fog: 0
  m_FogColor: {r: 0.5, g: 0.5, b: 0.5, a: 1}
  m_FogMode: 3
  m_FogDensity: 0.01
  m_LinearFogStart: 0
  m_LinearFogEnd: 300
  m_AmbientSkyColor: {r: 0.212, g: 0.227, b: 0.259, a: 1}
  m_AmbientEquatorColor: {r: 0.114, g: 0.125, b: 0.133, a: 1}
  m_AmbientGroundColor: {r: 0.047, g: 0.043, b: 0.035, a: 1}
  m_AmbientIntensity: 1
  m_AmbientMode: 0
  m_SubtractiveShadowColor: {r: 0.42, g: 0.478, b: 0.627, a: 1}
  m_SkyboxMaterial: {fileID: 10304, guid: 0000000000000000f000000000000000, type: 0}
  m_HaloStrength: 0.5
  m_FlareStrength: 1
  m_FlareFadeSpeed: 3
  m_HaloTexture: {fileID: 0}
  m_SpotCookie: {fileID: 10001, guid: 0000000000000000e000000000000000, type: 0}
  m_DefaultReflectionMode: 0
  m_DefaultReflectionResolution: 128
  m_ReflectionBounces: 1
  m_ReflectionIntensity: 1
  m_CustomReflection: {fileID: 0}
  m_Sun: {fileID: 0}
  m_IndirectSpecularColor: {r: 0, g: 0, b: 0, a: 1}
  m_UseRadianceAmbientProbe: 0
`;

        // Add generated game objects
        let gameObjects = '';
        let gameObjectCounter = 3;

        for (const object of sceneJson.objects || []) {
            gameObjects += `--- !u!1 &${gameObjectCounter}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: ${gameObjectCounter + 1}}
  m_Layer: 0
  m_Name: ${object.name}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &${gameObjectCounter + 1}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectCounter}}
  m_LocalRotation: {x: ${object.rotation?.x || 0}, y: ${object.rotation?.y || 0}, z: ${object.rotation?.z || 0}, w: ${object.rotation?.w || 1}}
  m_LocalPosition: {x: ${object.position?.x || 0}, y: ${object.position?.y || 0}, z: ${object.position?.z || 0}}
  m_LocalScale: {x: ${object.scale?.x || 1}, y: ${object.scale?.y || 1}, z: ${object.scale?.z || 1}}
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}
`;
            gameObjectCounter += 2;
        }

        return sceneYaml + gameObjects;
    }
}

module.exports = new PatchApplicationService();