use crate::event_collector::ActivityEvent;
use crate::storage::schema::{CREATE_TABLES_SQL, CURRENT_SCHEMA_VERSION};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("SQLite database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("Migration failed: {0}")]
    Migration(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredPattern {
    pub pattern_id: String,
    pub pattern_name: String,
    pub sequence: Vec<String>,
    pub frequency: i64,
    pub last_seen: String,
    pub success_count: i64,
    pub failure_count: i64,
    pub suggested_tool: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredPrediction {
    pub prediction_id: String,
    pub context_sequence: Vec<String>,
    pub predicted_action: String,
    pub confidence: f64,
    pub model_name: String,
    pub status: String,
    pub explanation: Option<String>,
    pub recommended_tool: Option<String>,
    pub timestamp: String,
    pub feedback_action: Option<String>,
    pub corrected_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredFeedback {
    pub feedback_id: String,
    pub prediction_id: String,
    pub user_action: String,
    pub corrected_action: Option<String>,
    pub actual_next_action: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStats {
    pub total_events: i64,
    pub total_patterns: i64,
    pub total_predictions: i64,
    pub total_feedback: i64,
    pub accepted_predictions: i64,
    pub dismissed_predictions: i64,
    pub incorrect_predictions: i64,
    pub corrected_predictions: i64,
    pub feedback_accuracy: f64,
}

pub struct PredictStorage {
    conn: Arc<Mutex<Connection>>,
    #[allow(dead_code)]
    db_path: PathBuf,
}

impl PredictStorage {
    pub fn new_in_memory() -> Result<Self, StorageError> {
        let conn = Connection::open_in_memory()?;
        let storage = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: PathBuf::from(":memory:"),
        };
        storage.init_schema()?;
        Ok(storage)
    }

    pub fn new(path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let path_buf = path.as_ref().to_path_buf();
        if let Some(parent) = path_buf.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                StorageError::Migration(format!("Failed to create storage dir: {e}"))
            })?;
        }
        let conn = Connection::open(&path_buf)?;
        let storage = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: path_buf,
        };
        storage.init_schema()?;
        Ok(storage)
    }

    fn init_schema(&self) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;

        let mut user_version: i32 = conn.query_row("PRAGMA user_version;", [], |r| r.get(0))?;
        if user_version == 0 {
            conn.execute_batch(CREATE_TABLES_SQL)?;
            conn.execute(&format!("PRAGMA user_version = {};", CURRENT_SCHEMA_VERSION), [])?;
            user_version = CURRENT_SCHEMA_VERSION;
        }

        if user_version != CURRENT_SCHEMA_VERSION {
            return Err(StorageError::Migration(format!(
                "Unsupported schema version: {user_version}, expected: {CURRENT_SCHEMA_VERSION}"
            )));
        }

        Ok(())
    }

    pub fn insert_event(&self, event: &ActivityEvent) -> Result<bool, StorageError> {
        let conn = self.conn.lock().unwrap();
        let metadata_str = event
            .metadata
            .as_ref()
            .map(|m| serde_json::to_string(m))
            .transpose()?;

        let created_at = Utc::now().to_rfc3339();

        let res = conn.execute(
            "INSERT OR IGNORE INTO predictive_events 
             (event_id, event_type, application, action, timestamp, workflow_id, success, metadata, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                event.event_id,
                event.event_type,
                event.application,
                event.action,
                event.timestamp,
                event.workflow_id,
                if event.success { 1 } else { 0 },
                metadata_str,
                created_at,
            ],
        )?;

        Ok(res > 0)
    }

    pub fn get_recent_events(&self, limit: usize) -> Result<Vec<ActivityEvent>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT event_id, event_type, application, action, timestamp, workflow_id, success, metadata
             FROM predictive_events
             ORDER BY timestamp DESC
             LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            let meta_str: Option<String> = row.get(7)?;
            let metadata = meta_str.and_then(|s| serde_json::from_str(&s).ok());
            let success_int: i32 = row.get(6)?;

            Ok(ActivityEvent {
                event_id: row.get(0)?,
                event_type: row.get(1)?,
                application: row.get(2)?,
                action: row.get(3)?,
                timestamp: row.get(4)?,
                workflow_id: row.get(5)?,
                success: success_int != 0,
                metadata,
            })
        })?;

        let mut events = Vec::new();
        for r in rows {
            events.push(r?);
        }
        Ok(events)
    }

    pub fn get_action_sequences(&self, session_gap_seconds: i64) -> Result<Vec<Vec<String>>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT action, timestamp, workflow_id
             FROM predictive_events
             ORDER BY timestamp ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            let action: String = row.get(0)?;
            let ts: String = row.get(1)?;
            let wf: Option<String> = row.get(2)?;
            Ok((action, ts, wf))
        })?;

        let mut sequences: Vec<Vec<String>> = Vec::new();
        let mut current_seq: Vec<String> = Vec::new();
        let mut last_ts: Option<DateTime<Utc>> = None;
        let mut last_wf: Option<String> = None;

        for r in rows {
            let (action, ts_str, wf_id) = r?;
            let current_ts = DateTime::parse_from_rfc3339(&ts_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let mut split = false;
            if let Some(prev_wf) = &last_wf {
                if let Some(curr_wf) = &wf_id {
                    if prev_wf != curr_wf {
                        split = true;
                    }
                }
            }

            if !split {
                if let Some(prev_ts) = last_ts {
                    let diff = (current_ts - prev_ts).num_seconds();
                    if diff > session_gap_seconds {
                        split = true;
                    }
                }
            }

            if split && !current_seq.is_empty() {
                sequences.push(std::mem::take(&mut current_seq));
            }

            current_seq.push(action);
            last_ts = Some(current_ts);
            last_wf = wf_id;
        }

        if !current_seq.is_empty() {
            sequences.push(current_seq);
        }

        Ok(sequences)
    }

    pub fn upsert_pattern(
        &self,
        pattern_id: &str,
        pattern_name: &str,
        sequence: &[String],
        frequency: i64,
        success: bool,
        suggested_tool: Option<&str>,
    ) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        let seq_json = serde_json::to_string(sequence)?;
        let last_seen = Utc::now().to_rfc3339();

        let success_inc = if success { 1 } else { 0 };
        let fail_inc = if success { 0 } else { 1 };

        conn.execute(
            "INSERT INTO workflow_patterns 
             (pattern_id, pattern_name, sequence_json, frequency, last_seen, success_count, failure_count, suggested_tool)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(sequence_json) DO UPDATE SET
                frequency = workflow_patterns.frequency + ?4,
                last_seen = ?5,
                success_count = workflow_patterns.success_count + ?6,
                failure_count = workflow_patterns.failure_count + ?7,
                suggested_tool = COALESCE(?8, workflow_patterns.suggested_tool)",
            params![
                pattern_id,
                pattern_name,
                seq_json,
                frequency,
                last_seen,
                success_inc,
                fail_inc,
                suggested_tool
            ],
        )?;

        Ok(())
    }

    pub fn get_top_patterns(&self, limit: usize) -> Result<Vec<StoredPattern>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT pattern_id, pattern_name, sequence_json, frequency, last_seen, success_count, failure_count, suggested_tool
             FROM workflow_patterns
             ORDER BY frequency DESC
             LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            let seq_json: String = row.get(2)?;
            let sequence: Vec<String> = serde_json::from_str(&seq_json).unwrap_or_default();
            Ok(StoredPattern {
                pattern_id: row.get(0)?,
                pattern_name: row.get(1)?,
                sequence,
                frequency: row.get(3)?,
                last_seen: row.get(4)?,
                success_count: row.get(5)?,
                failure_count: row.get(6)?,
                suggested_tool: row.get(7)?,
            })
        })?;

        let mut patterns = Vec::new();
        for r in rows {
            patterns.push(r?);
        }
        Ok(patterns)
    }

    pub fn save_prediction(
        &self,
        prediction_id: &str,
        context_sequence: &[String],
        predicted_action: &str,
        confidence: f64,
        model_name: &str,
        status: &str,
        explanation: Option<&str>,
        recommended_tool: Option<&str>,
    ) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        let context_json = serde_json::to_string(context_sequence)?;
        let ts = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO action_predictions
             (prediction_id, context_sequence_json, predicted_action, confidence, model_name, status, explanation, recommended_tool, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                prediction_id,
                context_json,
                predicted_action,
                confidence,
                model_name,
                status,
                explanation,
                recommended_tool,
                ts
            ],
        )?;

        Ok(())
    }

    pub fn get_predictions(&self, limit: usize) -> Result<Vec<StoredPrediction>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.prediction_id, p.context_sequence_json, p.predicted_action, p.confidence, 
                    p.model_name, p.status, p.explanation, p.recommended_tool, p.timestamp,
                    f.user_action, f.corrected_action
             FROM action_predictions p
             LEFT JOIN prediction_feedback f ON p.prediction_id = f.prediction_id
             ORDER BY p.timestamp DESC
             LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            let ctx_json: String = row.get(1)?;
            let context: Vec<String> = serde_json::from_str(&ctx_json).unwrap_or_default();
            Ok(StoredPrediction {
                prediction_id: row.get(0)?,
                context_sequence: context,
                predicted_action: row.get(2)?,
                confidence: row.get(3)?,
                model_name: row.get(4)?,
                status: row.get(5)?,
                explanation: row.get(6)?,
                recommended_tool: row.get(7)?,
                timestamp: row.get(8)?,
                feedback_action: row.get(9)?,
                corrected_action: row.get(10)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_feedback(
        &self,
        feedback_id: &str,
        prediction_id: &str,
        user_action: &str,
        corrected_action: Option<&str>,
        actual_next_action: Option<&str>,
    ) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        let ts = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO prediction_feedback
             (feedback_id, prediction_id, user_action, corrected_action, actual_next_action, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                feedback_id,
                prediction_id,
                user_action,
                corrected_action,
                actual_next_action,
                ts
            ],
        )?;

        Ok(())
    }

    pub fn get_stats(&self) -> Result<StorageStats, StorageError> {
        let conn = self.conn.lock().unwrap();

        let total_events: i64 = conn.query_row("SELECT COUNT(*) FROM predictive_events", [], |r| r.get(0))?;
        let total_patterns: i64 = conn.query_row("SELECT COUNT(*) FROM workflow_patterns", [], |r| r.get(0))?;
        let total_predictions: i64 = conn.query_row("SELECT COUNT(*) FROM action_predictions", [], |r| r.get(0))?;
        let total_feedback: i64 = conn.query_row("SELECT COUNT(*) FROM prediction_feedback", [], |r| r.get(0))?;

        let accepted: i64 = conn.query_row(
            "SELECT COUNT(*) FROM prediction_feedback WHERE user_action = 'accepted'",
            [],
            |r| r.get(0),
        )?;
        let dismissed: i64 = conn.query_row(
            "SELECT COUNT(*) FROM prediction_feedback WHERE user_action = 'dismissed'",
            [],
            |r| r.get(0),
        )?;
        let incorrect: i64 = conn.query_row(
            "SELECT COUNT(*) FROM prediction_feedback WHERE user_action = 'incorrect'",
            [],
            |r| r.get(0),
        )?;
        let corrected: i64 = conn.query_row(
            "SELECT COUNT(*) FROM prediction_feedback WHERE user_action = 'corrected'",
            [],
            |r| r.get(0),
        )?;

        let evaluated_total = accepted + incorrect + corrected;
        let feedback_accuracy = if evaluated_total > 0 {
            (accepted as f64) / (evaluated_total as f64)
        } else {
            0.0
        };

        Ok(StorageStats {
            total_events,
            total_patterns,
            total_predictions,
            total_feedback,
            accepted_predictions: accepted,
            dismissed_predictions: dismissed,
            incorrect_predictions: incorrect,
            corrected_predictions: corrected,
            feedback_accuracy,
        })
    }

    pub fn clear_events(&self) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM predictive_events", [])?;
        conn.execute("DELETE FROM workflow_patterns", [])?;
        Ok(())
    }

    pub fn purge_all_predict_data(&self) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM prediction_feedback", [])?;
        conn.execute("DELETE FROM action_predictions", [])?;
        conn.execute("DELETE FROM workflow_patterns", [])?;
        conn.execute("DELETE FROM predictive_events", [])?;
        conn.execute("DELETE FROM predict_settings", [])?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let val: Option<String> = conn
            .query_row("SELECT value FROM predict_settings WHERE key = ?1", params![key], |r| r.get(0))
            .optional()?;
        Ok(val)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO predict_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )?;
        Ok(())
    }
}
