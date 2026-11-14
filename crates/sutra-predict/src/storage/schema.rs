pub const CURRENT_SCHEMA_VERSION: i32 = 1;

pub const CREATE_TABLES_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS predictive_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    application TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    workflow_id TEXT,
    success INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(event_type, application, action, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_predictive_events_timestamp ON predictive_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_predictive_events_app_action ON predictive_events(application, action);
CREATE INDEX IF NOT EXISTS idx_predictive_events_workflow ON predictive_events(workflow_id);

CREATE TABLE IF NOT EXISTS workflow_patterns (
    pattern_id TEXT PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    sequence_json TEXT NOT NULL UNIQUE,
    frequency INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 1,
    failure_count INTEGER NOT NULL DEFAULT 0,
    suggested_tool TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_patterns_freq ON workflow_patterns(frequency DESC);

CREATE TABLE IF NOT EXISTS action_predictions (
    prediction_id TEXT PRIMARY KEY,
    context_sequence_json TEXT NOT NULL,
    predicted_action TEXT NOT NULL,
    confidence REAL NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT NOT NULL,
    explanation TEXT,
    recommended_tool TEXT,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_predictions_time ON action_predictions(timestamp DESC);

CREATE TABLE IF NOT EXISTS prediction_feedback (
    feedback_id TEXT PRIMARY KEY,
    prediction_id TEXT NOT NULL,
    user_action TEXT NOT NULL,
    corrected_action TEXT,
    actual_next_action TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(prediction_id) REFERENCES action_predictions(prediction_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prediction_feedback_pred ON prediction_feedback(prediction_id);

CREATE TABLE IF NOT EXISTS predict_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;
