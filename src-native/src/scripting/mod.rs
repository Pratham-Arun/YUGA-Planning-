//! Scripting system using Rhai

use bevy::prelude::*;
use rhai::{Engine, Scope, AST};
use std::collections::HashMap;

/// Plugin for script management and execution
pub struct ScriptingPlugin {
    engine: RhaiEngine,
}

/// Rhai script engine wrapper
pub struct RhaiEngine {
    engine: Engine,
    scope: Scope,
    ast_pool: HashMap<String, AST>,
}

/// Component for script attachment
#[derive(Component)]
pub struct ScriptComponent {
    pub script: String,
    pub scope: Scope,
}

impl Plugin for ScriptingPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, Self::update_scripts)
            .register_type::<ScriptComponent>();
    }
}

impl ScriptingPlugin {
    /// Create a new scripting plugin instance
    pub fn new() -> Self {
        Self {
            engine: RhaiEngine::new(),
        }
    }

    /// Update and run active scripts
    fn update_scripts(mut query: Query<(&mut ScriptComponent, &Transform)>) {
        for (script, transform) in query.iter_mut() {
            // Execute scripts with current context
        }
    }
}

impl RhaiEngine {
    /// Create a new Rhai engine instance
    pub fn new() -> Self {
        let mut engine = Engine::new();
        
        // Configure engine
        engine.set_optimization_level(rhai::OptimizationLevel::Full);
        
        Self {
            engine,
            scope: Scope::new(),
            ast_pool: HashMap::new(),
        }
    }

    /// Register game types with Rhai
    pub fn register_game_types(&mut self) {
        // Register common game types
        self.engine.register_type::<Transform>();
        self.engine.register_type::<Vec3>();
        self.engine.register_type::<Quat>();
    }

    /// Compile and cache a script
    pub fn compile_script(&mut self, name: &str, script: &str) -> Result<(), Box<rhai::EvalAltResult>> {
        let ast = self.engine.compile(script)?;
        self.ast_pool.insert(name.to_string(), ast);
        Ok(())
    }

    /// Run a compiled script
    pub fn run_script(&mut self, name: &str) -> Result<(), Box<rhai::EvalAltResult>> {
        if let Some(ast) = self.ast_pool.get(name) {
            self.engine.run_ast_with_scope(&mut self.scope, ast)?;
        }
        Ok(())
    }
}

impl Default for ScriptingPlugin {
    fn default() -> Self {
        Self::new()
    }
}