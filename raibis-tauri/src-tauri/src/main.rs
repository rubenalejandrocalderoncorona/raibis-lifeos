// Raibis LifeOS — Tauri v2 shell
// Responsibilities:
//   1. Spawn the Go sidecar (lifeos binary) as a background process
//   2. Wait for the server to be ready before showing the main window
//   3. System tray icon whose dropdown shows today's tasks/projects,
//      refreshed periodically in the background (Phase 1)
//   4. Global shortcut ⌘⇧Space to toggle a floating HUD window (Phase 2)
//   5. Hide main window on close (keep server alive in tray)

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::time::Duration;
use std::thread;

use serde::Deserialize;
use tauri::{
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers};
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

const SERVER_URL: &str = "http://localhost:3344";
const SERVER_ADDR: &str = "127.0.0.1:3344";
const HUD_LABEL: &str = "hud";
const MAIN_LABEL: &str = "main";
const TRAY_ID: &str = "main-tray";
/// A native OS menu can't fetch fresh data at the instant the user clicks it
/// without racing the OS's own "show the attached menu" behavior, so instead
/// the tray's task/project list is refreshed on this interval in the
/// background — up to this many seconds stale, which is unnoticeable for a
/// daily task list.
const MENUBAR_REFRESH_SECS: u64 = 60;

#[derive(Deserialize, Clone)]
struct MenubarItem {
    id: i64,
    title: String,
}

/// One labeled group in the dropdown — one per entity type the user selected
/// in Settings → Menu Bar. `section_type` is "task" | "goal" | "project" |
/// "sprint" | "custom_<name>", and doubles as the id prefix for its items
/// (see build_tray_menu) so on_menu_event knows what kind of thing was
/// clicked without needing a second lookup.
#[derive(Deserialize, Clone)]
struct MenubarSection {
    #[serde(rename = "type")]
    section_type: String,
    label: String,
    #[serde(default)]
    items: Vec<MenubarItem>,
}

#[derive(Deserialize, Default)]
struct MenubarToday {
    #[serde(default)]
    sections: Vec<MenubarSection>,
}

/// GET /api/menubar/today from the Go sidecar. None on any failure (server
/// not up yet, network hiccup) — callers keep whatever menu they already have.
fn fetch_menubar_today() -> Option<MenubarToday> {
    let resp = ureq::get(&format!("{SERVER_URL}/api/menubar/today"))
        .timeout(Duration::from_secs(3))
        .call()
        .ok()?;
    resp.into_json().ok()
}

/// One labeled, non-clickable header followed by a clickable item per entry
/// (id-encoded as "<section_type>:<id>" so on_menu_event knows what to open)
/// — an empty section contributes nothing, so it just disappears instead of
/// showing a header with nothing under it.
fn section_menu_items(app: &AppHandle, sec: &MenubarSection) -> tauri::Result<Vec<Box<dyn IsMenuItem<Wry>>>> {
    let mut out: Vec<Box<dyn IsMenuItem<Wry>>> = Vec::new();
    if sec.items.is_empty() {
        return Ok(out);
    }
    out.push(Box::new(MenuItem::with_id(
        app,
        format!("hdr-{}", sec.section_type),
        sec.label.to_uppercase(),
        false,
        None::<&str>,
    )?));
    for e in &sec.items {
        out.push(Box::new(MenuItem::with_id(
            app,
            format!("{}:{}", sec.section_type, e.id),
            format!("   {}", e.title),
            true,
            None::<&str>,
        )?));
    }
    Ok(out)
}

/// Build the tray's dropdown: one section per user-selected entity type
/// (when `today` is Some — the very first menu at startup, before the first
/// fetch lands, passes None and just skips straight to the static items)
/// above the existing open/HUD/quit items.
fn build_tray_menu(app: &AppHandle, today: Option<&MenubarToday>) -> tauri::Result<Menu<Wry>> {
    let mut items: Vec<Box<dyn IsMenuItem<Wry>>> = Vec::new();

    if let Some(t) = today {
        let mut had_any = false;
        for sec in &t.sections {
            let sec_items = section_menu_items(app, sec)?;
            had_any = had_any || !sec_items.is_empty();
            items.extend(sec_items);
        }
        if !had_any {
            items.push(Box::new(MenuItem::with_id(
                app,
                "hdr-empty",
                "Nothing in range",
                false,
                None::<&str>,
            )?));
        }
        items.push(Box::new(PredefinedMenuItem::separator(app)?));
    }

    items.push(Box::new(MenuItem::with_id(
        app,
        "open",
        "Open Raibis LifeOS",
        true,
        None::<&str>,
    )?));
    items.push(Box::new(MenuItem::with_id(
        app,
        "hud",
        "Quick HUD  (⌘⇧Space)",
        true,
        None::<&str>,
    )?));
    items.push(Box::new(PredefinedMenuItem::separator(app)?));
    items.push(Box::new(MenuItem::with_id(
        app,
        "quit",
        "Quit Raibis LifeOS",
        true,
        None::<&str>,
    )?));

    let refs: Vec<&dyn IsMenuItem<Wry>> = items.iter().map(|b| b.as_ref()).collect();
    Menu::with_items(app, &refs)
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

/// Open a specific item clicked from the tray dropdown: show the main
/// window, then call one of the web UI's own already-global open-this-item
/// functions (showTaskSlideover / showProjectSlideover / showGoalSlideover /
/// showSprintSlideover / openCustomEntitySlideover — the exact same
/// functions a click inside the app itself uses) so there's no separate
/// deep-linking mechanism to keep in sync with the UI.
fn open_item(app: &AppHandle, js_call: &str) {
    show_main(app);
    if let Some(w) = app.get_webview_window(MAIN_LABEL) {
        let _ = w.eval(js_call);
    }
}

/// Menu item ids from a dynamic section are "<section_type>:<id>" — task /
/// goal / project / sprint / custom_<name>. Returns the JS call to run in
/// the main window to open that exact item, or None for a non-item id
/// (a section header, or one of the static open/hud/quit items).
fn menu_id_to_js_call(id: &str) -> Option<String> {
    let (kind, rest) = id.split_once(':')?;
    let item_id: i64 = rest.parse().ok()?;
    match kind {
        "task" => Some(format!("showTaskSlideover({item_id})")),
        "goal" => Some(format!("showGoalSlideover({{id:{item_id}}}, null)")),
        "project" => Some(format!("showProjectSlideover({{id:{item_id}}}, null, null)")),
        "sprint" => Some(format!("showSprintSlideover({item_id}, null)")),
        _ => {
            let name = kind.strip_prefix("custom_")?;
            Some(format!("openCustomEntitySlideover({name:?}, {item_id})"))
        }
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
                .args(["server", "--port", "3344", "--vault", "/Users/racc/Documents/Obsidian Vault"]);

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
                // Extra pause so the HTTP server is fully ready to serve responses
                thread::sleep(Duration::from_millis(300));
                if let Some(w) = show_handle.get_webview_window(MAIN_LABEL) {
                    let _ = w.show();
                    let _ = w.set_focus();
                    // Force a fresh load to avoid WKWebView serving a blank cached page
                    let _ = w.eval("window.location.reload()");
                }
            });

            // 3. System tray, dropdown-on-click (Phase 1) ─────────────────
            // No fetched data yet at this point — the first real menu lands
            // moments later via the background refresh loop below, once the
            // sidecar has answered its first /api/menubar/today request.
            let menu = build_tray_menu(app.handle(), None)?;

            let _tray = TrayIconBuilder::with_id(TRAY_ID)
                .tooltip("Raibis LifeOS")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                // true = left-click shows the attached dropdown directly
                // (matching the reference "click icon → see a menu" UX),
                // instead of this app deciding what a click means itself.
                .show_menu_on_left_click(true)
                .on_menu_event({
                    let h = handle.clone();
                    move |_tray_handle, event| {
                        let id = event.id().as_ref();
                        if let Some(js_call) = menu_id_to_js_call(id) {
                            open_item(&h, &js_call);
                            return;
                        }
                        match id {
                            "open" => show_main(&h),
                            "hud" => toggle_hud(&h),
                            "quit" => h.exit(0),
                            _ => {}
                        }
                    }
                })
                .build(app)?;

            // Background refresh: a native menu can't fetch fresh data at
            // the moment the user clicks without racing the OS's own
            // "show the attached menu" behavior, so poll instead and swap
            // the tray's menu in place — see MENUBAR_REFRESH_SECS.
            let refresh_handle = handle.clone();
            tauri::async_runtime::spawn_blocking(move || {
                wait_for_server();
                loop {
                    if let Some(today) = fetch_menubar_today() {
                        if let Some(tray) = refresh_handle.tray_by_id(TRAY_ID) {
                            if let Ok(menu) = build_tray_menu(&refresh_handle, Some(&today)) {
                                let _ = tray.set_menu(Some(menu));
                            }
                        }
                    }
                    thread::sleep(Duration::from_secs(MENUBAR_REFRESH_SECS));
                }
            });

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
