use serde::Serialize;
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
};
use tauri::State;

const MAX_HISTORY_ENTRIES: usize = 100;
const MAX_HISTORY_BYTES: usize = 128 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES: usize = 32 * 1024 * 1024;

#[derive(Default)]
struct HistoryRegistry {
    undo: VecDeque<Arc<str>>,
    redo: VecDeque<Arc<str>>,
    bytes: usize,
    checkpoint: Option<Checkpoint>,
}

struct Checkpoint {
    checkout_id: String,
    snapshot: String,
    undo: VecDeque<Arc<str>>,
    redo: VecDeque<Arc<str>>,
    bytes: usize,
    changed: bool,
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

    fn clear_stack(stack: &mut VecDeque<Arc<str>>, bytes: &mut usize) {
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
        if let Some(checkpoint) = self.checkpoint.as_mut() {
            checkpoint.changed = true;
            return Ok(());
        }
        Self::clear_stack(&mut self.redo, &mut self.bytes);
        self.bytes += snapshot.len();
        self.undo.push_back(snapshot.into());
        self.trim();
        Ok(())
    }

    fn undo(&mut self, current: String) -> Result<Option<String>, String> {
        if self.checkpoint.is_some() {
            return Err("An agent edit checkpoint is active.".into());
        }
        Self::validate_snapshot(&current)?;
        let Some(previous) = self.undo.pop_back() else {
            return Ok(None);
        };
        self.bytes = self.bytes.saturating_sub(previous.len());
        self.bytes += current.len();
        self.redo.push_back(current.into());
        self.trim();
        Ok(Some(previous.to_string()))
    }

    fn redo(&mut self, current: String) -> Result<Option<String>, String> {
        if self.checkpoint.is_some() {
            return Err("An agent edit checkpoint is active.".into());
        }
        Self::validate_snapshot(&current)?;
        let Some(next) = self.redo.pop_back() else {
            return Ok(None);
        };
        self.bytes = self.bytes.saturating_sub(next.len());
        self.bytes += current.len();
        self.undo.push_back(current.into());
        self.trim();
        Ok(Some(next.to_string()))
    }

    fn clear(&mut self) {
        self.undo.clear();
        self.redo.clear();
        self.bytes = 0;
        self.checkpoint = None;
    }

    fn create_checkpoint(&mut self, checkout_id: String, snapshot: String) -> Result<(), String> {
        if checkout_id.trim().is_empty() {
            return Err("checkoutId must be non-empty.".into());
        }
        if self.checkpoint.is_some() {
            return Err("An edit checkpoint already exists.".into());
        }
        Self::validate_snapshot(&snapshot)?;
        // Baseline strings are shared, not duplicated. Agent edits do not append
        // intermediate snapshots; the checkout is committed as one history item.
        self.checkpoint = Some(Checkpoint {
            checkout_id,
            snapshot,
            undo: self.undo.clone(),
            redo: self.redo.clone(),
            bytes: self.bytes,
            changed: false,
        });
        Ok(())
    }

    fn checkpoint(&self, checkout_id: &str) -> Result<&Checkpoint, String> {
        self.checkpoint
            .as_ref()
            .filter(|checkpoint| checkpoint.checkout_id == checkout_id)
            .ok_or_else(|| "No checkpoint belongs to this checkoutId.".into())
    }

    fn finish_checkpoint(&mut self, checkout_id: &str, rollback: bool) -> Result<(), String> {
        self.checkpoint(checkout_id)?;
        let checkpoint = self.checkpoint.take().unwrap();
        if rollback {
            self.undo = checkpoint.undo;
            self.redo = checkpoint.redo;
            self.bytes = checkpoint.bytes;
        } else if checkpoint.changed {
            // One completed checkout contributes exactly one pre-work snapshot.
            self.undo = checkpoint.undo;
            self.redo = checkpoint.redo;
            self.bytes = checkpoint.bytes;
            Self::clear_stack(&mut self.redo, &mut self.bytes);
            self.bytes += checkpoint.snapshot.len();
            self.undo.push_back(checkpoint.snapshot.into());
            self.trim();
        }
        Ok(())
    }

    fn commit_checkpoint(&mut self, checkout_id: &str, changed: bool) -> Result<(), String> {
        self.checkpoint(checkout_id)?;
        self.checkpoint.as_mut().unwrap().changed |= changed;
        self.finish_checkpoint(checkout_id, false)
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

#[tauri::command]
pub fn edit_history_create_checkpoint(
    history: State<'_, EditHistory>,
    checkout_id: String,
    snapshot: String,
) -> Result<(), String> {
    lock_history(history.inner())?.create_checkpoint(checkout_id, snapshot)
}

#[tauri::command]
pub fn edit_history_get_checkpoint(
    history: State<'_, EditHistory>,
    checkout_id: String,
) -> Result<String, String> {
    Ok(lock_history(history.inner())?
        .checkpoint(&checkout_id)?
        .snapshot
        .clone())
}

#[tauri::command]
pub fn edit_history_finish_checkpoint(
    history: State<'_, EditHistory>,
    checkout_id: String,
    rollback: bool,
) -> Result<(), String> {
    lock_history(history.inner())?.finish_checkpoint(&checkout_id, rollback)
}

// A separate command makes old native binaries fail safely instead of silently
// ignoring a new grouping argument and losing the completed work's Undo entry.
#[tauri::command]
pub fn edit_history_commit_checkpoint(
    history: State<'_, EditHistory>,
    checkout_id: String,
    changed: bool,
) -> Result<(), String> {
    lock_history(history.inner())?.commit_checkpoint(&checkout_id, changed)
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
    fn checkpoint_restores_baseline_history_without_copying_strings() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.into()).unwrap();
        history.record(r#"{"value":1}"#.into()).unwrap();
        history.undo(r#"{"value":2}"#.into()).unwrap();
        let bytes = history.bytes;
        history
            .create_checkpoint("owner".into(), r#"{"value":1}"#.into())
            .unwrap();
        assert!(Arc::ptr_eq(
            &history.undo[0],
            &history.checkpoint("owner").unwrap().undo[0]
        ));
        assert!(history.undo(r#"{"value":1}"#.into()).is_err());
        assert!(history.redo(r#"{"value":1}"#.into()).is_err());
        history.record(r#"{"value":1}"#.into()).unwrap();
        history.record(r#"{"value":3}"#.into()).unwrap();
        assert_eq!(
            history.checkpoint("owner").unwrap().snapshot,
            r#"{"value":1}"#
        );
        history.finish_checkpoint("owner", true).unwrap();
        assert_eq!(history.bytes, bytes);
        assert_eq!(
            history.redo(r#"{"value":1}"#.into()).unwrap(),
            Some(r#"{"value":2}"#.into())
        );
        assert_eq!(history.redo(r#"{"value":2}"#.into()).unwrap(), None);
    }

    #[test]
    fn checkpoint_survives_many_edits_without_intermediate_history_growth() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.into()).unwrap();
        history
            .create_checkpoint("owner".into(), r#"{"value":1}"#.into())
            .unwrap();
        for value in 1..=MAX_HISTORY_ENTRIES + 10 {
            history.record(format!("{{\"value\":{value}}}")).unwrap();
        }
        assert_eq!(history.undo.len(), 1);
        history.finish_checkpoint("owner", true).unwrap();
        assert_eq!(
            history.undo(r#"{"value":1}"#.into()).unwrap(),
            Some(r#"{"value":0}"#.into())
        );
        assert_eq!(history.undo(r#"{"value":0}"#.into()).unwrap(), None);
    }

    #[test]
    fn checkpoint_ownership_and_validation_are_non_destructive() {
        let mut history = HistoryRegistry::default();
        assert!(history.create_checkpoint("".into(), "{}".into()).is_err());
        assert!(history
            .create_checkpoint("owner".into(), "bad".into())
            .is_err());
        assert!(history.checkpoint.is_none());
        history
            .create_checkpoint("owner".into(), "{}".into())
            .unwrap();
        assert!(history
            .create_checkpoint("other".into(), "{}".into())
            .is_err());
        assert!(history.checkpoint("other").is_err());
        assert!(history.finish_checkpoint("other", true).is_err());
        assert!(history.checkpoint("owner").is_ok());
        history.clear();
        assert!(history.checkpoint("owner").is_err());
    }

    #[test]
    fn checkin_keeps_live_history_and_drops_checkpoint() {
        let mut history = HistoryRegistry::default();
        history
            .create_checkpoint("owner".into(), "{}".into())
            .unwrap();
        history.record(r#"{"value":1}"#.into()).unwrap();
        history.finish_checkpoint("owner", false).unwrap();
        assert!(history.checkpoint.is_none());
        assert_eq!(
            history.undo(r#"{"value":2}"#.into()).unwrap(),
            Some("{}".into())
        );
    }

    #[test]
    fn completed_agent_work_is_one_undo_redo_and_clears_prior_redo() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.into()).unwrap();
        history.record(r#"{"value":1}"#.into()).unwrap();
        history.undo(r#"{"value":2}"#.into()).unwrap();
        history
            .create_checkpoint("owner".into(), r#"{"value":1}"#.into())
            .unwrap();
        for value in 1..=200 {
            history.record(format!("{{\"value\":{value}}}")).unwrap();
        }
        assert_eq!(history.undo.len(), 1); // No intermediate snapshots retained.
        history.commit_checkpoint("owner", true).unwrap();
        assert!(history.redo.is_empty());
        assert_eq!(history.undo.len(), 2);
        assert_eq!(
            history.undo(r#"{"value":201}"#.into()).unwrap(),
            Some(r#"{"value":1}"#.into())
        );
        assert_eq!(
            history.redo(r#"{"value":1}"#.into()).unwrap(),
            Some(r#"{"value":201}"#.into())
        );
        history.undo(r#"{"value":201}"#.into()).unwrap();
        assert_eq!(
            history.undo(r#"{"value":1}"#.into()).unwrap(),
            Some(r#"{"value":0}"#.into())
        );
    }

    #[test]
    fn unchanged_checkout_preserves_prior_undo_redo_and_wrong_owner_cannot_commit() {
        let mut history = HistoryRegistry::default();
        history.record(r#"{"value":0}"#.into()).unwrap();
        history.undo(r#"{"value":1}"#.into()).unwrap();
        let bytes = history.bytes;
        history
            .create_checkpoint("owner".into(), r#"{"value":0}"#.into())
            .unwrap();
        assert!(history.commit_checkpoint("other", true).is_err());
        assert!(!history.checkpoint("owner").unwrap().changed);
        history.commit_checkpoint("owner", false).unwrap();
        assert_eq!(history.bytes, bytes);
        assert!(history.undo.is_empty());
        assert_eq!(
            history.redo(r#"{"value":0}"#.into()).unwrap(),
            Some(r#"{"value":1}"#.into())
        );
    }

    #[test]
    fn completed_groups_obey_entry_limit() {
        let mut history = HistoryRegistry::default();
        for value in 0..MAX_HISTORY_ENTRIES {
            history.record(format!("{{\"value\":{value}}}")).unwrap();
        }
        history
            .create_checkpoint("owner".into(), r#"{"value":100}"#.into())
            .unwrap();
        history.commit_checkpoint("owner", true).unwrap();
        assert_eq!(history.undo.len(), MAX_HISTORY_ENTRIES);
        assert_eq!(&*history.undo[0], r#"{"value":1}"#);
        assert_eq!(history.undo.back().unwrap().as_ref(), r#"{"value":100}"#);
    }

    #[test]
    fn rejects_invalid_snapshots() {
        let mut history = HistoryRegistry::default();
        assert!(history.record("not-json".to_string()).is_err());
        assert!(history.undo("not-json".to_string()).is_err());
    }
}
