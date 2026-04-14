// Raibis LifeOS — Tauri v2 shell
// Responsibilities:
//   1. Spawn the Go sidecar (lifeos binary) as a background process
//   2. Wait for the server to be ready before showing the main window
//   3. System tray icon with context menu (Phase 1)
//   4. Global shortcut ⌘⇧Space to toggle a floating HUD window (Phase 2)
//   5. Hide main window on close (keep server alive in tray)

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::time::Duration;
use std::thread;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers};
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

const SERVER_URL: &str = "http://localhost:3344";
const SERVER_ADDR: &str = "127.0.0.1:3344";
const HUD_LABEL: &str = "hud";
const MAIN_LABEL: &str = "main";

/// Build the tray context menu.
fn build_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let open = MenuItem::with_id(app, "open", "Open Raibis LifeOS", true, None::<&str>)?;
    let hud  = MenuItem::with_id(app, "hud",  "Quick HUD  (⌘⇧Space)", true,  None::<&str>)?;
    let sep  = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Raibis LifeOS",   true,  None::<&str>)?;
    Menu::with_items(app, &[&open, &hud, &sep, &quit])
}

/// Toggle the floating HUD window (Phase 2).
fn toggle_hud(app: &AppHandle) {
    match app.get_webview_window(HUD_LABEL) {
        Some(w) => {
            if w.is_visible().unwrap_or(false) {
                let _ = w.hide();
            } else {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.move_window(Position::Center);
            }
        }
        None => {
            match WebviewWindowBuilder::new(
                app,
                HUD_LABEL,
                WebviewUrl::External(SERVER_URL.parse().unwrap()),
            )
            .title("raibis — Quick")
            .inner_size(520.0, 720.0)
            .always_on_top(true)
            .decorations(false)
            .resizable(false)
            .skip_taskbar(true)
            .center()
            .build()
            {
                Ok(w) => { let _ = w.set_focus(); }
                Err(e) => eprintln!("[raibis] failed to open HUD window: {e}"),
            }
        }
    }
}

/// Focus (or un-hide) the main window.
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(MAIN_LABEL) {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Poll TCP until the Go server is accepting connections (max ~5 s).
fn wait_for_server() {
    for _ in 0..50 {
        if TcpStream::connect_timeout(
            &SERVER_ADDR.parse().unwrap(),
            Duration::from_millis(100),
        )
        .is_ok()
        {
            return;
        }
        thread::sleep(Duration::from_millis(100));
    }
    eprintln!("[raibis] server did not start within 5 s");
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // 1. Spawn Go sidecar ────────────────────────────────────────
            // The lifeos binary requires: lifeos server --port 3344
            let sidecar_cmd = app
                .shell()
                .sidecar("lifeos")
                .expect("[raibis] lifeos sidecar binary not found in bundle")
                .args(["server", "--port", "3344"]);

            let (mut rx, _child) = sidecar_cmd
                .spawn()
                .expect("[raibis] failed to spawn lifeos sidecar");

            // Drain sidecar stdout/stderr so the pipe never blocks
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let s = String::from_utf8_lossy(&line);
                            println!("[lifeos] {s}");
                        }
                        CommandEvent::Stderr(line) => {
                            let s = String::from_utf8_lossy(&line);
                            eprintln!("[lifeos] {s}");
                        }
                        _ => {}
                    }
                }
            });

            // 2. Wait for server then show main window ───────────────────
            let show_handle = handle.clone();
            tauri::async_runtime::spawn_blocking(move || {
                wait_for_server();
                if let Some(w) = show_handle.get_webview_window(MAIN_LABEL) {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            });

            // 3. System tray (Phase 1) ────────────────────────────────────
            let menu = build_tray_menu(app.handle())?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Raibis LifeOS")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event({
                    let h = handle.clone();
                    move |_tray_handle, event| match event.id().as_ref() {
                        "open" => show_main(&h),
                        "hud"  => toggle_hud(&h),
                        "quit" => h.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event({
                    let h = handle.clone();
                    move |_tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_main(&h);
                        }
                    }
                })
                .build(app)?;

            // 4. Global shortcut ⌘⇧Space → toggle HUD (Phase 2) ─────────
            let shortcut_handle = handle.clone();
            app.global_shortcut().on_shortcut(
                tauri_plugin_global_shortcut::Shortcut::new(
                    Some(Modifiers::SUPER | Modifiers::SHIFT),
                    Code::Space,
                ),
                move |_app, _shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    if event.state() == ShortcutState::Pressed {
                        toggle_hud(&shortcut_handle);
                    }
                },
            )?;

            Ok(())
        })
        // Hide main window on close instead of quitting
        .on_window_event(|window, event| {
            if window.label() == MAIN_LABEL {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Raibis LifeOS");
}
