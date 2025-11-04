# Contributing to YUGA

First off, thank you for considering contributing to YUGA! This document provides guidelines and workflows for contributing.

## Code of Conduct

This project adheres to the Contributor Covenant code of conduct. By participating, you are expected to uphold this code.

## Development Process

1. Fork the repository
2. Create a feature branch
3. Write code & tests
4. Submit PR

### Branch Naming Convention

- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`
- Performance: `perf/description`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add hat wobble
^--^  ^------------^
|     |
|     +-> Description in present tense
|
+-------> Type: feat, fix, docs, style, refactor, test, or chore
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow [Airbnb Style Guide](https://github.com/airbnb/javascript)
- Use ESLint + Prettier
- Max line length: 100 characters
- Use async/await over Promises
- Document public APIs with JSDoc

Example:
```typescript
/**
 * Generates game logic using AI.
 * @param prompt - The generation prompt
 * @param options - Generation options
 * @returns Generated code
 */
async function generateGameLogic(
  prompt: string,
  options?: GenerationOptions
): Promise<string> {
  // Implementation
}
```

### Rust

- Follow [Rust Style Guide](https://github.com/rust-dev-tools/fmt-rfcs)
- Use `cargo fmt` and `cargo clippy`
- Document public APIs
- Use meaningful error types
- Prefer `Result` over panics

Example:
```rust
/// Handles game physics updates.
/// 
/// # Arguments
/// * `world` - The game world to update
/// * `delta` - Time since last update
///
/// # Returns
/// Result indicating success or error
pub fn update_physics(
    world: &mut World,
    delta: f32,
) -> Result<(), PhysicsError> {
    // Implementation
}
```

## Testing

### Required Tests

- Unit tests for all public APIs
- Integration tests for key workflows
- Mock external services (AI, DB) in tests
- Aim for 80%+ coverage

### Test Structure

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle successful case', async () => {
      // Test
    });

    it('should handle error case', async () => {
      // Test
    });
  });
});
```

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Pull Request Process

1. Update documentation
2. Add/update tests
3. Ensure CI passes
4. Get code review
5. Squash commits
6. Merge to main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Tested manually

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] CI passes
```

## Adding New Features

1. Discuss in Issues first
2. Create design doc if significant
3. Get approval from maintainers
4. Implement with tests
5. Submit PR

### Design Doc Template

```markdown
# Feature Name

## Overview
Brief description

## Goals
- Goal 1
- Goal 2

## Design
Technical design details

## Implementation Plan
Step-by-step plan

## Testing Strategy
How it will be tested
```

## Documentation

- Update README.md if needed
- Add/update API docs
- Create/update design docs
- Include code examples
- Document breaking changes

## Questions?

- Open an issue for discussion
- Join our Discord server
- Email the maintainers

Thank you for contributing! 🎮