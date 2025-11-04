use crate::core::subsystem::Subsystem;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Serialize, Deserialize};
use assimp::Scene;

#[derive(Debug)]
pub enum AssetError {
    LoadError(String),
    InvalidFormat(String),
    NotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetMetadata {
    pub id: String,
    pub name: String,
    pub asset_type: AssetType,
    pub path: PathBuf,
    pub dependencies: Vec<String>,
    pub tags: Vec<String>,
    pub created_at: std::time::SystemTime,
    pub modified_at: std::time::SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AssetType {
    Mesh,
    Texture,
    Material,
    Audio,
    Script,
    Scene,
    Prefab,
}

pub trait Asset: Send + Sync {
    fn get_type(&self) -> AssetType;
    fn get_metadata(&self) -> &AssetMetadata;
}

pub struct AssetSystem {
    root_path: PathBuf,
    assets: HashMap<String, Arc<RwLock<Box<dyn Asset>>>>,
    metadata: HashMap<String, AssetMetadata>,
    loaders: HashMap<String, Box<dyn AssetLoader>>,
}

pub trait AssetLoader: Send + Sync {
    fn get_supported_extensions(&self) -> Vec<&'static str>;
    fn load(&self, path: &Path) -> Result<Box<dyn Asset>, AssetError>;
}

// Example implementation for mesh loading
pub struct MeshLoader {
    importer: assimp::Importer,
}

impl MeshLoader {
    pub fn new() -> Self {
        Self {
            importer: assimp::Importer::new(),
        }
    }
}

impl AssetLoader for MeshLoader {
    fn get_supported_extensions(&self) -> Vec<&'static str> {
        vec!["obj", "fbx", "gltf", "glb"]
    }

    fn load(&self, path: &Path) -> Result<Box<dyn Asset>, AssetError> {
        let scene = self.importer.read_file(path)
            .map_err(|e| AssetError::LoadError(e.to_string()))?;

        // Convert Assimp scene to our internal format
        Ok(Box::new(MeshAsset::from_scene(scene, path)))
    }
}

pub struct MeshAsset {
    metadata: AssetMetadata,
    vertices: Vec<[f32; 3]>,
    normals: Vec<[f32; 3]>,
    uvs: Vec<[f32; 2]>,
    indices: Vec<u32>,
}

impl MeshAsset {
    fn from_scene(scene: Scene, path: &Path) -> Self {
        // TODO: Convert Assimp mesh data to our format
        Self {
            metadata: AssetMetadata {
                id: uuid::Uuid::new_v4().to_string(),
                name: path.file_stem().unwrap().to_string_lossy().to_string(),
                asset_type: AssetType::Mesh,
                path: path.to_path_buf(),
                dependencies: Vec::new(),
                tags: Vec::new(),
                created_at: std::time::SystemTime::now(),
                modified_at: std::time::SystemTime::now(),
            },
            vertices: Vec::new(),
            normals: Vec::new(),
            uvs: Vec::new(),
            indices: Vec::new(),
        }
    }
}

impl Asset for MeshAsset {
    fn get_type(&self) -> AssetType {
        AssetType::Mesh
    }

    fn get_metadata(&self) -> &AssetMetadata {
        &self.metadata
    }
}

impl AssetSystem {
    pub fn new<P: AsRef<Path>>(root_path: P) -> Self {
        let mut system = Self {
            root_path: root_path.as_ref().to_path_buf(),
            assets: HashMap::new(),
            metadata: HashMap::new(),
            loaders: HashMap::new(),
        };

        // Register default loaders
        system.register_loader(Box::new(MeshLoader::new()));
        // TODO: Register other asset type loaders

        system
    }

    pub fn register_loader(&mut self, loader: Box<dyn AssetLoader>) {
        for ext in loader.get_supported_extensions() {
            self.loaders.insert(ext.to_string(), loader.clone());
        }
    }

    pub fn load_asset<P: AsRef<Path>>(&mut self, path: P) -> Result<String, AssetError> {
        let path = path.as_ref();
        let ext = path.extension()
            .ok_or_else(|| AssetError::InvalidFormat("No file extension".to_string()))?
            .to_string_lossy()
            .to_string();

        let loader = self.loaders.get(&ext)
            .ok_or_else(|| AssetError::InvalidFormat(format!("No loader for extension: {}", ext)))?;

        let asset = loader.load(path)?;
        let id = asset.get_metadata().id.clone();
        
        self.assets.insert(id.clone(), Arc::new(RwLock::new(asset)));
        Ok(id)
    }

    pub fn get_asset<T: Asset + 'static>(&self, id: &str) -> Option<Arc<RwLock<Box<dyn Asset>>>> {
        self.assets.get(id).cloned()
    }

    pub fn unload_asset(&mut self, id: &str) {
        self.assets.remove(id);
        self.metadata.remove(id);
    }

    pub fn reload_asset(&mut self, id: &str) -> Result<(), AssetError> {
        if let Some(metadata) = self.metadata.get(id) {
            let path = &metadata.path;
            self.unload_asset(id);
            self.load_asset(path)?;
        }
        Ok(())
    }
}

impl Subsystem for AssetSystem {
    fn init(&mut self) -> Result<(), String> {
        // Load asset metadata from disk
        Ok(())
    }

    fn update(&mut self, _delta_time: f32) -> Result<(), String> {
        // Check for asset file changes and reload if necessary
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        // Save asset metadata to disk
        self.assets.clear();
        self.metadata.clear();
        Ok(())
    }
}