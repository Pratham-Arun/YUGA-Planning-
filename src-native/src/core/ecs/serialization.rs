use bevy::prelude::*;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::Path;

// Scene serialization format
#[derive(Serialize, Deserialize)]
pub struct SerializedScene {
    pub name: String,
    pub entities: Vec<SerializedEntity>,
}

#[derive(Serialize, Deserialize)]
pub struct SerializedEntity {
    pub id: String,
    pub name: String,
    pub components: Vec<SerializedComponent>,
    pub children: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SerializedComponent {
    pub type_name: String,
    pub data: serde_json::Value,
}

// Scene management resource
#[derive(Resource)]
pub struct SceneManager {
    scenes_path: String,
}

impl Default for SceneManager {
    fn default() -> Self {
        Self {
            scenes_path: "assets/scenes".to_string(),
        }
    }
}

impl SceneManager {
    pub fn save_scene(&self, scene_name: &str, world: &World) -> Result<(), String> {
        let mut serialized = SerializedScene {
            name: scene_name.to_string(),
            entities: Vec::new(),
        };

        // Get root level entities
        let mut root_entities: Vec<Entity> = Vec::new();
        world.query::<Entity>().iter(world).for_each(|e| {
            if !world.get::<Parent>(e).is_some() {
                root_entities.push(e);
            }
        });

        // Serialize entities recursively
        for entity in root_entities {
            if let Some(serialized_entity) = self.serialize_entity(world, entity) {
                serialized.entities.push(serialized_entity);
            }
        }

        // Save to file
        let path = Path::new(&self.scenes_path).join(format!("{}.json", scene_name));
        let json = serde_json::to_string_pretty(&serialized)
            .map_err(|e| format!("Failed to serialize scene: {}", e))?;
        fs::write(&path, json)
            .map_err(|e| format!("Failed to write scene file: {}", e))?;

        Ok(())
    }

    pub fn load_scene(&self, scene_name: &str, world: &mut World) -> Result<(), String> {
        let path = Path::new(&self.scenes_path).join(format!("{}.json", scene_name));
        let json = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read scene file: {}", e))?;
        
        let serialized: SerializedScene = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to deserialize scene: {}", e))?;

        // Clear existing entities
        world.clear_entities();

        // Create entity mapping for parent-child relationships
        let mut entity_map = std::collections::HashMap::new();

        // First pass: Create all entities
        for serialized_entity in &serialized.entities {
            let entity = world.spawn_empty().id();
            entity_map.insert(serialized_entity.id.clone(), entity);

            // Deserialize components
            for component in &serialized_entity.components {
                self.deserialize_component(world, entity, component)?;
            }
        }

        // Second pass: Set up parent-child relationships
        for serialized_entity in &serialized.entities {
            let entity = entity_map[&serialized_entity.id];
            
            for child_id in &serialized_entity.children {
                if let Some(&child_entity) = entity_map.get(child_id) {
                    world.entity_mut(child_entity)
                        .set_parent(entity);
                }
            }
        }

        Ok(())
    }

    fn serialize_entity(&self, world: &World, entity: Entity) -> Option<SerializedEntity> {
        let mut components = Vec::new();

        // Serialize transform
        if let Some(transform) = world.get::<Transform>(entity) {
            components.push(SerializedComponent {
                type_name: "transform".to_string(),
                data: serde_json::to_value(transform).ok()?,
            });
        }

        // Add more component serialization here
        // Example for custom components:
        if let Some(custom) = world.get::<CustomComponent>(entity) {
            components.push(SerializedComponent {
                type_name: "custom".to_string(),
                data: serde_json::to_value(custom).ok()?,
            });
        }

        // Get children
        let children = if let Some(children) = world.get::<Children>(entity) {
            children.iter()
                .filter_map(|&child| world.entity(child).get::<Name>()
                    .map(|name| name.to_string()))
                .collect()
        } else {
            Vec::new()
        };

        Some(SerializedEntity {
            id: world.entity(entity).get::<Name>()?.to_string(),
            name: world.entity(entity).get::<Name>()?.to_string(),
            components,
            children,
        })
    }

    fn deserialize_component(&self, world: &mut World, entity: Entity, component: &SerializedComponent) -> Result<(), String> {
        match component.type_name.as_str() {
            "transform" => {
                let transform: Transform = serde_json::from_value(component.data.clone())
                    .map_err(|e| format!("Failed to deserialize Transform: {}", e))?;
                world.entity_mut(entity).insert(transform);
            }
            // Add more component deserialization here
            "custom" => {
                let custom: CustomComponent = serde_json::from_value(component.data.clone())
                    .map_err(|e| format!("Failed to deserialize CustomComponent: {}", e))?;
                world.entity_mut(entity).insert(custom);
            }
            _ => return Err(format!("Unknown component type: {}", component.type_name)),
        }
        Ok(())
    }
}

// Example custom component with serialization
#[derive(Component, Serialize, Deserialize)]
pub struct CustomComponent {
    pub data: String,
    pub value: f32,
}

// Plugin to register scene management
pub struct SerializationPlugin;

impl Plugin for SerializationPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<SceneManager>();
    }
}