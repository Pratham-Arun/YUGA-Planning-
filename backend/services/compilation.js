const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Docker = require('dockerode');

class CompilationService {
    constructor() {
        this.docker = new Docker();
        this.buildPath = path.join(process.cwd(), 'builds');
        this.initialize();
    }

    async initialize() {
        await fs.mkdir(this.buildPath, { recursive: true });
    }

    async compileAndTest(projectId, projectPath) {
        const buildDir = path.join(this.buildPath, projectId);
        await fs.mkdir(buildDir, { recursive: true });

        try {
            // Copy project to build directory
            await this.copyProjectToBuildDir(projectPath, buildDir);

            // Run compilation in Docker container
            const compileResult = await this.runCompileInDocker(buildDir);

            // Run tests if compilation succeeds
            if (compileResult.success) {
                const testResult = await this.runTestsInDocker(buildDir);
                return {
                    success: testResult.success,
                    compilationOutput: compileResult.output,
                    testOutput: testResult.output
                };
            }

            return {
                success: false,
                compilationOutput: compileResult.output
            };
        } finally {
            // Cleanup
            await fs.rm(buildDir, { recursive: true, force: true });
        }
    }

    async copyProjectToBuildDir(projectPath, buildDir) {
        const filesToCopy = [
            'Assets/**/*',
            'ProjectSettings/**/*',
            'Packages/**/*',
            '*.csproj',
            '*.sln'
        ];

        for (const pattern of filesToCopy) {
            await new Promise((resolve, reject) => {
                exec(`robocopy "${projectPath}" "${buildDir}" "${pattern}" /E /NFL /NDL /NJH /NJS /nc /ns /np || exit 0`,
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

    async runCompileInDocker(buildDir) {
        const container = await this.docker.createContainer({
            Image: 'unity-builder:latest',
            Cmd: [
                '-batchmode',
                '-nographics',
                '-projectPath',
                '/project',
                '-buildWindows64Player',
                '/project/Build/windows/game.exe',
                '-logFile',
                '/project/Build/build.log'
            ],
            HostConfig: {
                Binds: [`${buildDir}:/project`]
            }
        });

        try {
            await container.start();
            const logs = await container.logs({ follow: true, stdout: true, stderr: true });
            const exitCode = (await container.wait()).StatusCode;

            return {
                success: exitCode === 0,
                output: logs.toString()
            };
        } finally {
            await container.remove({ force: true });
        }
    }

    async runTestsInDocker(buildDir) {
        const container = await this.docker.createContainer({
            Image: 'unity-builder:latest',
            Cmd: [
                '-batchmode',
                '-nographics',
                '-projectPath',
                '/project',
                '-runTests',
                '-testPlatform',
                'PlayMode',
                '-testResults',
                '/project/Build/test-results.xml'
            ],
            HostConfig: {
                Binds: [`${buildDir}:/project`]
            }
        });

        try {
            await container.start();
            const logs = await container.logs({ follow: true, stdout: true, stderr: true });
            const exitCode = (await container.wait()).StatusCode;

            // Parse test results XML
            const testResults = await fs.readFile(
                path.join(buildDir, 'Build', 'test-results.xml'),
                'utf8'
            );

            return {
                success: exitCode === 0,
                output: logs.toString(),
                testResults
            };
        } finally {
            await container.remove({ force: true });
        }
    }

    async getCompilationErrors(buildLog) {
        const log = await fs.readFile(buildLog, 'utf8');
        const errors = [];
        
        // Parse Unity compilation errors
        const errorRegex = /^(?:Assets|Scripts).*?\((\d+),(\d+)\): error CS\d+: (.+)$/gm;
        let match;
        
        while ((match = errorRegex.exec(log)) !== null) {
            errors.push({
                line: parseInt(match[1]),
                column: parseInt(match[2]),
                message: match[3]
            });
        }

        return errors;
    }

    async analyzeBuildSize(buildDir) {
        const stats = {};
        
        // Get size of build artifacts
        const buildFiles = await fs.readdir(path.join(buildDir, 'Build', 'windows'));
        
        for (const file of buildFiles) {
            const filePath = path.join(buildDir, 'Build', 'windows', file);
            const fileStat = await fs.stat(filePath);
            stats[file] = fileStat.size;
        }

        return stats;
    }
}

module.exports = new CompilationService();