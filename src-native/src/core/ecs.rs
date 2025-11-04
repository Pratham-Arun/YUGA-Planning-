use crate::core::subsystem::Subsystem;
use hecs::{Entity, World};
use std::any::Any;
use std::collections::HashMap;

pub struct EcsSystem {
    world: World,
    systems: Vec<Box<dyn System>>,
    queries: HashMap<String, Box<dyn QuerySystem>>,
}

pub trait System: Send + Sync {
    fn update(&mut self, world: &mut World, delta_time: f32);
}

pub trait QuerySystem: Send + Sync {
    fn as_any(&self) -> &dyn Any;
    fn as_any_mut(&mut self) -> &mut dyn Any;
}

impl EcsSystem {
    pub fn new() -> Self {
        Self {
            world: World::new(),
            systems: Vec::new(),
            queries: HashMap::new(),
        }
    }

    pub fn add_system<S: System + 'static>(&mut self, system: S) {
        self.systems.push(Box::new(system));
    }

    pub fn register_query<Q: QuerySystem + 'static>(&mut self, name: &str, query: Q) {
        self.queries.insert(name.to_string(), Box::new(query));
    }

    pub fn get_query<Q: QuerySystem + 'static>(&self, name: &str) -> Option<&Q> {
        self.queries
            .get(name)
            .and_then(|q| q.as_any().downcast_ref::<Q>())
    }

    pub fn get_query_mut<Q: QuerySystem + 'static>(&mut self, name: &str) -> Option<&mut Q> {
        self.queries
            .get_mut(name)
            .and_then(|q| q.as_any_mut().downcast_mut::<Q>())
    }

    pub fn spawn<T: Send + Sync + 'static>(&mut self, components: T) -> Entity {
        self.world.spawn(components)
    }

    pub fn despawn(&mut self, entity: Entity) -> Result<(), hecs::NoSuchEntity> {
        self.world.despawn(entity)
    }
}

impl Subsystem for EcsSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, delta_time: f32) -> Result<(), String> {
        for system in &mut self.systems {
            system.update(&mut self.world, delta_time);
        }
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        self.world.clear();
        Ok(())
    }
}

// Common components
#[derive(Debug, Clone)]
pub struct Transform {
    pub position: nalgebra::Vector3<f32>,
    pub rotation: nalgebra::UnitQuaternion<f32>,
    pub scale: nalgebra::Vector3<f32>,
}

#[derive(Debug)]
pub struct RigidBody {
    pub velocity: nalgebra::Vector3<f32>,
    pub acceleration: nalgebra::Vector3<f32>,
    pub mass: f32,
}

#[derive(Debug)]
pub struct Collider {
    pub shape: ColliderShape,
    pub is_trigger: bool,
}

#[derive(Debug)]
pub enum ColliderShape {
    Box { half_extents: nalgebra::Vector3<f32> },
    Sphere { radius: f32 },
    Capsule { height: f32, radius: f32 },
}

#[derive(Debug)]
pub struct Renderable {
    pub mesh_id: u32,
    pub material_id: u32,
}

#[derive(Debug)]
pub struct Light {
    pub color: nalgebra::Vector3<f32>,
    pub intensity: f32,
    pub light_type: LightType,
}

#[derive(Debug)]
pub enum LightType {
    Point { range: f32 },
    Directional,
    Spot { range: f32, angle: f32 },
}

#[derive(Debug)]
pub struct AudioSource {
    pub clip_id: u32,
    pub volume: f32,
    pub is_looping: bool,
}

#[derive(Debug)]
pub struct Script {
    pub script_id: u32,
    pub enabled: bool,
}