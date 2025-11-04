use bevy::prelude::*;
use super::components::*;

// Core systems that run every frame
pub struct CoreSystems;

impl Plugin for CoreSystems {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, (
            physics_system,
            ai_system,
            audio_system,
        ));
    }
}

// Physics simulation system
fn physics_system(
    mut query: Query<(&mut Transform3D, &mut Physics)>,
    time: Res<Time>,
) {
    for (mut transform, mut physics) in query.iter_mut() {
        // Update velocity based on acceleration
        physics.velocity += physics.acceleration * time.delta_seconds();
        
        // Update position based on velocity
        transform.position += physics.velocity * time.delta_seconds();
        
        // Basic ground collision
        if transform.position.y < 0.0 {
            transform.position.y = 0.0;
            physics.velocity.y = 0.0;
        }
    }
}

// AI behavior system
fn ai_system(
    mut query: Query<(&mut Transform3D, &mut AIController)>,
    time: Res<Time>,
) {
    for (mut transform, mut ai) in query.iter_mut() {
        // Update AI state
        ai.state.entry("time".to_string())
           .and_modify(|t| *t += time.delta_seconds())
           .or_insert(0.0);
           
        // Execute behavior tree (simplified example)
        match ai.behavior_tree.as_str() {
            "patrol" => {
                // Simple patrol behavior
                let t = ai.state["time"];
                transform.position.x = 5.0 * f32::cos(t);
                transform.position.z = 5.0 * f32::sin(t);
            }
            // Add more behaviors here
            _ => {}
        }
    }
}

// Audio system for managing sound playback
fn audio_system(
    mut query: Query<(&Transform3D, &mut AudioSource)>,
    audio: Res<Audio>,
) {
    for (transform, mut source) in query.iter_mut() {
        if source.playing {
            // Update 3D audio position
            // This is a simplified example - actual implementation would use
            // proper 3D audio APIs and distance attenuation
            let distance = transform.position.length();
            source.volume = 1.0 / (1.0 + distance * 0.1);
        }
    }
}