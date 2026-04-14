// lib.rs — required by Tauri v2 for the mobile targets (no-op on desktop)
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Desktop entry is in main.rs; this stub satisfies the Tauri v2 build system
}
