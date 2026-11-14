use crate::storage::StorageStats;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictAnalyticsOverview {
    pub total_recorded_events: i64,
    pub total_detected_workflows: usize,
    pub total_predictions_generated: i64,
    pub feedback_accuracy: f64,
    pub accepted_predictions: i64,
    pub dismissed_predictions: i64,
    pub incorrect_predictions: i64,
    pub corrected_predictions: i64,
    pub tracking_active: bool,
    pub model_name: String,
}

pub struct AnalyticsEngine;

impl AnalyticsEngine {
    pub fn build_overview(
        storage_stats: &StorageStats,
        detected_workflows_count: usize,
        tracking_active: bool,
    ) -> PredictAnalyticsOverview {
        PredictAnalyticsOverview {
            total_recorded_events: storage_stats.total_events,
            total_detected_workflows: detected_workflows_count,
            total_predictions_generated: storage_stats.total_predictions,
            feedback_accuracy: storage_stats.feedback_accuracy,
            accepted_predictions: storage_stats.accepted_predictions,
            dismissed_predictions: storage_stats.dismissed_predictions,
            incorrect_predictions: storage_stats.incorrect_predictions,
            corrected_predictions: storage_stats.corrected_predictions,
            tracking_active,
            model_name: "2nd-Order Markov Chain with 1st-Order Backoff".to_string(),
        }
    }
}
