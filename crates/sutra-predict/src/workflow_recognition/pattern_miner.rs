use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowPattern {
    pub pattern_id: String,
    pub name: String,
    pub sequence: Vec<String>,
    pub frequency: usize,
    pub success_rate: f64,
    pub failure_count: usize,
    pub category: String,
    pub automation_candidate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTransition {
    pub from_app: String,
    pub to_app: String,
    pub count: usize,
    pub probability: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationOpportunity {
    pub opportunity_id: String,
    pub title: String,
    pub description: String,
    pub sequence: Vec<String>,
    pub frequency: usize,
    pub estimated_seconds_saved: f64,
    pub confidence: f64,
    pub required_tool: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInsights {
    pub total_workflows_detected: usize,
    pub frequent_workflows: Vec<WorkflowPattern>,
    pub app_transitions: Vec<AppTransition>,
    pub repeated_task_sequences: Vec<Vec<String>>,
    pub frequently_failed_sequences: Vec<WorkflowPattern>,
    pub automation_opportunities: Vec<AutomationOpportunity>,
}

pub struct PatternMiner {
    min_frequency: usize,
    min_sequence_len: usize,
    max_sequence_len: usize,
}

impl Default for PatternMiner {
    fn default() -> Self {
        Self {
            min_frequency: 2,
            min_sequence_len: 2,
            max_sequence_len: 6,
        }
    }
}

impl PatternMiner {
    pub fn new(min_frequency: usize) -> Self {
        Self {
            min_frequency,
            min_sequence_len: 2,
            max_sequence_len: 6,
        }
    }

    pub fn analyze(
        &self,
        action_sequences: &[Vec<String>],
        app_sequences: &[Vec<String>],
        sequence_success: &[bool],
    ) -> WorkflowInsights {
        let mut n_gram_counts: HashMap<Vec<String>, (usize, usize)> = HashMap::new(); // seq -> (count, failures)

        for (idx, seq) in action_sequences.iter().enumerate() {
            let is_failed = sequence_success.get(idx).map(|s| !*s).unwrap_or(false);

            let len = seq.len();
            for n in self.min_sequence_len..=self.max_sequence_len {
                if len >= n {
                    for start in 0..=(len - n) {
                        let sub = seq[start..start + n].to_vec();
                        let entry = n_gram_counts.entry(sub).or_insert((0, 0));
                        entry.0 += 1;
                        if is_failed {
                            entry.1 += 1;
                        }
                    }
                }
            }
        }

        // App transitions
        let mut app_trans_counts: HashMap<(String, String), usize> = HashMap::new();
        let mut app_total_out: HashMap<String, usize> = HashMap::new();

        for apps in app_sequences {
            for w in apps.windows(2) {
                let from = w[0].clone();
                let to = w[1].clone();
                if from != to {
                    *app_trans_counts.entry((from.clone(), to)).or_insert(0) += 1;
                    *app_total_out.entry(from).or_insert(0) += 1;
                }
            }
        }

        let mut app_transitions: Vec<AppTransition> = app_trans_counts
            .into_iter()
            .map(|((from, to), cnt)| {
                let total = *app_total_out.get(&from).unwrap_or(&1);
                let prob = (cnt as f64) / (total as f64);
                AppTransition {
                    from_app: from,
                    to_app: to,
                    count: cnt,
                    probability: (prob * 1000.0).round() / 1000.0,
                }
            })
            .collect();
        app_transitions.sort_by(|a, b| b.count.cmp(&a.count));

        // Patterns
        let mut frequent_workflows = Vec::new();
        let mut failed_workflows = Vec::new();
        let mut automation_opportunities = Vec::new();
        let mut repeated_sequences = Vec::new();

        for (seq, (count, failures)) in n_gram_counts {
            if count >= self.min_frequency {
                let success_count = count.saturating_sub(failures);
                let success_rate = if count > 0 {
                    (success_count as f64) / (count as f64)
                } else {
                    1.0
                };

                let name = Self::infer_pattern_name(&seq);
                let is_automation_cand = seq.len() >= 3 && success_rate >= 0.7;

                let pattern = WorkflowPattern {
                    pattern_id: format!("pat_{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()),
                    name: name.clone(),
                    sequence: seq.clone(),
                    frequency: count,
                    success_rate: (success_rate * 1000.0).round() / 1000.0,
                    failure_count: failures,
                    category: Self::infer_category(&seq),
                    automation_candidate: is_automation_cand,
                };

                if failures > 0 && (failures as f64) / (count as f64) >= 0.25 {
                    failed_workflows.push(pattern.clone());
                }

                if is_automation_cand {
                    let opp_id = format!("opp_{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>());
                    let req_tool = Self::infer_tool_for_opportunity(&seq);
                    automation_opportunities.push(AutomationOpportunity {
                        opportunity_id: opp_id,
                        title: format!("Automate {}", name),
                        description: format!(
                            "This sequence repeats {} times. Sutra can bundle these {} steps into a 1-click execution.",
                            count,
                            seq.len()
                        ),
                        sequence: seq.clone(),
                        frequency: count,
                        estimated_seconds_saved: (count as f64) * (seq.len() as f64) * 3.5,
                        confidence: success_rate.clamp(0.6, 0.98),
                        required_tool: req_tool,
                    });
                }

                frequent_workflows.push(pattern);
                repeated_sequences.push(seq);
            }
        }

        frequent_workflows.sort_by(|a, b| b.frequency.cmp(&a.frequency));
        failed_workflows.sort_by(|a, b| b.failure_count.cmp(&a.failure_count));
        automation_opportunities.sort_by(|a, b| b.frequency.cmp(&a.frequency));

        WorkflowInsights {
            total_workflows_detected: frequent_workflows.len(),
            frequent_workflows,
            app_transitions,
            repeated_task_sequences: repeated_sequences,
            frequently_failed_sequences: failed_workflows,
            automation_opportunities,
        }
    }

    fn infer_pattern_name(seq: &[String]) -> String {
        let text = seq.join(" -> ").to_lowercase();
        if text.contains("vscode") && text.contains("dev_server") {
            "Full-Stack Development Cycle".to_string()
        } else if text.contains("terminal") && text.contains("browser") {
            "Dev Preview & Testing".to_string()
        } else if text.contains("commit") || text.contains("push") || text.contains("pull_request") {
            "Git Release & PR Pipeline".to_string()
        } else if text.contains("browser") && text.contains("search") {
            "Technical Web Research".to_string()
        } else if text.contains("spread_sheet") || text.contains("excel") {
            "Data Report Generation".to_string()
        } else {
            format!("{} Workflow", seq.first().cloned().unwrap_or_else(|| "Desktop".to_string()))
        }
    }

    fn infer_category(seq: &[String]) -> String {
        let text = seq.join(" ").to_lowercase();
        if text.contains("code") || text.contains("vscode") || text.contains("dev") || text.contains("git") {
            "Development".to_string()
        } else if text.contains("browser") || text.contains("search") || text.contains("web") {
            "Research".to_string()
        } else if text.contains("media") || text.contains("audio") || text.contains("music") {
            "Media".to_string()
        } else {
            "Productivity".to_string()
        }
    }

    fn infer_tool_for_opportunity(seq: &[String]) -> String {
        let text = seq.join(" ").to_lowercase();
        if text.contains("browser") || text.contains("preview") {
            "launch_app".to_string()
        } else if text.contains("ide") || text.contains("code") {
            "ide_bridge".to_string()
        } else if text.contains("type") || text.contains("terminal") {
            "keyboard_type".to_string()
        } else {
            "launch_app".to_string()
        }
    }
}
