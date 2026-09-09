use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::path::{Path, PathBuf};

const CLIENT_LAUNCH_FLAG: &str = "--client-launch";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ClientLaunchRequest {
    pub workspace_id: String,
    pub installation_id: String,
    pub bundle_id: String,
    pub launcher_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateShortcutRequest {
    pub destination_path: String,
    pub description: String,
    pub launch: ClientLaunchRequest,
}

fn parse_startup_request<I>(arguments: I) -> Option<ClientLaunchRequest>
where
    I: IntoIterator<Item = OsString>,
{
    let mut arguments = arguments.into_iter();
    while let Some(argument) = arguments.next() {
        if argument != CLIENT_LAUNCH_FLAG {
            continue;
        }
        return Some(ClientLaunchRequest {
            workspace_id: arguments.next()?.into_string().ok()?,
            installation_id: arguments.next()?.into_string().ok()?,
            bundle_id: arguments.next()?.into_string().ok()?,
            launcher_id: arguments.next()?.into_string().ok()?,
        });
    }
    None
}

fn validate_reference(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > 256 || value.chars().any(char::is_control) {
        return Err(format!("The {label} is invalid."));
    }
    Ok(())
}

fn validate_launch_request(request: &ClientLaunchRequest) -> Result<(), String> {
    if request.workspace_id != "default" {
        return Err("The requested client workspace is not available.".to_string());
    }
    validate_reference(&request.installation_id, "installation ID")?;
    validate_reference(&request.bundle_id, "Bundle ID")?;
    validate_reference(&request.launcher_id, "Launcher ID")
}

fn quote_windows_argument(value: &str) -> String {
    let mut result = String::from("\"");
    let mut backslashes = 0usize;
    for character in value.chars() {
        if character == '\\' {
            backslashes += 1;
            continue;
        }
        if character == '"' {
            result.push_str(&"\\".repeat(backslashes * 2 + 1));
            result.push('"');
        } else {
            result.push_str(&"\\".repeat(backslashes));
            result.push(character);
        }
        backslashes = 0;
    }
    result.push_str(&"\\".repeat(backslashes * 2));
    result.push('"');
    result
}

fn shortcut_arguments(request: &ClientLaunchRequest) -> String {
    [
        CLIENT_LAUNCH_FLAG.to_string(),
        quote_windows_argument(&request.workspace_id),
        quote_windows_argument(&request.installation_id),
        quote_windows_argument(&request.bundle_id),
        quote_windows_argument(&request.launcher_id),
    ]
    .join(" ")
}

fn validate_destination(path: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err("The shortcut destination must be an absolute path.".to_string());
    }
    if !path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("lnk"))
    {
        return Err("The shortcut file must use the .lnk extension.".to_string());
    }
    let parent = path
        .parent()
        .ok_or_else(|| "The shortcut destination has no parent directory.".to_string())?;
    if !parent.is_dir() {
        return Err("The shortcut destination folder does not exist.".to_string());
    }
    Ok(())
}

#[cfg(windows)]
fn create_windows_shortcut(request: CreateShortcutRequest) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{Interface, PCWSTR};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    struct ComApartment;
    impl Drop for ComApartment {
        fn drop(&mut self) {
            unsafe { CoUninitialize() };
        }
    }

    fn wide_path(path: &Path) -> Vec<u16> {
        path.as_os_str().encode_wide().chain(Some(0)).collect()
    }

    fn wide_text(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(Some(0)).collect()
    }

    validate_launch_request(&request.launch)?;
    let destination = PathBuf::from(&request.destination_path);
    validate_destination(&destination)?;
    let executable = std::env::current_exe()
        .map_err(|error| format!("The Mebaco executable path could not be resolved: {error}"))?;
    let working_directory = executable
        .parent()
        .ok_or_else(|| "The Mebaco executable folder could not be resolved.".to_string())?;
    let arguments = shortcut_arguments(&request.launch);

    let executable_wide = wide_path(&executable);
    let working_directory_wide = wide_path(working_directory);
    let destination_wide = wide_path(&destination);
    let arguments_wide = wide_text(&arguments);
    let description_wide = wide_text(&request.description);

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|error| {
                format!("Windows shortcut services could not be initialized: {error}")
            })?;
        let _apartment = ComApartment;
        let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)
            .map_err(|error| format!("The Windows shortcut could not be created: {error}"))?;
        link.SetPath(PCWSTR(executable_wide.as_ptr()))
            .map_err(|error| format!("The shortcut target could not be set: {error}"))?;
        link.SetArguments(PCWSTR(arguments_wide.as_ptr()))
            .map_err(|error| format!("The shortcut arguments could not be set: {error}"))?;
        link.SetWorkingDirectory(PCWSTR(working_directory_wide.as_ptr()))
            .map_err(|error| format!("The shortcut working folder could not be set: {error}"))?;
        link.SetDescription(PCWSTR(description_wide.as_ptr()))
            .map_err(|error| format!("The shortcut description could not be set: {error}"))?;
        link.SetIconLocation(PCWSTR(executable_wide.as_ptr()), 0)
            .map_err(|error| format!("The shortcut icon could not be set: {error}"))?;
        let persistent: IPersistFile = link
            .cast()
            .map_err(|error| format!("The shortcut could not be saved: {error}"))?;
        persistent
            .Save(PCWSTR(destination_wide.as_ptr()), true)
            .map_err(|error| format!("The shortcut file could not be saved: {error}"))?;
    }
    Ok(())
}

#[cfg(not(windows))]
fn create_windows_shortcut(_request: CreateShortcutRequest) -> Result<(), String> {
    Err("Windows shortcuts can only be created on Windows.".to_string())
}

#[tauri::command]
pub fn client_get_startup_launch_request() -> Option<ClientLaunchRequest> {
    parse_startup_request(std::env::args_os().skip(1))
        .filter(|request| validate_launch_request(request).is_ok())
}

#[tauri::command]
pub async fn client_create_launcher_shortcut(request: CreateShortcutRequest) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || create_windows_shortcut(request))
        .await
        .map_err(|error| format!("The shortcut task could not be completed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_client_launch_arguments() {
        let request = parse_startup_request([
            OsString::from("--unrelated"),
            OsString::from(CLIENT_LAUNCH_FLAG),
            OsString::from("default"),
            OsString::from("installation-id"),
            OsString::from("bundle-id"),
            OsString::from("launcher-id"),
        ])
        .unwrap();

        assert_eq!(request.workspace_id, "default");
        assert_eq!(request.installation_id, "installation-id");
        assert_eq!(request.bundle_id, "bundle-id");
        assert_eq!(request.launcher_id, "launcher-id");
    }

    #[test]
    fn rejects_incomplete_client_launch_arguments() {
        assert!(parse_startup_request([
            OsString::from(CLIENT_LAUNCH_FLAG),
            OsString::from("default"),
        ])
        .is_none());
    }

    #[test]
    fn quotes_windows_arguments() {
        assert_eq!(quote_windows_argument("plain"), "\"plain\"");
        assert_eq!(quote_windows_argument("a b"), "\"a b\"");
        assert_eq!(quote_windows_argument("a\\\"b"), "\"a\\\\\\\"b\"");
        assert_eq!(quote_windows_argument("tail\\"), "\"tail\\\\\"");
    }

    #[cfg(windows)]
    #[test]
    fn creates_a_windows_shortcut_file() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "mebaco-shortcut-test-{}-{unique}",
            std::process::id()
        ));
        std::fs::create_dir(&directory).unwrap();
        let destination = directory.join("launcher.lnk");

        create_windows_shortcut(CreateShortcutRequest {
            destination_path: destination.to_string_lossy().into_owned(),
            description: "Mebaco shortcut test".to_string(),
            launch: ClientLaunchRequest {
                workspace_id: "default".to_string(),
                installation_id: "installation-id".to_string(),
                bundle_id: "bundle-id".to_string(),
                launcher_id: "launcher-id".to_string(),
            },
        })
        .unwrap();

        assert!(destination.is_file());
        std::fs::remove_file(destination).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }
}
