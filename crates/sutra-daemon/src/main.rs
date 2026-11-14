#[cfg(target_os = "linux")]
use anyhow::Result;
#[cfg(target_os = "linux")]
use sutra_daemon::server::DaemonServer;
#[cfg(target_os = "linux")]
use std::path::PathBuf;
#[cfg(target_os = "linux")]
use tracing::info;
#[cfg(target_os = "linux")]
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[cfg(target_os = "linux")]
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

#[cfg(not(target_os = "linux"))]
fn main() {
    println!("sutra-daemon is currently supported on Linux (Wayland / X11).");
}
