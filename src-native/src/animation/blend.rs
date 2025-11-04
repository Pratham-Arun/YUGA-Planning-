use bevy::prelude::*;
use super::core::{AnimationClip, Skeleton, KeyframeValue, Transform};

/// Types of blending between animations
#[derive(Debug, Clone, Copy)]
pub enum BlendType {
    Linear,      // Simple linear interpolation
    Additive,    // Add one animation on top of another
    Override,    // Complete override with weight
}

/// A node in the blend tree
#[derive(Debug, Clone)]
pub struct BlendNode {
    pub animation: Handle<AnimationClip>,
    pub weight: f32,
    pub blend_type: BlendType,
    pub children: Vec<BlendNode>,
    pub parameters: Vec<BlendParameter>,
}

/// Parameter that influences blending
#[derive(Debug, Clone)]
pub struct BlendParameter {
    pub name: String,
    pub value: f32,
    pub range: (f32, f32),
}

/// Complete blend tree for complex animation mixing
#[derive(Component, Debug)]
pub struct BlendTree {
    pub root: BlendNode,
    pub parameters: Vec<BlendParameter>,
}

/// Cached pose data for efficient blending
#[derive(Debug, Clone)]
struct BlendPose {
    joint_transforms: Vec<Transform>,
}

impl BlendPose {
    fn new(joint_count: usize) -> Self {
        Self {
            joint_transforms: vec![Transform::default(); joint_count],
        }
    }

    fn lerp(&self, other: &BlendPose, factor: f32) -> BlendPose {
        let mut result = BlendPose::new(self.joint_transforms.len());
        
        for i in 0..self.joint_transforms.len() {
            result.joint_transforms[i] = Transform {
                translation: self.joint_transforms[i].translation.lerp(
                    other.joint_transforms[i].translation, 
                    factor
                ),
                rotation: self.joint_transforms[i].rotation.slerp(
                    other.joint_transforms[i].rotation, 
                    factor
                ),
                scale: self.joint_transforms[i].scale.lerp(
                    other.joint_transforms[i].scale, 
                    factor
                ),
            };
        }
        
        result
    }

    fn add(&self, other: &BlendPose, weight: f32) -> BlendPose {
        let mut result = self.clone();
        
        for i in 0..self.joint_transforms.len() {
            result.joint_transforms[i].translation += other.joint_transforms[i].translation * weight;
            result.joint_transforms[i].rotation = result.joint_transforms[i].rotation.mul_quat(
                other.joint_transforms[i].rotation.scale(weight)
            );
            result.joint_transforms[i].scale += (other.joint_transforms[i].scale - Vec3::ONE) * weight;
        }
        
        result
    }
}

/// System for updating blend trees
pub fn blend_tree_system(
    mut query: Query<(&BlendTree, &mut Skeleton)>,
    animations: Res<Assets<AnimationClip>>,
    time: Res<Time>,
) {
    for (blend_tree, mut skeleton) in query.iter_mut() {
        // Evaluate blend tree recursively
        if let Some(final_pose) = evaluate_blend_node(
            &blend_tree.root,
            &animations,
            skeleton.joints.len(),
            time.delta_seconds(),
        ) {
            // Apply final pose to skeleton
            for (i, transform) in final_pose.joint_transforms.iter().enumerate() {
                skeleton.joints[i].local_transform = *transform;
            }
        }
    }
}

fn evaluate_blend_node(
    node: &BlendNode,
    animations: &Assets<AnimationClip>,
    joint_count: usize,
    delta_time: f32,
) -> Option<BlendPose> {
    // Get current animation pose
    let current_pose = if let Some(animation) = animations.get(&node.animation) {
        sample_animation(animation, joint_count, delta_time)
    } else {
        return None;
    };

    // If this is a leaf node, return its pose
    if node.children.is_empty() {
        return Some(current_pose);
    }

    // Evaluate child nodes
    let mut child_poses = Vec::new();
    let mut total_weight = 0.0;

    for child in &node.children {
        if let Some(child_pose) = evaluate_blend_node(child, animations, joint_count, delta_time) {
            total_weight += child.weight;
            child_poses.push((child_pose, child.weight));
        }
    }

    // Normalize weights
    if total_weight > 0.0 {
        for (_, weight) in child_poses.iter_mut() {
            *weight /= total_weight;
        }
    }

    // Blend poses according to blend type
    let mut final_pose = current_pose;

    match node.blend_type {
        BlendType::Linear => {
            for (pose, weight) in child_poses {
                final_pose = final_pose.lerp(&pose, weight);
            }
        }
        BlendType::Additive => {
            for (pose, weight) in child_poses {
                final_pose = final_pose.add(&pose, weight);
            }
        }
        BlendType::Override => {
            // Take the highest weight pose
            if let Some((pose, _)) = child_poses.iter()
                .max_by(|(_, w1), (_, w2)| w1.partial_cmp(w2).unwrap()) {
                final_pose = pose.clone();
            }
        }
    }

    Some(final_pose)
}

fn sample_animation(
    animation: &AnimationClip,
    joint_count: usize,
    delta_time: f32,
) -> BlendPose {
    let mut pose = BlendPose::new(joint_count);
    
    // Sample each track at current time
    for track in &animation.tracks {
        // TODO: Implement proper animation sampling
        // This is a placeholder that should be replaced with actual keyframe sampling
    }
    
    pose
}