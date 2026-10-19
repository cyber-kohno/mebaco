use super::*;
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Instant,
};

// Compile the actual Studio acceptance code; only its WebView event sink is a fixture.
mod host {
    pub mod bridge {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../studio/src-tauri/src/mcp/bridge_types.rs"
        ));
    }
    pub mod diagnostics {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../studio/src-tauri/src/mcp/diagnostics.rs"
        ));
    }
    pub mod server {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../studio/src-tauri/src/mcp/server.rs"
        ));
    }
}
struct Fixture {
    directory: PathBuf,
    session_id: String,
    address: SocketAddr,
    token: String,
    stop: Arc<AtomicBool>,
    thread: Option<thread::JoinHandle<()>>,
    events: Arc<AtomicUsize>,
    pending: Arc<host::bridge::PendingResponses>,
    diagnostics: Arc<host::diagnostics::SharedDiagnostics>,
}
impl Fixture {
    fn new(generation: u32) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let address = listener.local_addr().unwrap();
        let session_id = uuid::Uuid::new_v4().to_string();
        let token = "a".repeat(64);
        let directory = env::temp_dir().join(format!("mebaco-contract-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&directory).unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        let events = Arc::new(AtomicUsize::new(0));
        let pending: Arc<host::bridge::PendingResponses> = Arc::new(Mutex::new(Default::default()));
        let diagnostics = Arc::new(Mutex::new(host::diagnostics::Diagnostics::default()));
        diagnostics.lock().unwrap().reset(Some(session_id.clone()));
        let identity = ProductIdentity {
            release_version: "9.9.9".into(),
            bridge_protocol_gen: generation,
            api_gen: 9,
            schema_gen: 9,
        };
        fs::write(directory.join(format!("{session_id}.json")),serde_json::to_vec(&json!({
            "sessionId":session_id,"pid":std::process::id(),"endpoint":format!("http://{address}"),"token":token,
            "projectDisplayName":"fixture.mbc","dirty":true,"createdAtEpochMs":1,"contract":identity.bridge_contract(),"identity":identity
        })).unwrap()).unwrap();
        let (s, e, p, d, id, t) = (
            stop.clone(),
            events.clone(),
            pending.clone(),
            diagnostics.clone(),
            session_id.clone(),
            token.clone(),
        );
        let thread = thread::spawn(move || {
            let send = p.clone();
            host::server::run(
                listener,
                move |request| {
                    e.fetch_add(1, Ordering::SeqCst);
                    send.lock()
                        .unwrap()
                        .remove(&request.id)
                        .unwrap()
                        .send(host::bridge::McpBridgeResponse {
                            id: request.id.clone(),
                            result: Some(json!({"method":request.method})),
                            error: None,
                        })
                        .unwrap();
                    Ok(())
                },
                identity,
                d,
                id,
                t,
                p,
                s,
            );
        });
        Self {
            directory,
            session_id,
            address,
            token,
            stop,
            thread: Some(thread),
            events,
            pending,
            diagnostics,
        }
    }
    fn direct(&self, body: Value) -> (u16, Value) {
        request(
            self.address,
            &self.token,
            Some(&serde_json::to_vec(&body).unwrap()),
            Duration::from_secs(2),
        )
        .unwrap()
    }
    fn snapshot(&self) -> Value {
        serde_json::to_value(
            self.diagnostics
                .lock()
                .unwrap()
                .snapshot(crate::product_info::identity()),
        )
        .unwrap()
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.thread.take().unwrap().join().unwrap();
        fs::remove_dir_all(&self.directory).unwrap();
    }
}

#[test]
fn same_generation_with_different_product_and_api_identity_succeeds() {
    let f = Fixture::new(crate::product_info::identity().bridge_protocol_gen);
    let list = list_from(&f.directory);
    let view = serde_json::to_value(list).unwrap();
    assert_eq!(view["sessions"][0]["compatible"], true);
    assert_eq!(view["sessions"][0]["identity"]["releaseVersion"], "9.9.9");
    assert!(!view.to_string().contains(&f.token));
    assert!(view["sessions"][0].get("endpoint").is_none());
    for method in [
        "getProjectOverview",
        "checkoutEditSession",
        "applyChanges",
        "startPreview",
        "inspectPreview",
        "interactPreview",
        "closePreview",
        "checkinEditSession",
        "cancelEditSession",
    ] {
        assert_eq!(
            call_in(&f.directory, &f.session_id, method, json!({})).unwrap()["method"],
            method
        );
    }
    assert_eq!(f.events.load(Ordering::SeqCst), 9);
    assert_eq!(f.snapshot()["accepted"], 9);
    assert!(f.pending.lock().unwrap().is_empty());
}
#[test]
fn foreign_generation_is_visible_but_never_posted() {
    let f = Fixture::new(crate::product_info::identity().bridge_protocol_gen + 1);
    assert_eq!(list_from(&f.directory).sessions[0].status, "incompatible");
    let error = call_in(&f.directory, &f.session_id, "applyChanges", json!({})).unwrap_err();
    assert_eq!(error.code, "MCP_BRIDGE_GENERATION_MISMATCH");
    assert!(error.expected_contract.is_some() && error.actual_contract.is_some());
    assert_eq!(f.events.load(Ordering::SeqCst), 0);
    assert_eq!(f.snapshot()["rejected"], 0); // MCP preflight is not Studio-observed rejection.
}
#[test]
fn all_legacy_invalid_and_foreign_requests_are_rejected_before_pending_or_events() {
    let f = Fixture::new(1);
    for method in [
        "getProjectOverview",
        "checkoutEditSession",
        "applyChanges",
        "startPreview",
        "cancelEditSession",
    ] {
        for contract in [
            None,
            Some(json!(null)),
            Some(json!({})),
            Some(json!({"bridgeProtocolGen":0})),
            Some(json!({"bridgeProtocolGen":"secret"})),
            Some(json!({"bridgeProtocolGen":2})),
        ] {
            let mut body = json!({"method":method,"params":{"source":"secret-source"},"sessionId":f.session_id});
            if let Some(c) = contract {
                body["contract"] = c;
            }
            let (status, result) = f.direct(body);
            assert_eq!(status, 409, "method={method}, result={result}");
            assert!(result["error"]["code"].is_string());
            assert!(!result.to_string().contains("secret"));
            assert_eq!(f.events.load(Ordering::SeqCst), 0);
            assert!(f.pending.lock().unwrap().is_empty());
        }
    }
    let (status, result) = f.direct(
        json!({"sessionId":"other","contract":{"bridgeProtocolGen":1},"method":"applyChanges"}),
    );
    assert_eq!(status, 409);
    assert_eq!(result["error"]["code"], "MCP_SESSION_MISMATCH");
    assert_eq!(f.events.load(Ordering::SeqCst), 0);
    // A rejected peer does not disable a compatible one.
    assert!(call_in(&f.directory, &f.session_id, "getProjectOverview", json!({})).is_ok());
}
#[test]
fn authentication_and_probe_do_not_count_as_external_acceptance() {
    let f = Fixture::new(1);
    let body = serde_json::to_vec(
        &json!({"sessionId":f.session_id,"contract":{"bridgeProtocolGen":1},"method":"ping"}),
    )
    .unwrap();
    assert_eq!(
        request(f.address, "wrong", Some(&body), Duration::from_secs(2))
            .unwrap()
            .0,
        401
    );
    assert_eq!(f.snapshot()["rejected"], 0);
    request(f.address, &f.token, None, Duration::from_secs(2)).unwrap();
    assert_eq!(
        request(f.address, &f.token, Some(&body), Duration::from_secs(2))
            .unwrap()
            .0,
        200
    );
    assert_eq!(f.snapshot()["accepted"], 0);
}
#[test]
fn descriptor_contract_is_checked_and_absent_metadata_can_use_health() {
    let f = Fixture::new(1);
    let file = f.directory.join(format!("{}.json", f.session_id));
    let mut d: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    d["contract"] = json!({"bridgeProtocolGen":2});
    fs::write(&file, serde_json::to_vec(&d).unwrap()).unwrap();
    assert_eq!(
        call_in(&f.directory, &f.session_id, "read", json!({}))
            .unwrap_err()
            .code,
        "MCP_DESCRIPTOR_MISMATCH"
    );
    d.as_object_mut().unwrap().remove("contract");
    fs::write(&file, serde_json::to_vec(&d).unwrap()).unwrap();
    assert!(call_in(&f.directory, &f.session_id, "read", json!({})).is_ok());
}
#[test]
fn legacy_health_is_classified_without_post_and_session_mismatch_is_invalid() {
    for mismatch in [false, true] {
        let f = Fixture::new(1);
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let file = f.directory.join(format!("{}.json", f.session_id));
        let mut d: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
        d["endpoint"] = json!(format!("http://{address}"));
        d.as_object_mut().unwrap().remove("contract");
        fs::write(&file, serde_json::to_vec(&d).unwrap()).unwrap();
        let id = f.session_id.clone();
        let server = thread::spawn(move || {
            for _ in 0..2 {
                let (mut stream, _) = listener.accept().unwrap();
                let mut buf = [0; 2048];
                let count = stream.read(&mut buf).unwrap();
                assert!(buf[..count].starts_with(b"GET /health"));
                let body = if mismatch {
                    json!({"ok":true,"sessionId":"different","contract":{"bridgeProtocolGen":1}})
                } else {
                    json!({"ok":true,"sessionId":id})
                };
                reply(&mut stream, 200, body);
            }
        });
        assert_eq!(
            list_from(&f.directory).sessions[0].status,
            if mismatch { "invalid" } else { "legacy" }
        );
        assert_eq!(
            call_in(&f.directory, &f.session_id, "read", json!({}))
                .unwrap_err()
                .code,
            if mismatch {
                "MCP_SESSION_MISMATCH"
            } else {
                "MCP_CONTRACT_REQUIRED"
            }
        );
        server.join().unwrap();
    }
}
fn reply(stream: &mut TcpStream, status: u16, body: Value) {
    let body = serde_json::to_vec(&body).unwrap();
    write!(
        stream,
        "HTTP/1.1 {status} OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .unwrap();
    stream.write_all(&body).unwrap();
}
#[test]
fn preserves_post_preflight_compatibility_errors() {
    let f = Fixture::new(1);
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let file = f.directory.join(format!("{}.json", f.session_id));
    let mut d: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    d["endpoint"] = json!(format!("http://{address}"));
    fs::write(&file, serde_json::to_vec(&d).unwrap()).unwrap();
    let id = f.session_id.clone();
    let server = thread::spawn(move || {
        let (mut health, _) = listener.accept().unwrap();
        let mut buffer = [0; 4096];
        health.read(&mut buffer).unwrap();
        reply(
            &mut health,
            200,
            json!({"ok":true,"sessionId":id,"contract":{"bridgeProtocolGen":1}}),
        );
        let (mut post, _) = listener.accept().unwrap();
        post.read(&mut buffer).unwrap();
        reply(
            &mut post,
            409,
            json!({"ok":false,"error":{"code":"MCP_BRIDGE_GENERATION_MISMATCH","message":"Generation changed.","expectedContract":{"bridgeProtocolGen":2},"actualContract":{"bridgeProtocolGen":1}}}),
        );
    });
    let error = call_in(&f.directory, &f.session_id, "read", json!({})).unwrap_err();
    assert_eq!(error.code, "MCP_BRIDGE_GENERATION_MISMATCH");
    assert_eq!(error.expected_contract.unwrap().bridge_protocol_gen, 2);
    server.join().unwrap();
}
#[test]
fn bounded_response_without_waiting_for_disconnect() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let server = thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap();
        let mut buf = [0; 1024];
        s.read(&mut buf).unwrap();
        reply(&mut s, 200, json!({"ok":true}));
        thread::sleep(Duration::from_millis(350));
    });
    let start = Instant::now();
    request(address, "secret", None, Duration::from_millis(200)).unwrap();
    assert!(start.elapsed() < Duration::from_millis(250));
    server.join().unwrap();
    for response in [
        "HTTP/1.1 200 OK\r\nContent-Length: 999999999\r\n\r\n",
        "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n",
        "HTTP/1.1 200 OK\r\nContent-Length: 1\r\nContent-Length: 1\r\n\r\n{",
    ] {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = thread::spawn(move || {
            let (mut s, _) = listener.accept().unwrap();
            let mut b = [0; 1024];
            s.read(&mut b).unwrap();
            s.write_all(response.as_bytes()).unwrap();
        });
        assert_eq!(
            request(address, "secret", None, Duration::from_millis(500))
                .unwrap_err()
                .code,
            "INVALID_RESPONSE"
        );
        server.join().unwrap();
    }
}
#[test]
fn endpoint_token_and_full_session_id_validation_is_preserved() {
    assert!(parse_endpoint("http://127.0.0.1:45").is_some());
    for endpoint in [
        "https://127.0.0.1:45",
        "http://0.0.0.0:45",
        "http://localhost:45",
        "http://192.168.1.1:45",
    ] {
        assert!(parse_endpoint(endpoint).is_none());
    }
    assert!(valid_token(&"a".repeat(64)));
    assert!(!valid_token(&"z".repeat(64)));
    assert!(!valid_session_id("../secrets"));
    assert!(!valid_session_id(&"-".repeat(36)));
}
