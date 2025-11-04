use bevy::prelude::*;
use super::core::{AnimationClip, KeyframeValue, Keyframe, AnimationTrack, PropertyType, LoopMode};

/// Example humanoid skeleton animation data
pub fn create_humanoid_animations(
    asset_server: &AssetServer,
    mut animation_assets: ResMut<Assets<AnimationClip>>,
) -> HumanoidAnimations {
    HumanoidAnimations {
        idle: create_idle_animation(&mut animation_assets),
        walk: create_walk_animation(&mut animation_assets),
        run: create_run_animation(&mut animation_assets),
        jump: create_jump_animation(&mut animation_assets),
    }
}

pub struct HumanoidAnimations {
    pub idle: Handle<AnimationClip>,
    pub walk: Handle<AnimationClip>,
    pub run: Handle<AnimationClip>,
    pub jump: Handle<AnimationClip>,
}

fn create_idle_animation(animations: &mut Assets<AnimationClip>) -> Handle<AnimationClip> {
    let mut tracks = Vec::new();

    // Subtle breathing animation
    tracks.push(AnimationTrack {
        target_path: "Spine2".to_string(),
        property_type: PropertyType::Transform,
        keyframes: vec![
            Keyframe {
                time: 0.0,
                value: KeyframeValue::Transform(Transform::from_xyz(0.0, 0.0, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
            Keyframe {
                time: 1.0,
                value: KeyframeValue::Transform(Transform::from_xyz(0.0, 0.02, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
            Keyframe {
                time: 2.0,
                value: KeyframeValue::Transform(Transform::from_xyz(0.0, 0.0, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
        ],
    });

    // Subtle arm sway
    for (side, factor) in [("Left", 1.0), ("Right", -1.0)].iter() {
        tracks.push(AnimationTrack {
            target_path: format!("{}Arm", side),
            property_type: PropertyType::Rotation,
            keyframes: vec![
                Keyframe {
                    time: 0.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.0)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 1.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.05 * factor)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 2.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.0)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
            ],
        });
    }

    animations.add(AnimationClip {
        name: "Idle".to_string(),
        duration: 2.0,
        tracks,
        events: vec![],
        loop_mode: LoopMode::Loop,
    })
}

fn create_walk_animation(animations: &mut Assets<AnimationClip>) -> Handle<AnimationClip> {
    let mut tracks = Vec::new();

    // Leg movement
    for (side, phase) in [("Left", 0.0), ("Right", 0.5)].iter() {
        tracks.push(AnimationTrack {
            target_path: format!("{}UpLeg", side),
            property_type: PropertyType::Rotation,
            keyframes: vec![
                Keyframe {
                    time: 0.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.3)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.5,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(-0.3)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 1.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.3)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
            ],
        });

        tracks.push(AnimationTrack {
            target_path: format!("{}Leg", side),
            property_type: PropertyType::Rotation,
            keyframes: vec![
                Keyframe {
                    time: 0.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(-0.6)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.5,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.0)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 1.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(-0.6)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
            ],
        });
    }

    // Arm swing
    for (side, factor) in [("Left", -1.0), ("Right", 1.0)].iter() {
        tracks.push(AnimationTrack {
            target_path: format!("{}Arm", side),
            property_type: PropertyType::Rotation,
            keyframes: vec![
                Keyframe {
                    time: 0.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.6 * factor)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.5,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(-0.6 * factor)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 1.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.6 * factor)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
            ],
        });
    }

    animations.add(AnimationClip {
        name: "Walk".to_string(),
        duration: 1.0,
        tracks,
        events: vec![],
        loop_mode: LoopMode::Loop,
    })
}

fn create_run_animation(animations: &mut Assets<AnimationClip>) -> Handle<AnimationClip> {
    let mut tracks = Vec::new();
    
    // Similar to walk but with more extreme angles and faster timing
    // ... (similar to walk but with modified values)

    animations.add(AnimationClip {
        name: "Run".to_string(),
        duration: 0.6, // Faster than walk
        tracks,
        events: vec![],
        loop_mode: LoopMode::Loop,
    })
}

fn create_jump_animation(animations: &mut Assets<AnimationClip>) -> Handle<AnimationClip> {
    let mut tracks = Vec::new();

    // Jump preparation (squat)
    tracks.push(AnimationTrack {
        target_path: "Root".to_string(),
        property_type: PropertyType::Translation,
        keyframes: vec![
            Keyframe {
                time: 0.0,
                value: KeyframeValue::Translation(Vec3::new(0.0, 0.0, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
            Keyframe {
                time: 0.2,
                value: KeyframeValue::Translation(Vec3::new(0.0, -0.2, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
            Keyframe {
                time: 0.4,
                value: KeyframeValue::Translation(Vec3::new(0.0, 0.5, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
            Keyframe {
                time: 0.8,
                value: KeyframeValue::Translation(Vec3::new(0.0, 0.0, 0.0)),
                interpolation: super::core::InterpolationType::CubicSpline,
            },
        ],
    });

    // Leg extension
    for side in ["Left", "Right"].iter() {
        tracks.push(AnimationTrack {
            target_path: format!("{}Leg", side),
            property_type: PropertyType::Rotation,
            keyframes: vec![
                Keyframe {
                    time: 0.0,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.0)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.2,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(-0.5)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.4,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.2)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
                Keyframe {
                    time: 0.8,
                    value: KeyframeValue::Rotation(Quat::from_rotation_x(0.0)),
                    interpolation: super::core::InterpolationType::CubicSpline,
                },
            ],
        });
    }

    animations.add(AnimationClip {
        name: "Jump".to_string(),
        duration: 0.8,
        tracks,
        events: vec![],
        loop_mode: LoopMode::Once,
    })
}