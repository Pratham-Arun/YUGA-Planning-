mod core;
mod state_machine;
mod blend;
mod debug;
mod examples;
mod test_scene;

use bevy::prelude::*;

pub use core::{
    Joint,
    Skeleton,
    AnimationClip,
    AnimationPlayer,
    LoopMode,
};

pub use state_machine::{
    AnimationStateMachine,
    AnimationState,
    Transition,
    Condition,
    Parameter,
};

pub use blend::{
    BlendTree,
    BlendNode,
    BlendType,
    BlendParameter,
};

pub use debug::DebugPlugin;
pub use test_scene::TestScenePlugin;

/// Plugin for the animation system
pub struct AnimationPlugin;

impl Plugin for AnimationPlugin {
    fn build(&self, app: &mut App) {
        app
            .add_plugins((
                DebugPlugin,
                TestScenePlugin,
            ))
            .add_systems(Update, (
                core::animation_system,
                state_machine::animation_state_machine_system,
                blend::blend_tree_system,
            ).chain())
            .register_type::<Joint>()
            .register_type::<Skeleton>()
            .register_type::<AnimationPlayer>()
            .register_type::<AnimationStateMachine>()
            .register_type::<BlendTree>();
    }
}

/// Example usage of the animation system
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_animation_system() {
        let mut app = App::new();
        
        // Add the animation plugin
        app.add_plugins(AnimationPlugin);
        
        // Create a test skeleton
        let skeleton = Skeleton {
            joints: vec![
                Joint {
                    name: "root".to_string(),
                    index: 0,
                    parent_index: None,
                    local_transform: Transform::default(),
                    inverse_bind_pose: Mat4::IDENTITY,
                },
                Joint {
                    name: "bone1".to_string(),
                    index: 1,
                    parent_index: Some(0),
                    local_transform: Transform::default(),
                    inverse_bind_pose: Mat4::IDENTITY,
                },
            ],
            bind_pose: vec![Mat4::IDENTITY; 2],
            inverse_bind_pose: vec![Mat4::IDENTITY; 2],
        };
        
        // Create an animation clip
        let clip = AnimationClip {
            name: "test".to_string(),
            duration: 1.0,
            tracks: vec![],
            events: vec![],
            loop_mode: LoopMode::Loop,
        };
        
        // Add resources
        let clip_handle = app.world.resource_mut::<Assets<AnimationClip>>()
            .add(clip);
        
        // Spawn an entity with animation components
        app.world.spawn((
            skeleton,
            AnimationPlayer::new(),
            AnimationStateMachine::new(),
            BlendTree {
                root: BlendNode {
                    animation: clip_handle,
                    weight: 1.0,
                    blend_type: BlendType::Linear,
                    children: vec![],
                    parameters: vec![],
                },
                parameters: vec![],
            },
        ));
        
        // Run systems
        app.update();
    }
}