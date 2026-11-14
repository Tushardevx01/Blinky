fn main() {
    println!("cargo:rerun-if-env-changed=SUTRA_TRANSPORT_MODE");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    let mode = std::env::var("SUTRA_TRANSPORT_MODE").unwrap_or_else(|_| "development".to_string());
    assert!(
        matches!(
            mode.trim().to_ascii_lowercase().as_str(),
            "" | "dev" | "development" | "release"
        ),
        "Unsupported SUTRA_TRANSPORT_MODE: {mode}. Use development or release."
    );
    println!("cargo:rustc-env=SUTRA_TRANSPORT_MODE={mode}");
    tauri_build::build()
}
