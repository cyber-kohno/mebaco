use anyhow::Result;
use rmcp::{transport::stdio, ServiceExt};
use tracing_subscriber::EnvFilter;

mod bridge;
mod product_info;
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

    let args: Vec<_> = std::env::args().skip(1).collect();
    if !args.is_empty() {
        match args.as_slice() {
            [flag] if flag == "--version" || flag == "-V" => println!(
                "Mebaco MCP {} (bridge generation {})",
                product_info::identity().release_version,
                product_info::identity().bridge_protocol_gen
            ),
            [flag] if flag == "--version-json" => {
                println!("{}", serde_json::to_string(&product_info::identity())?)
            }
            _ => anyhow::bail!("Use --version, --version-json, or no arguments for stdio mode."),
        }
        return Ok(());
    }
    tracing::info!("starting Mebaco MCP stdio server");
    let service = MebacoMcpServer::new().serve(stdio()).await?;
    service.waiting().await?;
    tracing::info!("Mebaco MCP stdio server stopped");
    Ok(())
}
