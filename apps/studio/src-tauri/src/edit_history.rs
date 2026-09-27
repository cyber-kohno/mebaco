use serde::Serialize;
use std::{collections::VecDeque, sync::Mutex};
use tauri::State;

const MAX_HISTORY_ENTRIES: usize = 100;
const MAX_HISTORY_BYTES: usize = 128 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES: usize = 32 * 1024 * 1024;

#[derive(Default)]
struct HistoryRegistry {
    undo: VecDeque<String>,
    redo: VecDeque<String>,
    bytes: usize,
}

impl HistoryRegistry {
    fn validate_snapshot(snapshot: &str) -> Result<(), String> {
        if snapshot.len() > MAX_SNAPSHOT_BYTES {
            return Err("The edit history snapshot is too large.".to_string());
        }
        serde_json::from_str::<serde_json::Value>(snapshot)
            .map(|_| ())
            .map_err(|error| format!("The edit history snapshot is invalid: {error}"))
    }

    fn clear_stack(stack: &mut VecDeque<String>, bytes: &mut usize) {
        while let Some(snapshot) = stack.pop_front() {
            *bytes = bytes.saturating_sub(snapshot.len());
        }
    }

    fn trim(&mut self) {
        while self.undo.len() > MAX_HISTORY_ENTRIES {
            if let Some(snapshot) = self.undo.pop_front() {
                self.bytes = self.bytes.saturating_sub(snapshot.len());
            }
        }
        while self.redo.len() > MAX_HISTORY_ENTRIES {
            if let Some(snapshot) = self.redo.pop_front() {
                self.bytes = self.bytes.saturating_sub(snapshot.len());
            }
        }
        while self.bytes > MAX_HISTORY_BYTES {
            let removed = self.undo.pop_front().or_else(|| self.redo.pop_front());
            let Some(snapshot) = removed else { break };
            self.bytes = self.bytes.saturating_sub(snapshot.len());
        }
    }

    fn record(&mut self, snapshot: String) -> Result<(), String> {
        Self::validate_snapshot(&snapshot)?;
        Self::clear_stack(&mut self.redo, &mut self.bytes);
        self.bytes += snapshot.len();
        self.undo.push_back(snapshot);
        self.trim();
        Ok(())
    }

    fn undo(&mut self, current: String) -> Result<Option<String>, String> {
        Self::validate_snapshot(&current)?;
        let Some(previous) = self.undo.pop_back() else {
            return Ok(None);
        };
        self.bytes = self.bytes.saturating_sub(previous.len());
        self.bytes += current.len();
        self.redo.push_back(current);
        self.trim();
        Ok(Some(previous))
    }

    fn redo(&mut self, current: String) -> Result<Option<String>, String> {
        Self::validate_snapshot(&current)?;
        let Some(next) = self.redo.pop_back() else {
            return Ok(None);
        };
        self.bytes = self.bytes.saturating_sub(next.len());
        self.bytes += current.len();
        self.undo.push_back(current);
        self.trim();
        Ok(Some(next))
    }

    fn clear(&mut self) {
        self.undo.clear();
        self.redo.clear();
        self.bytes = 0;
    }
}

#[derive(Default)]
pub struct EditHistory(Mutex<HistoryRegistry>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditHistoryStatus {
    can_undo: bool,
    can_redo: bool,
}

fn lock_history(
    history: &EditHistory,
) -> Result<std::sync::MutexGuard<'_, HistoryRegistry>, String> {
    history
        .0
        .lock()
        .map_err(|_| "The edit history is unavailable.".to_string())
}

#[tauri::command]
pub fn edit_history_record(
    history: State<'_, EditHistory>,
    snapshot: String,
) -> Result<(), String> {
    lock_history(history.inner())?.record(snapshot)
}

#[tauri::command]
pub fn edit_history_undo(
    history: State<'_, EditHistory>,
    current: String,
) -> Result<Option<String>, String> {
    lock_history(history.inner())?.undo(current)
}

#[tauri::command]
pub fn edit_history_redo(
    history: State<'_, EditHistory>,
    current: String,
) -> Result<Option<String>, String> {
    lock_history(history.inner())?.redo(current)
}

#[tauri::command]
pub fn edit_history_clear(history: State<'_, EditHistory>) -> Result<(), String> {
    lock_history(history.inner())?.clear();
    Ok(())
}

#[tauri::command]
pub fn edit_history_status(history: State<'_, EditHistory>) -> Result<EditHistoryStatus, String> {
    let history = lock_history(history.inner())?;
    Ok(EditHistoryStatus {
        can_undo: !history.undo.is_empty(),
        can_redo: !history.redo.is_empty(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_undoes_and_redoes_snapshots() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.to_string()).unwrap();
        history.record(r#"{"value":1}"#.to_string()).unwrap();

        assert_eq!(
            history.undo(r#"{"value":2}"#.to_string()).unwrap(),
            Some(r#"{"value":1}"#.to_string())
        );
        assert_eq!(
            history.undo(r#"{"value":1}"#.to_string()).unwrap(),
            Some(r#"{"value":0}"#.to_string())
        );
        assert_eq!(
            history.redo(r#"{"value":0}"#.to_string()).unwrap(),
            Some(r#"{"value":1}"#.to_string())
        );
    }

    #[test]
    fn a_new_record_clears_redo_history() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.to_string()).unwrap();
        assert!(history
            .undo(r#"{"value":1}"#.to_string())
            .unwrap()
            .is_some());
        history.record(r#"{"value":3}"#.to_string()).unwrap();
        assert_eq!(history.redo(r#"{"value":4}"#.to_string()).unwrap(), None);
    }

    #[test]
    fn rejects_invalid_snapshots() {
        let mut history = HistoryRegistry::default();
        assert!(history.record("not-json".to_string()).is_err());
        assert!(history.undo("not-json".to_string()).is_err());
    }
}
