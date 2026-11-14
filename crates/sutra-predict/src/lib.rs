//! Sutra Predict: Predictive Analytics, Workflow Recognition, and Next-Action Intelligence Module
//!
//! Provides lightweight, privacy-preserving local predictive intelligence for Sutra:
//! - Collects permitted, sanitized desktop activity events with opt-in control.
//! - Stores patterns, predictions, and user feedback in embedded SQLite.
//! - Runs hierarchical 2nd-order Markov Chain model with 1st-order backoff.
//! - Mines recurring workflow patterns and identifies automation candidates.
//! - Generates automation recommendations linked strictly to verified Sutra tools.
//! - Evaluates prediction performance against ground-truth datasets.

pub mod analytics;
pub mod api;
pub mod evaluation;
pub mod event_collector;
pub mod models;
pub mod recommendation_engine;
pub mod storage;
pub mod workflow_recognition;

pub use analytics::PredictAnalyticsOverview;
pub use api::{PredictService, PredictServiceError};
pub use evaluation::{BenchmarkDataset, EvaluationReport, Evaluator};
pub use event_collector::{ActivityEvent, EventCollector, EventType, EventValidator, ValidationError};
pub use models::{MarkovPredictor, NextActionPredictionResult, PredictedActionItem, PredictionStatus};
pub use recommendation_engine::{AutomationRecommendation, ToolRecommendationEngine};
pub use storage::{PredictStorage, StorageError, StorageStats, StoredFeedback, StoredPattern, StoredPrediction};
pub use workflow_recognition::{
    AppTransition, AutomationOpportunity, PatternMiner, WorkflowInsights, WorkflowPattern,
};
