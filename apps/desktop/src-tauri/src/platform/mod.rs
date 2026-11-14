#[cfg(target_os = "windows")]
#[path = "windows.rs"]
mod platform_impl;

#[cfg(not(target_os = "windows"))]
#[path = "linux.rs"]
mod platform_impl;

// Background computer-use bridge. Windows-only for now: the Linux actuator
// path already goes through the Hyprland/GNOME/KDE backend in Python.
#[cfg(target_os = "windows")]
pub mod cua;

#[cfg(target_os = "windows")]
#[path = "power_windows.rs"]
mod power_impl;

#[cfg(not(target_os = "windows"))]
#[path = "power_linux.rs"]
mod power_impl;

pub use platform_impl::{
    click_element_impl, click_screen_point_impl, configure_overlay_passthrough,
    get_cursor_position_impl, open_url_impl, register_exit_cursor_restorer,
    scroll_at_point_impl, set_system_cursor_visibility, set_window_capture_exclusion,
    start_global_click_listener, type_text_impl,
};
// execute_volume_* live in the per-OS power module (power.rs), not platform_impl.
pub use power_impl::*;



pub mod system_info;
pub use system_info::*;

pub mod fs_sync;
