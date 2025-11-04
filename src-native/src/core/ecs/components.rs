use bevy::prelude::*;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

// Base components for all game objects
#[derive(Component, Debug, Clone, Serialize, Deserialize)]
pub struct Transform3D {
    pub position: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
}

#[derive(Component, Debug, Clone)]
pub struct Renderer {
    pub mesh: Handle<Mesh>,
    pub material: Handle<StandardMaterial>,
    pub visible: bool,
}

#[derive(Component, Debug, Clone)]
pub struct Physics {
    pub velocity: Vec3,
    pub acceleration: Vec3,
    pub mass: f32,
    pub collider: ColliderType,
}

#[derive(Debug, Clone)]
pub enum ColliderType {
    Box(Vec3),
    Sphere(f32),
    Capsule(f32, f32),
}

#[derive(Component, Debug, Clone)]
pub struct AIController {
    pub behavior_tree: String,
    pub state: HashMap<String, f32>,
}

#[derive(Component, Debug, Clone)]
pub struct AudioSource {
    pub clip: Handle<AudioSource>,
    pub volume: f32,
    pub playing: bool,
}

// Register component types with the engine
pub fn register_components(app: &mut App) {
    app.register_type::<Transform3D>()
       .register_type::<Renderer>()
       .register_type::<Physics>()
       .register_type::<AIController>()
       .register_type::<AudioSource>();
}