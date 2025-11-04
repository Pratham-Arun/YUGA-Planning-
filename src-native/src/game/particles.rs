use bevy::{
    prelude::*,
    render::{
        render_resource::{Buffer, BufferUsages},
        renderer::RenderDevice,
    },
};
use rand::prelude::*;
use std::time::Duration;

// Particle components
#[derive(Component)]
pub struct ParticleEmitter {
    pub config: ParticleConfig,
    pub active: bool,
    pub emission_timer: Timer,
    pub total_particles: u32,
}

#[derive(Clone)]
pub struct ParticleConfig {
    pub max_particles: u32,
    pub emission_rate: f32,
    pub lifetime: Range<f32>,
    pub initial_velocity: Range<Vec3>,
    pub initial_size: Range<Vec2>,
    pub size_over_life: Vec<Vec2>,
    pub color_over_life: Vec<Color>,
    pub forces: Vec<ParticleForce>,
    pub texture: Handle<Image>,
    pub shader: Handle<Shader>,
}

impl Default for ParticleConfig {
    fn default() -> Self {
        Self {
            max_particles: 1000,
            emission_rate: 10.0,
            lifetime: 1.0..2.0,
            initial_velocity: Vec3::ZERO..Vec3::new(0.0, 1.0, 0.0),
            initial_size: Vec2::splat(0.1)..Vec2::splat(0.2),
            size_over_life: vec![Vec2::splat(1.0), Vec2::splat(0.0)],
            color_over_life: vec![Color::WHITE, Color::rgba(1.0, 1.0, 1.0, 0.0)],
            forces: Vec::new(),
            texture: Handle::default(),
            shader: Handle::default(),
        }
    }
}

#[derive(Component)]
pub struct Particle {
    pub velocity: Vec3,
    pub lifetime: f32,
    pub max_lifetime: f32,
    pub size: Vec2,
    pub color: Color,
}

// Particle forces and behaviors
#[derive(Clone)]
pub enum ParticleForce {
    Gravity(Vec3),
    Wind(Vec3),
    Vortex {
        center: Vec3,
        axis: Vec3,
        strength: f32,
    },
    Attractor {
        position: Vec3,
        strength: f32,
        min_distance: f32,
    },
    Resistance {
        strength: f32,
    },
    ShockWave {
        center: Vec3,
        strength: f32,
        decay: f32,
    },
    Turbulence {
        scale: f32,
        strength: f32,
        speed: f32,
        seed: u32,
    },
    Spring {
        anchor: Vec3,
        stiffness: f32,
        damping: f32,
    },
}

// GPU Instance data
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct ParticleInstance {
    pub position: [f32; 3],
    pub size: [f32; 2],
    pub color: [f32; 4],
    pub rotation: f32,
}

// Systems
pub fn spawn_particles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(Entity, &Transform, &mut ParticleEmitter)>,
    render_device: Res<RenderDevice>,
) {
    for (entity, transform, mut emitter) in query.iter_mut() {
        if !emitter.active {
            continue;
        }

        emitter.emission_timer.tick(time.delta());
        
        if emitter.emission_timer.just_finished() && 
           emitter.total_particles < emitter.config.max_particles {
            let mut rng = rand::thread_rng();
            
            let particle = Particle {
                velocity: rng.gen_range(emitter.config.initial_velocity.clone()),
                lifetime: 0.0,
                max_lifetime: rng.gen_range(emitter.config.lifetime.clone()),
                size: rng.gen_range(emitter.config.initial_size.clone()),
                color: emitter.config.color_over_life[0],
            };

            let instance = ParticleInstance {
                position: transform.translation.into(),
                size: particle.size.into(),
                color: particle.color.as_rgba_f32(),
                rotation: 0.0,
            };

            commands.spawn((particle, instance));
            emitter.total_particles += 1;
        }
    }
}

pub fn update_particles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(Entity, &mut Particle, &mut ParticleInstance)>,
) {
    for (entity, mut particle, mut instance) in query.iter_mut() {
        particle.lifetime += time.delta_seconds();

        if particle.lifetime >= particle.max_lifetime {
            commands.entity(entity).despawn();
            continue;
        }

        let life_percent = particle.lifetime / particle.max_lifetime;

        // Update position
        let position = Vec3::from(instance.position);
        let new_position = position + particle.velocity * time.delta_seconds();
        instance.position = new_position.into();

        // Update size and color using interpolation
        let size_index = ((emitter.config.size_over_life.len() - 1) as f32 * life_percent) as usize;
        let color_index = ((emitter.config.color_over_life.len() - 1) as f32 * life_percent) as usize;

        let size_t = life_percent * (emitter.config.size_over_life.len() - 1) as f32 % 1.0;
        let color_t = life_percent * (emitter.config.color_over_life.len() - 1) as f32 % 1.0;

        particle.size = emitter.config.size_over_life[size_index].lerp(
            emitter.config.size_over_life[size_index + 1],
            size_t,
        );

        particle.color = emitter.config.color_over_life[color_index].lerp(
            emitter.config.color_over_life[color_index + 1],
            color_t,
        );

        instance.size = particle.size.into();
        instance.color = particle.color.as_rgba_f32();
    }
}

pub fn apply_particle_forces(
    time: Res<Time>,
    mut query: Query<(&mut Particle, &ParticleInstance)>,
    emitters: Query<&ParticleEmitter>,
) {
    for (mut particle, instance) in query.iter_mut() {
        let position = Vec3::from(instance.position);

        for emitter in emitters.iter() {
            for force in &emitter.config.forces {
                match force {
                    ParticleForce::Gravity(acceleration) => {
                        particle.velocity += *acceleration * time.delta_seconds();
                    }
                    ParticleForce::Wind(velocity) => {
                        let diff = *velocity - particle.velocity;
                        particle.velocity += diff * 0.1 * time.delta_seconds();
                    }
                    ParticleForce::Vortex { center, axis, strength } => {
                        let to_particle = position - *center;
                        let tangent = axis.cross(to_particle).normalize();
                        particle.velocity += tangent * *strength * time.delta_seconds();
                    }
                    ParticleForce::Attractor { position: target, strength, min_distance } => {
                        let diff = *target - position;
                        let distance = diff.length();
                        if distance > *min_distance {
                            let force = diff.normalize() * *strength / distance.max(*min_distance);
                            particle.velocity += force * time.delta_seconds();
                        }
                    }
                }
            }
        }
    }
}

// Plugin registration
pub struct ParticleSystemPlugin;

impl Plugin for ParticleSystemPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, (
            spawn_particles,
            apply_particle_forces,
            update_particles,
        ).chain());
    }
}