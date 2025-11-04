use bevy::prelude::*;
use bevy::render::mesh::{Indices, PrimitiveTopology};
use super::core::{Skeleton, Joint, AnimationPlayer};
use super::state_machine::AnimationStateMachine;
use super::blend::BlendTree;

/// Component for visualizing skeleton and animations
#[derive(Component)]
pub struct AnimationDebugVisualization {
    pub show_skeleton: bool,
    pub show_joints: bool,
    pub show_labels: bool,
    pub show_trails: bool,
    pub trail_length: usize,
}

impl Default for AnimationDebugVisualization {
    fn default() -> Self {
        Self {
            show_skeleton: true,
            show_joints: true,
            show_labels: true,
            show_trails: false,
            trail_length: 30,
        }
    }
}

/// Trail data for motion visualization
#[derive(Component)]
struct JointTrail {
    positions: Vec<Vec3>,
    max_length: usize,
}

/// System for updating debug visualization
pub fn animation_debug_system(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    query: Query<(
        Entity,
        &Skeleton,
        &AnimationPlayer,
        Option<&AnimationStateMachine>,
        Option<&BlendTree>,
        &AnimationDebugVisualization,
    )>,
    mut trail_query: Query<(Entity, &mut JointTrail)>,
    mut gizmos: Gizmos,
    time: Res<Time>,
) {
    for (entity, skeleton, player, state_machine, blend_tree, debug_vis) in query.iter() {
        if debug_vis.show_skeleton {
            // Draw bones
            for joint in &skeleton.joints {
                if let Some(parent_idx) = joint.parent_index {
                    let parent = &skeleton.joints[parent_idx];
                    let start = parent.local_transform.translation;
                    let end = joint.local_transform.translation;
                    
                    // Draw bone line
                    gizmos.line(start, end, Color::GREEN);
                }
            }
        }

        if debug_vis.show_joints {
            // Draw joint points and coordinate axes
            for joint in &skeleton.joints {
                let transform = joint.local_transform;
                let position = transform.translation;
                
                // Draw joint sphere
                gizmos.sphere(position, transform.rotation, 0.05, Color::YELLOW);
                
                // Draw local axes
                let axis_length = 0.1;
                gizmos.ray(
                    position,
                    transform.right() * axis_length,
                    Color::RED,
                );
                gizmos.ray(
                    position,
                    transform.up() * axis_length,
                    Color::GREEN,
                );
                gizmos.ray(
                    position,
                    transform.forward() * axis_length,
                    Color::BLUE,
                );
            }
        }

        if debug_vis.show_trails {
            // Update or create trails for each joint
            for (i, joint) in skeleton.joints.iter().enumerate() {
                let trail_entity = commands.spawn((
                    JointTrail {
                        positions: vec![joint.local_transform.translation],
                        max_length: debug_vis.trail_length,
                    },
                    SpatialBundle::default(),
                )).id();

                // Create trail mesh
                let mut trail_positions = Vec::new();
                let mut trail_colors = Vec::new();
                let mut trail_indices = Vec::new();

                for (j, pos) in trail_query.iter().enumerate() {
                    trail_positions.push([pos.1.positions[0].x, pos.1.positions[0].y, pos.1.positions[0].z]);
                    trail_colors.push([1.0, 1.0, 1.0, (1.0 - j as f32 / debug_vis.trail_length as f32)]);
                    if j > 0 {
                        trail_indices.push(j as u32 - 1);
                        trail_indices.push(j as u32);
                    }
                }

                let mut trail_mesh = Mesh::new(PrimitiveTopology::LineStrip);
                trail_mesh.insert_attribute(Mesh::ATTRIBUTE_POSITION, trail_positions);
                trail_mesh.insert_attribute(Mesh::ATTRIBUTE_COLOR, trail_colors);
                trail_mesh.set_indices(Some(Indices::U32(trail_indices)));

                commands.entity(trail_entity).insert(PbrBundle {
                    mesh: meshes.add(trail_mesh),
                    material: materials.add(StandardMaterial {
                        base_color: Color::CYAN,
                        unlit: true,
                        alpha_mode: AlphaMode::Blend,
                        ..default()
                    }),
                    ..default()
                });
            }
        }

        // Display animation state info
        if let Some(state_machine) = state_machine {
            if let Some(current_state) = &state_machine.current_state {
                let state_text = format!("Current State: {}", current_state);
                let transition_text = if let Some((from, to, progress)) = &state_machine.current_transition {
                    format!("Transitioning: {} -> {} ({:.1}%)", from, to, progress * 100.0)
                } else {
                    "No active transition".to_string()
                };

                // Draw state machine debug text
                // TODO: Replace with proper UI overlay
                println!("{}\n{}", state_text, transition_text);
            }
        }

        // Display blend tree info
        if let Some(blend_tree) = blend_tree {
            debug_blend_node(&blend_tree.root, 0);
        }
    }
}

fn debug_blend_node(node: &BlendNode, depth: usize) {
    let indent = "  ".repeat(depth);
    println!(
        "{}Node: Weight={:.2}, Type={:?}",
        indent,
        node.weight,
        node.blend_type
    );

    for param in &node.parameters {
        println!(
            "{}  Parameter: {} = {:.2} ({:.2}..{:.2})",
            indent,
            param.name,
            param.value,
            param.range.0,
            param.range.1
        );
    }

    for child in &node.children {
        debug_blend_node(child, depth + 1);
    }
}

/// Plugin for animation debugging
pub struct AnimationDebugPlugin;

impl Plugin for AnimationDebugPlugin {
    fn build(&self, app: &mut App) {
        app
            .add_systems(Update, animation_debug_system)
            .register_type::<AnimationDebugVisualization>();
    }
}