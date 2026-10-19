//! Bounded loopback HTTP client shared by MCP and Studio's own bridge probe.
use mebaco_mcp_protocol::BridgeError;
use serde_json::Value;
use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    time::{Duration, Instant},
};

pub const MAX_REQUEST_BYTES: usize = 64 * 1024;
pub const MAX_HEADER_BYTES: usize = 16 * 1024;
pub const MAX_RESPONSE_BYTES: usize = 32 * 1024 * 1024;

fn remaining(deadline: Instant) -> Result<Duration, BridgeError> {
    deadline
        .checked_duration_since(Instant::now())
        .filter(|d| !d.is_zero())
        .ok_or_else(|| BridgeError::new("BRIDGE_TIMEOUT", "Studio bridge deadline expired."))
}
fn io_error(error: std::io::Error) -> BridgeError {
    if matches!(
        error.kind(),
        std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
    ) {
        BridgeError::new("BRIDGE_TIMEOUT", "Studio bridge deadline expired.")
    } else {
        BridgeError::new("BRIDGE_UNAVAILABLE", "Studio bridge communication failed.")
    }
}
fn invalid() -> BridgeError {
    BridgeError::new(
        "INVALID_RESPONSE",
        "Studio returned an invalid or oversized HTTP/JSON response.",
    )
}

pub fn request(
    address: SocketAddr,
    token: &str,
    body: Option<&[u8]>,
    timeout: Duration,
) -> Result<(u16, Value), BridgeError> {
    if !address.ip().is_loopback()
        || token.is_empty()
        || !token.bytes().all(|b| (0x21..=0x7e).contains(&b))
    {
        return Err(BridgeError::new(
            "INVALID_REQUEST",
            "Invalid loopback connection information.",
        ));
    }
    if body.is_some_and(|b| b.len() > MAX_REQUEST_BYTES) {
        return Err(BridgeError::new(
            "REQUEST_TOO_LARGE",
            "Studio bridge request exceeds 64 KiB.",
        ));
    }
    let deadline = Instant::now() + timeout;
    let mut stream = TcpStream::connect_timeout(
        &address,
        remaining(deadline)?.min(Duration::from_millis(500)),
    )
    .map_err(io_error)?;
    let head = match body {
        Some(b) => format!("POST /bridge HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",b.len()),
        None => format!("GET /health HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {token}\r\nConnection: close\r\n\r\n"),
    };
    for bytes in [head.as_bytes(), body.unwrap_or_default()] {
        let mut sent = 0;
        while sent < bytes.len() {
            stream
                .set_write_timeout(Some(remaining(deadline)?))
                .map_err(io_error)?;
            let count = stream.write(&bytes[sent..]).map_err(io_error)?;
            if count == 0 {
                return Err(invalid());
            }
            sent += count;
        }
    }
    let mut bytes = Vec::new();
    let mut buffer = [0u8; 8192];
    let mut header = None;
    loop {
        stream
            .set_read_timeout(Some(remaining(deadline)?))
            .map_err(io_error)?;
        let count = stream.read(&mut buffer).map_err(io_error)?;
        if count == 0 {
            return Err(invalid());
        }
        bytes.extend_from_slice(&buffer[..count]);
        if header.is_none() {
            if let Some(start) = bytes
                .windows(4)
                .position(|w| w == b"\r\n\r\n")
                .map(|p| p + 4)
            {
                if start > MAX_HEADER_BYTES {
                    return Err(invalid());
                }
                let source = std::str::from_utf8(&bytes[..start]).map_err(|_| invalid())?;
                let mut lines = source.split("\r\n");
                let mut status_line = lines.next().ok_or_else(invalid)?.split_whitespace();
                if status_line.next() != Some("HTTP/1.1") {
                    return Err(invalid());
                }
                let status: u16 = status_line
                    .next()
                    .ok_or_else(invalid)?
                    .parse()
                    .map_err(|_| invalid())?;
                if !(100..=599).contains(&status) {
                    return Err(invalid());
                }
                let mut length = None;
                for line in lines.filter(|s| !s.is_empty()) {
                    let (key, val) = line.split_once(':').ok_or_else(invalid)?;
                    if key.eq_ignore_ascii_case("transfer-encoding") {
                        return Err(invalid());
                    }
                    if key.eq_ignore_ascii_case("content-length") {
                        if length.is_some() || !val.trim().bytes().all(|b| b.is_ascii_digit()) {
                            return Err(invalid());
                        }
                        length = Some(val.trim().parse::<usize>().map_err(|_| invalid())?);
                    }
                }
                let length = length
                    .filter(|n| *n <= MAX_RESPONSE_BYTES)
                    .ok_or_else(invalid)?;
                header = Some((start, length, status));
            } else if bytes.len() > MAX_HEADER_BYTES {
                return Err(invalid());
            }
        }
        if let Some((start, length, status)) = header {
            if bytes.len() >= start + length {
                if bytes.len() != start + length {
                    return Err(invalid());
                }
                return Ok((
                    status,
                    serde_json::from_slice(&bytes[start..]).map_err(|_| invalid())?,
                ));
            }
        }
    }
}
