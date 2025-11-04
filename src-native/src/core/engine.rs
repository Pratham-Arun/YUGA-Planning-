use crate::core::{
    subsystem::SubsystemManager,
    ecs::{EcsSystem, Transform, RigidBody, Renderable},
    scripting::ScriptingSystem,
};
use crate::graphics::Renderer;
use std::time::Instant;

pub struct Engine {
    subsystem_manager: SubsystemManager,
    running: bool,
}

impl Engine {
    pub fn new() -> Result<Self, String> {
        let mut engine = Self {
            subsystem_manager: SubsystemManager::new(),
            running: false,
        };

        // Initialize subsystems
        engine.init_subsystems()?;

        Ok(engine)
    }

    fn init_subsystems(&mut self) -> Result<(), String> {
        // Initialize subsystems
        let mut ecs = EcsSystem::new();
        let mut physics = PhysicsSystem::new();
        let mut audio = AudioSystem::new().map_err(|e| e.to_string())?;
        let mut input = InputSystem::new();
        let mut assets = AssetSystem::new("assets/");
        let mut profiling = ProfilingSystem::new();

        // Set up example entity
        let entity = ecs.spawn((
            Transform {
                position: nalgebra::Vector3::new(0.0, 0.0, 0.0),
                rotation: nalgebra::UnitQuaternion::identity(),
                scale: nalgebra::Vector3::new(1.0, 1.0, 1.0),
            },
            RigidBody {
                velocity: nalgebra::Vector3::zeros(),
                acceleration: nalgebra::Vector3::zeros(),
                mass: 1.0,
            },
            Renderable {
                mesh_id: 0,
                material_id: 0,
            },
        ));

        // Register subsystems
        self.subsystem_manager.register(ecs)?;
        self.subsystem_manager.register(physics)?;
        self.subsystem_manager.register(audio)?;
        self.subsystem_manager.register(input)?;
        self.subsystem_manager.register(assets)?;
        self.subsystem_manager.register(profiling)?;

        // Initialize scripting system
        let scripting = ScriptingSystem::new();
        self.subsystem_manager.register(scripting)?;

        // Initialize other subsystems as needed

        Ok(())
    }

    pub fn run(&mut self) -> Result<(), String> {
        self.running = true;
        let mut last_time = Instant::now();

        while self.running {
            let current_time = Instant::now();
            let delta_time = (current_time - last_time).as_secs_f32();
            last_time = current_time;

            // Start frame profiling
            if let Some(profiling) = self.subsystem_manager.get_mut::<ProfilingSystem>() {
                profiling.begin_frame();
            }

            // Process input
            if let Some(input) = self.subsystem_manager.get_mut::<InputSystem>() {
                profiling.begin_subsystem_profile("Input");
                if input.is_key_just_pressed(glfw::Key::Escape) {
                    self.running = false;
                }
                profiling.end_subsystem_profile("Input");
            }

            // Update physics
            if let Some(physics) = self.subsystem_manager.get_mut::<PhysicsSystem>() {
                profiling.begin_subsystem_profile("Physics");
                physics.update(delta_time)?;
                profiling.end_subsystem_profile("Physics");
            }

            // Update audio
            if let Some(audio) = self.subsystem_manager.get_mut::<AudioSystem>() {
                profiling.begin_subsystem_profile("Audio");
                audio.update(delta_time)?;
                profiling.end_subsystem_profile("Audio");
            }

            // Update ECS
            if let Some(ecs) = self.subsystem_manager.get_mut::<EcsSystem>() {
                profiling.begin_subsystem_profile("ECS");
                ecs.update(delta_time)?;
                profiling.end_subsystem_profile("ECS");
            }

            // Update asset system
            if let Some(assets) = self.subsystem_manager.get_mut::<AssetSystem>() {
                profiling.begin_subsystem_profile("Assets");
                assets.update(delta_time)?;
                profiling.end_subsystem_profile("Assets");
            }

            // End frame profiling and collect stats
            if let Some(profiling) = self.subsystem_manager.get_mut::<ProfilingSystem>() {
                profiling.end_frame();
                
                // Log performance stats every second
                if current_time.elapsed().as_secs_f32() >= 1.0 {
                    let stats = profiling.get_stats();
                    println!(
                        "FPS: {:.2}, Frame Time: {:.2}ms, Draw Calls: {}, Triangles: {}",
                        stats.fps,
                        stats.frame_time.as_secs_f32() * 1000.0,
                        stats.draw_calls,
                        stats.triangle_count
                    );
                }
            }
        }

        self.shutdown()?;
        Ok(())
    }

    pub fn shutdown(&mut self) -> Result<(), String> {
        self.running = false;
        self.subsystem_manager.shutdown()
    }
}