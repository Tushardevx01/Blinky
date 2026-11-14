use anyhow::Result;
use sutra_daemon::server::DaemonServer;
use std::path::PathBuf;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,sutra_daemon=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting sutra Daemon v{}", env!("CARGO_PKG_VERSION"));

    let socket_path = std::env::args()
        .nth(1)
        .map(PathBuf::from);

    let server = DaemonServer::new(socket_path).await?;
    server.run().await?;

    Ok(())
}
