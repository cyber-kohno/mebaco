use tauri::{webview::PageLoadEvent, Manager};

mod resource;

fn app_window_title() -> String {
    format!("Mebaco v{}", env!("CARGO_PKG_VERSION"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(resource::ResourceSessions::default())
        .invoke_handler(tauri::generate_handler![
            resource::resource_create_session,
            resource::resource_dispose_session,
            resource::resource_exists,
            resource::resource_list,
            resource::resource_rename_file,
            resource::resource_copy_file,
            resource::resource_create_dir,
            resource::resource_create_file,
            resource::resource_delete_file,
            resource::resource_read_text,
            resource::resource_write_text,
            resource::resource_open_sqlite,
        ])
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && matches!(payload.event(), PageLoadEvent::Finished) {
                let main_window = webview.window();
                let _ = main_window.set_title(&app_window_title());
                let _ = main_window.show();
                let _ = main_window.set_focus();

                if let Some(splashscreen) =
                    main_window.app_handle().get_webview_window("splashscreen")
                {
                    let _ = splashscreen.close();
                }
            }
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
