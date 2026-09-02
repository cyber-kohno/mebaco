use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    path::{Component, Path, PathBuf},
    sync::Mutex,
};
use tauri::State;

#[derive(Default)]
pub struct ResourceSessions(Mutex<HashMap<String, ResourceSession>>);

#[derive(Clone)]
struct ResourceSession {
    resources: HashMap<String, ResourceDefinition>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourcePolicy {
    access: Access,
    pattern: String,
    #[serde(default)]
    create: bool,
}

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
enum Access {
    Read,
    ReadWrite,
}

#[derive(Clone, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
enum ResourceDefinition {
    Directory {
        path: String,
        access: Access,
        #[serde(default)]
        delete_file: bool,
        text: Option<ResourcePolicy>,
        sqlite: Option<ResourcePolicy>,
    },
    Text {
        path: String,
        access: Access,
    },
    Sqlite {
        path: String,
        access: Access,
        #[serde(default)]
        create: bool,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceRegistration {
    resource_id: String,
    #[serde(flatten)]
    definition: ResourceDefinition,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    session_id: String,
    resources: Vec<ResourceRegistration>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRequest {
    session_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceRequest {
    session_id: String,
    resource_id: String,
    relative_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryPathRequest {
    session_id: String,
    resource_id: String,
    relative_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryMoveRequest {
    session_id: String,
    resource_id: String,
    source_relative_path: String,
    destination_relative_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryGlobRequest {
    session_id: String,
    resource_id: String,
    pattern: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteTextRequest {
    session_id: String,
    resource_id: String,
    relative_path: Option<String>,
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    name: String,
    relative_path: String,
    kind: &'static str,
}

#[derive(Clone)]
struct FileTarget {
    path: PathBuf,
    boundary: Option<PathBuf>,
    access: Access,
    create: bool,
}

fn lock_sessions(
    sessions: &ResourceSessions,
) -> Result<std::sync::MutexGuard<'_, HashMap<String, ResourceSession>>, String> {
    sessions
        .0
        .lock()
        .map_err(|_| "The Resource session registry is unavailable.".to_string())
}

fn get_resource(
    sessions: &ResourceSessions,
    session_id: &str,
    resource_id: &str,
) -> Result<ResourceDefinition, String> {
    lock_sessions(sessions)?
        .get(session_id)
        .ok_or_else(|| "The Resource session is not available.".to_string())?
        .resources
        .get(resource_id)
        .cloned()
        .ok_or_else(|| format!("Resource '{resource_id}' is not available in this session."))
}

fn bound_path(path: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("The Resource has no path in the selected Configuration.".to_string());
    }
    let value = PathBuf::from(path);
    if !value.is_absolute() {
        return Err("A Resource binding must be an absolute path.".to_string());
    }
    Ok(value)
}

fn relative_path(value: &str, allow_empty: bool) -> Result<PathBuf, String> {
    if value.len() > 1024 || value.contains('\0') || (!allow_empty && value.is_empty()) {
        return Err("A valid relative Resource path is required.".to_string());
    }
    let normalized = value.replace('\\', "/");
    if normalized.starts_with('/') || normalized.as_bytes().get(1) == Some(&b':') {
        return Err(format!("Invalid relative Resource path '{value}'."));
    }
    let path = PathBuf::from(normalized);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir
                    | Component::RootDir
                    | Component::Prefix(_)
                    | Component::CurDir
            )
        })
    {
        return Err(format!("Invalid relative Resource path '{value}'."));
    }
    Ok(path)
}

fn glob_pattern(value: &str) -> Result<&str, String> {
    if value.is_empty()
        || value.len() > 1024
        || value.contains('\0')
        || value.contains('\\')
        || value.starts_with('/')
        || value.as_bytes().get(1) == Some(&b':')
        || value
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
    {
        return Err(format!("Invalid Resource glob pattern '{value}'."));
    }
    Ok(value)
}

fn canonical_directory(path: &Path) -> Result<PathBuf, String> {
    let canonical = fs::canonicalize(path)
        .map_err(|error| format!("The Directory Resource is unavailable: {error}"))?;
    if !canonical.is_dir() {
        return Err("The Directory Resource path is not a directory.".to_string());
    }
    Ok(canonical)
}

fn ensure_inside(boundary: &Path, path: &Path) -> Result<PathBuf, String> {
    let canonical = fs::canonicalize(path)
        .map_err(|error| format!("The Resource path is unavailable: {error}"))?;
    if !canonical.starts_with(boundary) {
        return Err("The Resource path escapes its permitted directory.".to_string());
    }
    Ok(canonical)
}

fn checked_existing_path(boundary: &Path, path: &Path) -> Result<PathBuf, String> {
    ensure_inside(boundary, path)?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("The Resource path is unavailable: {error}"))?;
    if metadata.file_type().is_symlink() {
        return Err("Symbolic-link Resource targets are not supported.".to_string());
    }
    Ok(path.to_path_buf())
}

fn ensure_parent_inside(boundary: &Path, path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "The Resource path has no parent directory.".to_string())?;
    let canonical = fs::canonicalize(parent)
        .map_err(|error| format!("The Resource parent directory is unavailable: {error}"))?;
    if !canonical.starts_with(boundary) {
        return Err("The Resource path escapes its permitted directory.".to_string());
    }
    Ok(())
}

fn ensure_nearest_existing_inside(boundary: &Path, path: &Path) -> Result<(), String> {
    let mut current = path;
    while !current.exists() {
        current = current
            .parent()
            .ok_or_else(|| "The Resource path has no existing parent.".to_string())?;
    }
    let canonical = fs::canonicalize(current)
        .map_err(|error| format!("The Resource path is unavailable: {error}"))?;
    if !canonical.starts_with(boundary) {
        return Err("The Resource path escapes its permitted directory.".to_string());
    }
    Ok(())
}

fn path_entry_exists(path: &Path) -> Result<bool, String> {
    match fs::symlink_metadata(path) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!("The Resource path is unavailable: {error}")),
    }
}

fn directory_definition(
    resource: ResourceDefinition,
    require_write: bool,
) -> Result<(PathBuf, bool), String> {
    let ResourceDefinition::Directory {
        path,
        access,
        delete_file,
        ..
    } = resource
    else {
        return Err("This operation requires a Directory Resource.".to_string());
    };
    if require_write && access != Access::ReadWrite {
        return Err("The Directory Resource is read-only.".to_string());
    }
    Ok((canonical_directory(&bound_path(&path)?)?, delete_file))
}

fn glob_matches(pattern: &str, value: &str) -> bool {
    fn matches(
        pattern: &[char],
        value: &[char],
        pattern_index: usize,
        value_index: usize,
        memo: &mut HashMap<(usize, usize), bool>,
    ) -> bool {
        if let Some(result) = memo.get(&(pattern_index, value_index)) {
            return *result;
        }
        if pattern_index == pattern.len() {
            return value_index == value.len();
        }
        let result = if pattern[pattern_index] == '*' {
            if pattern.get(pattern_index + 1) == Some(&'*') {
                let next = pattern_index + 2;
                if pattern.get(next) == Some(&'/') {
                    matches(pattern, value, next + 1, value_index, memo)
                        || (value_index < value.len()
                            && matches(pattern, value, pattern_index, value_index + 1, memo))
                } else {
                    matches(pattern, value, next, value_index, memo)
                        || (value_index < value.len()
                            && matches(pattern, value, pattern_index, value_index + 1, memo))
                }
            } else {
                matches(pattern, value, pattern_index + 1, value_index, memo)
                    || (value_index < value.len()
                        && value[value_index] != '/'
                        && matches(pattern, value, pattern_index, value_index + 1, memo))
            }
        } else if pattern[pattern_index] == '?' {
            value_index < value.len()
                && value[value_index] != '/'
                && matches(pattern, value, pattern_index + 1, value_index + 1, memo)
        } else {
            value_index < value.len()
                && pattern[pattern_index] == value[value_index]
                && matches(pattern, value, pattern_index + 1, value_index + 1, memo)
        };
        memo.insert((pattern_index, value_index), result);
        result
    }

    let pattern: Vec<char> = pattern.chars().collect();
    let value: Vec<char> = value.chars().collect();
    matches(&pattern, &value, 0, 0, &mut HashMap::new())
}

fn matches_policy(relative: &str, policy: &ResourcePolicy) -> Result<(), String> {
    let pattern = policy.pattern.replace('\\', "/");
    let value = relative.replace('\\', "/");
    if !glob_matches(&pattern, &value) {
        return Err(format!(
            "Resource path '{relative}' is not allowed by pattern '{}'.",
            policy.pattern
        ));
    }
    Ok(())
}

fn text_target(resource: ResourceDefinition, relative: Option<&str>) -> Result<FileTarget, String> {
    match resource {
        ResourceDefinition::Text { path, access } => {
            if relative.is_some() {
                return Err("A root Text Resource does not accept a relative path.".to_string());
            }
            Ok(FileTarget {
                path: bound_path(&path)?,
                boundary: None,
                access,
                create: false,
            })
        }
        ResourceDefinition::Directory { path, text, .. } => {
            let policy = text.ok_or_else(|| {
                "This Directory Resource does not permit derived Text Resources.".to_string()
            })?;
            let relative =
                relative.ok_or_else(|| "A derived Text Resource requires a path.".to_string())?;
            relative_path(relative, false)?;
            matches_policy(relative, &policy)?;
            let boundary = canonical_directory(&bound_path(&path)?)?;
            Ok(FileTarget {
                path: boundary.join(relative),
                boundary: Some(boundary),
                access: policy.access,
                create: false,
            })
        }
        ResourceDefinition::Sqlite { .. } => {
            Err("This operation requires a Text Resource.".to_string())
        }
    }
}

fn sqlite_target(
    resource: ResourceDefinition,
    relative: Option<&str>,
) -> Result<FileTarget, String> {
    match resource {
        ResourceDefinition::Sqlite {
            path,
            access,
            create,
        } => {
            if relative.is_some() {
                return Err("A root SQLite Resource does not accept a relative path.".to_string());
            }
            Ok(FileTarget {
                path: bound_path(&path)?,
                boundary: None,
                access,
                create: access == Access::ReadWrite && create,
            })
        }
        ResourceDefinition::Directory { path, sqlite, .. } => {
            let policy = sqlite.ok_or_else(|| {
                "This Directory Resource does not permit derived SQLite Resources.".to_string()
            })?;
            let relative =
                relative.ok_or_else(|| "A derived SQLite Resource requires a path.".to_string())?;
            relative_path(relative, false)?;
            matches_policy(relative, &policy)?;
            let boundary = canonical_directory(&bound_path(&path)?)?;
            Ok(FileTarget {
                path: boundary.join(relative),
                boundary: Some(boundary),
                access: policy.access,
                create: policy.access == Access::ReadWrite && policy.create,
            })
        }
        ResourceDefinition::Text { .. } => {
            Err("This operation requires a SQLite Resource.".to_string())
        }
    }
}

fn existing_file(target: &FileTarget) -> Result<PathBuf, String> {
    let path = if let Some(boundary) = &target.boundary {
        checked_existing_path(boundary, &target.path)?
    } else {
        fs::canonicalize(&target.path)
            .map_err(|error| format!("The Resource file is unavailable: {error}"))?
    };
    if !path.is_file() {
        return Err("The Resource path is not a file.".to_string());
    }
    Ok(path)
}

#[tauri::command]
pub fn resource_create_session(
    request: CreateSessionRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resources = request
        .resources
        .into_iter()
        .map(|resource| (resource.resource_id, resource.definition))
        .collect();
    lock_sessions(&sessions)?.insert(request.session_id, ResourceSession { resources });
    Ok(())
}

#[tauri::command]
pub fn resource_dispose_session(
    request: SessionRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    lock_sessions(&sessions)?.remove(&request.session_id);
    Ok(())
}

#[tauri::command]
pub fn resource_exists(
    request: DirectoryPathRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<bool, String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, false)?;
    let relative = relative_path(&request.relative_path, false)?;
    let target = boundary.join(relative);
    ensure_nearest_existing_inside(&boundary, &target)?;
    Ok(target.exists())
}

#[tauri::command]
pub fn resource_list(
    request: ResourceRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<Vec<DirectoryEntry>, String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, false)?;
    let relative = request.relative_path.as_deref().unwrap_or("");
    let target = if relative.is_empty() {
        boundary.clone()
    } else {
        checked_existing_path(&boundary, &boundary.join(relative_path(relative, false)?))?
    };
    if !target.is_dir() {
        return Err("The Resource list target is not a directory.".to_string());
    }

    let mut entries = Vec::new();
    for item in fs::read_dir(target)
        .map_err(|error| format!("Failed to list the Resource directory: {error}"))?
    {
        let item =
            item.map_err(|error| format!("Failed to read a Resource directory entry: {error}"))?;
        let checked = checked_existing_path(&boundary, &item.path())?;
        let kind = if checked.is_file() {
            "file"
        } else if checked.is_dir() {
            "directory"
        } else {
            continue;
        };
        let name = item.file_name().to_string_lossy().into_owned();
        let relative_path = if relative.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", relative.replace('\\', "/"), name)
        };
        entries.push(DirectoryEntry {
            name,
            relative_path,
            kind,
        });
    }
    entries.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(entries)
}

fn collect_glob_entries(
    boundary: &Path,
    directory: &Path,
    relative_directory: &str,
    pattern: &str,
    entries: &mut Vec<DirectoryEntry>,
) -> Result<(), String> {
    for item in fs::read_dir(directory)
        .map_err(|error| format!("Failed to search the Resource directory: {error}"))?
    {
        let item =
            item.map_err(|error| format!("Failed to read a Resource directory entry: {error}"))?;
        let path = item.path();
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("The Resource path is unavailable: {error}"))?;
        if metadata.file_type().is_symlink() {
            continue;
        }

        let canonical = ensure_inside(boundary, &path)?;
        let kind = if metadata.is_file() {
            "file"
        } else if metadata.is_dir() {
            "directory"
        } else {
            continue;
        };
        let name = item.file_name().to_string_lossy().into_owned();
        let relative_path = if relative_directory.is_empty() {
            name.clone()
        } else {
            format!("{relative_directory}/{name}")
        };

        if glob_matches(pattern, &relative_path) {
            entries.push(DirectoryEntry {
                name,
                relative_path: relative_path.clone(),
                kind,
            });
        }
        if metadata.is_dir() {
            collect_glob_entries(boundary, &canonical, &relative_path, pattern, entries)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn resource_glob(
    request: DirectoryGlobRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<Vec<DirectoryEntry>, String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, false)?;
    let pattern = glob_pattern(&request.pattern)?;
    let mut entries = Vec::new();
    collect_glob_entries(&boundary, &boundary, "", pattern, &mut entries)?;
    entries.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(entries)
}

fn destination_path(boundary: &Path, relative: &str) -> Result<PathBuf, String> {
    let destination = boundary.join(relative_path(relative, false)?);
    ensure_parent_inside(boundary, &destination)?;
    if path_entry_exists(&destination)? {
        return Err("The destination Resource path already exists.".to_string());
    }
    Ok(destination)
}

#[tauri::command]
pub fn resource_rename_file(
    request: DirectoryMoveRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, true)?;
    let source = checked_existing_path(
        &boundary,
        &boundary.join(relative_path(&request.source_relative_path, false)?),
    )?;
    if !source.is_file() {
        return Err("The source Resource path is not a file.".to_string());
    }
    let destination = destination_path(&boundary, &request.destination_relative_path)?;
    fs::rename(source, destination)
        .map_err(|error| format!("Failed to rename the Resource file: {error}"))
}

#[tauri::command]
pub fn resource_copy_file(
    request: DirectoryMoveRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, true)?;
    let source = checked_existing_path(
        &boundary,
        &boundary.join(relative_path(&request.source_relative_path, false)?),
    )?;
    if !source.is_file() {
        return Err("The source Resource path is not a file.".to_string());
    }
    let destination = destination_path(&boundary, &request.destination_relative_path)?;
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|error| format!("Failed to copy the Resource file: {error}"))
}

#[tauri::command]
pub fn resource_create_dir(
    request: DirectoryPathRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, true)?;
    let destination = destination_path(&boundary, &request.relative_path)?;
    fs::create_dir(destination)
        .map_err(|error| format!("Failed to create the Resource directory: {error}"))
}

#[tauri::command]
pub fn resource_create_file(
    request: DirectoryPathRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, _) = directory_definition(resource, true)?;
    let destination = destination_path(&boundary, &request.relative_path)?;
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)
        .map(|_| ())
        .map_err(|error| format!("Failed to create the Resource file: {error}"))
}

#[tauri::command]
pub fn resource_delete_file(
    request: DirectoryPathRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let (boundary, delete_file) = directory_definition(resource, true)?;
    if !delete_file {
        return Err("The Directory Resource does not permit deleting files.".to_string());
    }
    let target = checked_existing_path(
        &boundary,
        &boundary.join(relative_path(&request.relative_path, false)?),
    )?;
    if !target.is_file() {
        return Err("The Resource path is not a file.".to_string());
    }
    fs::remove_file(target).map_err(|error| format!("Failed to delete the Resource file: {error}"))
}

#[tauri::command]
pub fn resource_read_text(
    request: ResourceRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<String, String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let target = text_target(resource, request.relative_path.as_deref())?;
    fs::read_to_string(existing_file(&target)?)
        .map_err(|error| format!("Failed to read the Text Resource as UTF-8: {error}"))
}

#[tauri::command]
pub fn resource_write_text(
    request: WriteTextRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<(), String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let target = text_target(resource, request.relative_path.as_deref())?;
    if target.access != Access::ReadWrite {
        return Err("The Text Resource is read-only.".to_string());
    }
    fs::write(existing_file(&target)?, request.text)
        .map_err(|error| format!("Failed to write the Text Resource as UTF-8: {error}"))
}

#[tauri::command]
pub fn resource_open_sqlite(
    request: ResourceRequest,
    sessions: State<'_, ResourceSessions>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let resource = get_resource(&sessions, &request.session_id, &request.resource_id)?;
    let target = sqlite_target(resource, request.relative_path.as_deref())?;
    open_sqlite_target(&target)?;
    Ok(HashMap::new())
}

fn open_sqlite_target(target: &FileTarget) -> Result<(), String> {
    if path_entry_exists(&target.path)? {
        existing_file(target)?;
    } else {
        if !target.create {
            return Err(
                "The SQLite Resource does not exist and Create if missing is disabled.".to_string(),
            );
        }
        if let Some(boundary) = &target.boundary {
            ensure_parent_inside(boundary, &target.path)?;
        } else {
            let parent = target
                .path
                .parent()
                .ok_or_else(|| "The SQLite Resource has no parent directory.".to_string())?;
            if !parent.is_dir() {
                return Err("The SQLite Resource parent directory is unavailable.".to_string());
            }
        }
    }

    let flags = match (target.access, target.create) {
        (Access::Read, _) => OpenFlags::SQLITE_OPEN_READ_ONLY,
        (Access::ReadWrite, false) => OpenFlags::SQLITE_OPEN_READ_WRITE,
        (Access::ReadWrite, true) => {
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        }
    };
    let connection = Connection::open_with_flags(&target.path, flags)
        .map_err(|error| format!("Failed to open the SQLite Resource: {error}"))?;
    connection
        .query_row("PRAGMA schema_version", [], |_row| Ok(()))
        .map_err(|error| format!("The SQLite Resource is invalid: {error}"))?;
    drop(connection);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_directory() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must be after the Unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "mebaco-resource-test-{}-{suffix}",
            std::process::id()
        ));
        fs::create_dir(&path).expect("temporary directory must be created");
        path
    }

    #[test]
    fn rejects_parent_and_absolute_relative_paths() {
        assert!(relative_path("../secret.txt", false).is_err());
        assert!(relative_path("C:/secret.txt", false).is_err());
        assert!(relative_path("safe/file.txt", false).is_ok());
    }

    #[test]
    fn default_recursive_pattern_accepts_root_and_nested_files() {
        let policy = ResourcePolicy {
            access: Access::Read,
            pattern: "**/*".to_string(),
            create: false,
        };
        assert!(matches_policy("env.json", &policy).is_ok());
        assert!(matches_policy("config/env.json", &policy).is_ok());
    }

    #[test]
    fn validates_glob_patterns() {
        assert!(glob_pattern("src/**/*.java").is_ok());
        assert!(glob_pattern("../**/*.java").is_err());
        assert!(glob_pattern("C:/workspace/**/*.java").is_err());
        assert!(glob_pattern("src\\**\\*.java").is_err());
    }

    #[test]
    fn glob_searches_recursively_and_sorts_relative_paths() {
        let directory = temporary_directory();
        fs::create_dir(directory.join("src")).expect("source directory must be created");
        fs::create_dir(directory.join("src").join("nested"))
            .expect("nested source directory must be created");
        fs::write(directory.join("src").join("Z.java"), "class Z {}")
            .expect("root Java file must be created");
        fs::write(
            directory.join("src").join("nested").join("A.java"),
            "class A {}",
        )
        .expect("nested Java file must be created");
        fs::write(directory.join("src").join("notes.txt"), "notes")
            .expect("nonmatching file must be created");
        let boundary = fs::canonicalize(&directory).expect("temporary directory must resolve");
        let mut entries = Vec::new();

        collect_glob_entries(&boundary, &boundary, "", "src/**/*.java", &mut entries)
            .expect("glob search must succeed");
        entries.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

        assert_eq!(
            entries
                .iter()
                .map(|entry| entry.relative_path.as_str())
                .collect::<Vec<_>>(),
            vec!["src/Z.java", "src/nested/A.java"]
        );

        fs::remove_dir_all(directory).expect("temporary directory must be removed");
    }

    #[test]
    fn sqlite_create_if_missing_only_creates_an_enabled_writable_target() {
        let directory = temporary_directory();
        let boundary = fs::canonicalize(&directory).expect("temporary directory must resolve");
        let path = directory.join("manage.db");
        let writable = FileTarget {
            path: path.clone(),
            boundary: Some(boundary.clone()),
            access: Access::ReadWrite,
            create: true,
        };

        open_sqlite_target(&writable).expect("enabled SQLite target must be created");
        assert!(path.is_file());

        let missing = FileTarget {
            path: directory.join("missing.db"),
            boundary: Some(boundary),
            access: Access::Read,
            create: false,
        };
        assert!(open_sqlite_target(&missing).is_err());

        fs::remove_dir_all(directory).expect("temporary directory must be removed");
    }
}
