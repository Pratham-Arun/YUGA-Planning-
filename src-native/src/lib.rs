//! YUGA Engine - Native Core Implementation
//! 
//! This is the core engine implementation in Rust using Bevy.
//! It provides high-performance game engine features while maintaining
//! compatibility with the web-based prototype.

use bevy::prelude::*;
use bevy_egui::EguiPlugin;

mod core;
mod editor;
mod ai;
mod scripting;
mod game;

use crate::core::YugaEngine;
use crate::editor::EditorPlugin;
use crate::ai::AIPlugin;
use crate::scripting::ScriptingPlugin;

/// Main entry point for the YUGA native engine library
pub fn run() {
    let mut app = App::new();

    // Add core Bevy plugins
    app.add_plugins(DefaultPlugins)
        .add_plugins(EguiPlugin);

    // Add YUGA engine plugins
    app.add_plugins(YugaEngine::default())
        .add_plugins(EditorPlugin::default())
        .add_plugins(AIPlugin::default())
        .add_plugins(ScriptingPlugin::default());

    // Run the app
    app.run();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_initialization() {
        let mut app = App::new();
        app.add_plugins(YugaEngine::default());
        // Add test assertions
    }
}