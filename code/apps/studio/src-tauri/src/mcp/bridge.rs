pub use super::bridge_types::*;
use super::session::McpSessions;
use tauri::State;

#[tauri::command]
pub fn mcp_respond(
    sessions: State<'_, McpSessions>,
    response: McpBridgeResponse,
) -> Result<(), String> {
    let sender = sessions
        .pending()
        .lock()
        .map_err(|_| "MCP response state is unavailable.".to_string())?
        .remove(&response.id)
        .ok_or_else(|| "MCP request is no longer pending.".to_string())?;
    sender
        .send(response)
        .map_err(|_| "MCP request receiver is unavailable.".to_string())
}
