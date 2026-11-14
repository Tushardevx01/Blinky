# Blinky Predict — Predictive Analytics & Workflow Intelligence Engine

**Blinky Predict** is an embedded, privacy-preserving predictive analytics and workflow intelligence module for Blinky. It analyses historical user desktop workflow sequences, identifies recurring cross-application patterns, and predicts the user's next desktop action with calibrated confidence scores and verified automation recommendations.

---

## 1. Architectural Blueprint

Blinky Predict follows a strictly decoupled, offline-first architecture divided into three cooperative tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend UI                           │
│  PredictDashboard │ NextActionCard │ WorkflowInsights │ History       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Tauri IPC (Asynchronous Commands)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                 Tauri 2 Native Host (apps/desktop)                     │
│  predict_ipc.rs: State Management, IPC Dispatches, Permission Gates   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Native Rust Crate FFI
┌──────────────────────────────────▼─────────────────────────────────────┐
│                 Blinky Predict Crate (crates/blinky-predict)           │
│                                                                        │
│  ┌───────────────────────┐             ┌─────────────────────────────┐ │
│  │   Event Collector     │             │    Markov Predictor         │ │
│  │  Sanitizer & Privacy  │             │ 2nd-Order / 1st-Order Chain │ │
│  └──────────┬────────────┘             └──────────────┬──────────────┘ │
│             │                                         │                │
│  ┌──────────▼────────────┐             ┌──────────────▼─────────────┐  │
│  │     Pattern Miner     │             │    Recommendation Engine   │  │
│  │  N-Gram Sequence Mining             │  Verified Tool Registry    │  │
│  └──────────┬────────────┘             └──────────────┬─────────────┘  │
│             │                                         │                │
│             └──────────────────┬──────────────────────┘                │
│                                │                                       │
│                    ┌───────────▼───────────┐                           │
│                    │ SQLite Storage Layer  │                           │
│                    │  (tmp/blinky_predict) │                           │
│                    └───────────────────────┘                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Module Boundary Guarantees
- **Standalone Modular Crate (`crates/blinky-predict`)**: Zero external network dependencies, memory-safe, ultra-low latency (<1ms).
- **Desktop IPC Bridge (`apps/desktop/src-tauri/src/predict_ipc.rs`)**: Exposes thread-safe singleton operations to Tauri.
- **Frontend Dashboard (`apps/desktop/src/predict/`)**: Dedicated dashboard, history viewer, workflow visualizer, and user feedback loop.

---

## 2. Activity Event Collection & Privacy Rules

The event collector monitors permitted desktop activities, application switching, and tool execution events with strict user opt-in control.

### Event Data Contract
```json
{
  "event_id": "4a18e212-0f09-42b7-959c-8a03c00424bb",
  "event_type": "application_opened",
  "application": "vscode",
  "action": "open_project",
  "timestamp": "2026-11-14T10:00:00Z",
  "workflow_id": "wf_dev_cycle_10",
  "success": true,
  "metadata": {
    "workspace": "sutra"
  }
}
```

### Supported Event Types
- `application_opened`: An application was launched or focused.
- `application_switched`: Active window focus changed between applications.
- `automation_tool_executed`: An automated action or agent tool was invoked.
- `workflow_started`: Multi-step automation routine initiated.
- `workflow_completed`: Workflow finished successfully.
- `workflow_failed`: Workflow interrupted or returned an error.
- `recommendation_accepted`: User authorized a recommended action.
- `recommendation_dismissed`: User dismissed a recommendation.

### Privacy & Sanitization Gates
- **Zero Keystroke / Payload Snooping**: Arbitrary keystrokes, form inputs, and clipboard buffers are never collected.
- **Sensitive Substring Rejection**: Any action payload containing sensitive keywords (e.g., `password`, `token=`, `bearer `, `api_key`, `secret`, `BEGIN PRIVATE KEY`, `credit_card`) is immediately rejected by `EventValidator`.
- **Local Control & Opt-In**:
  - `tracking_enabled` flag defaults to opt-in with a persistent toggle.
  - When paused, all incoming activity events are dropped in-memory before reaching SQLite.
  - Users can clear historical activity or permanently purge all predictive data at any time.

---

## 3. Local SQLite Database Schema

Blinky Predict stores analytics locally in an embedded SQLite database (`tmp/blinky_predict.db`) using WAL mode and idempotent migrations (`PRAGMA user_version = 1`).

```sql
CREATE TABLE IF NOT EXISTS predictive_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    application TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    workflow_id TEXT,
    success INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(event_type, application, action, timestamp)
);

CREATE TABLE IF NOT EXISTS workflow_patterns (
    pattern_id TEXT PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    sequence_json TEXT NOT NULL UNIQUE,
    frequency INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 1,
    failure_count INTEGER NOT NULL DEFAULT 0,
    suggested_tool TEXT
);

CREATE TABLE IF NOT EXISTS action_predictions (
    prediction_id TEXT PRIMARY KEY,
    context_sequence_json TEXT NOT NULL,
    predicted_action TEXT NOT NULL,
    confidence REAL NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT NOT NULL,
    explanation TEXT,
    recommended_tool TEXT,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prediction_feedback (
    feedback_id TEXT PRIMARY KEY,
    prediction_id TEXT NOT NULL,
    user_action TEXT NOT NULL,
    corrected_action TEXT,
    actual_next_action TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(prediction_id) REFERENCES action_predictions(prediction_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS predict_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 4. Prediction Algorithm & Mathematical Formulation

Next-action prediction uses a hierarchical **Second-Order Markov Chain with First-Order Backoff**.

### State Transition Probabilities
For a sequence of actions $A = (a_1, a_2, \dots, a_t)$:

1. **Second-Order Context ($n=2$):**
   When the previous two actions $(a_{t-1}, a_t)$ have been observed in history:
   $$\hat{P}(a_{t+1} \mid a_{t-1}, a_t) = \frac{\text{Count}((a_{t-1}, a_t) \to a_{t+1})}{\sum_{a'} \text{Count}((a_{t-1}, a_t) \to a')}$$

2. **First-Order Fallback ($n=1$):**
   When the pair $(a_{t-1}, a_t)$ is unseen, the model falls back to the immediate predecessor $a_t$:
   $$\hat{P}(a_{t+1} \mid a_t) = \frac{\text{Count}(a_t \to a_{t+1})}{\sum_{a'} \text{Count}(a_t \to a')}$$

3. **Unseen / Insufficient Data:**
   If neither order has historical transitions, the model returns status `"insufficient_data"` or `"unseen_sequence"` without generating ungrounded guesses.

### Confidence Calibration vs. Probability
Probability represents the relative frequency of a specific transition among observed alternatives. Confidence accounts for **sample support volume** (Bayesian evidence weighting):

$$\text{SupportFactor}(N) = 1 - \frac{1}{1 + N}$$
$$\text{Confidence} = \hat{P}(a_{t+1}) \times \text{SupportFactor}(N)$$

| Transitions Observed ($N$) | Support Factor | Raw Probability | Final Confidence |
|---|---|---|---|
| 1 | 0.50 | 1.00 | **50.0%** |
| 2 | 0.67 | 1.00 | **66.7%** |
| 3 | 0.75 | 1.00 | **75.0%** |
| 5 | 0.83 | 1.00 | **83.3%** |
| 10 | 0.91 | 1.00 | **90.9%** |

First-order transitions receive an additional 0.85 discount factor to reflect reduced contextual specificity compared to second-order sequences.

---

## 5. Workflow Pattern Recognition

The `PatternMiner` identifies repeated variable-length action sequences ($k \in [2, 6]$) across historical sessions:

- **Frequent Workflows**: Subsequences observed $\ge 2$ times, categorized into Development, Research, Media, or Productivity pipelines.
- **Application Transition Matrix**: Directed graph showing transition counts and conditional probabilities between applications (e.g. `terminal -> browser`: 82%).
- **Failure Hotspot Detection**: Sequences where failure rate exceeds 25%, isolating points of user friction.
- **Automation Opportunities**: Recurring multi-step routines ($\ge 3$ actions) with high success rates ($\ge 70\%$) mapped to single-click Blinky automation routines.

---

## 6. Agent Tool Registry Integration

Blinky Predict connects predictions directly to Blinky's native tool registry (`crates/sutra-agent/src/tools/mod.rs`).

### Verified Tool Mappings
| Predicted Action | Verified Tool | Pre-filled Parameters |
|---|---|---|
| `open_browser` / `launch_browser` | `launch_app` | `{"name": "browser"}` |
| `open_terminal` | `launch_app` | `{"name": "terminal"}` |
| `open_vscode` | `launch_app` | `{"name": "code"}` |
| `search_docs` | `web_search` | `{"query": "developer documentation", "max_results": 5}` |
| `create_spreadsheet` | `create_spreadsheet` | `{"title": "Workflow_Export", "rows": []}` |
| `lock_workstation` | `system_session` | `{"command": "lock"}` |
| `mute_audio` | `media_control` | `{"command": "mute"}` |
| `open_project` | `ide_bridge` | `{"action": "open_project"}` |

### Safety Invariants
1. **Tool Verification Invariant**: Predicted actions are checked against verified tools. Non-existent or hallucinated tool names are never proposed.
2. **Explicit Authorization Invariant**: Automation recommendations are **never** executed autonomously. Execution requires explicit confirmation (`user_confirmed: true`).

---

## 7. Dynamic User Feedback Loop

Users can evaluate predictions directly in the desktop interface:
- **Accept**: Reinforces the transition weights in the Markov model (+2 transition count).
- **Dismiss**: Damps model weight for the proposed action.
- **Correct**: Records the user's intended action and adds reinforced transitions to the corrected action (+3 count).

---

## 8. API & IPC Contracts

The desktop host exposes the following Tauri IPC commands:

```typescript
// Record a sanitized desktop activity event
predict_record_event(event: ActivityEvent): Promise<ActivityEvent | null>;

// Generate next action predictions given recent history
predict_next_actions(contextActions: string[], currentApp?: string): Promise<NextActionPredictionResult>;

// Retrieve mined workflow patterns and app transitions
predict_get_workflow_insights(): Promise<WorkflowInsights>;

// Fetch prediction history with user feedback outcomes
predict_get_history(limit?: number): Promise<StoredPrediction[]>;

// Submit user evaluation (accepted, dismissed, incorrect, corrected)
predict_submit_feedback(predictionId: string, userAction: string, correctedAction?: string, actualNextAction?: string): Promise<boolean>;

// Fetch empirical ground-truth benchmark metrics
predict_get_metrics(): Promise<EvaluationReport>;

// Fetch executable automation recommendations
predict_get_recommendations(contextActions: string[]): Promise<AutomationRecommendation[]>;

// Execute recommendation with mandatory user authorization
predict_execute_recommendation(recommendationId: string, toolName: string, toolArgs: Record<string, any>, userConfirmed: boolean): Promise<ExecutionResult>;

// Analytics summary overview
predict_get_analytics_overview(): Promise<PredictAnalyticsOverview>;

// Opt-in activity tracking toggle
predict_set_tracking(enabled: boolean): Promise<boolean>;

// Clear activity history
predict_clear_history(): Promise<boolean>;

// Purge all predictive analytics data
predict_purge_data(): Promise<boolean>;

// Seed test workflow dataset
predict_seed_sample_data(): Promise<number>;

// Run live benchmark evaluation
predict_run_evaluation(): Promise<EvaluationReport>;
```

---

## 9. Evaluation Methodology & Measured Benchmarks

Prediction accuracy is measured against a repeatable hold-out ground-truth dataset (`BenchmarkDataset::standard_developer_benchmark()`):

### Ground-Truth Evaluation Results
| Metric | Measured Value | Threshold | Status |
|---|---|---|---|
| **Top-1 Accuracy** | **85.7%** | $\ge 75.0\%$ | Pass |
| **Top-3 Accuracy** | **100.0%** | $\ge 90.0\%$ | Pass |
| **Average Latency** | **23.4 µs** | $< 1,000\text{ µs}$ ($1\text{ms}$) | Pass |
| **Test Workflows** | **3 distinct pipelines** | Known sequences | Pass |
| **Evaluated Samples** | **14 transition steps** | Ground truth | Pass |

All tests pass deterministically via `cargo test -p blinky-predict`.

---

## 10. Limitations & Future Roadmap

- **Session Context Window**: Current pattern mining operates on an n-gram window of $k \in [2, 6]$. Future iterations could incorporate longer recurrent time horizons.
- **Cross-Device Sync**: Predictive weights are stored locally on the desktop SQLite database; future releases could support end-to-end encrypted peer sync to companion mobile clients via P-256 TLS.
- **Multimodal Context**: The current predictor operates on action and application tokens; future integrations can incorporate window accessibility element identifiers into the Markov state space.
