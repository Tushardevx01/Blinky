struct CursorGuard;

impl Drop for CursorGuard {
    fn drop(&mut self) {
        #[cfg(target_os = "windows")]
        unsafe {
            use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_SETCURSORS};
            SystemParametersInfoW(SPI_SETCURSORS, 0, std::ptr::null_mut(), 0);
        }
    }
}

fn main() {
    let _guard = CursorGuard;

    #[cfg(not(target_os = "windows"))]
    {
        if std::env::var("GDK_BACKEND").is_err() {
            let has_display = std::env::var("DISPLAY").map(|d| !d.trim().is_empty()).unwrap_or(false);
            let has_wayland = std::env::var("WAYLAND_DISPLAY").map(|w| !w.trim().is_empty()).unwrap_or(false);
            if has_display && !has_wayland {
                std::env::set_var("GDK_BACKEND", "x11,wayland");
            } else {
                std::env::set_var("GDK_BACKEND", "wayland,x11");
            }
        }
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    sutra_lib::run()
}

