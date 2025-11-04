const { Octokit } = require('@octokit/rest');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

class SharingService {
    constructor() {
        this.storage = new Storage({
            keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        });
        this.bucket = this.storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);
    }

    async shareViaGitHub(projectId, projectPath, userData) {
        try {
            const octokit = new Octokit({
                auth: userData.githubToken
            });

            // Create repository name from project name
            const repoName = `yuga-${projectId}`.toLowerCase();

            // Create repository
            const { data: repo } = await octokit.repos.createForAuthenticatedUser({
                name: repoName,
                description: 'YUGA Engine Project',
                private: true,
                auto_init: true
            });

            // Create GitHub Actions workflow for Unity builds
            await octokit.repos.createOrUpdateFileContents({
                owner: userData.githubUsername,
                repo: repoName,
                path: '.github/workflows/unity.yml',
                message: 'Add Unity build workflow',
                content: Buffer.from(this.getUnityWorkflowYaml()).toString('base64')
            });

            // Push project files
            await this.pushToGitHub(projectPath, repo.clone_url, userData.githubToken);

            return {
                success: true,
                repoUrl: repo.html_url
            };
        } catch (error) {
            throw new Error(`Failed to share via GitHub: ${error.message}`);
        }
    }

    async exportProject(projectId, projectPath) {
        return new Promise((resolve, reject) => {
            const output = path.join(process.cwd(), 'exports', `${projectId}.zip`);
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            const stream = fs.createWriteStream(output);

            stream.on('close', () => {
                resolve(output);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(stream);

            // Add project files to archive
            archive.directory(projectPath, false);

            archive.finalize();
        });
    }

    async generateShareableLink(projectId, expirationHours = 24) {
        try {
            const filename = `shared/${projectId}-${Date.now()}.zip`;
            const file = this.bucket.file(filename);

            // Generate signed URL
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + (expirationHours * 60 * 60 * 1000)
            });

            return {
                success: true,
                url
            };
        } catch (error) {
            throw new Error(`Failed to generate shareable link: ${error.message}`);
        }
    }

    getUnityWorkflowYaml() {
        return `
name: Unity Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    name: Build Unity Project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          lfs: true
          
      - uses: game-ci/unity-builder@v2
        env:
          UNITY_LICENSE: \${{ secrets.UNITY_LICENSE }}
          UNITY_EMAIL: \${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: \${{ secrets.UNITY_PASSWORD }}
        with:
          targetPlatform: StandaloneWindows64
          
      - uses: actions/upload-artifact@v2
        with:
          name: Build
          path: build
`;
    }

    async pushToGitHub(projectPath, repoUrl, token) {
        const gitUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);

        await this.execCommand('git init', projectPath);
        await this.execCommand('git add .', projectPath);
        await this.execCommand('git commit -m "Initial commit"', projectPath);
        await this.execCommand(`git remote add origin ${gitUrl}`, projectPath);
        await this.execCommand('git push -u origin main', projectPath);
    }

    async execCommand(command, cwd) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }
}

module.exports = new SharingService();