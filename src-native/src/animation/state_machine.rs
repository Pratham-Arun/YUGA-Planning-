use bevy::prelude::*;
use std::collections::HashMap;
use super::core::{AnimationClip, LoopMode};

/// Represents a parameter that can influence state transitions
#[derive(Debug, Clone)]
pub enum Parameter {
    Bool(bool),
    Int(i32),
    Float(f32),
    Trigger(bool),
}

/// A condition for transitioning between states
#[derive(Debug, Clone)]
pub enum Condition {
    BoolEquals { name: String, value: bool },
    IntEquals { name: String, value: i32 },
    FloatGreaterThan { name: String, value: f32 },
    FloatLessThan { name: String, value: f32 },
    TriggerActive { name: String },
}

/// A transition between animation states
#[derive(Debug, Clone)]
pub struct Transition {
    pub from_state: String,
    pub to_state: String,
    pub conditions: Vec<Condition>,
    pub duration: f32,
    pub offset: f32,
    pub has_exit_time: bool,
    pub exit_time: f32,
}

/// A state in the animation state machine
#[derive(Debug, Clone)]
pub struct AnimationState {
    pub name: String,
    pub clip: Handle<AnimationClip>,
    pub speed: f32,
    pub loop_mode: LoopMode,
}

/// The state machine that controls animation transitions
#[derive(Component, Debug)]
pub struct AnimationStateMachine {
    pub states: HashMap<String, AnimationState>,
    pub transitions: Vec<Transition>,
    pub parameters: HashMap<String, Parameter>,
    pub current_state: Option<String>,
    pub current_transition: Option<(String, String, f32)>, // (from, to, progress)
}

impl AnimationStateMachine {
    pub fn new() -> Self {
        Self {
            states: HashMap::new(),
            transitions: Vec::new(),
            parameters: HashMap::new(),
            current_state: None,
            current_transition: None,
        }
    }

    pub fn add_state(&mut self, name: String, clip: Handle<AnimationClip>) {
        let state = AnimationState {
            name: name.clone(),
            clip,
            speed: 1.0,
            loop_mode: LoopMode::Loop,
        };
        self.states.insert(name, state);
    }

    pub fn add_transition(&mut self, transition: Transition) {
        self.transitions.push(transition);
    }

    pub fn set_bool(&mut self, name: &str, value: bool) {
        self.parameters.insert(name.to_string(), Parameter::Bool(value));
    }

    pub fn set_int(&mut self, name: &str, value: i32) {
        self.parameters.insert(name.to_string(), Parameter::Int(value));
    }

    pub fn set_float(&mut self, name: &str, value: f32) {
        self.parameters.insert(name.to_string(), Parameter::Float(value));
    }

    pub fn set_trigger(&mut self, name: &str) {
        self.parameters.insert(name.to_string(), Parameter::Trigger(true));
    }

    pub fn reset_trigger(&mut self, name: &str) {
        if let Some(Parameter::Trigger(_)) = self.parameters.get(name) {
            self.parameters.insert(name.to_string(), Parameter::Trigger(false));
        }
    }
}

/// System for updating the animation state machine
pub fn animation_state_machine_system(
    time: Res<Time>,
    mut query: Query<(&mut AnimationStateMachine, &mut super::core::AnimationPlayer)>,
    animations: Res<Assets<AnimationClip>>,
) {
    for (mut state_machine, mut player) in query.iter_mut() {
        // Handle current transition if any
        if let Some((from, to, progress)) = &mut state_machine.current_transition {
            // Find the transition
            if let Some(transition) = state_machine.transitions.iter()
                .find(|t| t.from_state == *from && t.to_state == *to)
            {
                // Update transition progress
                *progress += time.delta_seconds() / transition.duration;

                if *progress >= 1.0 {
                    // Transition complete
                    state_machine.current_state = Some(to.clone());
                    state_machine.current_transition = None;
                    
                    // Start playing the new state's animation
                    if let Some(state) = state_machine.states.get(to) {
                        player.play(state.clip.clone());
                        player.speed = state.speed;
                    }
                } else {
                    // Blend between animations during transition
                    // TODO: Implement proper animation blending
                }
                continue;
            }
        }

        // Check for new transitions
        if let Some(current_state) = &state_machine.current_state {
            for transition in &state_machine.transitions {
                if transition.from_state != *current_state {
                    continue;
                }

                // Check if all conditions are met
                let conditions_met = transition.conditions.iter().all(|condition| {
                    match condition {
                        Condition::BoolEquals { name, value } => {
                            matches!(state_machine.parameters.get(name),
                                Some(Parameter::Bool(param_value)) if param_value == value)
                        }
                        Condition::IntEquals { name, value } => {
                            matches!(state_machine.parameters.get(name),
                                Some(Parameter::Int(param_value)) if param_value == value)
                        }
                        Condition::FloatGreaterThan { name, value } => {
                            matches!(state_machine.parameters.get(name),
                                Some(Parameter::Float(param_value)) if param_value > value)
                        }
                        Condition::FloatLessThan { name, value } => {
                            matches!(state_machine.parameters.get(name),
                                Some(Parameter::Float(param_value)) if param_value < value)
                        }
                        Condition::TriggerActive { name } => {
                            matches!(state_machine.parameters.get(name),
                                Some(Parameter::Trigger(true)))
                        }
                    }
                });

                if conditions_met {
                    // Start transition
                    state_machine.current_transition = Some((
                        current_state.clone(),
                        transition.to_state.clone(),
                        0.0,
                    ));
                    break;
                }
            }
        } else if let Some((name, state)) = state_machine.states.iter().next() {
            // No current state, start with the first one
            state_machine.current_state = Some(name.clone());
            player.play(state.clip.clone());
            player.speed = state.speed;
        }

        // Reset triggers
        for (_, param) in state_machine.parameters.iter_mut() {
            if let Parameter::Trigger(active) = param {
                *active = false;
            }
        }
    }
}