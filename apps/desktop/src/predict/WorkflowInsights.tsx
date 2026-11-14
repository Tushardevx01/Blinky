import React from 'react';
import {
  GitCommit,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Repeat,
  Layers,
  CheckCircle2,
  Activity
} from 'lucide-react';
import type { WorkflowInsights as WorkflowInsightsType } from '../lib/tauri';

interface WorkflowInsightsProps {
  insights: WorkflowInsightsType | null;
}

export const WorkflowInsights: React.FC<WorkflowInsightsProps> = ({ insights }) => {
  if (!insights || insights.frequent_workflows.length === 0) {
    return (
      <div className="predict-card predict-empty-card">
        <Activity size={24} className="text-muted" />
        <div className="predict-empty-content">
          <h4>No Workflow Patterns Identified Yet</h4>
          <p>
            When repetitive task sequences occur across your desktop sessions, Blinky's pattern miner
            will automatically catalog recurring workflows, transition probabilities, and failure
            hotspots here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="predict-insights-container">
      {/* 1. Frequently Repeated Workflows */}
      <div className="predict-card">
        <div className="predict-card-header">
          <div className="predict-badge-group">
            <Repeat size={14} className="text-accent" style={{ marginRight: 6 }} />
            <h4 className="predict-section-title">Frequently Repeated Workflows</h4>
          </div>
          <span className="predict-count-badge">
            {insights.frequent_workflows.length} detected
          </span>
        </div>

        <div className="predict-workflow-list">
          {insights.frequent_workflows.map((wf) => (
            <div key={wf.pattern_id} className="predict-workflow-item">
              <div className="predict-wf-meta">
                <span className="predict-wf-name">{wf.name}</span>
                <div className="predict-wf-badges">
                  <span className="predict-category-pill">{wf.category}</span>
                  <span className="predict-freq-pill">{wf.frequency}x repeated</span>
                  <span className="predict-success-pill">
                    <CheckCircle2 size={11} style={{ marginRight: 3 }} />
                    {(wf.success_rate * 100).toFixed(0)}% success
                  </span>
                </div>
              </div>

              <div className="predict-sequence-flow">
                {wf.sequence.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <span className="predict-step-chip">{step}</span>
                    {idx < wf.sequence.length - 1 && (
                      <ArrowRight size={12} className="predict-step-arrow" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Common Application Transitions */}
      {insights.app_transitions.length > 0 && (
        <div className="predict-card">
          <div className="predict-card-header">
            <div className="predict-badge-group">
              <TrendingUp size={14} className="text-accent" style={{ marginRight: 6 }} />
              <h4 className="predict-section-title">Common Application Transitions</h4>
            </div>
          </div>
          <div className="predict-transitions-grid">
            {insights.app_transitions.slice(0, 8).map((trans, idx) => (
              <div key={idx} className="predict-trans-card">
                <div className="predict-trans-flow">
                  <span className="predict-app-pill">{trans.from_app}</span>
                  <ArrowRight size={12} className="predict-trans-arrow" />
                  <span className="predict-app-pill predict-app-pill-target">{trans.to_app}</span>
                </div>
                <div className="predict-trans-stats">
                  <span className="predict-trans-count">{trans.count} transitions</span>
                  <span className="predict-trans-prob">
                    {(trans.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Frequently Failed Automation Sequences (if any) */}
      {insights.frequently_failed_sequences.length > 0 && (
        <div className="predict-card predict-warning-card">
          <div className="predict-card-header">
            <div className="predict-badge-group">
              <AlertTriangle size={14} className="text-warning" style={{ marginRight: 6 }} />
              <h4 className="predict-section-title">Failure Hotspots Detected</h4>
            </div>
          </div>
          <p className="predict-warning-text">
            These sequences experienced recurring errors or interrupts. Review for automation friction:
          </p>
          <div className="predict-failed-list">
            {insights.frequently_failed_sequences.map((wf) => (
              <div key={wf.pattern_id} className="predict-failed-item">
                <div className="predict-failed-meta">
                  <strong>{wf.name}</strong>
                  <span className="predict-fail-count">{wf.failure_count} failures</span>
                </div>
                <div className="predict-sequence-flow">
                  {wf.sequence.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className="predict-step-chip predict-step-failed">{step}</span>
                      {idx < wf.sequence.length - 1 && (
                        <ArrowRight size={12} className="predict-step-arrow" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
