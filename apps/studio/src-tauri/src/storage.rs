use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageScope {
    kind: String,
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageGetRequest {
    scope: StorageScope,
    storage_id: String,
    initial: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSetRequest {
    scope: StorageScope,
    storage_id: String,
    value: Value,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageFile {
    #[serde(default)]
    values: Map<String, Value>,
}

fn valid_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
}

fn storage_path(app: &AppHandle, scope: &StorageScope) -> Result<PathBuf, String> {
    if !valid_id(&scope.id) {
        return Err("Invalid storage scope id.".to_string());
    }
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;
    match scope.kind.as_str() {
        "package" => Ok(base
            .join("client/install/default/packages")
            .join(&scope.id)
            .join("storage/key-value.json")),
        "development" => Ok(base
            .join("develop/storage")
            .join(&scope.id)
            .join("key-value.json")),
        _ => Err("Invalid storage scope kind.".to_string()),
    }
}

fn read_file(path: &PathBuf) -> Result<StorageFile, String> {
    if !path.exists() {
        return Ok(StorageFile::default());
    }
    let source = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&source).map_err(|error| format!("The storage file is invalid: {error}"))
}

fn write_file(path: &PathBuf, file: &StorageFile) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid storage path.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let source = serde_json::to_vec_pretty(file).map_err(|error| error.to_string())?;
    fs::write(path, source).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn storage_get(app: AppHandle, request: StorageGetRequest) -> Result<Value, String> {
    if !valid_id(&request.storage_id) {
        return Err("Invalid storage item id.".to_string());
    }
    let path = storage_path(&app, &request.scope)?;
    let mut file = read_file(&path)?;
    if let Some(value) = file.values.get(&request.storage_id) {
        return Ok(value.clone());
    }
    file.values
        .insert(request.storage_id, request.initial.clone());
    write_file(&path, &file)?;
    Ok(request.initial)
}

#[tauri::command]
pub fn storage_set(app: AppHandle, request: StorageSetRequest) -> Result<(), String> {
    if !valid_id(&request.storage_id) {
        return Err("Invalid storage item id.".to_string());
    }
    let path = storage_path(&app, &request.scope)?;
    let mut file = read_file(&path)?;
    file.values.insert(request.storage_id, request.value);
    write_file(&path, &file)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn validates_storage_path_segments() {
        assert!(valid_id("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!valid_id("../outside"));
        assert!(!valid_id("with/slash"));
    }

    #[test]
    fn persists_and_reloads_values() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("mebaco-storage-{suffix}"));
        let path = directory.join("key-value.json");
        let mut file = StorageFile::default();
        file.values.insert(
            "settings-id".to_string(),
            serde_json::json!({ "fontSize": 22 }),
        );
        write_file(&path, &file).unwrap();
        assert_eq!(
            read_file(&path).unwrap().values["settings-id"]["fontSize"],
            22
        );
        fs::remove_dir_all(directory).unwrap();
    }
}
