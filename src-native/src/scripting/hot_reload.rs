use bevy::prelude::*;
use notify::{Watcher, RecursiveMode, Result as NotifyResult};
use std::{
    path::{Path, PathBuf},
    sync::mpsc::{channel, Receiver},
    collections::HashMap,
    time::{SystemTime, Duration},
};

// Resource for managing script hot reloading
#[derive(Resource)]
pub struct ScriptHotReload {
    watcher: Option<Box<dyn notify::Watcher>>,
    receiver: Option<Receiver<NotifyResult<notify::Event>>>,
    script_paths: HashMap<PathBuf, Vec<Entity>>,
    last_modified: HashMap<PathBuf, SystemTime>,
    scripts_dir: PathBuf,
}

impl Default for ScriptHotReload {
    fn default() -> Self {
        Self {
            watcher: None,
            receiver: None,
            script_paths: HashMap::new(),
            last_modified: HashMap::new(),
            scripts_dir: PathBuf::from("assets/scripts"),
        }
    }
}

impl ScriptHotReload {
    pub fn new(scripts_dir: PathBuf) -> Self {
        Self {
            scripts_dir,
            ..Default::default()
        }
    }

    // Initialize the file watcher
    pub fn initialize(&mut self) -> Result<(), String> {
        let (tx, rx) = channel();

        let mut watcher = notify::watcher(tx, Duration::from_secs(1))
            .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher.watch(&self.scripts_dir, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;

        self.watcher = Some(Box::new(watcher));
        self.receiver = Some(rx);

        // Load initial script states
        self.scan_scripts_directory()?;

        Ok(())
    }

    // Scan the scripts directory for existing scripts
    fn scan_scripts_directory(&mut self) -> Result<(), String> {
        if !self.scripts_dir.exists() {
            std::fs::create_dir_all(&self.scripts_dir)
                .map_err(|e| format!("Failed to create scripts directory: {}", e))?;
        }

        for entry in std::fs::read_dir(&self.scripts_dir)
            .map_err(|e| format!("Failed to read scripts directory: {}", e))? {
            let entry = entry
                .map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.extension().map_or(false, |ext| ext == "rhai") {
                if let Ok(metadata) = std::fs::metadata(&path) {
                    if let Ok(modified) = metadata.modified() {
                        self.last_modified.insert(path.clone(), modified);
                    }
                }
            }
        }

        Ok(())
    }

    // Register an entity as using a script
    pub fn register_script(&mut self, entity: Entity, script_path: PathBuf) {
        self.script_paths
            .entry(script_path.clone())
            .or_default()
            .push(entity);

        if let Ok(metadata) = std::fs::metadata(&script_path) {
            if let Ok(modified) = metadata.modified() {
                self.last_modified.insert(script_path, modified);
            }
        }
    }

    // Unregister an entity's script
    pub fn unregister_script(&mut self, entity: Entity) {
        self.script_paths.retain(|_, entities| {
            entities.retain(|&e| e != entity);
            !entities.is_empty()
        });
    }

    // Check for script changes
    pub fn check_for_changes(&mut self) -> Vec<(PathBuf, Vec<Entity>)> {
        let mut changed_scripts = Vec::new();

        if let Some(ref receiver) = self.receiver {
            while let Ok(Ok(event)) = receiver.try_recv() {
                use notify::EventKind;

                match event.kind {
                    EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.extension().map_or(false, |ext| ext == "rhai") {
                                if let Ok(metadata) = std::fs::metadata(&path) {
                                    if let Ok(modified) = metadata.modified() {
                                        if let Some(last_mod) = self.last_modified.get(&path) {
                                            if modified > *last_mod {
                                                if let Some(entities) = self.script_paths.get(&path) {
                                                    changed_scripts.push((path.clone(), entities.clone()));
                                                    self.last_modified.insert(path, modified);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        changed_scripts
    }
}

// Plugin for hot reloading
pub struct HotReloadPlugin;

impl Plugin for HotReloadPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<ScriptHotReload>()
           .add_systems(Update, hot_reload_system);
    }
}

// System to handle script reloading
fn hot_reload_system(
    mut script_reload: ResMut<ScriptHotReload>,
    mut script_query: Query<&mut Script>,
    mut engine: ResMut<ScriptEngine>,
) {
    for (path, entities) in script_reload.check_for_changes() {
        // Read the updated script
        if let Ok(source) = std::fs::read_to_string(&path) {
            // Try to compile the script first to validate it
            match engine.compile(&source) {
                Ok(ast) => {
                    // Update all entities using this script
                    for &entity in &entities {
                        if let Ok(mut script) = script_query.get_mut(entity) {
                            script.source = source.clone();
                            script.compiled = Some(ast.clone());
                            info!("Reloaded script for entity {:?}", entity);
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to compile updated script: {}", e);
                }
            }
        }
    }
}

// Helper functions for script management
pub fn load_script(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read script file: {}", e))
}

pub fn save_script(path: &Path, source: &str) -> Result<(), String> {
    std::fs::write(path, source)
        .map_err(|e| format!("Failed to write script file: {}", e))
}