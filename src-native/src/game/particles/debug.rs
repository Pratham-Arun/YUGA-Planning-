use bevy::prelude::*;
use bevy::diagnostic::{Diagnostics, FrameTimeDiagnosticsPlugin};
use super::{ParticleEmitter, Particle};

pub struct ParticleDebugPlugin;

impl Plugin for ParticleDebugPlugin {
    fn build(&self, app: &mut App) {
        app
            .add_plugins(FrameTimeDiagnosticsPlugin::default())
            .init_resource::<ParticleDebugState>()
            .add_systems(Update, (
                update_particle_debug_stats,
                particle_debug_visualization,
            ));
    }
}

#[derive(Resource, Default)]
pub struct ParticleDebugState {
    pub show_debug_overlay: bool,
    pub show_particle_bounds: bool,
    pub show_emitter_radius: bool,
    pub show_force_fields: bool,
    pub stats: ParticleStats,
}

#[derive(Default)]
pub struct ParticleStats {
    pub total_particles: u32,
    pub active_emitters: u32,
    pub emission_rate: f32,
    pub particle_updates_per_frame: u32,
    pub gpu_memory_usage: u64,
    pub cpu_time: f32,
    pub gpu_time: f32,
}

fn update_particle_debug_stats(
    mut debug_state: ResMut<ParticleDebugState>,
    particle_query: Query<&Particle>,
    emitter_query: Query<&ParticleEmitter>,
    diagnostics: Res<Diagnostics>,
) {
    let mut stats = ParticleStats::default();
    
    // Count particles and gather statistics
    stats.total_particles = particle_query.iter().count() as u32;
    stats.active_emitters = emitter_query.iter().filter(|e| e.active).count() as u32;
    
    // Calculate emission rate
    stats.emission_rate = emitter_query.iter()
        .filter(|e| e.active)
        .map(|e| e.config.emission_rate)
        .sum();
        
    // Get performance metrics from diagnostics
    if let Some(frame_time) = diagnostics.get(FrameTimeDiagnosticsPlugin::FRAME_TIME) {
        if let Some(value) = frame_time.average() {
            stats.cpu_time = value * 0.001; // Convert to milliseconds
        }
    }
    
    debug_state.stats = stats;
}

fn particle_debug_visualization(
    mut gizmos: Gizmos,
    debug_state: Res<ParticleDebugState>,
    particle_query: Query<(&Particle, &Transform)>,
    emitter_query: Query<(&ParticleEmitter, &Transform)>,
) {
    if !debug_state.show_debug_overlay {
        return;
    }

    // Draw particle bounds
    if debug_state.show_particle_bounds {
        for (particle, transform) in particle_query.iter() {
            let size = Vec3::new(particle.size.x, particle.size.y, 0.0);
            gizmos.rect(
                transform.translation,
                transform.rotation,
                size.truncate(),
                Color::GREEN,
            );
        }
    }

    // Draw emitter radius and direction
    if debug_state.show_emitter_radius {
        for (emitter, transform) in emitter_query.iter() {
            if !emitter.active {
                continue;
            }

            // Draw emission cone
            gizmos.circle(
                transform.translation,
                transform.rotation * Vec3::Z,
                1.0,
                Color::YELLOW,
            );

            // Draw direction indicator
            let direction = transform.forward() * 2.0;
            gizmos.ray(
                transform.translation,
                direction,
                Color::BLUE,
            );
        }
    }

    // Draw force fields
    if debug_state.show_force_fields {
        for (emitter, transform) in emitter_query.iter() {
            for force in &emitter.config.forces {
                match force {
                    ParticleForce::Attractor { position, strength, min_distance } => {
                        gizmos.circle(
                            *position,
                            Vec3::Y,
                            *min_distance,
                            Color::RED,
                        );
                    }
                    ParticleForce::Vortex { center, axis, strength } => {
                        gizmos.circle(
                            *center,
                            *axis,
                            *strength,
                            Color::PURPLE,
                        );
                    }
                    _ => {}
                }
            }
        }
    }
}

// Debug UI overlay
pub fn particle_debug_ui(
    mut egui_context: EguiContext,
    mut debug_state: ResMut<ParticleDebugState>,
) {
    egui::Window::new("Particle System Debug")
        .show(egui_context.ctx_mut(), |ui| {
            ui.checkbox(&mut debug_state.show_particle_bounds, "Show Particle Bounds");
            ui.checkbox(&mut debug_state.show_emitter_radius, "Show Emitter Radius");
            ui.checkbox(&mut debug_state.show_force_fields, "Show Force Fields");
            
            ui.separator();
            
            ui.label(format!("Total Particles: {}", debug_state.stats.total_particles));
            ui.label(format!("Active Emitters: {}", debug_state.stats.active_emitters));
            ui.label(format!("Emission Rate: {:.1} particles/s", debug_state.stats.emission_rate));
            ui.label(format!("CPU Time: {:.2} ms", debug_state.stats.cpu_time));
            ui.label(format!("GPU Time: {:.2} ms", debug_state.stats.gpu_time));
            
            ui.separator();
            
            if ui.button("Reset Statistics").clicked() {
                debug_state.stats = ParticleStats::default();
            }
        });
}