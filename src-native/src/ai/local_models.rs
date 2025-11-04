use bevy::prelude::*;
use serde::{Serialize, Deserialize};
use reqwest::Client;
use std::collections::HashMap;

// Ollama model configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaConfig {
    pub model: String,
    pub base_url: String,
    pub params: OllamaParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaParams {
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: i32,
    pub repeat_penalty: f32,
    pub max_tokens: i32,
}

impl Default for OllamaParams {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            max_tokens: 2048,
        }
    }
}

// Model management
pub struct LocalModelManager {
    client: Client,
    config: OllamaConfig,
    model_cache: HashMap<String, ModelInfo>,
}

#[derive(Debug, Clone)]
struct ModelInfo {
    name: String,
    size: u64,
    modified: String,
    parameters: HashMap<String, String>,
}

impl LocalModelManager {
    pub fn new(base_url: String, model: String) -> Self {
        Self {
            client: Client::new(),
            config: OllamaConfig {
                model,
                base_url,
                params: OllamaParams::default(),
            },
            model_cache: HashMap::new(),
        }
    }

    // List available models
    pub async fn list_models(&self) -> Result<Vec<String>, String> {
        let url = format!("{}/api/tags", self.config.base_url);

        let response = self.client.get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            Ok(result["models"].as_array()
                .unwrap_or(&Vec::new())
                .iter()
                .filter_map(|m| m["name"].as_str().map(String::from))
                .collect())
        } else {
            Err(format!("Failed to list models: {}", response.status()))
        }
    }

    // Pull a model from Ollama library
    pub async fn pull_model(&mut self, model_name: &str) -> Result<(), String> {
        let url = format!("{}/api/pull", self.config.base_url);

        let body = serde_json::json!({
            "name": model_name,
        });

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            // Update cache
            self.update_model_info(model_name).await?;
            Ok(())
        } else {
            Err(format!("Failed to pull model: {}", response.status()))
        }
    }

    // Generate text with local model
    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let url = format!("{}/api/generate", self.config.base_url);

        let body = serde_json::json!({
            "model": self.config.model,
            "prompt": prompt,
            "stream": false,
            "options": {
                "temperature": self.config.params.temperature,
                "top_p": self.config.params.top_p,
                "top_k": self.config.params.top_k,
                "repeat_penalty": self.config.params.repeat_penalty,
                "max_tokens": self.config.params.max_tokens,
            }
        });

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            Ok(result["response"].as_str()
                .unwrap_or("")
                .to_string())
        } else {
            Err(format!("Generation failed: {}", response.status()))
        }
    }

    // Generate embeddings with local model
    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>, String> {
        let url = format!("{}/api/embeddings", self.config.base_url);

        let body = serde_json::json!({
            "model": self.config.model,
            "prompt": text,
        });

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            Ok(result["embedding"].as_array()
                .unwrap_or(&Vec::new())
                .iter()
                .filter_map(|v| v.as_f64().map(|x| x as f32))
                .collect())
        } else {
            Err(format!("Embedding generation failed: {}", response.status()))
        }
    }

    // Create a chat completion
    pub async fn chat(&self, messages: Vec<ChatMessage>) -> Result<String, String> {
        let url = format!("{}/api/chat", self.config.base_url);

        let body = serde_json::json!({
            "model": self.config.model,
            "messages": messages,
            "stream": false,
            "options": {
                "temperature": self.config.params.temperature,
                "top_p": self.config.params.top_p,
                "top_k": self.config.params.top_k,
                "repeat_penalty": self.config.params.repeat_penalty,
                "max_tokens": self.config.params.max_tokens,
            }
        });

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            Ok(result["message"]["content"].as_str()
                .unwrap_or("")
                .to_string())
        } else {
            Err(format!("Chat completion failed: {}", response.status()))
        }
    }

    // Update model information in cache
    async fn update_model_info(&mut self, model_name: &str) -> Result<(), String> {
        let url = format!("{}/api/show", self.config.base_url);

        let body = serde_json::json!({
            "name": model_name,
        });

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            let model_info = ModelInfo {
                name: model_name.to_string(),
                size: result["size"].as_u64().unwrap_or(0),
                modified: result["modified"].as_str()
                    .unwrap_or("")
                    .to_string(),
                parameters: result["parameters"].as_object()
                    .map(|obj| obj.iter()
                        .map(|(k, v)| (k.clone(), v.to_string()))
                        .collect())
                    .unwrap_or_default(),
            };

            self.model_cache.insert(model_name.to_string(), model_info);
            Ok(())
        } else {
            Err(format!("Failed to get model info: {}", response.status()))
        }
    }
}

// Chat message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    pub fn system(content: &str) -> Self {
        Self {
            role: "system".to_string(),
            content: content.to_string(),
        }
    }

    pub fn user(content: &str) -> Self {
        Self {
            role: "user".to_string(),
            content: content.to_string(),
        }
    }

    pub fn assistant(content: &str) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.to_string(),
        }
    }
}

// Plugin for Ollama integration
pub struct LocalModelsPlugin;

impl Plugin for LocalModelsPlugin {
    fn build(&self, app: &mut App) {
        let manager = LocalModelManager::new(
            std::env::var("OLLAMA_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:11434".to_string()),
            std::env::var("OLLAMA_DEFAULT_MODEL")
                .unwrap_or_else(|_| "llama2".to_string()),
        );

        app.insert_resource(manager);
    }
}