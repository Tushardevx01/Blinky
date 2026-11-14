use crate::models::MarkovPredictor;
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationReport {
    pub dataset_name: String,
    pub top1_accuracy: f64,
    pub top3_accuracy: f64,
    pub average_latency_micros: f64,
    pub total_evaluated_samples: usize,
    pub correct_top1: usize,
    pub correct_top3: usize,
    pub workflow_recognition_frequency: usize,
}

pub struct Evaluator;

impl Evaluator {
    pub fn evaluate(predictor: &MarkovPredictor, dataset_name: &str, test_sequences: &[Vec<String>]) -> EvaluationReport {
        let mut total_samples = 0;
        let mut correct_top1 = 0;
        let mut correct_top3 = 0;
        let mut total_latency_nanos: u128 = 0;

        for seq in test_sequences {
            if seq.len() < 2 {
                continue;
            }

            for t in 1..seq.len() {
                let context = &seq[0..t];
                let ground_truth = &seq[t];

                let start = Instant::now();
                let res = predictor.predict(context);
                let elapsed = start.elapsed();
                total_latency_nanos += elapsed.as_nanos();
                total_samples += 1;

                if !res.predictions.is_empty() {
                    if res.predictions[0].action == *ground_truth {
                        correct_top1 += 1;
                    }
                    if res.predictions.iter().any(|p| p.action == *ground_truth) {
                        correct_top3 += 1;
                    }
                }
            }
        }

        let top1_acc = if total_samples > 0 {
            (correct_top1 as f64) / (total_samples as f64)
        } else {
            0.0
        };

        let top3_acc = if total_samples > 0 {
            (correct_top3 as f64) / (total_samples as f64)
        } else {
            0.0
        };

        let avg_latency_micros = if total_samples > 0 {
            (total_latency_nanos as f64) / (total_samples as f64) / 1000.0
        } else {
            0.0
        };

        EvaluationReport {
            dataset_name: dataset_name.to_string(),
            top1_accuracy: (top1_acc * 1000.0).round() / 1000.0,
            top3_accuracy: (top3_acc * 1000.0).round() / 1000.0,
            average_latency_micros: (avg_latency_micros * 10.0).round() / 10.0,
            total_evaluated_samples: total_samples,
            correct_top1,
            correct_top3,
            workflow_recognition_frequency: test_sequences.len(),
        }
    }
}
