use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    sync::{mpsc::SyncSender, Mutex},
};
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpBridgeRequest {
    pub id: String,
    pub method: String,
    pub params: Value,
}

pub use mebaco_mcp_protocol::BridgeError as McpBridgeError;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpBridgeResponse {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<McpBridgeError>,
}

pub type PendingResponses = Mutex<HashMap<String, SyncSender<McpBridgeResponse>>>;
