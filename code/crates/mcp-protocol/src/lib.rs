//! Pure Studio/MCP wire contract. No host state, I/O or current generation constant.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProductIdentity {
    pub release_version: String,
    pub bridge_protocol_gen: u32,
    pub api_gen: u32,
    pub schema_gen: u32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BridgeContract {
    pub bridge_protocol_gen: u32,
}

/// Internal credential-bearing discovery file. Never serialize to public results.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDescriptor {
    pub session_id: String,
    pub pid: u32,
    pub endpoint: String,
    pub token: String,
    pub project_display_name: String,
    pub dirty: bool,
    pub created_at_epoch_ms: u128,
    #[serde(default)]
    pub contract: Option<Value>,
    #[serde(default)]
    pub identity: Option<Value>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub ok: bool,
    pub session_id: String,
    #[serde(default)]
    pub contract: Option<Value>,
    #[serde(default)]
    pub identity: Option<Value>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRequest {
    pub method: String,
    #[serde(default)]
    pub params: Value,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub contract: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_contract: Option<BridgeContract>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_contract: Option<BridgeContract>,
}

impl BridgeError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            expected_revision: None,
            actual_revision: None,
            expected_contract: None,
            actual_contract: None,
        }
    }
}
impl std::fmt::Display for BridgeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}
impl std::error::Error for BridgeError {}

impl ProductIdentity {
    pub fn bridge_contract(&self) -> BridgeContract {
        BridgeContract {
            bridge_protocol_gen: self.bridge_protocol_gen,
        }
    }
    pub fn validate(&self) -> Result<(), BridgeError> {
        let parts: Vec<_> = self.release_version.split('.').collect();
        if parts.len() != 3
            || !parts.iter().all(|s| {
                !s.is_empty()
                    && (*s == "0" || !s.starts_with('0'))
                    && s.bytes().all(|c| c.is_ascii_digit())
                    && s.parse::<u32>().is_ok()
            })
        {
            return Err(BridgeError::new(
                "MCP_IDENTITY_INVALID",
                "Invalid release version.",
            ));
        }
        self.bridge_contract().validate()
    }
}
impl BridgeContract {
    pub fn validate(&self) -> Result<(), BridgeError> {
        if self.bridge_protocol_gen == 0 {
            return Err(BridgeError::new(
                "MCP_BRIDGE_GENERATION_INVALID",
                "MCP bridge generation must be a positive integer.",
            ));
        }
        Ok(())
    }
}

pub fn decode_contract(value: Option<&Value>) -> Result<BridgeContract, BridgeError> {
    let value = value.filter(|v| !v.is_null()).ok_or_else(|| BridgeError::new(
        "MCP_CONTRACT_REQUIRED", "Studio/MCP generation information is required. Update the legacy application and restart it."))?;
    let contract: BridgeContract = serde_json::from_value(value.clone()).map_err(|_| {
        BridgeError::new(
            "MCP_CONTRACT_INVALID",
            "Invalid Studio/MCP generation information.",
        )
    })?;
    contract.validate()?;
    Ok(contract)
}

/// Product/API/Schema identity is deliberately not an input to this decision.
pub fn check_compatibility(
    expected: &BridgeContract,
    actual: &BridgeContract,
) -> Result<(), BridgeError> {
    expected.validate()?;
    actual.validate()?;
    if expected != actual {
        let mut error = BridgeError::new("MCP_BRIDGE_GENERATION_MISMATCH",
            "Studio and MCP require the same MCP bridge generation. Update the applications to matching generations and restart Studio and the AI client's MCP process.");
        error.expected_contract = Some(expected.clone());
        error.actual_contract = Some(actual.clone());
        return Err(error);
    }
    Ok(())
}

pub fn require_contract(
    expected: &BridgeContract,
    value: Option<&Value>,
) -> Result<BridgeContract, BridgeError> {
    let result = decode_contract(value).and_then(|actual| {
        check_compatibility(expected, &actual)?;
        Ok(actual)
    });
    result.map_err(|mut e| {
        e.expected_contract = Some(expected.clone());
        e
    })
}

/// Ignore diagnostic extensions and invalid/missing diagnostics without gating connectivity.
pub fn diagnostic_identity(value: Option<&Value>) -> Option<ProductIdentity> {
    let v = value?;
    let identity: ProductIdentity = serde_json::from_value(json!({
        "releaseVersion": v.get("releaseVersion")?, "bridgeProtocolGen": v.get("bridgeProtocolGen")?,
        "apiGen": v.get("apiGen")?, "schemaGen": v.get("schemaGen")?
    })).ok()?;
    identity.validate().ok()?;
    Some(identity)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_generation_only() {
        let a = ProductIdentity {
            release_version: "0.1.1".into(),
            bridge_protocol_gen: 1,
            api_gen: 1,
            schema_gen: 1,
        };
        let b = ProductIdentity {
            release_version: "9.9.9".into(),
            api_gen: 9,
            schema_gen: 9,
            ..a.clone()
        };
        assert!(check_compatibility(&a.bridge_contract(), &b.bridge_contract()).is_ok());
        for (a, b) in [(1, 2), (2, 1)] {
            assert_eq!(
                check_compatibility(
                    &BridgeContract {
                        bridge_protocol_gen: a
                    },
                    &BridgeContract {
                        bridge_protocol_gen: b
                    }
                )
                .unwrap_err()
                .code,
                "MCP_BRIDGE_GENERATION_MISMATCH"
            );
        }
    }
    #[test]
    fn rejects_unknown_without_reflecting_input() {
        for v in [
            json!(null),
            json!({}),
            json!({"bridgeProtocolGen":0}),
            json!({"bridgeProtocolGen":"secret"}),
            json!({"bridgeProtocolGen":-1}),
            json!({"bridgeProtocolGen":1.5}),
            json!({"bridgeProtocolGen":4294967296u64}),
            json!({"bridgeProtocolGen":1,"other":true}),
        ] {
            let error = require_contract(
                &BridgeContract {
                    bridge_protocol_gen: 1,
                },
                Some(&v),
            )
            .unwrap_err();
            assert!(!serde_json::to_string(&error).unwrap().contains("secret"));
            assert!(error.expected_contract.is_some());
        }
        assert_eq!(
            decode_contract(None).unwrap_err().code,
            "MCP_CONTRACT_REQUIRED"
        );
    }
    #[test]
    fn diagnostics_are_optional_and_extensible() {
        assert!(diagnostic_identity(None).is_none());
        assert!(diagnostic_identity(Some(&json!({"releaseVersion":"0.1.1","bridgeProtocolGen":1,"apiGen":1,"schemaGen":1,"extra":true}))).is_some());
    }
}
