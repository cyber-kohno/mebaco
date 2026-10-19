use super::diagnostics::SharedDiagnostics;
use mebaco_mcp_protocol::{
    require_contract, BridgeError, BridgeRequest as IncomingRequest, ProductIdentity,
};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc,
    },
    thread,
    time::Duration,
};
use uuid::Uuid;

use super::bridge::{McpBridgeRequest, McpBridgeResponse, PendingResponses};

const MAX_HEADER_BYTES: usize = 16 * 1024;
const MAX_BODY_BYTES: usize = 64 * 1024;
const BRIDGE_TIMEOUT: Duration = Duration::from_secs(5);

struct ParsedHttpRequest {
    method: String,
    path: String,
    authorization: Option<String>,
    body: Vec<u8>,
}

fn read_request(stream: &mut TcpStream) -> Result<ParsedHttpRequest, String> {
    // Windows accepted sockets can inherit the nonblocking listener mode.
    stream
        .set_nonblocking(false)
        .map_err(|_| "Cannot configure bridge stream.")?;
    let deadline = std::time::Instant::now() + Duration::from_secs(2);
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 2048];
    let header_end = loop {
        stream
            .set_read_timeout(Some(
                deadline
                    .checked_duration_since(std::time::Instant::now())
                    .filter(|d| !d.is_zero())
                    .ok_or("Request deadline expired.")?,
            ))
            .map_err(|_| "Cannot set request deadline.")?;
        let count = stream
            .read(&mut buffer)
            .map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Request ended before headers were complete.".to_string());
        }
        bytes.extend_from_slice(&buffer[..count]);
        if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
            if index + 4 > MAX_HEADER_BYTES {
                return Err("Request headers are too large.".to_string());
            }
            break index + 4;
        }
        if bytes.len() > MAX_HEADER_BYTES {
            return Err("Request headers are too large.".to_string());
        }
    };

    let header_source = std::str::from_utf8(&bytes[..header_end])
        .map_err(|_| "Request headers must be UTF-8.".to_string())?;
    let mut lines = header_source.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Request line is missing.".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts.next().unwrap_or_default().to_string();
    let path = request_parts.next().unwrap_or_default().to_string();
    if method.is_empty() || path.is_empty() {
        return Err("Request line is invalid.".to_string());
    }

    let mut content_length = 0_usize;
    let mut authorization = None;
    for line in lines.filter(|line| !line.is_empty()) {
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        match name.trim().to_ascii_lowercase().as_str() {
            "content-length" => {
                content_length = value
                    .trim()
                    .parse()
                    .map_err(|_| "Content-Length is invalid.".to_string())?;
            }
            "authorization" => authorization = Some(value.trim().to_string()),
            _ => {}
        }
    }
    if content_length > MAX_BODY_BYTES {
        return Err("Request body is too large.".to_string());
    }

    while bytes.len() < header_end + content_length {
        stream
            .set_read_timeout(Some(
                deadline
                    .checked_duration_since(std::time::Instant::now())
                    .filter(|d| !d.is_zero())
                    .ok_or("Request deadline expired.")?,
            ))
            .map_err(|_| "Cannot set request deadline.")?;
        let count = stream
            .read(&mut buffer)
            .map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Request body ended unexpectedly.".to_string());
        }
        bytes.extend_from_slice(&buffer[..count]);
    }

    Ok(ParsedHttpRequest {
        method,
        path,
        authorization,
        body: bytes[header_end..header_end + content_length].to_vec(),
    })
}

fn write_json(stream: &mut TcpStream, status: &str, value: Value) {
    let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
    let body = serde_json::to_vec(&value).unwrap_or_else(|_| b"{}".to_vec());
    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len(),
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(&body);
}

fn error_value(code: &str, message: &str) -> Value {
    json!({ "ok": false, "error": { "code": code, "message": message } })
}

fn handle_connection(
    mut stream: TcpStream,
    emit: &impl Fn(&McpBridgeRequest) -> Result<(), String>,
    identity: &ProductIdentity,
    diagnostics: &SharedDiagnostics,
    session_id: &str,
    token: &str,
    pending: &Arc<PendingResponses>,
) {
    let request = match read_request(&mut stream) {
        Ok(request) => request,
        Err(message) => {
            write_json(
                &mut stream,
                "400 Bad Request",
                error_value("INVALID_REQUEST", &message),
            );
            return;
        }
    };

    if request.authorization.as_deref() != Some(&format!("Bearer {token}")) {
        write_json(
            &mut stream,
            "401 Unauthorized",
            error_value("UNAUTHORIZED", "A valid session token is required."),
        );
        return;
    }

    if request.method == "GET" && request.path == "/health" {
        write_json(
            &mut stream,
            "200 OK",
            json!({ "ok": true, "sessionId": session_id, "contract": identity.bridge_contract(), "identity": identity }),
        );
        return;
    }
    if request.method != "POST" || request.path != "/bridge" {
        write_json(
            &mut stream,
            "404 Not Found",
            error_value("NOT_FOUND", "The requested endpoint does not exist."),
        );
        return;
    }

    let incoming: IncomingRequest = match serde_json::from_slice(&request.body) {
        Ok(value) => value,
        Err(_) => {
            write_json(
                &mut stream,
                "400 Bad Request",
                error_value("INVALID_JSON", "Invalid Studio bridge request envelope."),
            );
            return;
        }
    };
    let expected = identity.bridge_contract();
    let checked = require_contract(&expected, incoming.contract.as_ref()).and_then(|_| {
        if incoming.session_id.as_deref() != Some(session_id) {
            let mut error = BridgeError::new(
                "MCP_SESSION_MISMATCH",
                "The target Studio session changed. Discover sessions again.",
            );
            error.expected_contract = Some(expected.clone());
            error.actual_contract = Some(expected.clone());
            return Err(error);
        }
        Ok(())
    });
    if let Err(error) = checked {
        if let Ok(mut state) = diagnostics.lock() {
            state.reject(&error, expected.bridge_protocol_gen);
        }
        write_json(
            &mut stream,
            "409 Conflict",
            json!({"ok":false,"error":error}),
        );
        return;
    }
    let id = Uuid::new_v4().to_string();
    let bridge_request = McpBridgeRequest {
        id: id.clone(),
        method: incoming.method,
        params: incoming.params,
    };
    let (sender, receiver) = mpsc::sync_channel::<McpBridgeResponse>(1);
    if let Ok(mut responses) = pending.lock() {
        responses.insert(id.clone(), sender);
    } else {
        write_json(
            &mut stream,
            "503 Service Unavailable",
            error_value("BRIDGE_UNAVAILABLE", "The response bridge is unavailable."),
        );
        return;
    }

    if emit(&bridge_request).is_err() {
        if let Ok(mut responses) = pending.lock() {
            responses.remove(&id);
        }
        write_json(
            &mut stream,
            "503 Service Unavailable",
            error_value("WEBVIEW_UNAVAILABLE", "The Studio WebView is unavailable."),
        );
        return;
    }

    if bridge_request.method != "ping" {
        if let Ok(mut state) = diagnostics.lock() {
            state.accept();
        }
    }
    match receiver.recv_timeout(BRIDGE_TIMEOUT) {
        Ok(response) => write_json(
            &mut stream,
            "200 OK",
            json!({
                "ok": response.error.is_none(),
                "result": response.result,
                "error": response.error,
            }),
        ),
        Err(_) => {
            if let Ok(mut responses) = pending.lock() {
                responses.remove(&id);
            }
            write_json(
                &mut stream,
                "504 Gateway Timeout",
                error_value("BRIDGE_TIMEOUT", "Studio did not answer within 5 seconds."),
            );
        }
    }
}

pub fn run(
    listener: TcpListener,
    emit: impl Fn(&McpBridgeRequest) -> Result<(), String>,
    identity: ProductIdentity,
    diagnostics: Arc<SharedDiagnostics>,
    session_id: String,
    token: String,
    pending: Arc<PendingResponses>,
    stop: Arc<AtomicBool>,
) {
    while !stop.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((stream, _)) => handle_connection(
                stream,
                &emit,
                &identity,
                &diagnostics,
                &session_id,
                &token,
                &pending,
            ),
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(20));
            }
            Err(error) => {
                log::warn!("MCP internal bridge stopped accepting connections: {error}");
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn creates_structured_errors() {
        assert_eq!(
            error_value("UNAUTHORIZED", "No token."),
            json!({ "ok": false, "error": { "code": "UNAUTHORIZED", "message": "No token." } }),
        );
    }

    #[test]
    fn parses_authorized_json_request() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let client = std::thread::spawn(move || {
            let mut stream = TcpStream::connect(address).unwrap();
            stream.write_all(
                b"POST /bridge HTTP/1.1\r\nAuthorization: Bearer secret\r\nContent-Length: 29\r\n\r\n{\"method\":\"ping\",\"params\":{}}",
            ).unwrap();
        });
        let (mut stream, _) = listener.accept().unwrap();
        let request = read_request(&mut stream).unwrap();
        client.join().unwrap();

        assert_eq!(request.method, "POST");
        assert_eq!(request.path, "/bridge");
        assert_eq!(request.authorization.as_deref(), Some("Bearer secret"));
        assert_eq!(request.body, br#"{"method":"ping","params":{}}"#);
    }
}
