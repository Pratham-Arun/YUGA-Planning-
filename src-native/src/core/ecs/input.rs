use bevy::prelude::*;
use serde::{Serialize, Deserialize};

// Input state component for entities that need input
#[derive(Component, Debug, Clone, Serialize, Deserialize)]
pub struct InputComponent {
    pub enabled: bool,
    pub mappings: Vec<InputMapping>,
    pub state: InputState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputMapping {
    pub name: String,
    pub input_type: InputType,
    pub action: InputAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputType {
    Key(KeyCode),
    MouseButton(MouseButton),
    MouseMotion,
    GamepadButton(GamepadButtonType),
    GamepadAxis(GamepadAxisType),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputAction {
    Move(Vec3),
    Rotate(Vec3),
    Action(String),
    Custom(String, f32),
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InputState {
    pub movement: Vec3,
    pub rotation: Vec3,
    pub actions: Vec<String>,
}

impl Default for InputComponent {
    fn default() -> Self {
        Self {
            enabled: true,
            mappings: Vec::new(),
            state: InputState::default(),
        }
    }
}

// Camera component with additional features
#[derive(Component, Debug, Clone)]
pub struct CameraComponent {
    pub active: bool,
    pub mode: CameraMode,
    pub fov: f32,
    pub near: f32,
    pub far: f32,
    pub target: Option<Entity>,
    pub offset: Vec3,
}

#[derive(Debug, Clone)]
pub enum CameraMode {
    Free,
    Follow,
    Orbit { distance: f32, min_zoom: f32, max_zoom: f32 },
    FirstPerson,
}

impl Default for CameraComponent {
    fn default() -> Self {
        Self {
            active: true,
            mode: CameraMode::Free,
            fov: 75.0,
            near: 0.1,
            far: 1000.0,
            target: None,
            offset: Vec3::ZERO,
        }
    }
}

// Plugin to register these components
pub struct CoreComponentsPlugin;

impl Plugin for CoreComponentsPlugin {
    fn build(&self, app: &mut App) {
        app.register_type::<InputComponent>()
           .register_type::<CameraComponent>()
           .add_systems(Update, (
               process_input,
               update_camera
           ));
    }
}

// Input processing system
fn process_input(
    mut query: Query<(&mut InputComponent, &mut Transform)>,
    keyboard: Res<Input<KeyCode>>,
    mouse: Res<Input<MouseButton>>,
    mut mouse_motion: EventReader<MouseMotion>,
    gamepads: Res<Gamepads>,
    button_inputs: Res<Input<GamepadButton>>,
    axes: Res<Axis<GamepadAxis>>,
    time: Res<Time>,
) {
    for (mut input, mut transform) in query.iter_mut() {
        if !input.enabled {
            continue;
        }

        // Reset state
        input.state = InputState::default();

        // Process each mapping
        for mapping in &input.mappings {
            match &mapping.input_type {
                InputType::Key(key) => {
                    if keyboard.pressed(*key) {
                        apply_input_action(&mut input.state, &mapping.action);
                    }
                }
                InputType::MouseButton(button) => {
                    if mouse.pressed(*button) {
                        apply_input_action(&mut input.state, &mapping.action);
                    }
                }
                InputType::MouseMotion => {
                    for event in mouse_motion.iter() {
                        let delta = Vec3::new(event.delta.x, event.delta.y, 0.0);
                        apply_input_action(&mut input.state, &mapping.action);
                    }
                }
                InputType::GamepadButton(button) => {
                    for gamepad in gamepads.iter() {
                        if button_inputs.pressed(GamepadButton::new(gamepad, *button)) {
                            apply_input_action(&mut input.state, &mapping.action);
                        }
                    }
                }
                InputType::GamepadAxis(axis) => {
                    for gamepad in gamepads.iter() {
                        if let Some(value) = axes.get(GamepadAxis::new(gamepad, *axis)) {
                            let action = match &mapping.action {
                                InputAction::Move(dir) => InputAction::Move(*dir * value),
                                InputAction::Rotate(rot) => InputAction::Rotate(*rot * value),
                                other => other.clone(),
                            };
                            apply_input_action(&mut input.state, &action);
                        }
                    }
                }
            }
        }

        // Apply movement and rotation
        let dt = time.delta_seconds();
        transform.translation += input.state.movement * dt;
        transform.rotate(Quat::from_euler(
            EulerRot::XYZ,
            input.state.rotation.x * dt,
            input.state.rotation.y * dt,
            input.state.rotation.z * dt
        ));
    }
}

fn apply_input_action(state: &mut InputState, action: &InputAction) {
    match action {
        InputAction::Move(dir) => state.movement += *dir,
        InputAction::Rotate(rot) => state.rotation += *rot,
        InputAction::Action(name) => state.actions.push(name.clone()),
        InputAction::Custom(_, _) => {} // Handle custom actions
    }
}

// Camera update system
fn update_camera(
    mut query: Query<(&mut Transform, &CameraComponent)>,
    target_query: Query<&Transform, Without<CameraComponent>>,
    time: Res<Time>,
) {
    for (mut cam_transform, camera) in query.iter_mut() {
        if !camera.active {
            continue;
        }

        match &camera.mode {
            CameraMode::Free => {
                // Free camera movement handled by input system
            }
            CameraMode::Follow => {
                if let Some(target) = camera.target {
                    if let Ok(target_transform) = target_query.get(target) {
                        let target_pos = target_transform.translation + camera.offset;
                        cam_transform.translation = cam_transform.translation.lerp(target_pos, 0.1);
                        // TODO: Add smooth rotation
                    }
                }
            }
            CameraMode::Orbit { distance, min_zoom, max_zoom } => {
                if let Some(target) = camera.target {
                    if let Ok(target_transform) = target_query.get(target) {
                        // Implement orbital camera movement
                        // This would use spherical coordinates to orbit around the target
                    }
                }
            }
            CameraMode::FirstPerson => {
                if let Some(target) = camera.target {
                    if let Ok(target_transform) = target_query.get(target) {
                        cam_transform.translation = target_transform.translation + camera.offset;
                        // Use target's rotation for first-person view
                        cam_transform.rotation = target_transform.rotation;
                    }
                }
            }
        }
    }
}