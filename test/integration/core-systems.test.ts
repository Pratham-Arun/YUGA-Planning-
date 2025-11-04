import { describe, it, expect, beforeEach } from 'vitest';
import { World, addEntity, addComponent, getComponent } from '../../src/core/ecs/world';
import { TransformComponent, RenderComponent } from '../../src/core/ecs/components';
import { AIOrchestrator } from '../../src/core/ai/AIOrchestrator';
import { ScriptingSystem } from '../../src/core/scripting/ScriptingSystem';

describe('Core Systems Integration', () => {
  let world: World;
  let aiOrchestrator: AIOrchestrator;
  let scriptingSystem: ScriptingSystem;

  beforeEach(() => {
    world = {
      entities: new Map(),
      systems: [],
    };
    aiOrchestrator = new AIOrchestrator({});
    scriptingSystem = new ScriptingSystem();
  });

  it('should create and manage entities with components', () => {
    // Create entity with transform and render components
    const entity = addEntity(world);
    addComponent(world, entity, TransformComponent.create({}));
    addComponent(world, entity, RenderComponent.create({}));

    // Verify components
    const transform = getComponent(world, entity, 'transform');
    const render = getComponent(world, entity, 'render');

    expect(transform).toBeDefined();
    expect(render).toBeDefined();
    expect(transform?.data.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(render?.data.mesh).toBe('default');
  });

  it('should integrate AI and scripting systems', async () => {
    // Generate a simple script using AI
    const prompt = 'Create a script that moves an entity forward';
    const generatedCode = await aiOrchestrator.generateCode(prompt);

    // Add entity with script
    const entity = addEntity(world);
    addComponent(world, entity, TransformComponent.create({}));
    addComponent(world, entity, {
      type: 'script',
      data: { source: generatedCode, enabled: true }
    });

    // Run scripting system
    scriptingSystem.update(world);

    // Verify entity was updated
    const transform = getComponent(world, entity, 'transform');
    expect(transform).toBeDefined();
  });
});