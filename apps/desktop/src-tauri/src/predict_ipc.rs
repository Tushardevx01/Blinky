use sutra_predict::{ActivityEvent, PredictService};
use std::path::PathBuf;
use std::sync::{Arc, OnceLock};
use tauri::{AppHandle, Manager};

static PREDICT_SERVICE: OnceLock<Arc<PredictService>> = OnceLock::new();

pub fn get_predict_service(app: &AppHandle) -> Result<Arc<PredictService>, String> {
    if let Some(service) = PREDICT_SERVICE.get() {
        return Ok(service.clone());
    }

    let root = match super::project_root(app) {
        Ok(r) => r,
        Err(_) => std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
    };

    let db_path = root.join("tmp").join("sutra_predict.db");

    let service = PredictService::new(&db_path)
        .map_err(|e| format!("Failed to initialize Sutra Predict service: {e}"))?;
    let arc_service = Arc::new(service);

    let _ = PREDICT_SERVICE.set(arc_service.clone());
    Ok(arc_service)
}

#[tauri::command]
pub async fn predict_record_event(
    app: AppHandle,
    event: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;

    let activity_event: ActivityEvent = serde_json::from_value(event)
        .map_err(|e| format!("Invalid activity event payload: {e}"))?;

    let res = service
        .record_event(activity_event)
        .map_err(|e| format!("Record event failed: {e}"))?;

    Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_next_actions(
    app: AppHandle,
    context_actions: Vec<String>,
    current_app: Option<String>,
) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;

    let res = service
        .predict_next_actions(&context_actions, current_app.as_deref())
        .map_err(|e| format!("Prediction failed: {e}"))?;

    Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_get_workflow_insights(app: AppHandle) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;

    let insights = service
        .get_workflow_insights()
        .map_err(|e| format!("Failed to extract workflow insights: {e}"))?;

    Ok(serde_json::to_value(insights).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_get_history(
    app: AppHandle,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;
    let history = service
        .get_prediction_history(limit.unwrap_or(50))
        .map_err(|e| format!("Failed to fetch prediction history: {e}"))?;

    Ok(serde_json::to_value(history).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_submit_feedback(
    app: AppHandle,
    prediction_id: String,
    user_action: String,
    corrected_action: Option<String>,
    actual_next_action: Option<String>,
) -> Result<bool, String> {
    let service = get_predict_service(&app)?;

    service
        .submit_feedback(
            &prediction_id,
            &user_action,
            corrected_action.as_deref(),
            actual_next_action.as_deref(),
        )
        .map_err(|e| format!("Feedback submission failed: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub async fn predict_get_metrics(app: AppHandle) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;
    let report = service
        .run_evaluation(None)
        .map_err(|e| format!("Evaluation metrics error: {e}"))?;

    Ok(serde_json::to_value(report).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_get_recommendations(
    app: AppHandle,
    context_actions: Vec<String>,
) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;
    let recs = service
        .get_automation_recommendations(&context_actions)
        .map_err(|e| format!("Failed to get automation recommendations: {e}"))?;

    Ok(serde_json::to_value(recs).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_execute_recommendation(
    _app: AppHandle,
    recommendation_id: String,
    tool_name: String,
    tool_args: serde_json::Value,
    user_confirmed: bool,
) -> Result<serde_json::Value, String> {
    // Safety check: Explicit user authorization required
    if !user_confirmed {
        return Err(format!(
            "Execution blocked: User authorization required before executing automation recommendation '{recommendation_id}'"
        ));
    }

    let registry = sutra_agent::tools::ToolRegistry::new();
    let res = registry
        .execute(&tool_name, tool_args)
        .await
        .map_err(|e| format!("Failed to execute recommendation tool '{tool_name}': {e:#}"))?;

    Ok(serde_json::json!({
        "success": true,
        "recommendation_id": recommendation_id,
        "tool_name": tool_name,
        "result": res
    }))
}

#[tauri::command]
pub async fn predict_get_analytics_overview(app: AppHandle) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;
    let overview = service
        .get_analytics_overview()
        .map_err(|e| format!("Failed to fetch analytics overview: {e}"))?;

    Ok(serde_json::to_value(overview).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn predict_set_tracking(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let service = get_predict_service(&app)?;
    service
        .set_tracking_enabled(enabled)
        .map_err(|e| format!("Failed to update tracking setting: {e}"))?;

    Ok(enabled)
}

#[tauri::command]
pub async fn predict_clear_history(app: AppHandle) -> Result<bool, String> {
    let service = get_predict_service(&app)?;
    service
        .clear_history()
        .map_err(|e| format!("Failed to clear history: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub async fn predict_purge_data(app: AppHandle) -> Result<bool, String> {
    let service = get_predict_service(&app)?;
    service
        .purge_all_data()
        .map_err(|e| format!("Failed to purge data: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub async fn predict_seed_sample_data(app: AppHandle) -> Result<usize, String> {
    let service = get_predict_service(&app)?;
    let count = service
        .seed_sample_data()
        .map_err(|e| format!("Failed to seed sample data: {e}"))?;

    Ok(count)
}

#[tauri::command]
pub async fn predict_run_evaluation(app: AppHandle) -> Result<serde_json::Value, String> {
    let service = get_predict_service(&app)?;
    let report = service
        .run_evaluation(None)
        .map_err(|e| format!("Failed to run benchmark evaluation: {e}"))?;

    Ok(serde_json::to_value(report).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn open_predict_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("predict") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        Ok(())
    } else {
        Err("Predict window not found in configuration".to_string())
    }
}

#[tauri::command]
pub fn close_predict_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("predict") {
        let _ = w.hide();
        Ok(())
    } else {
        Err("Predict window not found in configuration".to_string())
    }
}
