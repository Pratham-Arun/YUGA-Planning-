use bevy::prelude::*;
use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;

// Model types and capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelType {
    GPT4,
    GPT35Turbo,
    Claude2,
    PaLM2,
    Llama2,
    StableDiffusion,
    DallE3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskType {
    CodeGeneration,
    AssetGeneration,
    BehaviorCreation,
    SceneComposition,
    TextCompletion,
    ImageGeneration,
    Audio3D,
}

// Model configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub model_type: ModelType,
    pub capabilities: Vec<TaskType>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub priority: i32,
}

// Request and response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub task_type: TaskType,
    pub prompt: String,
    pub parameters: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub success: bool,
    pub result: String,
    pub model_used: ModelType,
    pub metadata: HashMap<String, String>,
}

// Model provider trait
#[async_trait]
pub trait ModelProvider: Send + Sync {
    async fn process_request(&self, request: AIRequest, config: &ModelConfig) -> Result<AIResponse, String>;
    fn get_model_types(&self) -> Vec<ModelType>;
    fn get_capabilities(&self, model: &ModelType) -> Vec<TaskType>;
}

// OpenAI provider implementation
pub struct OpenAIProvider {
    client: reqwest::Client,
    api_key: String,
}

#[async_trait]
impl ModelProvider for OpenAIProvider {
    async fn process_request(&self, request: AIRequest, config: &ModelConfig) -> Result<AIResponse, String> {
        let endpoint = match config.model_type {
            ModelType::GPT4 => "https://api.openai.com/v1/chat/completions",
            ModelType::GPT35Turbo => "https://api.openai.com/v1/chat/completions",
            ModelType::DallE3 => "https://api.openai.com/v1/images/generations",
            _ => return Err("Unsupported model type for OpenAI".to_string()),
        };

        let response = self.client
            .post(endpoint)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&self.build_request_body(&request, config))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        self.parse_response(response, config.model_type.clone()).await
    }

    fn get_model_types(&self) -> Vec<ModelType> {
        vec![ModelType::GPT4, ModelType::GPT35Turbo, ModelType::DallE3]
    }

    fn get_capabilities(&self, model: &ModelType) -> Vec<TaskType> {
        match model {
            ModelType::GPT4 | ModelType::GPT35Turbo => vec![
                TaskType::CodeGeneration,
                TaskType::BehaviorCreation,
                TaskType::SceneComposition,
                TaskType::TextCompletion,
            ],
            ModelType::DallE3 => vec![TaskType::ImageGeneration],
            _ => vec![],
        }
    }
}

// Anthropic provider for Claude
pub struct AnthropicProvider {
    client: reqwest::Client,
    api_key: String,
}

#[async_trait]
impl ModelProvider for AnthropicProvider {
    async fn process_request(&self, request: AIRequest, config: &ModelConfig) -> Result<AIResponse, String> {
        // Similar implementation to OpenAI but for Anthropic's API
        todo!()
    }

    fn get_model_types(&self) -> Vec<ModelType> {
        vec![ModelType::Claude2]
    }

    fn get_capabilities(&self, model: &ModelType) -> Vec<TaskType> {
        match model {
            ModelType::Claude2 => vec![
                TaskType::CodeGeneration,
                TaskType::BehaviorCreation,
                TaskType::TextCompletion,
            ],
            _ => vec![],
        }
    }
}

// Local model provider (Ollama)
pub struct LocalProvider {
    client: reqwest::Client,
    base_url: String,
}

#[async_trait]
impl ModelProvider for LocalProvider {
    async fn process_request(&self, request: AIRequest, config: &ModelConfig) -> Result<AIResponse, String> {
        // Implementation for local model inference
        todo!()
    }

    fn get_model_types(&self) -> Vec<ModelType> {
        vec![ModelType::Llama2]
    }

    fn get_capabilities(&self, model: &ModelType) -> Vec<TaskType> {
        match model {
            ModelType::Llama2 => vec![
                TaskType::CodeGeneration,
                TaskType::TextCompletion,
            ],
            _ => vec![],
        }
    }
}

// Model router implementation
pub struct ModelRouter {
    providers: HashMap<String, Box<dyn ModelProvider>>,
    model_configs: HashMap<ModelType, ModelConfig>,
}

impl ModelRouter {
    pub fn new() -> Self {
        let mut router = Self {
            providers: HashMap::new(),
            model_configs: HashMap::new(),
        };

        // Initialize default configurations
        router.init_default_configs();
        router
    }

    pub fn add_provider(&mut self, name: &str, provider: Box<dyn ModelProvider>) {
        self.providers.insert(name.to_string(), provider);
    }

    pub fn init_default_configs(&mut self) {
        // GPT-4 configuration
        self.model_configs.insert(ModelType::GPT4, ModelConfig {
            model_type: ModelType::GPT4,
            capabilities: vec![
                TaskType::CodeGeneration,
                TaskType::BehaviorCreation,
                TaskType::SceneComposition,
                TaskType::TextCompletion,
            ],
            max_tokens: 8192,
            temperature: 0.7,
            priority: 1,
        });

        // Add more default configurations
    }

    pub fn get_best_model(&self, task_type: TaskType) -> Option<(&ModelType, &ModelConfig)> {
        self.model_configs.iter()
            .filter(|(_, config)| config.capabilities.contains(&task_type))
            .max_by_key(|(_, config)| config.priority)
            .map(|(model_type, config)| (model_type, config))
    }

    pub async fn route_request(&self, request: AIRequest) -> Result<AIResponse, String> {
        let (model_type, config) = self.get_best_model(request.task_type.clone())
            .ok_or_else(|| "No suitable model found for task".to_string())?;

        // Find a provider that supports the chosen model
        for provider in self.providers.values() {
            if provider.get_model_types().contains(model_type) {
                return provider.process_request(request, config).await;
            }
        }

        Err("No provider available for selected model".to_string())
    }
}

// Model router plugin
pub struct ModelRouterPlugin;

impl Plugin for ModelRouterPlugin {
    fn build(&self, app: &mut App) {
        let mut router = ModelRouter::new();

        // Initialize providers
        let openai = OpenAIProvider {
            client: reqwest::Client::new(),
            api_key: std::env::var("OPENAI_API_KEY")
                .unwrap_or_else(|_| "".to_string()),
        };
        router.add_provider("openai", Box::new(openai));

        // Add Anthropic provider if API key is available
        if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
            let anthropic = AnthropicProvider {
                client: reqwest::Client::new(),
                api_key,
            };
            router.add_provider("anthropic", Box::new(anthropic));
        }

        // Add local provider if Ollama is available
        let local = LocalProvider {
            client: reqwest::Client::new(),
            base_url: "http://localhost:11434".to_string(),
        };
        router.add_provider("local", Box::new(local));

        app.insert_resource(router);
    }
}