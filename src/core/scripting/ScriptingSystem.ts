import { Engine } from 'rhai';
import { World, Entity, getComponent } from '../ecs/world';
import { ScriptComponent } from '../ecs/components';

export class ScriptingSystem {
  private engine: Engine;
  private scripts: Map<Entity, Function>;

  constructor() {
    this.engine = new Engine();
    this.scripts = new Map();
    this.setupEngine();
  }

  private setupEngine() {
    // Register game API
    this.engine.register_fn("get_position", (entity: string, world: World) => {
      const transform = getComponent(world, entity, 'transform');
      return transform ? transform.data.position : null;
    });

    this.engine.register_fn("set_position", (entity: string, world: World, x: number, y: number, z: number) => {
      const transform = getComponent(world, entity, 'transform');
      if (transform) {
        transform.data.position = { x, y, z };
      }
    });

    // Add more API functions here...
  }

  compileScript(source: string): Function {
    try {
      const ast = this.engine.compile(source);
      return () => this.engine.eval_ast(ast);
    } catch (error) {
      console.error('Script compilation error:', error);
      return () => {};
    }
  }

  update(world: World) {
    // Run all active scripts
    world.entities.forEach((components, entity) => {
      const scriptComponent = getComponent(world, entity, 'script');
      if (scriptComponent && scriptComponent.data.enabled) {
        let script = this.scripts.get(entity);
        
        if (!script) {
          script = this.compileScript(scriptComponent.data.source);
          this.scripts.set(entity, script);
        }

        try {
          const scope = this.engine.new_scope();
          scope.set_value("entity", entity);
          scope.set_value("world", world);
          script.call(scope);
        } catch (error) {
          console.error(`Error running script for entity ${entity}:`, error);
          scriptComponent.data.enabled = false;
        }
      }
    });
  }

  // Clear cached scripts for an entity
  clearEntityScripts(entity: Entity) {
    this.scripts.delete(entity);
  }

  // Clear all cached scripts
  clearAllScripts() {
    this.scripts.clear();
  }
}