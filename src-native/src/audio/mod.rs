use crate::core::subsystem::Subsystem;
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;
use parking_lot::RwLock;

#[derive(Debug)]
pub enum AudioError {
    FileNotFound(String),
    InvalidFormat(String),
    PlaybackError(String),
}

pub struct AudioSystem {
    _stream: OutputStream,
    stream_handle: OutputStreamHandle,
    audio_clips: HashMap<String, Arc<Vec<u8>>>,
    active_sinks: HashMap<u32, Arc<RwLock<Sink>>>,
    next_source_id: u32,
}

impl AudioSystem {
    pub fn new() -> Result<Self, AudioError> {
        let (stream, stream_handle) = OutputStream::try_default()
            .map_err(|e| AudioError::PlaybackError(e.to_string()))?;

        Ok(Self {
            _stream: stream,
            stream_handle,
            audio_clips: HashMap::new(),
            active_sinks: HashMap::new(),
            next_source_id: 1,
        })
    }

    pub fn load_clip(&mut self, name: &str, path: &str) -> Result<(), AudioError> {
        let file = File::open(path)
            .map_err(|_| AudioError::FileNotFound(path.to_string()))?;
        let mut reader = BufReader::new(file);
        let mut buffer = Vec::new();
        std::io::Read::read_to_end(&mut reader, &mut buffer)
            .map_err(|_| AudioError::InvalidFormat("Failed to read audio file".to_string()))?;

        self.audio_clips.insert(name.to_string(), Arc::new(buffer));
        Ok(())
    }

    pub fn play(&mut self, clip_name: &str, volume: f32, loop_audio: bool) -> Result<u32, AudioError> {
        let clip = self.audio_clips.get(clip_name)
            .ok_or_else(|| AudioError::FileNotFound(clip_name.to_string()))?;

        let sink = Sink::try_new(&self.stream_handle)
            .map_err(|e| AudioError::PlaybackError(e.to_string()))?;

        sink.set_volume(volume);

        let cursor = std::io::Cursor::new(Arc::clone(clip));
        let source = rodio::Decoder::new(cursor)
            .map_err(|e| AudioError::InvalidFormat(e.to_string()))?;

        if loop_audio {
            sink.append(source.repeat_infinite());
        } else {
            sink.append(source);
        }

        let source_id = self.next_source_id;
        self.next_source_id += 1;

        self.active_sinks.insert(source_id, Arc::new(RwLock::new(sink)));
        Ok(source_id)
    }

    pub fn stop(&mut self, source_id: u32) {
        if let Some(sink) = self.active_sinks.get(&source_id) {
            sink.write().stop();
            self.active_sinks.remove(&source_id);
        }
    }

    pub fn pause(&self, source_id: u32) {
        if let Some(sink) = self.active_sinks.get(&source_id) {
            sink.write().pause();
        }
    }

    pub fn resume(&self, source_id: u32) {
        if let Some(sink) = self.active_sinks.get(&source_id) {
            sink.write().play();
        }
    }

    pub fn set_volume(&self, source_id: u32, volume: f32) {
        if let Some(sink) = self.active_sinks.get(&source_id) {
            sink.write().set_volume(volume);
        }
    }

    pub fn is_playing(&self, source_id: u32) -> bool {
        self.active_sinks.get(&source_id)
            .map(|sink| !sink.read().empty())
            .unwrap_or(false)
    }

    pub fn cleanup_finished(&mut self) {
        self.active_sinks.retain(|_, sink| !sink.read().empty());
    }
}

impl Subsystem for AudioSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, _delta_time: f32) -> Result<(), String> {
        self.cleanup_finished();
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        for (_, sink) in self.active_sinks.drain() {
            sink.write().stop();
        }
        Ok(())
    }
}