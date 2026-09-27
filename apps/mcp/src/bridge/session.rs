use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env, fs,
    io::{Read, Write},
    net::{IpAddr, SocketAddr, TcpStream},
    path::{Path, PathBuf},
    time::Duration,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionDescriptor {
    session_id: String,
    pid: u32,
    endpoint: String,
    token: String,
    project_display_name: String,
    dirty: bool,
    created_at_epoch_ms: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevelopmentSession {
    session_id: String,
    pid: u32,
    project_display_name: String,
    dirty: bool,
    created_at_epoch_ms: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevelopmentSessionList {
    sessions: Vec<DevelopmentSession>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeCallError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_revision: Option<u64>,
}

impl BridgeCallError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            expected_revision: None,
            actual_revision: None,
        }
    }

    fn with_revisions(
        mut self,
        expected_revision: Option<u64>,
        actual_revision: Option<u64>,
    ) -> Self {
        self.expected_revision = expected_revision;
        self.actual_revision = actual_revision;
        self
    }
}

impl DevelopmentSessionList {
    #[cfg(test)]
    fn len(&self) -> usize {
        self.sessions.len()
    }
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

fn validate_health(address: SocketAddr, token: &str, expected_session_id: &str) -> bool {
    let mut stream = match TcpStream::connect_timeout(&address, Duration::from_millis(500)) {
        Ok(stream) => stream,
        Err(_) => return false,
    };
    if stream
        .set_read_timeout(Some(Duration::from_millis(500)))
        .is_err()
    {
        return false;
    }
    let request = format!(
        "GET /health HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {token}\r\nConnection: close\r\n\r\n",
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut response = Vec::new();
    if stream.read_to_end(&mut response).is_err() {
        return false;
    }
    let Some(body_start) = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
    else {
        return false;
    };
    let Ok(body) = serde_json::from_slice::<Value>(&response[body_start..]) else {
        return false;
    };
    response.starts_with(b"HTTP/1.1 200 ")
        && body.get("ok").and_then(Value::as_bool) == Some(true)
        && body.get("sessionId").and_then(Value::as_str) == Some(expected_session_id)
}

fn read_valid_descriptor(path: &Path) -> Option<(SessionDescriptor, SocketAddr)> {
    let source = fs::read(path).ok()?;
    let descriptor: SessionDescriptor = serde_json::from_slice(&source).ok()?;
    if path.file_stem()?.to_str()? != descriptor.session_id
        || descriptor.session_id.is_empty()
        || descriptor.pid == 0
        || !valid_token(&descriptor.token)
        || descriptor.project_display_name.is_empty()
        || descriptor.created_at_epoch_ms == 0
        || !process_is_running(descriptor.pid)
    {
        return None;
    }
    let address = parse_endpoint(&descriptor.endpoint)?;
    if !validate_health(address, &descriptor.token, &descriptor.session_id) {
        return None;
    }
    Some((descriptor, address))
}

fn read_valid_session(path: &Path) -> Option<DevelopmentSession> {
    let (descriptor, _) = read_valid_descriptor(path)?;
    Some(DevelopmentSession {
        session_id: descriptor.session_id,
        pid: descriptor.pid,
        project_display_name: descriptor.project_display_name,
        dirty: descriptor.dirty,
        created_at_epoch_ms: descriptor.created_at_epoch_ms,
    })
}

fn valid_session_id(session_id: &str) -> bool {
    session_id.len() == 36
        && session_id
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() || byte == b'-')
}

fn bridge_request(
    address: SocketAddr,
    token: &str,
    method: &str,
    params: Value,
) -> Result<Value, BridgeCallError> {
    let unavailable = || {
        BridgeCallError::new(
            "SESSION_NOT_AVAILABLE",
            "The selected Mebaco Studio session is no longer available.",
        )
    };
    let mut stream =
        TcpStream::connect_timeout(&address, Duration::from_secs(2)).map_err(|_| unavailable())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(7)))
        .map_err(|error| BridgeCallError::new("BRIDGE_UNAVAILABLE", error.to_string()))?;
    let body = serde_json::to_vec(&serde_json::json!({ "method": method, "params": params }))
        .map_err(|error| BridgeCallError::new("INVALID_REQUEST", error.to_string()))?;
    let request = format!(
        "POST /bridge HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len(),
    );
    stream
        .write_all(request.as_bytes())
        .and_then(|_| stream.write_all(&body))
        .map_err(|_| unavailable())?;
    let mut response = Vec::new();
    stream.read_to_end(&mut response).map_err(|error| {
        let code = if matches!(
            error.kind(),
            std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
        ) {
            "BRIDGE_TIMEOUT"
        } else {
            "BRIDGE_UNAVAILABLE"
        };
        BridgeCallError::new(code, error.to_string())
    })?;
    let body_start = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
        .ok_or_else(|| {
            BridgeCallError::new(
                "INVALID_RESPONSE",
                "Studio returned an invalid HTTP response.",
            )
        })?;
    let value: Value = serde_json::from_slice(&response[body_start..]).map_err(|error| {
        BridgeCallError::new(
            "INVALID_RESPONSE",
            format!("Studio returned invalid JSON: {error}"),
        )
    })?;
    if value.get("ok").and_then(Value::as_bool) == Some(true) {
        return Ok(value.get("result").cloned().unwrap_or(Value::Null));
    }
    let error = value.get("error");
    Err(BridgeCallError::new(
        error
            .and_then(|value| value.get("code"))
            .and_then(Value::as_str)
            .unwrap_or("BRIDGE_ERROR"),
        error
            .and_then(|value| value.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("Studio could not complete the request."),
    )
    .with_revisions(
        error
            .and_then(|value| value.get("expectedRevision"))
            .and_then(Value::as_u64),
        error
            .and_then(|value| value.get("actualRevision"))
            .and_then(Value::as_u64),
    ))
}

pub fn call_development_session(
    session_id: &str,
    method: &str,
    params: Value,
) -> Result<Value, BridgeCallError> {
    if !valid_session_id(session_id) {
        return Err(BridgeCallError::new(
            "SESSION_NOT_AVAILABLE",
            "The selected Mebaco Studio session is not available.",
        ));
    }
    let path = sessions_dir()
        .map(|directory| directory.join(format!("{session_id}.json")))
        .ok_or_else(|| {
            BridgeCallError::new(
                "SESSION_NOT_AVAILABLE",
                "The Mebaco Studio session directory is unavailable.",
            )
        })?;
    let (descriptor, address) = read_valid_descriptor(&path).ok_or_else(|| {
        BridgeCallError::new(
            "SESSION_NOT_AVAILABLE",
            "The selected Mebaco Studio session is not available.",
        )
    })?;
    bridge_request(address, &descriptor.token, method, params)
}

fn list_from(directory: &Path) -> DevelopmentSessionList {
    let mut sessions = fs::read_dir(directory)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().and_then(|value| value.to_str()) == Some("json"))
        .filter_map(|entry| read_valid_session(&entry.path()))
        .collect::<Vec<_>>();
    sessions.sort_by(|left, right| {
        right
            .created_at_epoch_ms
            .cmp(&left.created_at_epoch_ms)
            .then_with(|| left.session_id.cmp(&right.session_id))
    });
    DevelopmentSessionList { sessions }
}

pub fn list_development_sessions() -> DevelopmentSessionList {
    sessions_dir()
        .map(|directory| list_from(&directory))
        .unwrap_or(DevelopmentSessionList { sessions: vec![] })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        net::TcpListener,
        thread,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn accepts_only_ipv4_loopback_endpoints() {
        assert!(parse_endpoint("http://127.0.0.1:4567").is_some());
        assert!(parse_endpoint("https://127.0.0.1:4567").is_none());
        assert!(parse_endpoint("http://0.0.0.0:4567").is_none());
        assert!(parse_endpoint("http://192.168.1.10:4567").is_none());
    }

    #[test]
    fn requires_a_64_character_hex_token() {
        assert!(valid_token(&"a".repeat(64)));
        assert!(!valid_token(&"a".repeat(63)));
        assert!(!valid_token(&"z".repeat(64)));
    }

    #[test]
    fn rejects_unsafe_session_ids() {
        assert!(valid_session_id("7b7b0e3e-f9f1-43b6-bd15-e8de93e43a21"));
        assert!(!valid_session_id("../sessions/secret"));
        assert!(!valid_session_id("short"));
    }

    #[test]
    fn sends_an_authenticated_bridge_request() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 2048];
            let count = stream.read(&mut request).unwrap();
            let request = String::from_utf8_lossy(&request[..count]);
            assert!(request.contains("POST /bridge HTTP/1.1"));
            assert!(request.contains("Authorization: Bearer secret"));
            let body = br#"{"ok":true,"result":{"displayed":true},"error":null}"#;
            write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len(),
            )
            .unwrap();
            stream.write_all(body).unwrap();
            stream.shutdown(std::net::Shutdown::Write).unwrap();
        });

        let result = bridge_request(
            address,
            "secret",
            "showMessage",
            serde_json::json!({ "message": "Hello" }),
        )
        .unwrap();
        server.join().unwrap();
        assert_eq!(result, serde_json::json!({ "displayed": true }));
    }

    #[test]
    fn lists_only_an_authenticated_live_session() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let count = stream.read(&mut request).unwrap();
            let request = String::from_utf8_lossy(&request[..count]);
            assert!(request.contains("Authorization: Bearer "));
            let body = br#"{"ok":true,"sessionId":"live-session"}"#;
            write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len(),
            )
            .unwrap();
            stream.write_all(body).unwrap();
        });

        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = env::temp_dir().join(format!(
            "mebaco-mcp-session-test-{}-{suffix}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let descriptor = serde_json::json!({
            "sessionId": "live-session",
            "pid": std::process::id(),
            "endpoint": format!("http://{address}"),
            "token": "a".repeat(64),
            "projectDisplayName": "test.mbc",
            "dirty": true,
            "createdAtEpochMs": 1,
        });
        fs::write(
            directory.join("live-session.json"),
            serde_json::to_vec(&descriptor).unwrap(),
        )
        .unwrap();
        fs::write(directory.join("stale.json"), b"{}").unwrap();

        let result = list_from(&directory);
        server.join().unwrap();
        fs::remove_file(directory.join("live-session.json")).unwrap();
        let after_stop = list_from(&directory);
        fs::remove_dir_all(&directory).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(after_stop.len(), 0);
    }
}
