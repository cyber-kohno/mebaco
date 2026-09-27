use anyhow::Result;
use rmcp::{transport::stdio, ServiceExt};
use tracing_subscriber::EnvFilter;

mod bridge;
mod resources;
mod server;

use server::MebacoMcpServer;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .init();

    tracing::info!("starting Mebaco MCP stdio server");
    let service = MebacoMcpServer::new().serve(stdio()).await?;
    service.waiting().await?;
    tracing::info!("Mebaco MCP stdio server stopped");
    Ok(())
}
