use anyhow::Result;
use sutra_agent::agent::AgentLoop;
use sutra_agent::providers::create_provider_from_env;
use sutra_agent::tools::ToolRegistry;
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,sutra_agent=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("sutra Autonomous AI Agent Engine v{}", env!("CARGO_PKG_VERSION"));

    let goal = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "Find the current price of BTC and tell me a summary of Rust language on Wikipedia".to_string());

    let provider = create_provider_from_env()?;
    let tools = Arc::new(ToolRegistry::new());
    let agent = AgentLoop::new(provider, tools);

    let res = agent.run(&goal, 150).await?;
    println!("\n=== AGENT RESULT ===");
    println!("Success: {}", res.success);
    println!("Elapsed: {:.2}ms", res.elapsed_ms);
    println!("Steps Taken: {}", res.steps.len());
    println!("Final Answer:\n{}", res.answer.unwrap_or_else(|| "No final answer".to_string()));

    Ok(())
}
