//! Test-only host: actual Studio HTTP gate, in-memory WebView response sink.
mod bridge {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../studio/src-tauri/src/mcp/bridge_types.rs"
    ));
}
mod diagnostics {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../studio/src-tauri/src/mcp/diagnostics.rs"
    ));
}
mod server {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../studio/src-tauri/src/mcp/server.rs"
    ));
}
use mebaco_mcp_protocol::{ProductIdentity, SessionDescriptor};
use serde_json::json;
use std::{
    fs,
    io::{self, Read, Write},
    net::TcpListener,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};
fn main() {
    let args: Vec<_> = std::env::args().skip(1).collect();
    assert_eq!(
        args.len(),
        2,
        "fixture requires a sessions directory and generation"
    );
    let directory = std::path::PathBuf::from(&args[0]);
    fs::create_dir_all(&directory).unwrap();
    let generation = args[1].parse().unwrap();
    let identity = ProductIdentity {
        release_version: "9.9.9".into(),
        bridge_protocol_gen: generation,
        api_gen: 9,
        schema_gen: 9,
    };
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let session_id = uuid::Uuid::new_v4().to_string();
    let token = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let descriptor = SessionDescriptor {
        session_id: session_id.clone(),
        pid: std::process::id(),
        endpoint: format!("http://{}", listener.local_addr().unwrap()),
        token: token.clone(),
        project_display_name: "isolated-fixture.mbc".into(),
        dirty: true,
        created_at_epoch_ms: 1,
        contract: Some(json!(identity.bridge_contract())),
        identity: Some(json!(identity.clone())),
    };
    let file = directory.join(format!("{session_id}.json"));
    fs::write(&file, serde_json::to_vec(&descriptor).unwrap()).unwrap();
    let stop = Arc::new(AtomicBool::new(false));
    let signal = stop.clone();
    std::thread::spawn(move || {
        let mut byte = [0];
        let _ = io::stdin().read(&mut byte);
        signal.store(true, Ordering::Relaxed);
    });
    let pending: Arc<bridge::PendingResponses> = Arc::new(Mutex::new(Default::default()));
    let response_sink = pending.clone();
    let diagnostics = Arc::new(Mutex::new(diagnostics::Diagnostics::default()));
    diagnostics.lock().unwrap().reset(Some(session_id.clone()));
    println!(
        "{}",
        json!({"sessionId":session_id,"pid":std::process::id()})
    );
    io::stdout().flush().unwrap();
    server::run(
        listener,
        move |request| {
            response_sink
                .lock()
                .unwrap()
                .remove(&request.id)
                .unwrap()
                .send(bridge::McpBridgeResponse {
                    id: request.id.clone(),
                    result: Some(json!({"fixture":true,"method":request.method,"revision":0})),
                    error: None,
                })
                .unwrap();
            Ok(())
        },
        identity.clone(),
        diagnostics.clone(),
        session_id,
        token,
        pending,
        stop,
    );
    fs::remove_file(file).unwrap();
    println!(
        "{}",
        serde_json::to_string(&diagnostics.lock().unwrap().snapshot(identity)).unwrap()
    );
}
