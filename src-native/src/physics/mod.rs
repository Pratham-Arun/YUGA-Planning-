use crate::core::subsystem::Subsystem;
use rapier3d::prelude::*;
use std::collections::HashMap;
use nalgebra as na;

pub struct PhysicsSystem {
    gravity: Vector<f32>,
    physics_pipeline: PhysicsPipeline,
    island_manager: IslandManager,
    broad_phase: BroadPhase,
    narrow_phase: NarrowPhase,
    rigid_body_set: RigidBodySet,
    collider_set: ColliderSet,
    impulse_joint_set: ImpulseJointSet,
    multibody_joint_set: MultibodyJointSet,
    ccd_solver: CCDSolver,
    physics_hooks: (),
    event_handler: (),
    body_handles: HashMap<u32, RigidBodyHandle>,
    collider_handles: HashMap<u32, ColliderHandle>,
}

impl PhysicsSystem {
    pub fn new() -> Self {
        Self {
            gravity: vector![0.0, -9.81, 0.0],
            physics_pipeline: PhysicsPipeline::new(),
            island_manager: IslandManager::new(),
            broad_phase: BroadPhase::new(),
            narrow_phase: NarrowPhase::new(),
            rigid_body_set: RigidBodySet::new(),
            collider_set: ColliderSet::new(),
            impulse_joint_set: ImpulseJointSet::new(),
            multibody_joint_set: MultibodyJointSet::new(),
            ccd_solver: CCDSolver::new(),
            physics_hooks: (),
            event_handler: (),
            body_handles: HashMap::new(),
            collider_handles: HashMap::new(),
        }
    }

    pub fn create_rigid_body(&mut self, entity_id: u32, position: Point<f32>, is_dynamic: bool) -> RigidBodyHandle {
        let rigid_body = if is_dynamic {
            RigidBodyBuilder::dynamic()
                .translation(position.coords)
                .build()
        } else {
            RigidBodyBuilder::fixed()
                .translation(position.coords)
                .build()
        };

        let handle = self.rigid_body_set.insert(rigid_body);
        self.body_handles.insert(entity_id, handle);
        handle
    }

    pub fn create_collider(
        &mut self,
        entity_id: u32,
        body_handle: RigidBodyHandle,
        shape: ColliderShape,
        restitution: f32,
        friction: f32,
    ) -> ColliderHandle {
        let collider = ColliderBuilder::new(shape)
            .restitution(restitution)
            .friction(friction)
            .build();

        let handle = self.collider_set.insert_with_parent(
            collider,
            body_handle,
            &mut self.rigid_body_set,
        );

        self.collider_handles.insert(entity_id, handle);
        handle
    }

    pub fn apply_force(&mut self, entity_id: u32, force: Vector<f32>) {
        if let Some(&handle) = self.body_handles.get(&entity_id) {
            if let Some(body) = self.rigid_body_set.get_mut(handle) {
                body.add_force(force, true);
            }
        }
    }

    pub fn apply_impulse(&mut self, entity_id: u32, impulse: Vector<f32>) {
        if let Some(&handle) = self.body_handles.get(&entity_id) {
            if let Some(body) = self.rigid_body_set.get_mut(handle) {
                body.apply_impulse(impulse, true);
            }
        }
    }

    pub fn set_gravity(&mut self, gravity: Vector<f32>) {
        self.gravity = gravity;
    }

    pub fn get_position(&self, entity_id: u32) -> Option<Point<f32>> {
        self.body_handles.get(&entity_id)
            .and_then(|&handle| self.rigid_body_set.get(handle))
            .map(|body| body.translation().into())
    }

    pub fn get_rotation(&self, entity_id: u32) -> Option<na::UnitQuaternion<f32>> {
        self.body_handles.get(&entity_id)
            .and_then(|&handle| self.rigid_body_set.get(handle))
            .map(|body| *body.rotation())
    }

    pub fn get_velocity(&self, entity_id: u32) -> Option<Vector<f32>> {
        self.body_handles.get(&entity_id)
            .and_then(|&handle| self.rigid_body_set.get(handle))
            .map(|body| *body.linvel())
    }

    pub fn set_position(&mut self, entity_id: u32, position: Point<f32>) {
        if let Some(&handle) = self.body_handles.get(&entity_id) {
            if let Some(body) = self.rigid_body_set.get_mut(handle) {
                body.set_translation(position.coords, true);
            }
        }
    }

    pub fn set_rotation(&mut self, entity_id: u32, rotation: na::UnitQuaternion<f32>) {
        if let Some(&handle) = self.body_handles.get(&entity_id) {
            if let Some(body) = self.rigid_body_set.get_mut(handle) {
                body.set_rotation(rotation, true);
            }
        }
    }
}

impl Subsystem for PhysicsSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, delta_time: f32) -> Result<(), String> {
        self.physics_pipeline.step(
            &self.gravity,
            &self.physics_hooks,
            &self.event_handler,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.impulse_joint_set,
            &mut self.multibody_joint_set,
            &mut self.ccd_solver,
            None,
            &(),
            &(),
        );
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        self.body_handles.clear();
        self.collider_handles.clear();
        Ok(())
    }
}