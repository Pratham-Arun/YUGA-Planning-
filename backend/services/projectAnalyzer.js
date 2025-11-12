import fs from 'fs';
import path from 'path';
import pkg from 'glob';
const { glob } = pkg;

/**
 * Project Context Analyzer
 * Analyzes project structure and extracts context for AI code generation
 */
class ProjectAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.context = {
      classes: [],
      functions: [],
      imports: [],
      patterns: [],
      style: {},
      dependencies: []
    };
  }

  /**
   * Analyze entire project structure
   */
  async analyze() {
    try {
      // Find all code files
      const csharpFiles = await glob('**/*.cs', { cwd: this.projectPath, ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**'] });
      const cppFiles = await glob('**/*.{cpp,h,hpp}', { cwd: this.projectPath, ignore: ['**/node_modules/**'] });
      const jsFiles = await glob('**/*.{js,jsx,ts,tsx}', { cwd: this.projectPath, ignore: ['**/node_modules/**'] });

      // Analyze each file type
      for (const file of csharpFiles) {
        await this.analyzeCSharpFile(path.join(this.projectPath, file));
      }

      for (const file of cppFiles) {
        await this.analyzeCppFile(path.join(this.projectPath, file));
      }

      for (const file of jsFiles) {
        await this.analyzeJSFile(path.join(this.projectPath, file));
      }

      // Detect coding patterns
      this.detectPatterns();

      return this.context;
    } catch (error) {
      console.error('Project analysis error:', error);
      return this.context;
    }
  }

  /**
   * Analyze C# file
   */
  async analyzeCSharpFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract classes
      const classMatches = content.matchAll(/class\s+(\w+)(?:\s*:\s*(\w+))?/g);
      for (const match of classMatches) {
        this.context.classes.push({
          name: match[1],
          baseClass: match[2] || null,
          file: filePath,
          language: 'csharp'
        });
      }

      // Extract methods
      const methodMatches = content.matchAll(/(?:public|private|protected)\s+(?:static\s+)?(?:void|int|string|bool|float|\w+)\s+(\w+)\s*\(/g);
      for (const match of methodMatches) {
        this.context.functions.push({
          name: match[1],
          file: filePath,
          language: 'csharp'
        });
      }

      // Extract using statements
      const usingMatches = content.matchAll(/using\s+([\w.]+);/g);
      for (const match of usingMatches) {
        if (!this.context.imports.includes(match[1])) {
          this.context.imports.push(match[1]);
        }
      }

      // Detect Unity-specific patterns
      if (content.includes('MonoBehaviour') || content.includes('UnityEngine')) {
        if (!this.context.patterns.includes('Unity')) {
          this.context.patterns.push('Unity');
        }
      }

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Analyze C++ file
   */
  async analyzeCppFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract classes
      const classMatches = content.matchAll(/class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?/g);
      for (const match of classMatches) {
        this.context.classes.push({
          name: match[1],
          baseClass: match[2] || null,
          file: filePath,
          language: 'cpp'
        });
      }

      // Extract includes
      const includeMatches = content.matchAll(/#include\s+[<"](.+)[>"]/g);
      for (const match of includeMatches) {
        if (!this.context.imports.includes(match[1])) {
          this.context.imports.push(match[1]);
        }
      }

      // Detect Unreal Engine patterns
      if (content.includes('UCLASS') || content.includes('UPROPERTY') || content.includes('UE_LOG')) {
        if (!this.context.patterns.includes('Unreal')) {
          this.context.patterns.push('Unreal');
        }
      }

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Analyze JavaScript/TypeScript file
   */
  async analyzeJSFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract classes
      const classMatches = content.matchAll(/class\s+(\w+)(?:\s+extends\s+(\w+))?/g);
      for (const match of classMatches) {
        this.context.classes.push({
          name: match[1],
          baseClass: match[2] || null,
          file: filePath,
          language: 'javascript'
        });
      }

      // Extract functions
      const functionMatches = content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\()/g);
      for (const match of functionMatches) {
        const funcName = match[1] || match[2];
        if (funcName) {
          this.context.functions.push({
            name: funcName,
            file: filePath,
            language: 'javascript'
          });
        }
      }

      // Extract imports
      const importMatches = content.matchAll(/import\s+.*?from\s+['"](.+?)['"]/g);
      for (const match of importMatches) {
        if (!this.context.imports.includes(match[1])) {
          this.context.imports.push(match[1]);
        }
      }

      // Detect frameworks
      if (content.includes('React') || content.includes('useState')) {
        if (!this.context.patterns.includes('React')) {
          this.context.patterns.push('React');
        }
      }

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Detect coding patterns and style
   */
  detectPatterns() {
    // Detect naming conventions
    const hasUnderscorePrefix = this.context.functions.some(f => f.name.startsWith('_'));
    const hasCamelCase = this.context.functions.some(f => /^[a-z][a-zA-Z0-9]*$/.test(f.name));
    const hasPascalCase = this.context.classes.some(c => /^[A-Z][a-zA-Z0-9]*$/.test(c.name));

    this.context.style = {
      namingConvention: hasPascalCase ? 'PascalCase' : 'camelCase',
      usesPrivatePrefix: hasUnderscorePrefix,
      frameworks: this.context.patterns
    };
  }

  /**
   * Get context summary for AI
   */
  getContextSummary() {
    return {
      totalClasses: this.context.classes.length,
      totalFunctions: this.context.functions.length,
      frameworks: this.context.patterns,
      commonImports: this.context.imports.slice(0, 10),
      style: this.context.style,
      existingClasses: this.context.classes.map(c => c.name).slice(0, 20),
      existingFunctions: this.context.functions.map(f => f.name).slice(0, 20)
    };
  }

  /**
   * Get related files for a specific task
   */
  getRelatedFiles(taskDescription) {
    const keywords = taskDescription.toLowerCase().split(' ');
    const relatedClasses = this.context.classes.filter(c => 
      keywords.some(keyword => c.name.toLowerCase().includes(keyword))
    );

    return relatedClasses.map(c => ({
      name: c.name,
      file: c.file,
      baseClass: c.baseClass
    }));
  }
}

export default ProjectAnalyzer;
