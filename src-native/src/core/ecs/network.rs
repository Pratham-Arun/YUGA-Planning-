use bevy::prelude::*;
use serde::{Serialize, Deserialize};
use std::net::SocketAddr;

#[derive(Component, Debug, Clone, Serialize, Deserialize)]
pub struct NetworkComponent {
    pub id: String,
    pub owner: Option<String>,
    pub authority: NetworkAuthority,
    pub sync_mode: SyncMode,
    pub last_sync: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NetworkAuthority {
    Server,
    Client(String), // Client ID
    Shared,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncMode {
    Reliable,
    Unreliable,
    ReliableOrdered,
}

#[derive(Component, Debug)]
pub struct NetworkConnection {
    pub addr: SocketAddr,
    pub latency: f32,
    pub connected: bool,
}

impl Default for NetworkComponent {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            owner: None,
            authority: NetworkAuthority::Server,
            sync_mode: SyncMode::Reliable,
            last_sync: 0.0,
        }
    }
}

// Network state resource
#[derive(Resource)]
pub struct NetworkState {
    pub is_host: bool,
    pub client_id: Option<String>,
    pub connections: Vec<NetworkConnection>,
    pub tick_rate: f32,
}

impl Default for NetworkState {
    fn default() -> Self {
        Self {
            is_host: false,
            client_id: None,
            connections: Vec::new(),
            tick_rate: 60.0,
        }
    }
}

// Plugin to register network components and systems
pub struct NetworkPlugin;

impl Plugin for NetworkPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<NetworkState>()
            .register_type::<NetworkComponent>()
            .add_systems(Update, network_sync_system);
    }
}

// Network synchronization system
pub fn network_sync_system(
    mut query: Query<(Entity, &mut NetworkComponent, &Transform)>,
    time: Res<Time>,
    network_state: Res<NetworkState>,
) {
    let current_time = time.elapsed_seconds_f64();
    let sync_interval = 1.0 / network_state.tick_rate as f64;

    for (_entity, mut net, _transform) in query.iter_mut() {
        // Only sync if enough time has passed since last sync
        if current_time - net.last_sync >= sync_interval {
            net.last_sync = current_time;
            // Implement actual network sync logic here
            // This would involve serializing component state and sending it
            // over the network based on the sync_mode and authority
        }
    }
}