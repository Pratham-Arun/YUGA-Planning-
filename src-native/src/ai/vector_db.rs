use bevy::prelude::*;
use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use reqwest::Client;

// Vector database types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub text: String,
    pub metadata: HashMap<String, String>,
    pub embedding: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub document: Document,
    pub score: f32,
}

// Vector database trait
#[async_trait]
pub trait VectorDB: Send + Sync {
    async fn insert(&self, documents: Vec<Document>) -> Result<(), String>;
    async fn query(&self, query: &str, limit: usize) -> Result<Vec<QueryResult>, String>;
    async fn delete(&self, ids: Vec<String>) -> Result<(), String>;
    async fn update(&self, documents: Vec<Document>) -> Result<(), String>;
}

// Pinecone implementation
pub struct PineconeDB {
    client: Client,
    api_key: String,
    environment: String,
    index_name: String,
}

impl PineconeDB {
    pub fn new(api_key: String, environment: String, index_name: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            environment,
            index_name,
        }
    }

    fn base_url(&self) -> String {
        format!(
            "https://{}-{}.svc.{}",
            self.index_name, 
            self.api_key,
            self.environment
        )
    }
}

#[async_trait]
impl VectorDB for PineconeDB {
    async fn insert(&self, documents: Vec<Document>) -> Result<(), String> {
        let url = format!("{}/vectors/upsert", self.base_url());
        
        // Convert documents to Pinecone format
        let vectors: Vec<_> = documents.into_iter()
            .map(|doc| serde_json::json!({
                "id": doc.id,
                "values": doc.embedding.unwrap_or_default(),
                "metadata": doc.metadata,
            }))
            .collect();

        let body = serde_json::json!({
            "vectors": vectors,
        });

        let response = self.client
            .post(&url)
            .header("Api-Key", &self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Pinecone insert failed: {}", response.status()))
        }
    }

    async fn query(&self, query: &str, limit: usize) -> Result<Vec<QueryResult>, String> {
        let url = format!("{}/query", self.base_url());

        // TODO: Get query embedding from OpenAI/other embedding provider
        let query_embedding = vec![0.0; 1536]; // Placeholder

        let body = serde_json::json!({
            "vector": query_embedding,
            "topK": limit,
            "includeMetadata": true,
        });

        let response = self.client
            .post(&url)
            .header("Api-Key", &self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            let matches = result["matches"].as_array()
                .ok_or("Invalid response format")?;

            Ok(matches.iter()
                .filter_map(|m| {
                    Some(QueryResult {
                        document: Document {
                            id: m["id"].as_str()?.to_string(),
                            text: m["metadata"]["text"].as_str()?.to_string(),
                            metadata: serde_json::from_value(m["metadata"].clone()).ok()?,
                            embedding: Some(
                                m["values"].as_array()?
                                    .iter()
                                    .filter_map(|v| v.as_f64())
                                    .map(|v| v as f32)
                                    .collect()
                            ),
                        },
                        score: m["score"].as_f64()? as f32,
                    })
                })
                .collect())
        } else {
            Err(format!("Pinecone query failed: {}", response.status()))
        }
    }

    async fn delete(&self, ids: Vec<String>) -> Result<(), String> {
        let url = format!("{}/vectors/delete", self.base_url());

        let body = serde_json::json!({
            "ids": ids,
        });

        let response = self.client
            .post(&url)
            .header("Api-Key", &self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Pinecone delete failed: {}", response.status()))
        }
    }

    async fn update(&self, documents: Vec<Document>) -> Result<(), String> {
        // Pinecone uses upsert for both insert and update
        self.insert(documents).await
    }
}

// Qdrant implementation
pub struct QdrantDB {
    client: Client,
    url: String,
    api_key: Option<String>,
    collection_name: String,
}

impl QdrantDB {
    pub fn new(url: String, api_key: Option<String>, collection_name: String) -> Self {
        Self {
            client: Client::new(),
            url,
            api_key,
            collection_name,
        }
    }
}

#[async_trait]
impl VectorDB for QdrantDB {
    async fn insert(&self, documents: Vec<Document>) -> Result<(), String> {
        let url = format!("{}/collections/{}/points", self.url, self.collection_name);

        let points: Vec<_> = documents.into_iter()
            .map(|doc| serde_json::json!({
                "id": doc.id,
                "vector": doc.embedding.unwrap_or_default(),
                "payload": {
                    "text": doc.text,
                    "metadata": doc.metadata,
                },
            }))
            .collect();

        let body = serde_json::json!({
            "points": points,
        });

        let mut request = self.client.put(&url).json(&body);
        if let Some(api_key) = &self.api_key {
            request = request.header("api-key", api_key);
        }

        let response = request
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Qdrant insert failed: {}", response.status()))
        }
    }

    async fn query(&self, query: &str, limit: usize) -> Result<Vec<QueryResult>, String> {
        let url = format!(
            "{}/collections/{}/points/search",
            self.url,
            self.collection_name
        );

        // TODO: Get query embedding from OpenAI/other embedding provider
        let query_embedding = vec![0.0; 1536]; // Placeholder

        let body = serde_json::json!({
            "vector": query_embedding,
            "limit": limit,
            "with_payload": true,
        });

        let mut request = self.client.post(&url).json(&body);
        if let Some(api_key) = &self.api_key {
            request = request.header("api-key", api_key);
        }

        let response = request
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json()
                .await
                .map_err(|e| e.to_string())?;

            let results = result["result"].as_array()
                .ok_or("Invalid response format")?;

            Ok(results.iter()
                .filter_map(|r| {
                    let payload = &r["payload"];
                    Some(QueryResult {
                        document: Document {
                            id: r["id"].as_str()?.to_string(),
                            text: payload["text"].as_str()?.to_string(),
                            metadata: serde_json::from_value(
                                payload["metadata"].clone()
                            ).ok()?,
                            embedding: Some(
                                r["vector"].as_array()?
                                    .iter()
                                    .filter_map(|v| v.as_f64())
                                    .map(|v| v as f32)
                                    .collect()
                            ),
                        },
                        score: r["score"].as_f64()? as f32,
                    })
                })
                .collect())
        } else {
            Err(format!("Qdrant query failed: {}", response.status()))
        }
    }

    async fn delete(&self, ids: Vec<String>) -> Result<(), String> {
        let url = format!(
            "{}/collections/{}/points/delete",
            self.url,
            self.collection_name
        );

        let body = serde_json::json!({
            "points": ids,
        });

        let mut request = self.client.post(&url).json(&body);
        if let Some(api_key) = &self.api_key {
            request = request.header("api-key", api_key);
        }

        let response = request
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Qdrant delete failed: {}", response.status()))
        }
    }

    async fn update(&self, documents: Vec<Document>) -> Result<(), String> {
        self.insert(documents).await
    }
}

// Vector database plugin
pub struct VectorDBPlugin;

impl Plugin for VectorDBPlugin {
    fn build(&self, app: &mut App) {
        // Choose vector DB based on configuration
        let vector_db: Box<dyn VectorDB> = if let Ok(api_key) = std::env::var("PINECONE_API_KEY") {
            Box::new(PineconeDB::new(
                api_key,
                std::env::var("PINECONE_ENVIRONMENT")
                    .unwrap_or_else(|_| "us-west1-gcp".to_string()),
                std::env::var("PINECONE_INDEX")
                    .unwrap_or_else(|_| "yuga-engine".to_string()),
            ))
        } else {
            // Fall back to Qdrant
            Box::new(QdrantDB::new(
                std::env::var("QDRANT_URL")
                    .unwrap_or_else(|_| "http://localhost:6333".to_string()),
                std::env::var("QDRANT_API_KEY").ok(),
                "yuga-engine".to_string(),
            ))
        };

        app.insert_resource(vector_db);
    }
}