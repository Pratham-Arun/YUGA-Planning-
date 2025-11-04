use bevy::prelude::*;
use rhai::{Engine, Dynamic, FuncArgs};
use std::sync::Arc;

// Game API module for Rhai scripting
pub struct GameAPI {
    world: Arc<World>,
}

impl GameAPI {
    pub fn new(world: Arc<World>) -> Self {
        Self { world }
    }

    // Register all game API functions with the Rhai engine
    pub fn register_api(&self, engine: &mut Engine) {
        // Transform operations
        engine.register_fn("get_position", self.get_position());
        engine.register_fn("set_position", self.set_position());
        engine.register_fn("get_rotation", self.get_rotation());
        engine.register_fn("set_rotation", self.set_rotation());
        engine.register_fn("get_scale", self.get_scale());
        engine.register_fn("set_scale", self.set_scale());

        // Physics operations
        engine.register_fn("add_force", self.add_force());
        engine.register_fn("set_velocity", self.set_velocity());
        engine.register_fn("get_velocity", self.get_velocity());
        
        // Input operations
        engine.register_fn("is_key_pressed", self.is_key_pressed());
        engine.register_fn("get_mouse_position", self.get_mouse_position());
        engine.register_fn("get_axis", self.get_axis());

        // Entity management
        engine.register_fn("spawn_entity", self.spawn_entity());
        engine.register_fn("destroy_entity", self.destroy_entity());
        engine.register_fn("add_component", self.add_component());
        engine.register_fn("remove_component", self.remove_component());

        // Scene management
        engine.register_fn("load_scene", self.load_scene());
        engine.register_fn("save_scene", self.save_scene());
        engine.register_fn("get_scene_entities", self.get_scene_entities());

        // Audio operations
        engine.register_fn("play_sound", self.play_sound());
        engine.register_fn("stop_sound", self.stop_sound());
        engine.register_fn("set_volume", self.set_volume());

        // AI operations
        engine.register_fn("generate_behavior", self.generate_behavior());
        engine.register_fn("query_similar", self.query_similar());
        engine.register_fn("update_ai_state", self.update_ai_state());
    }

    // Transform API
    fn get_position(&self) -> impl Fn(Entity) -> Dynamic {
        let world = self.world.clone();
        move |entity| {
            if let Some(transform) = world.get::<Transform>(entity) {
                let pos = transform.translation;
                rhai::Dynamic::from_array(vec![
                    pos.x.into(),
                    pos.y.into(),
                    pos.z.into(),
                ])
            } else {
                rhai::Dynamic::from_array(vec![0.0.into(), 0.0.into(), 0.0.into()])
            }
        }
    }

    fn set_position(&self) -> impl Fn(Entity, f32, f32, f32) {
        let world = self.world.clone();
        move |entity, x, y, z| {
            if let Some(mut transform) = world.get_mut::<Transform>(entity) {
                transform.translation = Vec3::new(x, y, z);
            }
        }
    }

    fn get_rotation(&self) -> impl Fn(Entity) -> Dynamic {
        let world = self.world.clone();
        move |entity| {
            if let Some(transform) = world.get::<Transform>(entity) {
                let euler = transform.rotation.to_euler(EulerRot::XYZ);
                rhai::Dynamic::from_array(vec![
                    euler.0.into(),
                    euler.1.into(),
                    euler.2.into(),
                ])
            } else {
                rhai::Dynamic::from_array(vec![0.0.into(), 0.0.into(), 0.0.into()])
            }
        }
    }

    fn set_rotation(&self) -> impl Fn(Entity, f32, f32, f32) {
        let world = self.world.clone();
        move |entity, x, y, z| {
            if let Some(mut transform) = world.get_mut::<Transform>(entity) {
                transform.rotation = Quat::from_euler(EulerRot::XYZ, x, y, z);
            }
        }
    }

    // Physics API
    fn add_force(&self) -> impl Fn(Entity, f32, f32, f32) {
        let world = self.world.clone();
        move |entity, x, y, z| {
            if let Some(mut physics) = world.get_mut::<Physics>(entity) {
                physics.add_force(Vec3::new(x, y, z));
            }
        }
    }

    fn set_velocity(&self) -> impl Fn(Entity, f32, f32, f32) {
        let world = self.world.clone();
        move |entity, x, y, z| {
            if let Some(mut physics) = world.get_mut::<Physics>(entity) {
                physics.velocity = Vec3::new(x, y, z);
            }
        }
    }

    // Input API
    fn is_key_pressed(&self) -> impl Fn(String) -> bool {
        let world = self.world.clone();
        move |key| {
            if let Some(input) = world.get_resource::<Input<KeyCode>>() {
                if let Ok(key_code) = key.parse::<KeyCode>() {
                    input.pressed(key_code)
                } else {
                    false
                }
            } else {
                false
            }
        }
    }

    fn get_mouse_position(&self) -> impl Fn() -> Dynamic {
        let world = self.world.clone();
        move || {
            if let Some(windows) = world.get_resource::<Windows>() {
                if let Some(window) = windows.get_primary() {
                    if let Some(pos) = window.cursor_position() {
                        return rhai::Dynamic::from_array(vec![
                            pos.x.into(),
                            pos.y.into(),
                        ]);
                    }
                }
            }
            rhai::Dynamic::from_array(vec![0.0.into(), 0.0.into()])
        }
    }

    // Entity API
    fn spawn_entity(&self) -> impl Fn(Dynamic) -> Entity {
        let world = self.world.clone();
        move |components| {
            let mut entity = world.spawn_empty();
            
            if let Ok(map) = components.try_cast::<rhai::Map>() {
                for (key, value) in map {
                    match key.as_str() {
                        "transform" => {
                            if let Ok(pos) = value.try_cast::<rhai::Array>() {
                                if pos.len() >= 3 {
                                    let x = pos[0].clone().try_cast::<f32>().unwrap_or(0.0);
                                    let y = pos[1].clone().try_cast::<f32>().unwrap_or(0.0);
                                    let z = pos[2].clone().try_cast::<f32>().unwrap_or(0.0);
                                    entity.insert(Transform::from_xyz(x, y, z));
                                }
                            }
                        }
                        "physics" => {
                            entity.insert(Physics::default());
                        }
                        "script" => {
                            if let Ok(source) = value.try_cast::<String>() {
                                entity.insert(Script {
                                    source,
                                    compiled: None,
                                    scope: rhai::Scope::new(),
                                });
                            }
                        }
                        _ => {}
                    }
                }
            }

            entity.id()
        }
    }

    fn destroy_entity(&self) -> impl Fn(Entity) {
        let world = self.world.clone();
        move |entity| {
            if let Some(mut commands) = world.get_resource_mut::<Commands>() {
                commands.entity(entity).despawn_recursive();
            }
        }
    }

    // Audio API
    fn play_sound(&self) -> impl Fn(String, f32) {
        let world = self.world.clone();
        move |path, volume| {
            if let Some(audio) = world.get_resource::<Audio>() {
                if let Some(asset_server) = world.get_resource::<AssetServer>() {
                    let sound = asset_server.load(&path);
                    audio.play(sound).with_volume(volume);
                }
            }
        }
    }

    // AI API
    fn generate_behavior(&self) -> impl Fn(String) -> String {
        let world = self.world.clone();
        move |prompt| {
            if let Some(ai) = world.get_resource::<AIOrchestrator>() {
                // This would be implemented to call the AI service
                "// Generated behavior code".to_string()
            } else {
                "".to_string()
            }
        }
    }

    fn query_similar(&self) -> impl Fn(String, i32) -> Dynamic {
        let world = self.world.clone();
        move |text, limit| {
            if let Some(vector_db) = world.get_resource::<Box<dyn VectorDB>>() {
                // This would query the vector database
                rhai::Dynamic::from_array(vec![])
            } else {
                rhai::Dynamic::from_array(vec![])
            }
        }
    }
}

// Helper components and resources needed by the API
#[derive(Component)]
pub struct Physics {
    pub velocity: Vec3,
    pub forces: Vec3,
}

impl Physics {
    pub fn add_force(&mut self, force: Vec3) {
        self.forces += force;
    }
}

impl Default for Physics {
    fn default() -> Self {
        Self {
            velocity: Vec3::ZERO,
            forces: Vec3::ZERO,
        }
    }
}

#[derive(Component)]
pub struct Script {
    pub source: String,
    pub compiled: Option<Arc<rhai::AST>>,
    pub scope: rhai::Scope,
}