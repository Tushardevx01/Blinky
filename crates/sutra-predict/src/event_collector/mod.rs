pub mod validator;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use uuid::Uuid;
pub use validator::{EventType, EventValidator, ValidationError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEvent {
    pub event_id: String,
    pub event_type: String,
    pub application: String,
    pub action: String,
    pub timestamp: String,
    pub workflow_id: Option<String>,
    pub success: bool,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

impl ActivityEvent {
    pub fn new(
        event_type: impl Into<String>,
        application: impl Into<String>,
        action: impl Into<String>,
        workflow_id: Option<String>,
        success: bool,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4().to_string(),
            event_type: event_type.into(),
            application: application.into(),
            action: action.into(),
            timestamp: Utc::now().to_rfc3339(),
            workflow_id,
            success,
            metadata: None,
        }
    }
}

pub struct EventCollector {
    tracking_enabled: Arc<AtomicBool>,
}

impl Default for EventCollector {
    fn default() -> Self {
        Self::new(true)
    }
}

impl EventCollector {
    pub fn new(initial_enabled: bool) -> Self {
        Self {
            tracking_enabled: Arc::new(AtomicBool::new(initial_enabled)),
        }
    }

    pub fn is_tracking_enabled(&self) -> bool {
        self.tracking_enabled.load(Ordering::Relaxed)
    }

    pub fn set_tracking_enabled(&self, enabled: bool) {
        self.tracking_enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn process_event(&self, mut event: ActivityEvent) -> Result<Option<ActivityEvent>, ValidationError> {
        if !self.is_tracking_enabled() {
            return Ok(None);
        }

        let (et, app, action) = EventValidator::validate_and_sanitize(
            &event.event_type,
            &event.application,
            &event.action,
        )?;

        event.event_type = et.as_str().to_string();
        event.application = app;
        event.action = action;

        if event.event_id.trim().is_empty() {
            event.event_id = Uuid::new_v4().to_string();
        }

        if event.timestamp.trim().is_empty() {
            event.timestamp = Utc::now().to_rfc3339();
        }

        // Sanitize metadata: remove private or excessively deep json
        if let Some(meta) = &mut event.metadata {
            if let Some(obj) = meta.as_object_mut() {
                obj.retain(|k, _v| {
                    let k_lower = k.to_lowercase();
                    !k_lower.contains("token")
                        && !k_lower.contains("password")
                        && !k_lower.contains("secret")
                        && !k_lower.contains("key")
                });
            }
        }

        Ok(Some(event))
    }
}
