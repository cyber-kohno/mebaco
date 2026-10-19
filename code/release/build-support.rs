use mebaco_mcp_protocol::ProductIdentity;
use std::{env, fs, path::Path};

pub fn generation_constant(source: &str, name: &str) -> Result<u32, String> {
    let mut values = Vec::new();
    for line in source.lines() {
        let Some((left, right)) = line.trim().split_once('=') else {
            continue;
        };
        if left.split_whitespace().collect::<Vec<_>>() == ["export", "const", name] {
            let value: u32 = serde_json::from_str(right.trim().trim_end_matches(';'))
                .map_err(|_| format!("{name} must remain a literal u32 in version.ts"))?;
            values.push(value);
        }
    }
    if values.len() != 1 {
        return Err(format!("Expected exactly one {name}"));
    }
    Ok(values[0])
}

pub fn load_identity(root: &Path) -> Result<ProductIdentity, String> {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Release {
        format_version: u32,
        release_version: String,
        bridge_protocol_gen: u32,
    }
    let release: Release = serde_json::from_slice(
        &fs::read(root.join("release/studio-mcp.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    if release.format_version != 1 {
        return Err("Unknown release metadata format".into());
    }
    let source = fs::read_to_string(root.join("apps/studio/src/system/version.ts"))
        .map_err(|e| e.to_string())?;
    let identity = ProductIdentity {
        release_version: release.release_version,
        bridge_protocol_gen: release.bridge_protocol_gen,
        api_gen: generation_constant(&source, "API_GEN")?,
        schema_gen: generation_constant(&source, "SCHEMA_GEN")?,
    };
    identity.validate().map_err(|e| e.to_string())?;
    Ok(identity)
}

pub fn verify_frontend(expected: &ProductIdentity, bytes: &[u8]) -> Result<(), String> {
    let actual: ProductIdentity = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    if &actual != expected {
        return Err("Stale Frontend identity. Rebuild Studio Frontend first.".into());
    }
    Ok(())
}

#[cfg_attr(test, allow(dead_code))]
pub fn configure(root: &Path, studio: bool) {
    for input in [
        "release/studio-mcp.json",
        "release/build-support.rs",
        "apps/studio/src/system/version.ts",
    ] {
        println!("cargo:rerun-if-changed={}", root.join(input).display());
    }
    println!("cargo:rerun-if-changed=Cargo.toml");
    let identity = load_identity(root).expect("Invalid Studio/MCP release metadata");
    assert_eq!(
        identity.release_version,
        env::var("CARGO_PKG_VERSION").unwrap(),
        "Cargo version differs from studio-mcp.json"
    );
    if studio {
        for (input, pointers) in [
            ("apps/studio/package.json", vec!["/version"]),
            (
                "apps/studio/package-lock.json",
                vec!["/version", "/packages//version"],
            ),
            ("package-lock.json", vec!["/packages/apps~1studio/version"]),
            ("apps/studio/src-tauri/tauri.conf.json", vec!["/version"]),
        ] {
            let path = root.join(input);
            println!("cargo:rerun-if-changed={}", path.display());
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
            for pointer in pointers {
                assert_eq!(
                    value.pointer(pointer).and_then(|v| v.as_str()),
                    Some(identity.release_version.as_str()),
                    "{input} version differs from studio-mcp.json"
                );
            }
        }
        let frontend = root.join("apps/studio/dist/product-identity.json");
        println!("cargo:rerun-if-changed={}", frontend.display());
        if env::var("PROFILE").as_deref() == Ok("release") {
            verify_frontend(
                &identity,
                &fs::read(frontend).expect("Build Studio Frontend first"),
            )
            .unwrap();
        }
    }
    fs::write(
        Path::new(&env::var_os("OUT_DIR").unwrap()).join("studio-mcp.json"),
        serde_json::to_vec(&identity).unwrap(),
    )
    .unwrap();
}
