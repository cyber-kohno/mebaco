use super::diagnostics::{Diagnostics, SharedDiagnostics, Snapshot};
use mebaco_mcp_protocol::{BridgeRequest, SessionDescriptor};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener},
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread::JoinHandle,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

use super::{bridge::PendingResponses, server};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStartRequest {
    project_display_name: String,
    dirty: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStartResult {
    session_id: String,
    endpoint: String,
    pid: u32,
}

struct ActiveSession {
    session_id: String,
    descriptor_path: PathBuf,
    address: SocketAddr,
    token: String,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl ActiveSession {
    fn shutdown(mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
        let _ = fs::remove_file(&self.descriptor_path);
    }
}

impl Drop for ActiveSession {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        let _ = fs::remove_file(&self.descriptor_path);
    }
}

pub struct McpSessions {
    active: Mutex<Option<ActiveSession>>,
    pending: Arc<PendingResponses>,
    diagnostics: Arc<SharedDiagnostics>,
}

impl Default for McpSessions {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
            pending: Arc::new(Mutex::new(Default::default())),
            diagnostics: Arc::new(Mutex::new(Diagnostics::default())),
        }
    }
}

impl McpSessions {
    pub(super) fn pending(&self) -> &PendingResponses {
        &self.pending
    }
}

fn sessions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|path| path.join("mcp/sessions"))
        .map_err(|error| error.to_string())
}

fn write_descriptor(path: &PathBuf, descriptor: &SessionDescriptor) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid MCP session path.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    let source = serde_json::to_vec_pretty(descriptor).map_err(|error| error.to_string())?;
    fs::write(&temporary, source).map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn mcp_start_session(
    app: AppHandle,
    sessions: State<'_, McpSessions>,
    request: McpStartRequest,
) -> Result<McpStartResult, String> {
    let mut active = sessions
        .active
        .lock()
        .map_err(|_| "MCP session state is unavailable.".to_string())?;
    if active.is_some() {
        return Err("An MCP development session is already running.".to_string());
    }

    let listener = TcpListener::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 0))
        .map_err(|error| format!("Could not start the MCP internal bridge: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let endpoint = format!(
        "http://{}",
        listener.local_addr().map_err(|error| error.to_string())?
    );
    let address = listener.local_addr().map_err(|error| error.to_string())?;
    let session_id = Uuid::new_v4().to_string();
    let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let descriptor = SessionDescriptor {
        session_id: session_id.clone(),
        contract: Some(serde_json::json!(
            crate::product_info::identity().bridge_contract()
        )),
        identity: Some(serde_json::json!(crate::product_info::identity())),
        pid: std::process::id(),
        endpoint: endpoint.clone(),
        token: token.clone(),
        project_display_name: request.project_display_name,
        dirty: request.dirty,
        created_at_epoch_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_millis(),
    };
    let descriptor_path = sessions_dir(&app)?.join(format!("{session_id}.json"));
    write_descriptor(&descriptor_path, &descriptor)?;

    let stop = Arc::new(AtomicBool::new(false));
    let server_stop = Arc::clone(&stop);
    let pending = Arc::clone(&sessions.pending);
    let server_app = app.clone();
    let diagnostics = Arc::clone(&sessions.diagnostics);
    diagnostics
        .lock()
        .map_err(|_| "MCP diagnostics are unavailable.")?
        .reset(Some(session_id.clone()));
    let server_session_id = session_id.clone();
    let server_token = token.clone();
    let thread = std::thread::Builder::new()
        .name("mebaco-mcp-bridge".to_string())
        .spawn(move || {
            server::run(
                listener,
                move |request| {
                    server_app
                        .emit("mebaco://mcp/request", request)
                        .map_err(|_| "Studio WebView unavailable.".to_string())
                },
                crate::product_info::identity(),
                diagnostics,
                server_session_id,
                server_token,
                pending,
                server_stop,
            )
        })
        .map_err(|error| {
            let _ = fs::remove_file(&descriptor_path);
            error.to_string()
        })?;

    *active = Some(ActiveSession {
        session_id: session_id.clone(),
        descriptor_path,
        address,
        token,
        stop,
        thread: Some(thread),
    });
    Ok(McpStartResult {
        session_id,
        endpoint,
        pid: std::process::id(),
    })
}

fn probe_bridge(
    address: SocketAddr,
    token: String,
    session_id: String,
) -> Result<serde_json::Value, String> {
    let body = serde_json::to_vec(&BridgeRequest {
        method: "ping".into(),
        params: serde_json::json!({}),
        session_id: Some(session_id),
        contract: Some(serde_json::json!(
            crate::product_info::identity().bridge_contract()
        )),
    })
    .map_err(|e| e.to_string())?;
    let (status, value) = mebaco_mcp_transport::request(
        address,
        &token,
        Some(&body),
        std::time::Duration::from_secs(7),
    )
    .map_err(|e| e.to_string())?;
    if status != 200 || value.get("ok").and_then(|v| v.as_bool()) != Some(true) {
        return Err("MCP bridge self-test failed.".into());
    }
    Ok(value)
}

#[tauri::command]
pub async fn mcp_probe_session(
    sessions: State<'_, McpSessions>,
) -> Result<serde_json::Value, String> {
    let (address, token, session_id) = {
        let active = sessions
            .active
            .lock()
            .map_err(|_| "MCP session state is unavailable.".to_string())?;
        let session = active
            .as_ref()
            .ok_or_else(|| "No MCP development session is running.".to_string())?;
        (
            session.address,
            session.token.clone(),
            session.session_id.clone(),
        )
    };
    tauri::async_runtime::spawn_blocking(move || probe_bridge(address, token, session_id))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn mcp_update_session_dirty(
    sessions: State<'_, McpSessions>,
    dirty: bool,
) -> Result<(), String> {
    let active = sessions
        .active
        .lock()
        .map_err(|_| "MCP session state is unavailable.".to_string())?;
    let session = active
        .as_ref()
        .ok_or_else(|| "No MCP development session is running.".to_string())?;
    let source = fs::read(&session.descriptor_path).map_err(|error| error.to_string())?;
    let mut descriptor: SessionDescriptor = serde_json::from_slice(&source)
        .map_err(|error| format!("MCP session descriptor is invalid: {error}"))?;
    descriptor.dirty = dirty;
    write_descriptor(&session.descriptor_path, &descriptor)
}

#[tauri::command]
pub fn mcp_stop_session(sessions: State<'_, McpSessions>) -> Result<(), String> {
    let session = sessions
        .active
        .lock()
        .map_err(|_| "MCP session state is unavailable.".to_string())?
        .take();
    if let Some(session) = session {
        session.shutdown();
    }
    if let Ok(mut diagnostics) = sessions.diagnostics.lock() {
        diagnostics.reset(None);
    }
    if let Ok(mut pending) = sessions.pending.lock() {
        pending.clear();
    }
    Ok(())
}

#[tauri::command]
pub fn mcp_diagnostics(sessions: State<'_, McpSessions>) -> Result<Snapshot, String> {
    Ok(sessions
        .diagnostics
        .lock()
        .map_err(|_| "MCP diagnostics unavailable.")?
        .snapshot(crate::product_info::identity()))
}
