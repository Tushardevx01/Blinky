use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PredictedActionItem {
    pub action: String,
    pub probability: f64,
    pub confidence: f64,
    pub count: u32,
    pub total_context_observations: u32,
    pub markov_order: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PredictionStatus {
    PredictionAvailable,
    InsufficientData,
    UnseenSequence,
}

impl PredictionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PredictionStatus::PredictionAvailable => "prediction_available",
            PredictionStatus::InsufficientData => "insufficient_data",
            PredictionStatus::UnseenSequence => "unseen_sequence",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextActionPredictionResult {
    pub predictions: Vec<PredictedActionItem>,
    pub model: String,
    pub status: String,
    pub context_used: Vec<String>,
    pub explanation: String,
}
