use mebaco_mcp_protocol::{BridgeError, ProductIdentity};
use serde::Serialize;
use std::{
    collections::VecDeque,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rejection {
    code: String,
    studio_gen: u32,
    peer_gen: Option<u32>,
    count: u64,
    last_at_epoch_ms: u128,
}
#[derive(Default)]
pub struct Diagnostics {
    pub session_id: Option<String>,
    accepted: u64,
    rejected: u64,
    history: VecDeque<Rejection>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    session_id: Option<String>,
    identity: ProductIdentity,
    accepted: u64,
    rejected: u64,
    history: Vec<Rejection>,
}
impl Diagnostics {
    pub fn reset(&mut self, session_id: Option<String>) {
        *self = Self {
            session_id,
            ..Self::default()
        };
    }
    pub fn accept(&mut self) {
        self.accepted = self.accepted.saturating_add(1);
    }
    pub fn reject(&mut self, error: &BridgeError, studio_gen: u32) {
        self.rejected = self.rejected.saturating_add(1);
        let peer_gen = error
            .actual_contract
            .as_ref()
            .map(|c| c.bridge_protocol_gen);
        let previous = self
            .history
            .iter()
            .position(|r| {
                r.code == error.code && r.studio_gen == studio_gen && r.peer_gen == peer_gen
            })
            .and_then(|i| self.history.remove(i));
        self.history.push_front(Rejection {
            code: error.code.clone(),
            studio_gen,
            peer_gen,
            count: previous.map_or(1, |r| r.count.saturating_add(1)),
            last_at_epoch_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
        });
        self.history.truncate(8);
    }
    pub fn snapshot(&self, identity: ProductIdentity) -> Snapshot {
        Snapshot {
            session_id: self.session_id.clone(),
            identity,
            accepted: self.accepted,
            rejected: self.rejected,
            history: self.history.iter().cloned().collect(),
        }
    }
}
pub type SharedDiagnostics = Mutex<Diagnostics>;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounded_grouped_and_reset_without_raw_data() {
        let identity = ProductIdentity {
            release_version: "0.1.1".into(),
            bridge_protocol_gen: 1,
            api_gen: 1,
            schema_gen: 1,
        };
        let mut d = Diagnostics::default();
        d.reset(Some("session".into()));
        let mut error = BridgeError::new("MCP_CONTRACT_REQUIRED", "secret-source-token");
        d.reject(&error, 1);
        d.reject(&error, 1);
        assert_eq!(d.history[0].count, 2);
        for generation in 2..15 {
            error.actual_contract = Some(mebaco_mcp_protocol::BridgeContract {
                bridge_protocol_gen: generation,
            });
            d.reject(&error, 1);
        }
        assert_eq!(d.history.len(), 8);
        assert!(!serde_json::to_string(&d.snapshot(identity.clone()))
            .unwrap()
            .contains("secret"));
        d.reset(None);
        assert_eq!(d.snapshot(identity).rejected, 0);
    }
}
