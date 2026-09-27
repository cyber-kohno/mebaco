use crate::bridge::{
    call_development_session, list_development_sessions as discover_development_sessions,
};
use crate::resources;
use rmcp::{
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::{
        CallToolResult, ContentBlock, Implementation, ListResourcesResult, PaginatedRequestParams,
        ProtocolVersion, ReadResourceRequestParams, ReadResourceResponse, ReadResourceResult,
        ServerCapabilities, ServerConfig,
    },
    schemars,
    service::RequestContext,
    tool, tool_handler, tool_router, ErrorData as McpError, RoleServer, ServerHandler,
};
use serde::Serialize;

#[derive(Clone)]
pub struct MebacoMcpServer {
    #[allow(dead_code)]
    tool_router: ToolRouter<Self>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PingResult {
    application: &'static str,
    status: &'static str,
    studio_required: bool,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct ShowMessageRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The message to display in Mebaco Studio (1-2000 characters).")]
    message: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SessionRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SelectNodeRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The existing node ID to select in Studio.")]
    node_id: i64,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct AppContextRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The stable appId returned by get_project_overview.")]
    app_id: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct AppAnalysisContextRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The stable appId returned by get_project_overview.")]
    app_id: String,
    #[schemars(description = "Maximum semantic nodes to return, from 1 to 300. Defaults to 200.")]
    max_nodes: Option<u16>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct ComponentStructureRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(
        description = "The stable componentId returned by project overview or app context."
    )]
    component_id: String,
    #[schemars(description = "Maximum content-tree depth (default 3, maximum 8).")]
    max_depth: Option<u8>,
    #[schemars(description = "Maximum returned nodes (default 80, maximum 200).")]
    max_nodes: Option<u16>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct NodeDetailsRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The live tree node ID returned by a project read tool.")]
    node_id: u32,
    #[schemars(
        description = "Include allowlisted expression/source fields (maximum 8000 characters per field). Defaults to false."
    )]
    include_source: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct NodeReferencesRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The live tree node ID returned by a project read tool.")]
    node_id: u32,
    #[schemars(description = "Which graph direction to return. Defaults to both.")]
    direction: Option<String>,
    #[schemars(
        description = "Maximum relationships per direction, from 1 to 200. Defaults to 50."
    )]
    limit: Option<u16>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SetNodeDisabledRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The live tree node ID returned by a project read tool.")]
    node_id: u32,
    #[schemars(
        description = "The revision returned by the read snapshot used to plan this update."
    )]
    expected_revision: u64,
    #[schemars(description = "The disabled state to apply.")]
    disabled: bool,
    #[schemars(
        description = "Validate and describe the update without changing Studio. Defaults to false."
    )]
    dry_run: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct UpdateNodePropertyRequest {
    #[schemars(description = "The complete sessionId returned by list_development_sessions.")]
    session_id: String,
    #[schemars(description = "The live tree node ID returned by a project read tool.")]
    node_id: u32,
    #[schemars(description = "The revision returned by the read snapshot used to plan this update.")]
    expected_revision: u64,
    #[schemars(description = "One of comment, tagName, or source.")]
    property: String,
    #[schemars(description = "The string value to apply.")]
    value: String,
    #[schemars(description = "Validate without changing Studio. Defaults to false.")]
    dry_run: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct DeleteNodeRequest {
    session_id: String,
    node_id: u32,
    expected_revision: u64,
    dry_run: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct InsertNodeRequest {
    session_id: String,
    parent_node_id: u32,
    expected_revision: u64,
    kind: String,
    index: Option<u32>,
    tag_name: Option<String>,
    value: Option<String>,
    dry_run: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct MoveNodeRequest {
    session_id: String,
    node_id: u32,
    expected_revision: u64,
    direction: String,
    dry_run: Option<bool>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct UpdateNodeAttributeRequest { session_id: String, node_id: u32, expected_revision: u64, name: String, value: String, dry_run: Option<bool> }

impl PingResult {
    fn new() -> Self {
        Self {
            application: "Mebaco Studio",
            status: "ok",
            studio_required: false,
        }
    }

    fn to_json(&self) -> String {
        serde_json::to_string(self).expect("the static ping result must be serializable")
    }
}

#[tool_router]
impl MebacoMcpServer {
    pub fn new() -> Self {
        Self {
            tool_router: Self::tool_router(),
        }
    }

    #[tool(
        description = "Check whether the Mebaco MCP adapter is running. This tool does not require Mebaco Studio to be open."
    )]
    async fn ping(&self) -> Result<CallToolResult, McpError> {
        Ok(CallToolResult::success(vec![ContentBlock::text(
            PingResult::new().to_json(),
        )]))
    }

    #[tool(
        description = "List active Mebaco Studio development sessions. The result is refreshed on every call and excludes sessions that fail PID, endpoint, token, or health validation."
    )]
    async fn list_development_sessions(&self) -> Result<CallToolResult, McpError> {
        let sessions = discover_development_sessions();
        let json = serde_json::to_string(&sessions)
            .map_err(|error| McpError::internal_error(error.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Display a non-persistent message in a specific active Mebaco Studio session. Call list_development_sessions first and pass its complete sessionId."
    )]
    async fn show_message(
        &self,
        Parameters(request): Parameters<ShowMessageRequest>,
    ) -> Result<CallToolResult, McpError> {
        let message = request.message.trim();
        if message.is_empty() || message.chars().count() > 2000 {
            return Err(McpError::invalid_params(
                "message must contain between 1 and 2000 characters.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "showMessage",
            serde_json::json!({ "message": message }),
        ) {
            Ok(result) => Ok(CallToolResult::success(vec![ContentBlock::text(
                serde_json::to_string(&result)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read a summary of the current unsaved Mebaco Studio tree for a specific active session. Call list_development_sessions first and pass its complete sessionId."
    )]
    async fn get_project_summary(
        &self,
        Parameters(request): Parameters<SessionRequest>,
    ) -> Result<CallToolResult, McpError> {
        match call_development_session(
            &request.session_id,
            "getProjectSummary",
            serde_json::json!({}),
        ) {
            Ok(result) => Ok(CallToolResult::success(vec![ContentBlock::text(
                serde_json::to_string(&result)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read the current unsaved project overview, App entries, and globally declared Components for a specific live Studio session. Call list_development_sessions first and pass its complete sessionId. This is the starting point for project analysis."
    )]
    async fn get_project_overview(
        &self,
        Parameters(request): Parameters<SessionRequest>,
    ) -> Result<CallToolResult, McpError> {
        match call_development_session(
            &request.session_id,
            "getProjectOverview",
            serde_json::json!({}),
        ) {
            Ok(result) => Ok(CallToolResult::success(vec![ContentBlock::text(
                serde_json::to_string(&result)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read an App's Entry, resolved starting Component, initial prop bindings, and App-owned components. Obtain appId from get_project_overview. Formula sources are reported by type and are not evaluated."
    )]
    async fn get_app_context(
        &self,
        Parameters(request): Parameters<AppContextRequest>,
    ) -> Result<CallToolResult, McpError> {
        if request.app_id.trim().is_empty() {
            return Err(McpError::invalid_params(
                "appId must be a non-empty string.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "getAppContext",
            serde_json::json!({ "appId": request.app_id }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read an analysis-oriented snapshot for one App in a single call: Entry component, state and declarations, semantic View/Retention nodes, source-bearing fields, and supported dependency edges. Use this before drilling into individual nodes."
    )]
    async fn get_app_analysis_context(
        &self,
        Parameters(request): Parameters<AppAnalysisContextRequest>,
    ) -> Result<CallToolResult, McpError> {
        if request.app_id.trim().is_empty() {
            return Err(McpError::invalid_params(
                "appId must be a non-empty string.",
                None,
            ));
        }
        if request
            .max_nodes
            .is_some_and(|value| value == 0 || value > 300)
        {
            return Err(McpError::invalid_params(
                "maxNodes must be from 1 to 300.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "getAppAnalysisContext",
            serde_json::json!({ "appId": request.app_id, "maxNodes": request.max_nodes.unwrap_or(200) }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read a Component's props, slots, Retention declarations, and renderable Elements tree while preserving each nested content host's optional Retention/Elements split. Obtain componentId from get_project_overview or get_app_context. Output is bounded; inspect omitted branches in separate calls later."
    )]
    async fn get_component_structure(
        &self,
        Parameters(request): Parameters<ComponentStructureRequest>,
    ) -> Result<CallToolResult, McpError> {
        if request.component_id.trim().is_empty() {
            return Err(McpError::invalid_params(
                "componentId must be a non-empty string.",
                None,
            ));
        }
        if request
            .max_depth
            .is_some_and(|value| value == 0 || value > 8)
            || request
                .max_nodes
                .is_some_and(|value| value == 0 || value > 200)
        {
            return Err(McpError::invalid_params(
                "maxDepth must be 1-8 and maxNodes must be 1-200.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "getComponentStructure",
            serde_json::json!({
                "componentId": request.component_id,
                "maxDepth": request.max_depth,
                "maxNodes": request.max_nodes,
            }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read safe allowlisted details and immediate children of a live tree node. Source and expression fields are omitted unless includeSource is true. Obtain nodeId from another read tool."
    )]
    async fn get_node_details(
        &self,
        Parameters(request): Parameters<NodeDetailsRequest>,
    ) -> Result<CallToolResult, McpError> {
        match call_development_session(
            &request.session_id,
            "getNodeDetails",
            serde_json::json!({ "nodeId": request.node_id, "includeSource": request.include_source.unwrap_or(false) }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Read incoming references and outgoing dependencies reported by Mebaco's ReferenceGraph for a live tree node. This covers supported semantic/structural relationships, not every textual mention."
    )]
    async fn get_node_references(
        &self,
        Parameters(request): Parameters<NodeReferencesRequest>,
    ) -> Result<CallToolResult, McpError> {
        let direction = request.direction.as_deref().unwrap_or("both");
        if !["incoming", "outgoing", "both"].contains(&direction) {
            return Err(McpError::invalid_params(
                "direction must be incoming, outgoing, or both.",
                None,
            ));
        }
        if request.limit.is_some_and(|limit| limit == 0 || limit > 200) {
            return Err(McpError::invalid_params(
                "limit must be from 1 to 200.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "getNodeReferences",
            serde_json::json!({ "nodeId": request.node_id, "direction": direction, "limit": request.limit.unwrap_or(50) }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(
        description = "Set the saved disabled state of one live tree node. Pass expectedRevision from a current read result to prevent stale writes. With dryRun=true, validate without changing Studio. The node kind must support Disable."
    )]
    async fn set_node_disabled(
        &self,
        Parameters(request): Parameters<SetNodeDisabledRequest>,
    ) -> Result<CallToolResult, McpError> {
        match call_development_session(
            &request.session_id,
            "setNodeDisabled",
            serde_json::json!({
                "nodeId": request.node_id,
                "expectedRevision": request.expected_revision,
                "disabled": request.disabled,
                "dryRun": request.dry_run.unwrap_or(false),
            }),
        ) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(
                        serde_json::to_string(error)
                            .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                    )]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(
                    serde_json::to_string(&result)
                        .map_err(|error| McpError::internal_error(error.to_string(), None))?,
                )]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }

    #[tool(description = "Update a limited allowlisted property on one live tree node. Pass expectedRevision from a current read result; use dryRun to validate without changing Studio.")]
    async fn update_node_property(
        &self,
        Parameters(request): Parameters<UpdateNodePropertyRequest>,
    ) -> Result<CallToolResult, McpError> {
        if !["comment", "tagName", "source"].contains(&request.property.as_str()) || request.value.len() > 8000 {
            return Err(McpError::invalid_params("property must be comment, tagName, or source and value must be at most 8000 characters.", None));
        }
        match call_development_session(&request.session_id, "updateNodeProperty", serde_json::json!({
            "nodeId": request.node_id,
            "expectedRevision": request.expected_revision,
            "property": request.property,
            "value": request.value,
            "dryRun": request.dry_run.unwrap_or(false),
        })) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(error).map_err(|error| McpError::internal_error(error.to_string(), None))?)]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(serde_json::to_string(&result).map_err(|error| McpError::internal_error(error.to_string(), None))?)]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(&error).map_err(|error| McpError::internal_error(error.to_string(), None))?)])),
        }
    }

    #[tool(description = "Delete one non-root leaf node from the live Studio tree. Pass expectedRevision and use dryRun to validate without changing Studio.")]
    async fn delete_node(&self, Parameters(request): Parameters<DeleteNodeRequest>) -> Result<CallToolResult, McpError> {
        match call_development_session(&request.session_id, "deleteNode", serde_json::json!({
            "nodeId": request.node_id,
            "expectedRevision": request.expected_revision,
            "dryRun": request.dry_run.unwrap_or(false),
        })) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(error).map_err(|error| McpError::internal_error(error.to_string(), None))?)]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(serde_json::to_string(&result).map_err(|error| McpError::internal_error(error.to_string(), None))?)]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(&error).map_err(|error| McpError::internal_error(error.to_string(), None))?)])),
        }
    }

    #[tool(description = "Insert a tag or text node under a live Studio node. Pass expectedRevision and use dryRun to validate without changing Studio.")]
    async fn insert_node(&self, Parameters(request): Parameters<InsertNodeRequest>) -> Result<CallToolResult, McpError> {
        if !["tag", "text"].contains(&request.kind.as_str()) || request.value.as_deref().unwrap_or("").len() > 8000 {
            return Err(McpError::invalid_params("kind must be tag or text and value must be at most 8000 characters.", None));
        }
        match call_development_session(&request.session_id, "insertNode", serde_json::json!({
            "parentNodeId": request.parent_node_id,
            "expectedRevision": request.expected_revision,
            "kind": request.kind,
            "index": request.index,
            "tagName": request.tag_name,
            "value": request.value,
            "dryRun": request.dry_run.unwrap_or(false),
        })) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(error).map_err(|error| McpError::internal_error(error.to_string(), None))?)]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(serde_json::to_string(&result).map_err(|error| McpError::internal_error(error.to_string(), None))?)]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(&error).map_err(|error| McpError::internal_error(error.to_string(), None))?)])),
        }
    }

    #[tool(description = "Move one live Studio node up or down within its current reorder group. Pass expectedRevision and use dryRun to validate without changing Studio.")]
    async fn move_node(&self, Parameters(request): Parameters<MoveNodeRequest>) -> Result<CallToolResult, McpError> {
        if !["up", "down"].contains(&request.direction.as_str()) {
            return Err(McpError::invalid_params("direction must be up or down.", None));
        }
        match call_development_session(&request.session_id, "moveNode", serde_json::json!({
            "nodeId": request.node_id,
            "expectedRevision": request.expected_revision,
            "direction": request.direction,
            "dryRun": request.dry_run.unwrap_or(false),
        })) {
            Ok(result) => {
                if let Some(error) = result.get("error") {
                    return Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(error).map_err(|error| McpError::internal_error(error.to_string(), None))?)]));
                }
                Ok(CallToolResult::success(vec![ContentBlock::text(serde_json::to_string(&result).map_err(|error| McpError::internal_error(error.to_string(), None))?)]))
            }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(&error).map_err(|error| McpError::internal_error(error.to_string(), None))?)])),
        }
    }

    #[tool(description = "Add or update one literal HTML attribute on a live Tag node. Pass expectedRevision and use dryRun to validate without changing Studio.")]
    async fn update_node_attribute(&self, Parameters(request): Parameters<UpdateNodeAttributeRequest>) -> Result<CallToolResult, McpError> {
        if request.name.trim().is_empty() || request.value.len() > 8000 { return Err(McpError::invalid_params("name must be non-empty and value must be at most 8000 characters.", None)); }
        match call_development_session(&request.session_id, "updateNodeAttribute", serde_json::json!({"nodeId":request.node_id,"expectedRevision":request.expected_revision,"name":request.name,"value":request.value,"dryRun":request.dry_run.unwrap_or(false)})) {
            Ok(result) => { if let Some(error)=result.get("error") { return Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(error).map_err(|e| McpError::internal_error(e.to_string(),None))?)])); } Ok(CallToolResult::success(vec![ContentBlock::text(serde_json::to_string(&result).map_err(|e| McpError::internal_error(e.to_string(),None))?)])) }
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(serde_json::to_string(&error).map_err(|e| McpError::internal_error(e.to_string(),None))?)])),
        }
    }

    #[tool(
        description = "Select an existing node in the live Mebaco Studio tree without changing project content. Call get_project_summary first to obtain a node ID."
    )]
    async fn select_node(
        &self,
        Parameters(request): Parameters<SelectNodeRequest>,
    ) -> Result<CallToolResult, McpError> {
        if request.node_id < 0 || request.node_id > i32::MAX as i64 {
            return Err(McpError::invalid_params(
                "nodeId must be a non-negative 32-bit integer.",
                None,
            ));
        }
        match call_development_session(
            &request.session_id,
            "selectNode",
            serde_json::json!({ "nodeId": request.node_id }),
        ) {
            Ok(result) => Ok(CallToolResult::success(vec![ContentBlock::text(
                serde_json::to_string(&result)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
            Err(error) => Ok(CallToolResult::error(vec![ContentBlock::text(
                serde_json::to_string(&error)
                    .map_err(|error| McpError::internal_error(error.to_string(), None))?,
            )])),
        }
    }
}

#[tool_handler]
impl ServerHandler for MebacoMcpServer {
    async fn list_resources(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListResourcesResult, McpError> {
        Ok(ListResourcesResult::with_all_items(resources::list()))
    }

    async fn read_resource(
        &self,
        request: ReadResourceRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<ReadResourceResponse, McpError> {
        let content = resources::read(&request.uri).ok_or_else(|| {
            McpError::resource_not_found(format!("Unknown Mebaco resource: {}", request.uri), None)
        })?;
        Ok(ReadResourceResponse::Complete(ReadResourceResult::new(
            vec![content],
        )))
    }

    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .build(),
        )
            .with_server_info(
                Implementation::new(env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"))
                    .with_title("Mebaco MCP"),
            )
            .with_protocol_version(ProtocolVersion::V_2024_11_05)
            .with_instructions(
                "Mebaco development tools. Read mebaco://model/core first, then consult the component/Retention and style resources as needed. ping and fixed model resources do not require Studio. Project tools use the current unsaved state of the specified live Studio session. Discover sessions before calling session tools. Before an update, read the current revision and pass it as expectedRevision; use dryRun when available."
                    .to_string(),
            )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_result_is_stable_json() {
        assert_eq!(
            PingResult::new().to_json(),
            r#"{"application":"Mebaco Studio","status":"ok","studioRequired":false}"#,
        );
    }

    #[test]
    fn tool_router_exposes_ping() {
        let router = MebacoMcpServer::tool_router();
        assert!(router.has_route("ping"));
        assert!(router.has_route("list_development_sessions"));
        assert!(router.has_route("show_message"));
        assert!(router.has_route("get_project_summary"));
        assert!(router.has_route("get_project_overview"));
        assert!(router.has_route("get_app_context"));
        assert!(router.has_route("get_app_analysis_context"));
        assert!(router.has_route("get_component_structure"));
        assert!(router.has_route("get_node_details"));
        assert!(router.has_route("get_node_references"));
        assert!(router.has_route("set_node_disabled"));
        assert!(router.has_route("select_node"));
        assert_eq!(router.list_all().len(), 12);
    }

    #[test]
    fn server_advertises_tools_and_fixed_resources() {
        let info = MebacoMcpServer::new().get_info();
        assert!(info.capabilities.tools.is_some());
        assert!(info.capabilities.resources.is_some());
        assert_eq!(resources::list().len(), 3);
        assert!(resources::read(resources::CORE_URI).is_some());
        assert!(resources::read(resources::COMPONENTS_URI).is_some());
        assert!(resources::read(resources::STYLES_URI).is_some());
    }
}
