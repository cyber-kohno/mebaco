use mebaco_mcp_protocol::ProductIdentity;
pub fn identity() -> ProductIdentity {
    serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/studio-mcp.json")))
        .expect("Build-validated product identity")
}
