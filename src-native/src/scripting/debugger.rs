use bevy::prelude::*;
use rhai::{Engine, AST, Dynamic, Position, FnPtr};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

// Debugging types
#[derive(Debug, Clone)]
pub struct Breakpoint {
    pub file: String,
    pub line: i32,
    pub column: i32,
    pub condition: Option<String>,
    pub hit_count: i32,
}

#[derive(Debug)]
pub struct StackFrame {
    pub function: String,
    pub file: String,
    pub line: i32,
    pub column: i32,
    pub locals: HashMap<String, Dynamic>,
}

#[derive(Debug)]
pub enum DebuggerState {
    Running,
    Paused,
    StepOver,
    StepInto,
    StepOut,
}

// Main debugger struct
#[derive(Resource)]
pub struct ScriptDebugger {
    breakpoints: HashMap<String, Vec<Breakpoint>>,
    call_stack: Vec<StackFrame>,
    state: DebuggerState,
    step_depth: i32,
    current_entity: Option<Entity>,
    watchers: HashMap<String, FnPtr>,
    debug_output: Arc<Mutex<Vec<String>>>,
}

impl Default for ScriptDebugger {
    fn default() -> Self {
        Self {
            breakpoints: HashMap::new(),
            call_stack: Vec::new(),
            state: DebuggerState::Running,
            step_depth: 0,
            current_entity: None,
            watchers: HashMap::new(),
            debug_output: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

impl ScriptDebugger {
    // Add or remove breakpoints
    pub fn add_breakpoint(&mut self, file: String, line: i32, column: i32, condition: Option<String>) {
        let breakpoint = Breakpoint {
            file: file.clone(),
            line,
            column,
            condition,
            hit_count: 0,
        };

        self.breakpoints
            .entry(file)
            .or_insert_with(Vec::new)
            .push(breakpoint);
    }

    pub fn remove_breakpoint(&mut self, file: &str, line: i32) {
        if let Some(breakpoints) = self.breakpoints.get_mut(file) {
            breakpoints.retain(|b| b.line != line);
        }
    }

    // Debug flow control
    pub fn pause(&mut self) {
        self.state = DebuggerState::Paused;
    }

    pub fn resume(&mut self) {
        self.state = DebuggerState::Running;
    }

    pub fn step_over(&mut self) {
        self.state = DebuggerState::StepOver;
        self.step_depth = self.call_stack.len() as i32;
    }

    pub fn step_into(&mut self) {
        self.state = DebuggerState::StepInto;
    }

    pub fn step_out(&mut self) {
        self.state = DebuggerState::StepOut;
        self.step_depth = (self.call_stack.len() - 1) as i32;
    }

    // Stack and variable inspection
    pub fn get_call_stack(&self) -> &[StackFrame] {
        &self.call_stack
    }

    pub fn get_local_variables(&self) -> Option<&HashMap<String, Dynamic>> {
        self.call_stack.last().map(|frame| &frame.locals)
    }

    // Watch expressions
    pub fn add_watch(&mut self, expression: String, callback: FnPtr) {
        self.watchers.insert(expression, callback);
    }

    pub fn remove_watch(&mut self, expression: &str) {
        self.watchers.remove(expression);
    }

    // Debug output
    pub fn log(&self, message: String) {
        if let Ok(mut output) = self.debug_output.lock() {
            output.push(message);
        }
    }

    pub fn get_output(&self) -> Vec<String> {
        self.debug_output
            .lock()
            .map(|o| o.clone())
            .unwrap_or_default()
    }

    pub fn clear_output(&self) {
        if let Ok(mut output) = self.debug_output.lock() {
            output.clear();
        }
    }
}

// Debugger hook to inject into Rhai engine
pub struct DebugHook {
    debugger: Arc<Mutex<ScriptDebugger>>,
}

impl rhai::Debug for DebugHook {
    fn debug_step(&mut self, state: &mut rhai::debugger::DebugState) {
        if let Ok(mut debugger) = self.debugger.lock() {
            // Get current position
            let position = state.position();
            
            // Check breakpoints
            if let Some(breakpoints) = debugger.breakpoints.get(&position.source().to_string()) {
                for breakpoint in breakpoints {
                    if breakpoint.line == position.line() {
                        // Check condition if any
                        if let Some(ref condition) = breakpoint.condition {
                            if let Ok(result) = state.eval_expression(condition) {
                                if !result.as_bool().unwrap_or(false) {
                                    continue;
                                }
                            }
                        }

                        debugger.pause();
                        break;
                    }
                }
            }

            // Handle stepping
            match debugger.state {
                DebuggerState::Paused => {
                    // Wait for user input
                    while matches!(debugger.state, DebuggerState::Paused) {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                }
                DebuggerState::StepOver => {
                    if (debugger.call_stack.len() as i32) <= debugger.step_depth {
                        debugger.pause();
                    }
                }
                DebuggerState::StepInto => {
                    debugger.pause();
                }
                DebuggerState::StepOut => {
                    if (debugger.call_stack.len() as i32) == debugger.step_depth {
                        debugger.pause();
                    }
                }
                DebuggerState::Running => {}
            }

            // Update call stack
            let frame = StackFrame {
                function: state.fn_name().to_string(),
                file: position.source().to_string(),
                line: position.line(),
                column: position.column(),
                locals: state.scope().iter().map(|(k, v)| (k.into(), v.clone())).collect(),
            };

            match state.action() {
                rhai::debugger::DebugAction::FunctionCall => {
                    debugger.call_stack.push(frame);
                }
                rhai::debugger::DebugAction::FunctionReturn => {
                    debugger.call_stack.pop();
                }
                _ => {
                    if let Some(last) = debugger.call_stack.last_mut() {
                        *last = frame;
                    }
                }
            }

            // Evaluate watches
            for (expr, callback) in &debugger.watchers {
                if let Ok(result) = state.eval_expression(expr) {
                    let mut scope = rhai::Scope::new();
                    scope.push("result", result);
                    state.call_fn(callback, Some(scope));
                }
            }
        }
    }
}

// Plugin for script debugging
pub struct DebuggerPlugin;

impl Plugin for DebuggerPlugin {
    fn build(&self, app: &mut App) {
        let debugger = ScriptDebugger::default();
        let debug_hook = DebugHook {
            debugger: Arc::new(Mutex::new(debugger.clone())),
        };

        app.insert_resource(debugger)
           .insert_resource(debug_hook);
    }
}

// Debug UI system
pub fn debug_ui_system(
    mut egui_context: ResMut<EguiContext>,
    mut debugger: ResMut<ScriptDebugger>,
) {
    egui::Window::new("Script Debugger").show(egui_context.ctx_mut(), |ui| {
        // Debug controls
        ui.horizontal(|ui| {
            if ui.button("⏵").clicked() {
                debugger.resume();
            }
            if ui.button("⏸").clicked() {
                debugger.pause();
            }
            if ui.button("⤵").clicked() {
                debugger.step_into();
            }
            if ui.button("↷").clicked() {
                debugger.step_over();
            }
            if ui.button("↑").clicked() {
                debugger.step_out();
            }
        });

        // Call stack
        ui.collapsing("Call Stack", |ui| {
            for frame in debugger.get_call_stack() {
                ui.label(format!(
                    "{}() at {}:{}:{}",
                    frame.function, frame.file, frame.line, frame.column
                ));
            }
        });

        // Variables
        if let Some(locals) = debugger.get_local_variables() {
            ui.collapsing("Variables", |ui| {
                for (name, value) in locals {
                    ui.label(format!("{}: {:?}", name, value));
                }
            });
        }

        // Debug output
        ui.collapsing("Output", |ui| {
            let output = debugger.get_output();
            egui::ScrollArea::vertical().show(ui, |ui| {
                for line in output {
                    ui.label(line);
                }
            });
            if ui.button("Clear").clicked() {
                debugger.clear_output();
            }
        });
    });
}