import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  Zap,
  Repeat,
  History,
  TrendingUp,
  RefreshCw,
  Play,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Sliders,
  BarChart3,
  Loader2,
  AlertCircle,
  Database,
  ArrowRight,
  Layers,
  Cpu,
  Clock
} from 'lucide-react';
import { NextActionCard } from './NextActionCard';
import { WorkflowInsights } from './WorkflowInsights';
import { AutomationRecommendations } from './AutomationRecommendations';
import { PredictionHistory } from './PredictionHistory';
import { PredictionFeedback } from './PredictionFeedback';
import type {
  NextActionPredictionResult,
  WorkflowInsights as WorkflowInsightsType,
  StoredPrediction,
  AutomationOpportunity,
  AutomationRecommendation,
  PredictAnalyticsOverview,
  EvaluationReport
} from '../lib/tauri';
import {
  predictNextActions,
  predictGetWorkflowInsights,
  predictGetHistory,
  predictGetRecommendations,
  predictGetAnalyticsOverview,
  predictSetTracking,
  predictClearHistory,
  predictPurgeData,
  predictSeedSampleData,
  predictRunEvaluation,
  predictGetMetrics
} from '../lib/tauri';

interface PredictDashboardProps {
  onClose?: () => void;
  isStandalone?: boolean;
}

export const PredictDashboard: React.FC<PredictDashboardProps> = ({
  onClose,
  isStandalone = false
}) => {
  const [activeTab, setActiveTab] = useState<
    'predictions' | 'insights' | 'automation' | 'history' | 'evaluation'
  >('predictions');

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const [predictionResult, setPredictionResult] = useState<NextActionPredictionResult | null>(null);
  const [insights, setInsights] = useState<WorkflowInsightsType | null>(null);
  const [history, setHistory] = useState<StoredPrediction[]>([]);
  const [recommendations, setRecommendations] = useState<AutomationRecommendation[]>([]);
  const [overview, setOverview] = useState<PredictAnalyticsOverview | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);

  // Active feedback modal
  const [feedbackModalTarget, setFeedbackModalTarget] = useState<{
    predictionId: string;
    action: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ins, hist, evalRep] = await Promise.all([
        predictGetAnalyticsOverview(),
        predictGetWorkflowInsights(),
        predictGetHistory(50),
        predictGetMetrics().catch(() => null)
      ]);

      setOverview(ov);
      setInsights(ins);
      setHistory(hist);
      setEvaluationReport(evalRep);

      // Context actions for live prediction: extract from the most recent historical events
      let context: string[] = [];
      if (ins && ins.repeated_task_sequences.length > 0) {
        context = ins.repeated_task_sequences[0].slice(-3);
      } else if (hist.length > 0) {
        context = hist[0].context_sequence.slice(-2);
        if (context.length === 0 && hist[0].predicted_action) {
          context = [hist[0].predicted_action];
        }
      }

      if (context.length > 0) {
        const pred = await predictNextActions(context);
        setPredictionResult(pred);
        const recs = await predictGetRecommendations(context);
        setRecommendations(recs);
      } else {
        setPredictionResult({
          predictions: [],
          model: '2nd-Order Markov Chain with 1st-Order Backoff',
          status: 'insufficient_data',
          context_used: [],
          explanation: 'No recent workflow history detected yet. Record desktop activity or seed test workflows to evaluate predictions.'
        });
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Failed to load predictive analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleTracking = async () => {
    if (!overview) return;
    const nextState = !overview.tracking_active;
    try {
      await predictSetTracking(nextState);
      setOverview({ ...overview, tracking_active: nextState });
      setStatusNotification(
        nextState ? 'Activity tracking resumed' : 'Activity tracking paused'
      );
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (err) {
      console.error('Failed to toggle tracking:', err);
    }
  };

  const handleSeedSampleData = async () => {
    setSeeding(true);
    setStatusNotification(null);
    try {
      const count = await predictSeedSampleData();
      setStatusNotification(`Seeded ${count} realistic workflow events. Re-training Markov model...`);
      await loadData();
    } catch (err: any) {
      setStatusNotification(`Seeding error: ${err?.message || err}`);
    } finally {
      setSeeding(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    try {
      const report = await predictRunEvaluation();
      setEvaluationReport(report);
      setStatusNotification(
        `Evaluation complete: Top-1: ${(report.top1_accuracy * 100).toFixed(1)}%, Top-3: ${(
          report.top3_accuracy * 100
        ).toFixed(1)}% (${report.average_latency_micros}µs latency)`
      );
    } catch (err: any) {
      setStatusNotification(`Evaluation error: ${err?.message || err}`);
    } finally {
      setEvaluating(false);
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all recorded workflow events and patterns?')) {
      return;
    }
    try {
      await predictClearHistory();
      setStatusNotification('Activity history cleared.');
      await loadData();
    } catch (err) {
      console.error('Clear failed:', err);
    }
  };

  return (
    <div className={`predict-dashboard-shell ${isStandalone ? 'predict-standalone' : ''}`}>
      {/* HEADER BAR */}
      <div className="predict-header">
        <div className="predict-header-left">
          <div className="predict-logo-badge">
            <Brain size={22} className="text-accent" />
          </div>
          <div>
            <div className="predict-title-row">
              <h2 className="predict-title">Sutra Predict</h2>
              <span className="predict-engine-pill">
                <Cpu size={12} style={{ marginRight: 4 }} />
                Markov Intelligence Engine
              </span>
            </div>
            <p className="predict-subtitle">
              Context-aware desktop workflow pattern recognition and next-action prediction
            </p>
          </div>
        </div>

        <div className="predict-header-right">
          {/* Tracking Opt-In Switch */}
          <div className="predict-tracking-switch" onClick={handleToggleTracking} title="Click to pause or resume activity tracking">
            <span className="predict-switch-label">Activity Tracking:</span>
            <span
              className={`predict-switch-pill ${
                overview?.tracking_active ? 'predict-pill-on' : 'predict-pill-off'
              }`}
            >
              {overview?.tracking_active ? 'Active (Opt-in)' : 'Paused'}
            </span>
          </div>

          <button
            type="button"
            className="predict-tool-btn"
            onClick={handleSeedSampleData}
            disabled={seeding}
            title="Seed standard developer action sequences for instant evaluation"
          >
            {seeding ? <Loader2 size={13} className="spin" /> : <Database size={13} />}
            Seed Test Data
          </button>

          <button
            type="button"
            className="predict-tool-btn"
            onClick={handleRunEvaluation}
            disabled={evaluating}
            title="Evaluate model accuracy against ground-truth benchmarks"
          >
            {evaluating ? <Loader2 size={13} className="spin" /> : <BarChart3 size={13} />}
            Evaluate Model
          </button>

          <button
            type="button"
            className="predict-tool-btn predict-btn-danger-ghost"
            onClick={handleClearHistory}
            title="Clear recorded activity history"
          >
            <Trash2 size={13} />
          </button>

          {onClose && (
            <button type="button" className="predict-close-btn" onClick={onClose} title="Close">
              &times;
            </button>
          )}
        </div>
      </div>

      {/* STATUS NOTIFICATION ALERT */}
      {statusNotification && (
        <div className="predict-alert-banner">
          <Sparkles size={14} style={{ marginRight: 6 }} />
          {statusNotification}
        </div>
      )}

      {/* METRICS SUMMARY OVERVIEW STRIP */}
      <div className="predict-metrics-strip">
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {overview ? overview.total_recorded_events : 0}
          </span>
          <span className="predict-metric-label">Recorded Events</span>
        </div>
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {overview ? overview.total_detected_workflows : 0}
          </span>
          <span className="predict-metric-label">Detected Workflows</span>
        </div>
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {overview ? overview.total_predictions_generated : 0}
          </span>
          <span className="predict-metric-label">Predictions Generated</span>
        </div>
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {evaluationReport ? `${(evaluationReport.top1_accuracy * 100).toFixed(0)}%` : '--'}
          </span>
          <span className="predict-metric-label">Top-1 Accuracy</span>
        </div>
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {evaluationReport ? `${(evaluationReport.top3_accuracy * 100).toFixed(0)}%` : '--'}
          </span>
          <span className="predict-metric-label">Top-3 Accuracy</span>
        </div>
        <div className="predict-metric-card">
          <span className="predict-metric-num">
            {evaluationReport ? `${evaluationReport.average_latency_micros}µs` : '<1ms'}
          </span>
          <span className="predict-metric-label">Inference Latency</span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="predict-tabs-row">
        <button
          type="button"
          className={`predict-tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          <Sparkles size={14} style={{ marginRight: 6 }} />
          Next Likely Action
        </button>
        <button
          type="button"
          className={`predict-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <Repeat size={14} style={{ marginRight: 6 }} />
          Workflow Insights
          {insights && insights.frequent_workflows.length > 0 && (
            <span className="predict-tab-badge">{insights.frequent_workflows.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`predict-tab-btn ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          <Zap size={14} style={{ marginRight: 6 }} />
          Automation Recommendations
          {recommendations.length > 0 && (
            <span className="predict-tab-badge predict-badge-accent">{recommendations.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`predict-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={14} style={{ marginRight: 6 }} />
          Prediction History
          {history.length > 0 && (
            <span className="predict-tab-badge">{history.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`predict-tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          <BarChart3 size={14} style={{ marginRight: 6 }} />
          Benchmark & Evaluation
        </button>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="predict-content-viewport">
        {loading ? (
          <div className="predict-loading-state">
            <Loader2 size={28} className="spin text-accent" />
            <span>Analyzing workflow patterns and transitions...</span>
          </div>
        ) : (
          <>
            {activeTab === 'predictions' && (
              <div className="predict-tab-pane">
                <NextActionCard
                  predictionResult={predictionResult}
                  recommendations={recommendations}
                  onFeedbackSubmitted={loadData}
                  onOpenFeedbackModal={(id, act) =>
                    setFeedbackModalTarget({ predictionId: id, action: act })
                  }
                />
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="predict-tab-pane">
                <WorkflowInsights insights={insights} />
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="predict-tab-pane">
                <AutomationRecommendations
                  opportunities={insights ? insights.automation_opportunities : []}
                  recommendations={recommendations}
                  onActionCompleted={loadData}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="predict-tab-pane">
                <PredictionHistory
                  history={history}
                  onFeedbackSubmitted={loadData}
                  onOpenFeedbackModal={(id, act) =>
                    setFeedbackModalTarget({ predictionId: id, action: act })
                  }
                />
              </div>
            )}

            {activeTab === 'evaluation' && (
              <div className="predict-tab-pane">
                <div className="predict-card">
                  <div className="predict-card-header">
                    <div className="predict-badge-group">
                      <BarChart3 size={16} className="text-accent" style={{ marginRight: 6 }} />
                      <h4 className="predict-section-title">
                        Empirical Benchmark Evaluation (Repeatable Ground Truth)
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="predict-btn predict-btn-accent predict-btn-sm"
                      onClick={handleRunEvaluation}
                      disabled={evaluating}
                    >
                      {evaluating ? (
                        <>
                          <Loader2 size={12} className="spin" style={{ marginRight: 4 }} />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Play size={12} style={{ marginRight: 4 }} />
                          Re-Run Benchmark
                        </>
                      )}
                    </button>
                  </div>

                  <p className="predict-eval-desc">
                    In compliance with the predictive intelligence specification, accuracy metrics are
                    empirically calculated using a hold-out test dataset containing known development
                    and research action sequences.
                  </p>

                  {evaluationReport && (
                    <div className="predict-eval-results-grid">
                      <div className="predict-eval-stat-box">
                        <span className="predict-eval-val">
                          {(evaluationReport.top1_accuracy * 100).toFixed(1)}%
                        </span>
                        <span className="predict-eval-name">Top-1 Accuracy</span>
                        <span className="predict-eval-sub">
                          {evaluationReport.correct_top1} / {evaluationReport.total_evaluated_samples} exact next actions
                        </span>
                      </div>
                      <div className="predict-eval-stat-box">
                        <span className="predict-eval-val">
                          {(evaluationReport.top3_accuracy * 100).toFixed(1)}%
                        </span>
                        <span className="predict-eval-name">Top-3 Accuracy</span>
                        <span className="predict-eval-sub">
                          {evaluationReport.correct_top3} / {evaluationReport.total_evaluated_samples} in top 3 predictions
                        </span>
                      </div>
                      <div className="predict-eval-stat-box">
                        <span className="predict-eval-val">
                          {evaluationReport.average_latency_micros} µs
                        </span>
                        <span className="predict-eval-name">Average Inference Latency</span>
                        <span className="predict-eval-sub">Ultra-fast local Markov traversal</span>
                      </div>
                      <div className="predict-eval-stat-box">
                        <span className="predict-eval-val">
                          {evaluationReport.workflow_recognition_frequency}
                        </span>
                        <span className="predict-eval-name">Workflows Evaluated</span>
                        <span className="predict-eval-sub">
                          {evaluationReport.dataset_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {overview && overview.accepted_predictions + overview.incorrect_predictions + overview.corrected_predictions > 0 && (
                    <div className="predict-user-eval-box">
                      <h5>Live User Feedback Outcome Metric</h5>
                      <p>
                        Based on {overview.accepted_predictions + overview.incorrect_predictions + overview.corrected_predictions} user-evaluated predictions:
                      </p>
                      <div className="predict-user-eval-row">
                        <div className="predict-eval-pill-stat">
                          <strong>{(overview.feedback_accuracy * 100).toFixed(1)}%</strong>
                          <span>User Acceptance Rate</span>
                        </div>
                        <div className="predict-eval-pill-stat">
                          <strong>{overview.accepted_predictions}</strong>
                          <span>Accepted</span>
                        </div>
                        <div className="predict-eval-pill-stat">
                          <strong>{overview.dismissed_predictions}</strong>
                          <span>Dismissed</span>
                        </div>
                        <div className="predict-eval-pill-stat">
                          <strong>{overview.corrected_predictions}</strong>
                          <span>Corrected</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FEEDBACK CORRECTION MODAL */}
      {feedbackModalTarget && (
        <PredictionFeedback
          predictionId={feedbackModalTarget.predictionId}
          predictedAction={feedbackModalTarget.action}
          onClose={() => setFeedbackModalTarget(null)}
          onSubmitted={loadData}
        />
      )}
    </div>
  );
};
