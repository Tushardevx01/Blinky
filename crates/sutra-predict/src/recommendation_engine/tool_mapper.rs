use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationRecommendation {
    pub recommendation_id: String,
    pub predicted_action: String,
    pub confidence: f64,
    pub title: String,
    pub description: String,
    pub tool_name: String,
    pub tool_args: serde_json::Value,
    pub requires_user_approval: bool,
    pub is_verified_tool: bool,
}

pub struct ToolRecommendationEngine {
    verified_tools: HashSet<String>,
}

impl Default for ToolRecommendationEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ToolRecommendationEngine {
    pub fn new() -> Self {
        let mut verified = HashSet::new();
        // Exact list of tools implemented in Sutra's ToolRegistry
        let tools = [
            "launch_app",
            "focus_window",
            "capture_window",
            "capture_screen",
            "act_on_frame",
            "keyboard_type",
            "keyboard_key",
            "media_control",
            "system_session",
            "web_search",
            "fetch_web_page",
            "crypto_price",
            "wikipedia",
            "create_spreadsheet",
            "esp32_light",
            "ide_bridge",
            "consult_reflex",
        ];
        for t in tools {
            verified.insert(t.to_string());
        }
        Self {
            verified_tools: verified,
        }
    }

    pub fn is_tool_verified(&self, tool_name: &str) -> bool {
        self.verified_tools.contains(tool_name)
    }

    pub fn create_recommendation(
        &self,
        predicted_action: &str,
        confidence: f64,
        context: &[String],
    ) -> Option<AutomationRecommendation> {
        let action_clean = predicted_action.trim().to_lowercase();
        let last_context = context.last().map(|s| s.to_lowercase()).unwrap_or_default();

        let (tool_name, tool_args, title, description) = match action_clean.as_str() {
            "open_browser" | "launch_browser" => {
                if last_context.contains("dev_server") || last_context.contains("run_dev") {
                    (
                        "launch_app",
                        json!({ "name": "browser" }),
                        "Open Local Development Preview".to_string(),
                        "Sutra detected you started the dev server. Would you like to open the local development preview in your browser?".to_string(),
                    )
                } else {
                    (
                        "launch_app",
                        json!({ "name": "browser" }),
                        "Launch Web Browser".to_string(),
                        "Would you like Sutra to launch your default web browser?".to_string(),
                    )
                }
            }
            "open_terminal" | "launch_terminal" => (
                "launch_app",
                json!({ "name": "terminal" }),
                "Launch Terminal".to_string(),
                "Would you like Sutra to open the system terminal?".to_string(),
            ),
            "open_vscode" | "open_editor" | "open_ide" => (
                "launch_app",
                json!({ "name": "code" }),
                "Open VS Code".to_string(),
                "Would you like Sutra to open Visual Studio Code?".to_string(),
            ),
            "search_docs" | "web_search" => (
                "web_search",
                json!({ "query": "developer documentation", "max_results": 5 }),
                "Search Documentation".to_string(),
                "Would you like Sutra to perform a private web search for technical documentation?".to_string(),
            ),
            "create_spreadsheet" | "export_data" => (
                "create_spreadsheet",
                json!({ "title": "Workflow_Export", "rows": [] }),
                "Create Spreadsheet Report".to_string(),
                "Would you like Sutra to create an organized spreadsheet with recent workflow metrics?".to_string(),
            ),
            "lock_workstation" | "lock_screen" => (
                "system_session",
                json!({ "command": "lock" }),
                "Lock Workstation".to_string(),
                "Would you like Sutra to safely lock the workstation?".to_string(),
            ),
            "mute_audio" | "mute" => (
                "media_control",
                json!({ "command": "mute" }),
                "Mute Audio".to_string(),
                "Would you like Sutra to toggle audio mute?".to_string(),
            ),
            "open_project" => (
                "ide_bridge",
                json!({ "action": "open_project" }),
                "Open Workspace Project".to_string(),
                "Would you like Sutra's IDE bridge to open the target project workspace?".to_string(),
            ),
            _ => return None,
        };

        // Strictly verify that the mapped tool exists in ToolRegistry
        if !self.is_tool_verified(tool_name) {
            return None;
        }

        Some(AutomationRecommendation {
            recommendation_id: format!(
                "rec_{}",
                uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()
            ),
            predicted_action: predicted_action.to_string(),
            confidence,
            title,
            description,
            tool_name: tool_name.to_string(),
            tool_args,
            requires_user_approval: true,
            is_verified_tool: true,
        })
    }
}
