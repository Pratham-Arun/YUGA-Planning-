use bevy::prelude::*;
use super::{ParticleInstance, ParticleConfig, ParticleForce};

// Common effect configurations
pub struct ParticleEffects;

impl ParticleEffects {
    pub fn fire() -> ParticleConfig {
        ParticleConfig {
            max_particles: 1000,
            emission_rate: 50.0,
            lifetime: 0.5..1.5,
            initial_velocity: Vec3::new(-0.2, 1.0, -0.2)..Vec3::new(0.2, 2.0, 0.2),
            initial_size: Vec2::splat(0.2)..Vec2::splat(0.4),
            size_over_life: vec![
                Vec2::splat(1.0),
                Vec2::splat(1.2),
                Vec2::splat(0.8),
                Vec2::splat(0.0),
            ],
            color_over_life: vec![
                Color::rgba(1.0, 0.5, 0.0, 0.0),  // Transparent orange
                Color::rgba(1.0, 0.3, 0.0, 1.0),  // Bright orange
                Color::rgba(0.7, 0.0, 0.0, 0.8),  // Dark red
                Color::rgba(0.3, 0.3, 0.3, 0.0),  // Smoke
            ],
            forces: vec![
                ParticleForce::Gravity(Vec3::new(0.0, 2.0, 0.0)),
                ParticleForce::Wind(Vec3::new(0.0, 1.0, 0.0)),
            ],
            ..Default::default()
        }
    }

    pub fn smoke() -> ParticleConfig {
        ParticleConfig {
            max_particles: 500,
            emission_rate: 20.0,
            lifetime: 2.0..4.0,
            initial_velocity: Vec3::new(-0.1, 0.3, -0.1)..Vec3::new(0.1, 0.5, 0.1),
            initial_size: Vec2::splat(0.3)..Vec2::splat(0.6),
            size_over_life: vec![
                Vec2::splat(0.8),
                Vec2::splat(1.5),
                Vec2::splat(2.0),
            ],
            color_over_life: vec![
                Color::rgba(0.2, 0.2, 0.2, 0.0),
                Color::rgba(0.5, 0.5, 0.5, 0.3),
                Color::rgba(0.7, 0.7, 0.7, 0.1),
                Color::rgba(0.9, 0.9, 0.9, 0.0),
            ],
            forces: vec![
                ParticleForce::Wind(Vec3::new(0.2, 0.1, 0.0)),
                ParticleForce::Vortex {
                    center: Vec3::ZERO,
                    axis: Vec3::Y,
                    strength: 0.2,
                },
            ],
            ..Default::default()
        }
    }

    pub fn magic_aura() -> ParticleConfig {
        ParticleConfig {
            max_particles: 300,
            emission_rate: 30.0,
            lifetime: 1.0..2.0,
            initial_velocity: Vec3::new(-0.3, 0.0, -0.3)..Vec3::new(0.3, 0.0, 0.3),
            initial_size: Vec2::splat(0.1)..Vec2::splat(0.2),
            size_over_life: vec![
                Vec2::splat(0.5),
                Vec2::splat(1.0),
                Vec2::splat(0.0),
            ],
            color_over_life: vec![
                Color::rgba(0.5, 0.0, 1.0, 0.0),  // Purple
                Color::rgba(0.7, 0.3, 1.0, 0.8),  // Bright purple
                Color::rgba(0.3, 0.9, 1.0, 0.5),  // Cyan
                Color::rgba(0.0, 0.5, 1.0, 0.0),  // Blue
            ],
            forces: vec![
                ParticleForce::Attractor {
                    position: Vec3::ZERO,
                    strength: 1.0,
                    min_distance: 0.5,
                },
                ParticleForce::Vortex {
                    center: Vec3::ZERO,
                    axis: Vec3::Y,
                    strength: 0.5,
                },
            ],
            ..Default::default()
        }
    }

    pub fn explosion() -> ParticleConfig {
        ParticleConfig {
            max_particles: 2000,
            emission_rate: 2000.0,  // Burst emission
            lifetime: 0.5..1.5,
            initial_velocity: Vec3::new(-5.0, -5.0, -5.0)..Vec3::new(5.0, 5.0, 5.0),
            initial_size: Vec2::splat(0.2)..Vec2::splat(0.4),
            size_over_life: vec![
                Vec2::splat(1.0),
                Vec2::splat(0.8),
                Vec2::splat(0.3),
                Vec2::splat(0.0),
            ],
            color_over_life: vec![
                Color::rgba(1.0, 0.8, 0.3, 1.0),  // Bright yellow
                Color::rgba(1.0, 0.4, 0.0, 0.8),  // Orange
                Color::rgba(0.7, 0.0, 0.0, 0.5),  // Red
                Color::rgba(0.3, 0.3, 0.3, 0.0),  // Smoke
            ],
            forces: vec![
                ParticleForce::Gravity(Vec3::new(0.0, -2.0, 0.0)),
                ParticleForce::Resistance { strength: 2.0 },
                ParticleForce::ShockWave {
                    center: Vec3::ZERO,
                    strength: 10.0,
                    decay: 2.0,
                },
            ],
            ..Default::default()
        }
    }
}