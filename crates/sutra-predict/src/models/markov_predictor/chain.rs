use super::state::{NextActionPredictionResult, PredictedActionItem, PredictionStatus};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct MarkovPredictor {
    first_order: HashMap<String, HashMap<String, u32>>,
    second_order: HashMap<(String, String), HashMap<String, u32>>,
    vocabulary: HashSet<String>,
    min_observations: u32,
}

impl Default for MarkovPredictor {
    fn default() -> Self {
        Self::new()
    }
}

impl MarkovPredictor {
    pub fn new() -> Self {
        Self {
            first_order: HashMap::new(),
            second_order: HashMap::new(),
            vocabulary: HashSet::new(),
            min_observations: 1,
        }
    }

    pub fn train_sequence(&mut self, sequence: &[String]) {
        if sequence.len() < 2 {
            if let Some(first) = sequence.first() {
                self.vocabulary.insert(first.clone());
            }
            return;
        }

        for &ref item in sequence {
            self.vocabulary.insert(item.clone());
        }

        // 1st order: a[i] -> a[i+1]
        for w in sequence.windows(2) {
            let from = &w[0];
            let to = &w[1];
            *self
                .first_order
                .entry(from.clone())
                .or_default()
                .entry(to.clone())
                .or_insert(0) += 1;
        }

        // 2nd order: (a[i], a[i+1]) -> a[i+2]
        for w in sequence.windows(3) {
            let from = (w[0].clone(), w[1].clone());
            let to = &w[2];
            *self
                .second_order
                .entry(from)
                .or_default()
                .entry(to.clone())
                .or_insert(0) += 1;
        }
    }

    pub fn train_batch(&mut self, sequences: &[Vec<String>]) {
        for seq in sequences {
            self.train_sequence(seq);
        }
    }

    pub fn record_feedback(
        &mut self,
        context: &[String],
        predicted: &str,
        user_action: &str,
        corrected: Option<&str>,
    ) {
        if context.is_empty() {
            return;
        }

        let last = &context[context.len() - 1];
        let second_last = if context.len() >= 2 {
            Some(&context[context.len() - 2])
        } else {
            None
        };

        match user_action {
            "accepted" => {
                // Boost confirmed transition
                *self
                    .first_order
                    .entry(last.clone())
                    .or_default()
                    .entry(predicted.to_string())
                    .or_insert(0) += 2;

                if let Some(sl) = second_last {
                    *self
                        .second_order
                        .entry((sl.clone(), last.clone()))
                        .or_default()
                        .entry(predicted.to_string())
                        .or_insert(0) += 2;
                }
            }
            "corrected" => {
                if let Some(corr) = corrected {
                    if !corr.trim().is_empty() {
                        self.vocabulary.insert(corr.to_string());
                        *self
                            .first_order
                            .entry(last.clone())
                            .or_default()
                            .entry(corr.to_string())
                            .or_insert(0) += 3;

                        if let Some(sl) = second_last {
                            *self
                                .second_order
                                .entry((sl.clone(), last.clone()))
                                .or_default()
                                .entry(corr.to_string())
                                .or_insert(0) += 3;
                        }
                    }
                }
            }
            "incorrect" | "dismissed" => {
                // Damping if count > 1
                if let Some(map) = self.first_order.get_mut(last) {
                    if let Some(cnt) = map.get_mut(predicted) {
                        if *cnt > 1 {
                            *cnt -= 1;
                        }
                    }
                }
                if let Some(sl) = second_last {
                    if let Some(map) = self.second_order.get_mut(&(sl.clone(), last.clone())) {
                        if let Some(cnt) = map.get_mut(predicted) {
                            if *cnt > 1 {
                                *cnt -= 1;
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    pub fn predict(&self, context: &[String]) -> NextActionPredictionResult {
        if context.is_empty() {
            return NextActionPredictionResult {
                predictions: Vec::new(),
                model: "markov_chain_order2_fallback1".to_string(),
                status: PredictionStatus::InsufficientData.as_str().to_string(),
                context_used: Vec::new(),
                explanation: "No recent desktop activity context available to evaluate predictions.".to_string(),
            };
        }

        // Try second-order Markov first
        if context.len() >= 2 {
            let key = (
                context[context.len() - 2].clone(),
                context[context.len() - 1].clone(),
            );
            if let Some(transitions) = self.second_order.get(&key) {
                let total_counts: u32 = transitions.values().sum();
                if total_counts >= self.min_observations {
                    let mut candidates: Vec<PredictedActionItem> = transitions
                        .iter()
                        .map(|(action, &cnt)| {
                            let prob = (cnt as f64) / (total_counts as f64);
                            // Bayesian support factor based on evidence count:
                            // count 1 => 0.50, count 3 => 0.75, count 5 => 0.83, count 10 => 0.91
                            let support_factor = 1.0 - (1.0 / (1.0 + (total_counts as f64)));
                            let conf = (prob * support_factor).clamp(0.01, 0.99);

                            PredictedActionItem {
                                action: action.clone(),
                                probability: (prob * 1000.0).round() / 1000.0,
                                confidence: (conf * 1000.0).round() / 1000.0,
                                count: cnt,
                                total_context_observations: total_counts,
                                markov_order: 2,
                            }
                        })
                        .collect();

                    candidates.sort_by(|a, b| {
                        b.probability
                            .partial_cmp(&a.probability)
                            .unwrap_or(std::cmp::Ordering::Equal)
                    });
                    candidates.truncate(3);

                    let top = &candidates[0];
                    let explanation = format!(
                        "Observed {} times ({:.1}% probability) following sequence '{} -> {}' (2nd-order Markov model)",
                        top.count,
                        top.probability * 100.0,
                        key.0,
                        key.1
                    );

                    return NextActionPredictionResult {
                        predictions: candidates,
                        model: "markov_chain_order2".to_string(),
                        status: PredictionStatus::PredictionAvailable.as_str().to_string(),
                        context_used: vec![key.0, key.1],
                        explanation,
                    };
                }
            }
        }

        // Fall back to first-order Markov
        let last_action = &context[context.len() - 1];
        if let Some(transitions) = self.first_order.get(last_action) {
            let total_counts: u32 = transitions.values().sum();
            if total_counts >= self.min_observations {
                let mut candidates: Vec<PredictedActionItem> = transitions
                    .iter()
                    .map(|(action, &cnt)| {
                        let prob = (cnt as f64) / (total_counts as f64);
                        // First-order gets a slight discount vs second order due to less specific context
                        let support_factor = (1.0 - (1.0 / (1.0 + (total_counts as f64)))) * 0.85;
                        let conf = (prob * support_factor).clamp(0.01, 0.95);

                        PredictedActionItem {
                            action: action.clone(),
                            probability: (prob * 1000.0).round() / 1000.0,
                            confidence: (conf * 1000.0).round() / 1000.0,
                            count: cnt,
                            total_context_observations: total_counts,
                            markov_order: 1,
                        }
                    })
                    .collect();

                candidates.sort_by(|a, b| {
                    b.probability
                        .partial_cmp(&a.probability)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                candidates.truncate(3);

                let top = &candidates[0];
                let explanation = format!(
                    "Observed {} times ({:.1}% probability) following '{}' (1st-order Markov fallback)",
                    top.count,
                    top.probability * 100.0,
                    last_action
                );

                return NextActionPredictionResult {
                    predictions: candidates,
                    model: "markov_chain_order1_fallback".to_string(),
                    status: PredictionStatus::PredictionAvailable.as_str().to_string(),
                    context_used: vec![last_action.clone()],
                    explanation,
                };
            }
        }

        // Neither order found transitions
        NextActionPredictionResult {
            predictions: Vec::new(),
            model: "markov_chain_order2_fallback1".to_string(),
            status: PredictionStatus::UnseenSequence.as_str().to_string(),
            context_used: vec![last_action.clone()],
            explanation: format!(
                "Action sequence ending with '{}' has not been previously observed in historical workflows.",
                last_action
            ),
        }
    }

    pub fn vocabulary_size(&self) -> usize {
        self.vocabulary.len()
    }

    pub fn transition_count_order1(&self) -> usize {
        self.first_order.values().map(|m| m.len()).sum()
    }

    pub fn transition_count_order2(&self) -> usize {
        self.second_order.values().map(|m| m.len()).sum()
    }
}
