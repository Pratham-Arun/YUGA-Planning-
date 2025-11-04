use crate::core::subsystem::Subsystem;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tracy_client;

#[derive(Default)]
pub struct DebugStats {
    pub frame_time: Duration,
    pub fps: f32,
    pub subsystem_times: HashMap<String, Duration>,
    pub memory_usage: usize,
    pub draw_calls: u32,
    pub vertex_count: u32,
    pub triangle_count: u32,
}

pub struct ProfilingSystem {
    stats: DebugStats,
    frame_start: Instant,
    last_frame: Instant,
    frame_times: Vec<Duration>,
    frame_time_window: usize,
}

impl ProfilingSystem {
    pub fn new() -> Self {
        Self {
            stats: DebugStats::default(),
            frame_start: Instant::now(),
            last_frame: Instant::now(),
            frame_times: Vec::with_capacity(60),
            frame_time_window: 60,
        }
    }

    pub fn begin_frame(&mut self) {
        self.frame_start = Instant::now();
        tracy_client::Client::start();
    }

    pub fn end_frame(&mut self) {
        let frame_time = self.frame_start.elapsed();
        self.stats.frame_time = frame_time;
        
        self.frame_times.push(frame_time);
        if self.frame_times.len() > self.frame_time_window {
            self.frame_times.remove(0);
        }

        let avg_frame_time = self.frame_times.iter().sum::<Duration>() / self.frame_times.len() as u32;
        self.stats.fps = 1.0 / avg_frame_time.as_secs_f32();

        tracy_client::Client::finish();
    }

    pub fn begin_subsystem_profile(&self, name: &str) {
        tracy_client::Client::span(name);
    }

    pub fn end_subsystem_profile(&mut self, name: &str) {
        let elapsed = self.frame_start.elapsed();
        self.stats.subsystem_times.insert(name.to_string(), elapsed);
    }

    pub fn record_draw_call(&mut self) {
        self.stats.draw_calls += 1;
    }

    pub fn record_vertices(&mut self, count: u32) {
        self.stats.vertex_count += count;
    }

    pub fn record_triangles(&mut self, count: u32) {
        self.stats.triangle_count += count;
    }

    pub fn record_memory_usage(&mut self, bytes: usize) {
        self.stats.memory_usage = bytes;
    }

    pub fn get_stats(&self) -> &DebugStats {
        &self.stats
    }
}

impl Subsystem for ProfilingSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, _delta_time: f32) -> Result<(), String> {
        // Reset per-frame stats
        self.stats.draw_calls = 0;
        self.stats.vertex_count = 0;
        self.stats.triangle_count = 0;
        self.stats.subsystem_times.clear();
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        Ok(())
    }
}