use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Missing or empty field: {0}")]
    MissingField(&'static str),
    #[error("Invalid event type: {0}")]
    InvalidEventType(String),
    #[error("Event exceeds maximum length for field: {0}")]
    FieldTooLong(&'static str),
    #[error("Sensitive content detected in field '{0}' - event rejected for privacy")]
    SensitiveContentDetected(&'static str),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    ApplicationOpened,
    ApplicationSwitched,
    AutomationToolExecuted,
    WorkflowStarted,
    WorkflowCompleted,
    WorkflowFailed,
    RecommendationAccepted,
    RecommendationDismissed,
}

impl EventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            EventType::ApplicationOpened => "application_opened",
            EventType::ApplicationSwitched => "application_switched",
            EventType::AutomationToolExecuted => "automation_tool_executed",
            EventType::WorkflowStarted => "workflow_started",
            EventType::WorkflowCompleted => "workflow_completed",
            EventType::WorkflowFailed => "workflow_failed",
            EventType::RecommendationAccepted => "recommendation_accepted",
            EventType::RecommendationDismissed => "recommendation_dismissed",
        }
    }

    pub fn from_str_loose(s: &str) -> Result<Self, ValidationError> {
        let normalized = s.trim().to_lowercase();
        match normalized.as_str() {
            "application_opened" | "app_opened" | "open_app" => Ok(EventType::ApplicationOpened),
            "application_switched" | "app_switched" | "switch_app" => Ok(EventType::ApplicationSwitched),
            "automation_tool_executed" | "tool_executed" | "tool_run" => Ok(EventType::AutomationToolExecuted),
            "workflow_started" | "workflow_start" => Ok(EventType::WorkflowStarted),
            "workflow_completed" | "workflow_complete" | "workflow_success" => Ok(EventType::WorkflowCompleted),
            "workflow_failed" | "workflow_error" => Ok(EventType::WorkflowFailed),
            "recommendation_accepted" | "prediction_accepted" => Ok(EventType::RecommendationAccepted),
            "recommendation_dismissed" | "prediction_dismissed" => Ok(EventType::RecommendationDismissed),
            _ => Err(ValidationError::InvalidEventType(s.to_string())),
        }
    }
}

pub struct EventValidator;

impl EventValidator {
    const MAX_FIELD_LEN: usize = 256;

    // Pattern substrings that indicate passwords, tokens, private keys or sensitive personal info
    const SENSITIVE_KEYWORDS: &'static [&'static str] = &[
        "password",
        "passwd",
        "bearer ",
        "token=",
        "auth_token",
        "access_token",
        "refresh_token",
        "id_token",
        "api_key",
        "apikey",
        "secret",
        "private_key",
        "private key",
        "begin rsa private key",
        "begin openssh private key",
        "session_token",
        "ssn",
        "cvv",
        "credit_card",
    ];

    pub fn validate_and_sanitize(
        event_type: &str,
        application: &str,
        action: &str,
    ) -> Result<(EventType, String, String), ValidationError> {
        let et = EventType::from_str_loose(event_type)?;

        let app_clean = application.trim();
        if app_clean.is_empty() {
            return Err(ValidationError::MissingField("application"));
        }
        if app_clean.len() > Self::MAX_FIELD_LEN {
            return Err(ValidationError::FieldTooLong("application"));
        }

        let action_clean = action.trim();
        if action_clean.is_empty() {
            return Err(ValidationError::MissingField("action"));
        }
        if action_clean.len() > Self::MAX_FIELD_LEN {
            return Err(ValidationError::FieldTooLong("action"));
        }

        // Privacy check
        let lower_action = action_clean.to_lowercase();
        for &kw in Self::SENSITIVE_KEYWORDS {
            if lower_action.contains(kw) {
                return Err(ValidationError::SensitiveContentDetected("action"));
            }
        }

        let lower_app = app_clean.to_lowercase();
        for &kw in Self::SENSITIVE_KEYWORDS {
            if lower_app.contains(kw) {
                return Err(ValidationError::SensitiveContentDetected("application"));
            }
        }

        Ok((et, app_clean.to_string(), action_clean.to_string()))
    }
}
