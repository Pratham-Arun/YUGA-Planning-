use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Trait for engine subsystems
pub trait Subsystem: Any + Send + Sync {
    /// Initialize the subsystem
    fn init(&mut self) -> Result<(), String>;
    
    /// Update the subsystem
    fn update(&mut self, delta_time: f32) -> Result<(), String>;
    
    /// Shutdown the subsystem
    fn shutdown(&mut self) -> Result<(), String>;
}

/// Manager for all engine subsystems
pub struct SubsystemManager {
    subsystems: HashMap<TypeId, Box<dyn Subsystem>>,
    shared_data: Arc<RwLock<HashMap<String, Box<dyn Any + Send + Sync>>>>,
}

impl SubsystemManager {
    /// Create a new subsystem manager
    pub fn new() -> Self {
        Self {
            subsystems: HashMap::new(),
            shared_data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a subsystem
    pub fn register<T: Subsystem + 'static>(&mut self, subsystem: T) -> Result<(), String> {
        let type_id = TypeId::of::<T>();
        
        if self.subsystems.contains_key(&type_id) {
            return Err(format!("Subsystem of type {:?} already registered", type_id));
        }

        let mut boxed = Box::new(subsystem);
        boxed.init()?;
        
        self.subsystems.insert(type_id, boxed);
        Ok(())
    }

    /// Get a reference to a subsystem
    pub fn get<T: Subsystem + 'static>(&self) -> Option<&T> {
        self.subsystems
            .get(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_ref())
    }

    /// Get a mutable reference to a subsystem
    pub fn get_mut<T: Subsystem + 'static>(&mut self) -> Option<&mut T> {
        self.subsystems
            .get_mut(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_mut())
    }

    /// Share data between subsystems
    pub fn share_data<T: Any + Send + Sync>(&self, key: &str, data: T) -> Result<(), String> {
        let mut shared = self.shared_data.write().map_err(|e| e.to_string())?;
        shared.insert(key.to_string(), Box::new(data));
        Ok(())
    }

    /// Get shared data
    pub fn get_shared_data<T: Any + Send + Sync>(&self, key: &str) -> Option<T>
    where
        T: Clone,
    {
        let shared = self.shared_data.read().ok()?;
        shared.get(key)?.downcast_ref::<T>().cloned()
    }

    /// Update all subsystems
    pub fn update(&mut self, delta_time: f32) -> Result<(), String> {
        for subsystem in self.subsystems.values_mut() {
            subsystem.update(delta_time)?;
        }
        Ok(())
    }

    /// Shutdown all subsystems
    pub fn shutdown(&mut self) -> Result<(), String> {
        for subsystem in self.subsystems.values_mut() {
            subsystem.shutdown()?;
        }
        self.subsystems.clear();
        Ok(())
    }
}