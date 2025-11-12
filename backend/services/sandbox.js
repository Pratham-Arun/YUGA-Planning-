/**
 * Code Sandbox for Safe Compilation and Validation
 * Uses Docker containers to safely compile and test generated code
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class Sandbox {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_sandbox');
    this.ensureTempDir();
    this.dockerAvailable = false;
    this.checkDocker();
  }
  
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  async checkDocker() {
    try {
      await execAsync('docker --version');
      this.dockerAvailable = true;
      console.log('✓ Docker available for sandbox compilation');
    } catch (error) {
      console.warn('⚠ Docker not available - sandbox compilation disabled');
      this.dockerAvailable = false;
    }
  }
  
  /**
   * Validate C# code (Unity)
   */
  async validateCSharp(code, options = {}) {
    const { timeout = 30000 } = options;
    
    try {
      // Write code to temp file
      const filename = `temp_${Date.now()}.cs`;
      const filepath = path.join(this.tempDir, filename);
      fs.writeFileSync(filepath, code);
      
      // Check syntax without Docker (basic validation)
      const syntaxCheck = this._checkCSharpSyntax(code);
      
      if (!syntaxCheck.valid) {
        return {
          success: false,
          errors: syntaxCheck.errors,
          warnings: [],
          method: 'syntax-check'
        };
      }
      
      // If Docker available, compile in container
      if (this.dockerAvailable) {
        return await this._compileInDocker(filepath, 'csharp', timeout);
      }
      
      // Fallback: Basic validation passed
      return {
        success: true,
        errors: [],
        warnings: syntaxCheck.warnings,
        method: 'syntax-check',
        message: 'Basic syntax validation passed (Docker not available for full compilation)'
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        warnings: []
      };
    }
  }
  
  /**
   * Basic C# syntax checking
   */
  _checkCSharpSyntax(code) {
    const errors = [];
    const warnings = [];
    
    // Check for common syntax errors
    const lines = code.split('\n');
    let braceCount = 0;
    let inString = false;
    let inComment = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check for unclosed strings
      for (let char of line) {
        if (char === '"' && !inComment) {
          inString = !inString;
        }
        if (char === '{' && !inString && !inComment) braceCount++;
        if (char === '}' && !inString && !inComment) braceCount--;
      }
      
      // Check for missing semicolons (simple heuristic)
      if (!inString && !inComment && 
          !line.endsWith('{') && !line.endsWith('}') && 
          !line.endsWith(';') && !line.startsWith('//') &&
          !line.includes('class ') && !line.includes('namespace ') &&
          !line.includes('using ') && line.length > 0) {
        warnings.push({
          line: i + 1,
          message: 'Possible missing semicolon',
          severity: 'warning'
        });
      }
    }
    
    // Check brace balance
    if (braceCount !== 0) {
      errors.push({
        line: -1,
        message: `Unbalanced braces (${braceCount > 0 ? 'missing closing' : 'extra closing'} braces)`,
        severity: 'error'
      });
    }
    
    // Check for required Unity namespaces
    if (code.includes('MonoBehaviour') && !code.includes('using UnityEngine')) {
      warnings.push({
        line: -1,
        message: 'Missing "using UnityEngine;" for MonoBehaviour',
        severity: 'warning'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Compile code in Docker container
   */
  async _compileInDocker(filepath, language, timeout) {
    try {
      const containerName = `yuga_sandbox_${Date.now()}`;
      const filename = path.basename(filepath);
      
      // Create Docker command based on language
      let dockerCmd;
      
      if (language === 'csharp') {
        dockerCmd = `docker run --name ${containerName} --rm -v "${this.tempDir}:/code" -w /code mcr.microsoft.com/dotnet/sdk:6.0 dotnet build ${filename}`;
      } else if (language === 'cpp') {
        dockerCmd = `docker run --name ${containerName} --rm -v "${this.tempDir}:/code" -w /code gcc:latest g++ -o output ${filename}`;
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }
      
      // Execute with timeout
      const { stdout, stderr } = await execAsync(dockerCmd, {
        timeout,
        maxBuffer: 1024 * 1024 // 1MB
      });
      
      // Parse output for errors/warnings
      const errors = this._parseCompilerOutput(stderr, 'error');
      const warnings = this._parseCompilerOutput(stderr, 'warning');
      
      return {
        success: errors.length === 0,
        errors,
        warnings,
        stdout,
        stderr,
        method: 'docker-compile'
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{ message: error.message, severity: 'error' }],
        warnings: [],
        method: 'docker-compile'
      };
    }
  }
  
  /**
   * Parse compiler output for errors and warnings
   */
  _parseCompilerOutput(output, type) {
    const results = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes(type)) {
        results.push({
          message: line.trim(),
          severity: type
        });
      }
    }
    
    return results;
  }
  
  /**
   * Validate JavaScript/TypeScript code
   */
  async validateJavaScript(code, options = {}) {
    try {
      // Basic syntax check using eval (in try-catch)
      try {
        new Function(code);
        return {
          success: true,
          errors: [],
          warnings: [],
          method: 'syntax-check'
        };
      } catch (error) {
        return {
          success: false,
          errors: [{
            message: error.message,
            severity: 'error'
          }],
          warnings: [],
          method: 'syntax-check'
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  }
  
  /**
   * Validate Python code
   */
  async validatePython(code, options = {}) {
    try {
      // Write to temp file
      const filename = `temp_${Date.now()}.py`;
      const filepath = path.join(this.tempDir, filename);
      fs.writeFileSync(filepath, code);
      
      // Check syntax with python -m py_compile
      const { stdout, stderr } = await execAsync(`python -m py_compile ${filepath}`);
      
      if (stderr) {
        return {
          success: false,
          errors: [{ message: stderr, severity: 'error' }],
          warnings: []
        };
      }
      
      return {
        success: true,
        errors: [],
        warnings: [],
        method: 'py_compile'
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  }
  
  /**
   * Validate code based on language
   */
  async validateCode(code, language, options = {}) {
    switch (language.toLowerCase()) {
      case 'csharp':
      case 'cs':
        return await this.validateCSharp(code, options);
      
      case 'javascript':
      case 'js':
        return await this.validateJavaScript(code, options);
      
      case 'python':
      case 'py':
        return await this.validatePython(code, options);
      
      default:
        return {
          success: false,
          errors: [{ message: `Unsupported language: ${language}` }],
          warnings: []
        };
    }
  }
  
  /**
   * Run static analysis on code
   */
  async analyzeCode(code, language) {
    const analysis = {
      complexity: 0,
      linesOfCode: code.split('\n').length,
      functions: [],
      classes: [],
      issues: []
    };
    
    // Count functions
    const functionMatches = code.match(/function\s+\w+|def\s+\w+|void\s+\w+\s*\(/g);
    analysis.functions = functionMatches || [];
    
    // Count classes
    const classMatches = code.match(/class\s+\w+/g);
    analysis.classes = classMatches || [];
    
    // Calculate cyclomatic complexity (simplified)
    const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      analysis.complexity += matches ? matches.length : 0;
    }
    
    return analysis;
  }
  
  /**
   * Clean up temporary files
   */
  cleanup() {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.tempDir, file));
      }
    } catch (error) {
      console.error('Sandbox cleanup error:', error);
    }
  }
}

// Singleton instance
const sandbox = new Sandbox();

// Cleanup on exit
process.on('exit', () => sandbox.cleanup());

export default sandbox;
