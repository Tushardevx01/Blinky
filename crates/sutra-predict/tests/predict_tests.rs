use sutra_predict::{
    ActivityEvent, BenchmarkDataset, Evaluator, MarkovPredictor, PredictService,
    ToolRecommendationEngine, ValidationError,
};

#[test]
fn test_markov_known_recurring_sequence() {
    let mut predictor = MarkovPredictor::new();

    let seq1 = vec![
        "open_vscode".to_string(),
        "open_project".to_string(),
        "open_terminal".to_string(),
        "run_dev_server".to_string(),
        "open_browser".to_string(),
    ];
    let seq2 = seq1.clone();
    let seq3 = seq1.clone();

    predictor.train_batch(&[seq1, seq2, seq3]);

    let context = vec![
        "open_vscode".to_string(),
        "open_project".to_string(),
        "open_terminal".to_string(),
        "run_dev_server".to_string(),
    ];

    let result = predictor.predict(&context);
    assert_eq!(result.status, "prediction_available");
    assert!(!result.predictions.is_empty());
    assert_eq!(result.predictions[0].action, "open_browser");
    assert_eq!(result.predictions[0].probability, 1.0);
    assert!(result.predictions[0].confidence > 0.6);
    assert_eq!(result.predictions[0].markov_order, 2);
}

#[test]
fn test_markov_unknown_sequence() {
    let mut predictor = MarkovPredictor::new();
    let seq = vec![
        "open_vscode".to_string(),
        "open_project".to_string(),
    ];
    predictor.train_sequence(&seq);

    let context = vec!["unknown_action_xyz".to_string()];
    let result = predictor.predict(&context);
    assert_eq!(result.status, "unseen_sequence");
    assert!(result.predictions.is_empty());
}

#[test]
fn test_markov_insufficient_data() {
    let predictor = MarkovPredictor::new();
    let empty_context: Vec<String> = Vec::new();
    let result = predictor.predict(&empty_context);
    assert_eq!(result.status, "insufficient_data");
    assert!(result.predictions.is_empty());
}

#[test]
fn test_markov_first_order_fallback() {
    let mut predictor = MarkovPredictor::new();

    // Sequence where "run_dev_server" -> "open_browser" was observed
    let seq = vec![
        "open_terminal".to_string(),
        "run_dev_server".to_string(),
        "open_browser".to_string(),
    ];
    predictor.train_sequence(&seq);

    // Unseen prefix but known 1st order predecessor
    let context = vec![
        "weird_predecessor".to_string(),
        "run_dev_server".to_string(),
    ];

    let result = predictor.predict(&context);
    assert_eq!(result.status, "prediction_available");
    assert_eq!(result.predictions[0].action, "open_browser");
    assert_eq!(result.predictions[0].markov_order, 1);
}

#[test]
fn test_privacy_and_sensitive_event_rejection() {
    let service = PredictService::new_in_memory().unwrap();

    let safe_event = ActivityEvent::new(
        "application_opened",
        "vscode",
        "open_project",
        None,
        true,
    );
    let res = service.record_event(safe_event).unwrap();
    assert!(res.is_some());

    // Event with sensitive password keyword
    let password_event = ActivityEvent::new(
        "automation_tool_executed",
        "terminal",
        "type_text password1234",
        None,
        true,
    );
    let err = service.record_event(password_event);
    assert!(err.is_err());
    match err.unwrap_err() {
        sutra_predict::PredictServiceError::Validation(ValidationError::SensitiveContentDetected(field)) => {
            assert_eq!(field, "action");
        }
        other => panic!("Expected SensitiveContentDetected, got: {:?}", other),
    }

    // Event with api_key
    let key_event = ActivityEvent::new(
        "automation_tool_executed",
        "curl",
        "export API_KEY=secret_token",
        None,
        true,
    );
    assert!(service.record_event(key_event).is_err());
}

#[test]
fn test_opt_in_tracking_toggle() {
    let service = PredictService::new_in_memory().unwrap();
    assert!(service.is_tracking_enabled());

    // Disable tracking
    service.set_tracking_enabled(false).unwrap();
    assert!(!service.is_tracking_enabled());

    let event = ActivityEvent::new(
        "application_opened",
        "terminal",
        "open_terminal",
        None,
        true,
    );
    let res = service.record_event(event).unwrap();
    // Tracking is disabled, event is dropped
    assert!(res.is_none());

    // Re-enable tracking
    service.set_tracking_enabled(true).unwrap();
    assert!(service.is_tracking_enabled());

    let event2 = ActivityEvent::new(
        "application_opened",
        "terminal",
        "open_terminal",
        None,
        true,
    );
    let res2 = service.record_event(event2).unwrap();
    assert!(res2.is_some());
}

#[test]
fn test_database_persistence_and_metrics() {
    let service = PredictService::new_in_memory().unwrap();

    let seeded = service.seed_sample_data().unwrap();
    assert!(seeded > 0);

    let overview = service.get_analytics_overview().unwrap();
    assert_eq!(overview.total_recorded_events, seeded as i64);
    assert!(overview.total_detected_workflows > 0);

    let context = vec![
        "open_terminal".to_string(),
        "run_dev_server".to_string(),
    ];
    let pred = service.predict_next_actions(&context, None).unwrap();
    assert_eq!(pred.status, "prediction_available");
    assert_eq!(pred.predictions[0].action, "open_browser");

    let history = service.get_prediction_history(10).unwrap();
    assert!(!history.is_empty());
    let pred_id = &history[0].prediction_id;

    // Submit user acceptance feedback
    service.submit_feedback(pred_id, "accepted", None, Some("open_browser")).unwrap();

    let updated_overview = service.get_analytics_overview().unwrap();
    assert_eq!(updated_overview.accepted_predictions, 1);
    assert_eq!(updated_overview.feedback_accuracy, 1.0);
}

#[test]
fn test_verified_tool_recommendations_only() {
    let engine = ToolRecommendationEngine::new();

    // Browser preview maps to verified "launch_app"
    let rec = engine.create_recommendation(
        "open_browser",
        0.88,
        &["open_terminal".to_string(), "run_dev_server".to_string()],
    );
    assert!(rec.is_some());
    let r = rec.unwrap();
    assert_eq!(r.tool_name, "launch_app");
    assert!(r.requires_user_approval);
    assert!(r.is_verified_tool);

    // Unmapped/unsupported action does not invent tools
    let invalid_rec = engine.create_recommendation("teleport_to_mars", 0.9, &[]);
    assert!(invalid_rec.is_none());
}

#[test]
fn test_benchmark_evaluation_methodology() {
    let ds = BenchmarkDataset::standard_developer_benchmark();
    let mut predictor = MarkovPredictor::new();
    predictor.train_batch(&ds.train_sequences);

    let report = Evaluator::evaluate(&predictor, ds.name, &ds.test_sequences);
    assert!(report.total_evaluated_samples > 0);
    assert!(report.top1_accuracy >= 0.80, "Expected >=80% Top-1 accuracy, got {}", report.top1_accuracy);
    assert!(report.top3_accuracy >= 0.95, "Expected >=95% Top-3 accuracy, got {}", report.top3_accuracy);
    assert!(report.average_latency_micros < 1000.0, "Expected <1ms latency, got {}us", report.average_latency_micros);
}
