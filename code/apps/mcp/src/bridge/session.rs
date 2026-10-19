pub use mebaco_mcp_protocol::BridgeError as BridgeCallError;
use mebaco_mcp_protocol::{
    decode_contract, diagnostic_identity, require_contract, BridgeContract, BridgeRequest,
    HealthResponse, ProductIdentity, SessionDescriptor,
};
use mebaco_mcp_transport::request;
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    env, fs,
    io::Read,
    net::{IpAddr, SocketAddr},
    path::{Path, PathBuf},
    time::Duration,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevelopmentSession {
    session_id: String,
    pid: u32,
    project_display_name: String,
    dirty: bool,
    created_at_epoch_ms: u128,
    status: &'static str,
    compatible: bool,
    contract: Option<BridgeContract>,
    mcp_contract: BridgeContract,
    #[serde(skip_serializing_if = "Option::is_none")]
    identity: Option<ProductIdentity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<BridgeCallError>,
}
#[derive(Serialize)]
pub struct DevelopmentSessionList {
    sessions: Vec<DevelopmentSession>,
}
fn sessions_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        return env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .map(|path| path.join("com.mebaco.studio/mcp/sessions"));
    }

    #[cfg(target_os = "macos")]
    {
        return env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join("Library/Application Support/com.mebaco.studio/mcp/sessions"));
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        if let Some(path) = env::var_os("XDG_DATA_HOME") {
            return Some(PathBuf::from(path).join("com.mebaco.studio/mcp/sessions"));
        }
        env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join(".local/share/com.mebaco.studio/mcp/sessions"))
    }
}

fn parse_endpoint(endpoint: &str) -> Option<SocketAddr> {
    let address: SocketAddr = endpoint.strip_prefix("http://")?.parse().ok()?;
    match address.ip() {
        IpAddr::V4(ip) if ip.is_loopback() => Some(address),
        _ => None,
    }
}

fn valid_token(token: &str) -> bool {
    token.len() == 64 && token.bytes().all(|byte| byte.is_ascii_hexdigit())
}

#[cfg(windows)]
fn process_is_running(pid: u32) -> bool {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, STILL_ACTIVE},
        System::Threading::{GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION},
    };

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return false;
        }
        let mut exit_code = 0_u32;
        let running =
            GetExitCodeProcess(handle, &mut exit_code) != 0 && exit_code == STILL_ACTIVE as u32;
        CloseHandle(handle);
        running
    }
}

#[cfg(not(windows))]
fn process_is_running(pid: u32) -> bool {
    // An authenticated loopback health response remains the authoritative check
    // on non-Windows MVP builds.
    pid > 0
}

fn read_descriptor(path: &Path) -> Option<(SessionDescriptor, SocketAddr)> {
    let mut source = Vec::new();
    fs::File::open(path)
        .ok()?
        .take(16 * 1024 + 1)
        .read_to_end(&mut source)
        .ok()?;
    if source.len() > 16 * 1024 {
        return None;
    }
    let d: SessionDescriptor = serde_json::from_slice(&source).ok()?;
    if path.file_stem()?.to_str()? != d.session_id
        || d.session_id.is_empty()
        || d.pid == 0
        || !valid_token(&d.token)
        || d.project_display_name.is_empty()
        || d.created_at_epoch_ms == 0
    {
        return None;
    }
    let address = parse_endpoint(&d.endpoint)?;
    Some((d, address))
}
fn probe(d: &SessionDescriptor, address: SocketAddr) -> DevelopmentSession {
    let expected = crate::product_info::identity().bridge_contract();
    let mut view = DevelopmentSession {
        session_id: d.session_id.clone(),
        pid: d.pid,
        project_display_name: d.project_display_name.clone(),
        dirty: d.dirty,
        created_at_epoch_ms: d.created_at_epoch_ms,
        status: "unavailable",
        compatible: false,
        contract: None,
        mcp_contract: expected.clone(),
        identity: None,
        error: None,
    };
    let outcome = (|| -> Result<(), BridgeCallError> {
        if !process_is_running(d.pid) {
            return Err(BridgeCallError::new(
                "SESSION_NOT_AVAILABLE",
                "Studio process is not running.",
            ));
        }
        let (status, value) = request(address, &d.token, None, Duration::from_secs(2))?;
        if status != 200 {
            return Err(BridgeCallError::new(
                "MCP_HEALTH_FAILED",
                "Studio health request was rejected.",
            ));
        }
        view.status = "invalid";
        let health: HealthResponse = serde_json::from_value(value).map_err(|_| {
            BridgeCallError::new("MCP_HEALTH_INVALID", "Invalid Studio health response.")
        })?;
        if !health.ok || health.session_id != d.session_id {
            return Err(BridgeCallError::new(
                "MCP_SESSION_MISMATCH",
                "Descriptor and authenticated Studio session differ. Discover sessions again.",
            ));
        }
        view.identity = diagnostic_identity(health.identity.as_ref());
        if let Ok(actual) = decode_contract(health.contract.as_ref()) {
            view.contract = Some(actual);
        }
        if let Some(contract) = d.contract.as_ref() {
            // Legacy health must be reported as legacy even if the descriptor contains new metadata.
            if let Some(actual) = view.contract.as_ref() {
                if decode_contract(Some(contract)).ok().as_ref() != Some(actual) {
                    return Err(BridgeCallError::new("MCP_DESCRIPTOR_MISMATCH","Descriptor and authenticated Studio bridge generations differ. Discover sessions again."));
                }
            }
        }
        view.status = if health.contract.as_ref().is_none_or(Value::is_null) {
            "legacy"
        } else if view.contract.is_some() {
            "incompatible"
        } else {
            "invalid"
        };
        require_contract(&expected, health.contract.as_ref())?;
        view.status = "compatible";
        view.compatible = true;
        Ok(())
    })();
    if let Err(error) = outcome {
        view.error = Some(error);
    }
    view
}
fn valid_session_id(session_id: &str) -> bool {
    session_id.len() == 36
        && session_id.bytes().enumerate().all(|(i, b)| {
            if [8, 13, 18, 23].contains(&i) {
                b == b'-'
            } else {
                b.is_ascii_hexdigit()
            }
        })
}
fn call_in(
    directory: &Path,
    session_id: &str,
    method: &str,
    params: Value,
) -> Result<Value, BridgeCallError> {
    if !valid_session_id(session_id) {
        return Err(BridgeCallError::new(
            "SESSION_NOT_AVAILABLE",
            "Select a full sessionId from list_development_sessions.",
        ));
    }
    let (d, address) =
        read_descriptor(&directory.join(format!("{session_id}.json"))).ok_or_else(|| {
            BridgeCallError::new(
                "SESSION_NOT_AVAILABLE",
                "Studio session descriptor is unavailable. Discover sessions again.",
            )
        })?;
    let view = probe(&d, address);
    if !view.compatible {
        return Err(view.error.unwrap_or_else(|| {
            BridgeCallError::new("SESSION_NOT_AVAILABLE", "Studio session is unavailable.")
        }));
    }
    let body = serde_json::to_vec(&BridgeRequest {
        method: method.into(),
        params,
        session_id: Some(session_id.into()),
        contract: Some(json!(crate::product_info::identity().bridge_contract())),
    })
    .map_err(|_| BridgeCallError::new("INVALID_REQUEST", "Cannot encode Studio request."))?;
    let (status, value) = request(address, &d.token, Some(&body), Duration::from_secs(7))?;
    if status == 200 && value.get("ok").and_then(Value::as_bool) == Some(true) {
        return Ok(value.get("result").cloned().unwrap_or(Value::Null));
    }
    Err(value
        .get("error")
        .and_then(|e| serde_json::from_value(e.clone()).ok())
        .unwrap_or_else(|| {
            BridgeCallError::new("BRIDGE_ERROR", "Studio could not complete the request.")
        }))
}
pub fn call_development_session(
    session_id: &str,
    method: &str,
    params: Value,
) -> Result<Value, BridgeCallError> {
    let directory = sessions_dir().ok_or_else(|| {
        BridgeCallError::new(
            "SESSION_NOT_AVAILABLE",
            "Studio session directory is unavailable.",
        )
    })?;
    call_in(&directory, session_id, method, params)
}
fn list_from(directory: &Path) -> DevelopmentSessionList {
    let mut sessions = fs::read_dir(directory)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().and_then(|v| v.to_str()) == Some("json"))
        .filter_map(|e| read_descriptor(&e.path()))
        .map(|(d, a)| probe(&d, a))
        .collect::<Vec<_>>();
    sessions.sort_by(|a, b| {
        b.created_at_epoch_ms
            .cmp(&a.created_at_epoch_ms)
            .then_with(|| a.session_id.cmp(&b.session_id))
    });
    DevelopmentSessionList { sessions }
}
pub fn list_development_sessions() -> DevelopmentSessionList {
    sessions_dir()
        .map(|d| list_from(&d))
        .unwrap_or(DevelopmentSessionList { sessions: vec![] })
}
#[cfg(test)]
#[path = "session_tests.rs"]
mod tests;
