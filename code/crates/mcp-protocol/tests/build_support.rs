#[path = "../../../release/build-support.rs"]
mod support;
#[test]
fn build_metadata_and_frontend_match() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let identity = support::load_identity(&root).unwrap();
    support::verify_frontend(&identity, &serde_json::to_vec(&identity).unwrap()).unwrap();
    let mut changed = identity.clone();
    changed.bridge_protocol_gen += 1;
    assert!(support::verify_frontend(&identity, &serde_json::to_vec(&changed).unwrap()).is_err());
    assert!(support::verify_frontend(&identity, b"{}").is_err());
}
#[test]
fn reject_expressions_and_duplicate_constants() {
    assert!(support::generation_constant("export const API_GEN = 1 + 1", "API_GEN").is_err());
    assert!(support::generation_constant(
        "export const API_GEN = 1\nexport const API_GEN = 2",
        "API_GEN"
    )
    .is_err());
    assert!(support::generation_constant("export const API_GEN = 4294967296", "API_GEN").is_err());
}
