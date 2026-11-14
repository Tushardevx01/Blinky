use crate::analytics::{AnalyticsEngine, PredictAnalyticsOverview};
use crate::evaluation::{BenchmarkDataset, EvaluationReport, Evaluator};
use crate::event_collector::{ActivityEvent, EventCollector, ValidationError};
use crate::models::{MarkovPredictor, NextActionPredictionResult};
use crate::recommendation_engine::{AutomationRecommendation, ToolRecommendationEngine};
use crate::storage::{PredictStorage, StorageError, StoredPrediction};
use crate::workflow_recognition::{PatternMiner, WorkflowInsights};
use std::path::Path;
use std::sync::{Arc, RwLock};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum PredictServiceError {
    #[error("Storage error: {0}")]
    Storage(#[from] StorageError),
    #[error("Validation error: {0}")]
    Validation(#[from] ValidationError),
    #[error("Prediction error: {0}")]
    Prediction(String),
}

pub struct PredictService {
    collector: EventCollector,
    storage: Arc<PredictStorage>,
    model: Arc<RwLock<MarkovPredictor>>,
    miner: PatternMiner,
    rec_engine: ToolRecommendationEngine,
}

impl PredictService {
    pub fn new_in_memory() -> Result<Self, PredictServiceError> {
        let storage = Arc::new(PredictStorage::new_in_memory()?);
        let service = Self {
            collector: EventCollector::new(true),
            storage,
            model: Arc::new(RwLock::new(MarkovPredictor::new())),
            miner: PatternMiner::new(2),
            rec_engine: ToolRecommendationEngine::new(),
        };
        Ok(service)
    }

    pub fn new(db_path: impl AsRef<Path>) -> Result<Self, PredictServiceError> {
        let storage = Arc::new(PredictStorage::new(db_path)?);

        let tracking_setting = storage.get_setting("tracking_enabled")?.unwrap_or_else(|| "true".to_string());
        let tracking_enabled = tracking_setting == "true" || tracking_setting == "1";

        let service = Self {
            collector: EventCollector::new(tracking_enabled),
            storage: storage.clone(),
            model: Arc::new(RwLock::new(MarkovPredictor::new())),
            miner: PatternMiner::new(2),
            rec_engine: ToolRecommendationEngine::new(),
        };

        service.reload_model_from_storage()?;
        Ok(service)
    }

    pub fn reload_model_from_storage(&self) -> Result<(), PredictServiceError> {
        let sequences = self.storage.get_action_sequences(120)?;
        let mut model = self.model.write().unwrap();
        *model = MarkovPredictor::new();
        model.train_batch(&sequences);
        Ok(())
    }

    pub fn is_tracking_enabled(&self) -> bool {
        self.collector.is_tracking_enabled()
    }

    pub fn set_tracking_enabled(&self, enabled: bool) -> Result<(), PredictServiceError> {
        self.collector.set_tracking_enabled(enabled);
        self.storage
            .set_setting("tracking_enabled", if enabled { "true" } else { "false" })?;
        Ok(())
    }

    pub fn record_event(&self, event: ActivityEvent) -> Result<Option<ActivityEvent>, PredictServiceError> {
        let processed = self.collector.process_event(event)?;
        if let Some(valid_ev) = &processed {
            let inserted = self.storage.insert_event(valid_ev)?;
            if inserted {
                // Incrementally train Markov model
                let recent = self.storage.get_recent_events(3)?;
                if recent.len() >= 2 {
                    let mut seq: Vec<String> = recent.into_iter().map(|e| e.action).collect();
                    seq.reverse(); // Chronological order
                    let mut model = self.model.write().unwrap();
                    model.train_sequence(&seq);
                }
            }
        }
        Ok(processed)
    }

    pub fn predict_next_actions(
        &self,
        context_actions: &[String],
        _current_app: Option<&str>,
    ) -> Result<NextActionPredictionResult, PredictServiceError> {
        let result = {
            let model = self.model.read().unwrap();
            model.predict(context_actions)
        };

        if !result.predictions.is_empty() {
            let top = &result.predictions[0];
            let pred_id = format!("pred_{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());

            let rec = self.rec_engine.create_recommendation(&top.action, top.confidence, context_actions);
            let rec_tool = rec.as_ref().map(|r| r.tool_name.as_str());

            self.storage.save_prediction(
                &pred_id,
                context_actions,
                &top.action,
                top.confidence,
                &result.model,
                &result.status,
                Some(&result.explanation),
                rec_tool,
            )?;
        }

        Ok(result)
    }

    pub fn get_automation_recommendations(
        &self,
        context_actions: &[String],
    ) -> Result<Vec<AutomationRecommendation>, PredictServiceError> {
        let prediction = self.predict_next_actions(context_actions, None)?;
        let mut recs = Vec::new();

        for item in &prediction.predictions {
            if let Some(rec) = self.rec_engine.create_recommendation(&item.action, item.confidence, context_actions) {
                recs.push(rec);
            }
        }

        Ok(recs)
    }

    pub fn get_workflow_insights(&self) -> Result<WorkflowInsights, PredictServiceError> {
        let raw_events = self.storage.get_recent_events(500)?;
        if raw_events.is_empty() {
            return Ok(WorkflowInsights {
                total_workflows_detected: 0,
                frequent_workflows: Vec::new(),
                app_transitions: Vec::new(),
                repeated_task_sequences: Vec::new(),
                frequently_failed_sequences: Vec::new(),
                automation_opportunities: Vec::new(),
            });
        }

        let action_seqs = self.storage.get_action_sequences(120)?;

        let mut app_seqs: Vec<Vec<String>> = Vec::new();
        let mut curr_apps: Vec<String> = Vec::new();
        for ev in raw_events.iter().rev() {
            curr_apps.push(ev.application.clone());
        }
        if !curr_apps.is_empty() {
            app_seqs.push(curr_apps);
        }

        let success_flags = vec![true; action_seqs.len()];
        let insights = self.miner.analyze(&action_seqs, &app_seqs, &success_flags);

        for pat in &insights.frequent_workflows {
            let _ = self.storage.upsert_pattern(
                &pat.pattern_id,
                &pat.name,
                &pat.sequence,
                pat.frequency as i64,
                pat.success_rate >= 0.5,
                None,
            );
        }

        Ok(insights)
    }

    pub fn get_prediction_history(&self, limit: usize) -> Result<Vec<StoredPrediction>, PredictServiceError> {
        Ok(self.storage.get_predictions(limit)?)
    }

    pub fn submit_feedback(
        &self,
        prediction_id: &str,
        user_action: &str,
        corrected_action: Option<&str>,
        actual_next_action: Option<&str>,
    ) -> Result<(), PredictServiceError> {
        let feedback_id = format!("fb_{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());

        self.storage.save_feedback(
            &feedback_id,
            prediction_id,
            user_action,
            corrected_action,
            actual_next_action,
        )?;

        // Update the Markov model weights based on feedback
        let predictions = self.storage.get_predictions(50)?;
        if let Some(target_pred) = predictions.iter().find(|p| p.prediction_id == prediction_id) {
            let mut model = self.model.write().unwrap();
            model.record_feedback(
                &target_pred.context_sequence,
                &target_pred.predicted_action,
                user_action,
                corrected_action,
            );
        }

        Ok(())
    }

    pub fn get_analytics_overview(&self) -> Result<PredictAnalyticsOverview, PredictServiceError> {
        let stats = self.storage.get_stats()?;
        let patterns = self.storage.get_top_patterns(100)?;
        let overview = AnalyticsEngine::build_overview(
            &stats,
            patterns.len(),
            self.collector.is_tracking_enabled(),
        );
        Ok(overview)
    }

    pub fn run_evaluation(&self, custom_dataset: Option<BenchmarkDataset>) -> Result<EvaluationReport, PredictServiceError> {
        let ds = custom_dataset.unwrap_or_else(BenchmarkDataset::standard_developer_benchmark);
        let mut eval_model = MarkovPredictor::new();
        eval_model.train_batch(&ds.train_sequences);

        let report = Evaluator::evaluate(&eval_model, ds.name, &ds.test_sequences);
        Ok(report)
    }

    pub fn clear_history(&self) -> Result<(), PredictServiceError> {
        self.storage.clear_events()?;
        let mut model = self.model.write().unwrap();
        *model = MarkovPredictor::new();
        Ok(())
    }

    pub fn purge_all_data(&self) -> Result<(), PredictServiceError> {
        self.storage.purge_all_predict_data()?;
        let mut model = self.model.write().unwrap();
        *model = MarkovPredictor::new();
        Ok(())
    }

    pub fn seed_sample_data(&self) -> Result<usize, PredictServiceError> {
        let sample_workflows = vec![
            vec![
                ("vscode", "open_vscode"),
                ("vscode", "open_project"),
                ("terminal", "open_terminal"),
                ("terminal", "run_dev_server"),
                ("browser", "open_browser"),
            ],
            vec![
                ("vscode", "open_vscode"),
                ("vscode", "open_project"),
                ("terminal", "open_terminal"),
                ("terminal", "run_dev_server"),
                ("browser", "open_browser"),
            ],
            vec![
                ("vscode", "open_vscode"),
                ("vscode", "open_project"),
                ("terminal", "open_terminal"),
                ("terminal", "run_dev_server"),
                ("browser", "open_browser"),
            ],
            vec![
                ("browser", "open_browser"),
                ("browser", "search_docs"),
                ("vscode", "open_vscode"),
                ("vscode", "paste_snippet"),
            ],
            vec![
                ("terminal", "git_status"),
                ("terminal", "git_commit"),
                ("terminal", "git_push"),
                ("browser", "open_browser"),
            ],
            vec![
                ("terminal", "git_status"),
                ("terminal", "git_commit"),
                ("terminal", "git_push"),
                ("browser", "open_browser"),
            ],
        ];

        let mut count = 0;
        let base_time = chrono::Utc::now() - chrono::Duration::hours(5);

        for (w_idx, wf) in sample_workflows.iter().enumerate() {
            let wf_id = format!("wf_seed_{}", w_idx);
            for (step_idx, (app, action)) in wf.iter().enumerate() {
                let ts = base_time + chrono::Duration::minutes((w_idx * 15 + step_idx) as i64);
                let ev = ActivityEvent {
                    event_id: format!("seed_{}_{}", w_idx, step_idx),
                    event_type: "application_opened".to_string(),
                    application: app.to_string(),
                    action: action.to_string(),
                    timestamp: ts.to_rfc3339(),
                    workflow_id: Some(wf_id.clone()),
                    success: true,
                    metadata: None,
                };
                let _ = self.record_event(ev);
                count += 1;
            }
        }

        self.reload_model_from_storage()?;
        let _ = self.get_workflow_insights();
        Ok(count)
    }
}
