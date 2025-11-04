use crate::core::subsystem::Subsystem;
use glfw::{Action, Key, MouseButton};
use std::collections::HashMap;

pub struct InputSystem {
    key_states: HashMap<Key, bool>,
    prev_key_states: HashMap<Key, bool>,
    mouse_button_states: HashMap<MouseButton, bool>,
    prev_mouse_button_states: HashMap<MouseButton, bool>,
    mouse_position: (f64, f64),
    prev_mouse_position: (f64, f64),
    mouse_scroll: (f64, f64),
    action_mappings: HashMap<String, Vec<InputAction>>,
}

#[derive(Clone)]
pub enum InputAction {
    KeyPress(Key),
    KeyRelease(Key),
    MouseButtonPress(MouseButton),
    MouseButtonRelease(MouseButton),
    MouseMove,
    MouseScroll,
}

impl InputSystem {
    pub fn new() -> Self {
        Self {
            key_states: HashMap::new(),
            prev_key_states: HashMap::new(),
            mouse_button_states: HashMap::new(),
            prev_mouse_button_states: HashMap::new(),
            mouse_position: (0.0, 0.0),
            prev_mouse_position: (0.0, 0.0),
            mouse_scroll: (0.0, 0.0),
            action_mappings: HashMap::new(),
        }
    }

    pub fn map_action(&mut self, action_name: &str, input_action: InputAction) {
        self.action_mappings
            .entry(action_name.to_string())
            .or_insert_with(Vec::new)
            .push(input_action);
    }

    pub fn is_action_pressed(&self, action_name: &str) -> bool {
        if let Some(actions) = self.action_mappings.get(action_name) {
            for action in actions {
                match action {
                    InputAction::KeyPress(key) => {
                        if self.is_key_pressed(*key) {
                            return true;
                        }
                    }
                    InputAction::MouseButtonPress(button) => {
                        if self.is_mouse_button_pressed(*button) {
                            return true;
                        }
                    }
                    _ => {}
                }
            }
        }
        false
    }

    pub fn is_action_just_pressed(&self, action_name: &str) -> bool {
        if let Some(actions) = self.action_mappings.get(action_name) {
            for action in actions {
                match action {
                    InputAction::KeyPress(key) => {
                        if self.is_key_just_pressed(*key) {
                            return true;
                        }
                    }
                    InputAction::MouseButtonPress(button) => {
                        if self.is_mouse_button_just_pressed(*button) {
                            return true;
                        }
                    }
                    _ => {}
                }
            }
        }
        false
    }

    pub fn is_key_pressed(&self, key: Key) -> bool {
        self.key_states.get(&key).copied().unwrap_or(false)
    }

    pub fn is_key_just_pressed(&self, key: Key) -> bool {
        self.key_states.get(&key).copied().unwrap_or(false) &&
        !self.prev_key_states.get(&key).copied().unwrap_or(false)
    }

    pub fn is_mouse_button_pressed(&self, button: MouseButton) -> bool {
        self.mouse_button_states.get(&button).copied().unwrap_or(false)
    }

    pub fn is_mouse_button_just_pressed(&self, button: MouseButton) -> bool {
        self.mouse_button_states.get(&button).copied().unwrap_or(false) &&
        !self.prev_mouse_button_states.get(&button).copied().unwrap_or(false)
    }

    pub fn get_mouse_position(&self) -> (f64, f64) {
        self.mouse_position
    }

    pub fn get_mouse_movement(&self) -> (f64, f64) {
        (
            self.mouse_position.0 - self.prev_mouse_position.0,
            self.mouse_position.1 - self.prev_mouse_position.1,
        )
    }

    pub fn get_mouse_scroll(&self) -> (f64, f64) {
        self.mouse_scroll
    }

    pub fn handle_key(&mut self, key: Key, action: Action) {
        let pressed = action != Action::Release;
        self.key_states.insert(key, pressed);
    }

    pub fn handle_mouse_button(&mut self, button: MouseButton, action: Action) {
        let pressed = action != Action::Release;
        self.mouse_button_states.insert(button, pressed);
    }

    pub fn handle_mouse_move(&mut self, x: f64, y: f64) {
        self.mouse_position = (x, y);
    }

    pub fn handle_mouse_scroll(&mut self, x: f64, y: f64) {
        self.mouse_scroll = (x, y);
    }

    fn update_previous_states(&mut self) {
        self.prev_key_states = self.key_states.clone();
        self.prev_mouse_button_states = self.mouse_button_states.clone();
        self.prev_mouse_position = self.mouse_position;
        self.mouse_scroll = (0.0, 0.0);
    }
}

impl Subsystem for InputSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, _delta_time: f32) -> Result<(), String> {
        self.update_previous_states();
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        self.key_states.clear();
        self.prev_key_states.clear();
        self.mouse_button_states.clear();
        self.prev_mouse_button_states.clear();
        self.action_mappings.clear();
        Ok(())
    }
}