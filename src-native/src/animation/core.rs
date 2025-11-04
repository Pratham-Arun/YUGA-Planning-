use bevy::prelude::*;
use std::collections::HashMap;

/// Represents a joint in a skeletal animation
#[derive(Component, Debug, Clone)]
pub struct Joint {
    pub name: String,
    pub index: usize,
    pub parent_index: Option<usize>,
    pub local_transform: Transform,
    pub inverse_bind_pose: Mat4,
}

/// A complete skeleton made up of joints
#[derive(Component, Debug, Clone)]
pub struct Skeleton {
    pub joints: Vec<Joint>,
    pub bind_pose: Vec<Mat4>,
    pub inverse_bind_pose: Vec<Mat4>,
}

/// A keyframe in an animation track
#[derive(Debug, Clone)]
pub struct Keyframe {
    pub time: f32,
    pub value: KeyframeValue,
    pub interpolation: InterpolationType,
}

/// Types of values that can be animated
#[derive(Debug, Clone)]
pub enum KeyframeValue {
    Transform(Transform),
    Translation(Vec3),
    Rotation(Quat),
    Scale(Vec3),
    Float(f32),
}

/// Different types of interpolation between keyframes
#[derive(Debug, Clone)]
pub enum InterpolationType {
    Linear,
    Step,
    CubicSpline,
    Bezier {
        control_point1: Vec3,
        control_point2: Vec3,
    },
}

/// A track of animation data for a specific property
#[derive(Debug, Clone)]
pub struct AnimationTrack {
    pub target_path: String,  // Path to the property being animated
    pub keyframes: Vec<Keyframe>,
    pub property_type: PropertyType,
}

/// Type of property being animated
#[derive(Debug, Clone)]
pub enum PropertyType {
    Transform,
    Translation,
    Rotation,
    Scale,
    Custom(String),
}

/// A complete animation clip
#[derive(Component, Debug, Clone)]
pub struct AnimationClip {
    pub name: String,
    pub duration: f32,
    pub tracks: Vec<AnimationTrack>,
    pub events: Vec<AnimationEvent>,
    pub loop_mode: LoopMode,
}

/// Event triggered during animation playback
#[derive(Debug, Clone)]
pub struct AnimationEvent {
    pub time: f32,
    pub event_type: String,
    pub parameters: HashMap<String, String>,
}

/// How the animation should loop
#[derive(Debug, Clone, Copy)]
pub enum LoopMode {
    Once,
    Loop,
    PingPong,
    ClampForever,
}

/// Controls animation playback
#[derive(Component, Debug)]
pub struct AnimationPlayer {
    pub current_animation: Option<Handle<AnimationClip>>,
    pub time: f32,
    pub speed: f32,
    pub is_playing: bool,
}

impl AnimationPlayer {
    pub fn new() -> Self {
        Self {
            current_animation: None,
            time: 0.0,
            speed: 1.0,
            is_playing: false,
        }
    }

    pub fn play(&mut self, animation: Handle<AnimationClip>) {
        self.current_animation = Some(animation);
        self.time = 0.0;
        self.is_playing = true;
    }

    pub fn stop(&mut self) {
        self.is_playing = false;
    }

    pub fn pause(&mut self) {
        self.is_playing = false;
    }

    pub fn resume(&mut self) {
        self.is_playing = true;
    }

    pub fn seek(&mut self, time: f32) {
        self.time = time;
    }
}

/// System for updating animations
pub fn animation_system(
    time: Res<Time>,
    mut query: Query<(&mut AnimationPlayer, &mut Skeleton)>,
    animations: Res<Assets<AnimationClip>>,
) {
    for (mut player, mut skeleton) in query.iter_mut() {
        if !player.is_playing {
            continue;
        }

        if let Some(animation_handle) = &player.current_animation {
            if let Some(animation) = animations.get(animation_handle) {
                // Update animation time
                player.time += time.delta_seconds() * player.speed;

                // Handle looping
                match animation.loop_mode {
                    LoopMode::Once if player.time >= animation.duration => {
                        player.is_playing = false;
                        player.time = animation.duration;
                    }
                    LoopMode::Loop => {
                        player.time %= animation.duration;
                    }
                    LoopMode::PingPong => {
                        let cycle = (player.time / animation.duration) as i32;
                        if cycle % 2 == 0 {
                            player.time %= animation.duration;
                        } else {
                            player.time = animation.duration - (player.time % animation.duration);
                        }
                    }
                    LoopMode::ClampForever => {
                        player.time = player.time.min(animation.duration);
                    }
                    _ => {}
                }

                // Apply animation tracks
                for track in &animation.tracks {
                    apply_track(track, player.time, &mut skeleton);
                }
            }
        }
    }
}

fn apply_track(track: &AnimationTrack, time: f32, skeleton: &mut Skeleton) {
    // Find the keyframes before and after the current time
    let mut prev_keyframe = None;
    let mut next_keyframe = None;

    for window in track.keyframes.windows(2) {
        if time >= window[0].time && time <= window[1].time {
            prev_keyframe = Some(&window[0]);
            next_keyframe = Some(&window[1]);
            break;
        }
    }

    if let (Some(prev), Some(next)) = (prev_keyframe, next_keyframe) {
        // Calculate interpolation factor
        let factor = (time - prev.time) / (next.time - prev.time);

        // Apply interpolated value based on property type
        match (&prev.value, &next.value) {
            (KeyframeValue::Transform(t1), KeyframeValue::Transform(t2)) => {
                let interpolated = interpolate_transform(t1, t2, factor);
                apply_transform_to_skeleton(&track.target_path, interpolated, skeleton);
            }
            (KeyframeValue::Translation(t1), KeyframeValue::Translation(t2)) => {
                let interpolated = t1.lerp(*t2, factor);
                apply_translation_to_skeleton(&track.target_path, interpolated, skeleton);
            }
            (KeyframeValue::Rotation(r1), KeyframeValue::Rotation(r2)) => {
                let interpolated = r1.slerp(*r2, factor);
                apply_rotation_to_skeleton(&track.target_path, interpolated, skeleton);
            }
            (KeyframeValue::Scale(s1), KeyframeValue::Scale(s2)) => {
                let interpolated = s1.lerp(*s2, factor);
                apply_scale_to_skeleton(&track.target_path, interpolated, skeleton);
            }
            _ => {}
        }
    }
}

fn interpolate_transform(t1: &Transform, t2: &Transform, factor: f32) -> Transform {
    Transform {
        translation: t1.translation.lerp(t2.translation, factor),
        rotation: t1.rotation.slerp(t2.rotation, factor),
        scale: t1.scale.lerp(t2.scale, factor),
    }
}

fn apply_transform_to_skeleton(path: &str, transform: Transform, skeleton: &mut Skeleton) {
    if let Some(joint_index) = find_joint_by_path(path, skeleton) {
        skeleton.joints[joint_index].local_transform = transform;
    }
}

fn apply_translation_to_skeleton(path: &str, translation: Vec3, skeleton: &mut Skeleton) {
    if let Some(joint_index) = find_joint_by_path(path, skeleton) {
        skeleton.joints[joint_index].local_transform.translation = translation;
    }
}

fn apply_rotation_to_skeleton(path: &str, rotation: Quat, skeleton: &mut Skeleton) {
    if let Some(joint_index) = find_joint_by_path(path, skeleton) {
        skeleton.joints[joint_index].local_transform.rotation = rotation;
    }
}

fn apply_scale_to_skeleton(path: &str, scale: Vec3, skeleton: &mut Skeleton) {
    if let Some(joint_index) = find_joint_by_path(path, skeleton) {
        skeleton.joints[joint_index].local_transform.scale = scale;
    }
}

fn find_joint_by_path(path: &str, skeleton: &Skeleton) -> Option<usize> {
    skeleton.joints.iter().position(|joint| joint.name == path)
}