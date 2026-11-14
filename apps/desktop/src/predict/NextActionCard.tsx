import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Edit3,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Loader2
} from 'lucide-react';
import type {
  NextActionPredictionResult,
  AutomationRecommendation
} from '../lib/tauri';
import { predictSubmitFeedback, predictExecuteRecommendation } from '../lib/tauri';

interface NextActionCardProps {
  predictionResult: NextActionPredictionResult | null;
  recommendations: AutomationRecommendation[];
  onFeedbackSubmitted?: () => void;
  onOpenFeedbackModal?: (predictionId: string, currentAction: string) => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  predictionResult,
  recommendations,
  onFeedbackSubmitted,
  onOpenFeedbackModal
}) => {
  const [executing, setExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  if (!predictionResult || predictionResult.status === 'insufficient_data') {
    return (
      <div className="predict-card predict-empty-card">
        <div className="predict-empty-icon">
          <Sparkles size={28} className="text-muted" />
        </div>
        <div className="predict-empty-content">
          <h4>Awaiting Desktop Activity Patterns</h4>
          <p>
            Blinky is observing your workflow sequences. As recurring desktop actions or automation
            routines take place, next-action predictions and confidence scores will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (predictionResult.status === 'unseen_sequence' || predictionResult.predictions.length === 0) {
    return (
      <div className="predict-card predict-neutral-card">
        <div className="predict-card-header">
          <div className="predict-tag-pill">Unseen Action Sequence</div>
        </div>
        <p className="predict-explanation">
          {predictionResult.explanation ||
            'The recent desktop action sequence is novel. Blinky will record transitions to build predictive confidence.'}
        </p>
      </div>
    );
  }

  const topPrediction = predictionResult.predictions[0];
  const alternatives = predictionResult.predictions.slice(1, 3);
  const linkedRecommendation = recommendations.find(
    (r) => r.predicted_action === topPrediction.action
  );

  const handleFeedback = async (action: 'accepted' | 'dismissed') => {
    try {
      setActionStatus(action === 'accepted' ? 'Accepted' : 'Dismissed');
      // For immediate prediction feedback
      await predictSubmitFeedback('realtime_top_prediction', action, undefined, topPrediction.action);
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const handleExecute = async (rec: AutomationRecommendation) => {
    if (
      !window.confirm(
        `Authorize Blinky to execute '${rec.tool_name}'?\n\nTool Arguments: ${JSON.stringify(
          rec.tool_args,
          null,
          2
        )}`
      )
    ) {
      return;
    }

    setExecuting(true);
    setExecutionMessage(null);
    try {
      const res = await predictExecuteRecommendation(
        rec.recommendation_id,
        rec.tool_name,
        rec.tool_args,
        true
      );
      if (res.success) {
        setExecutionMessage(`Successfully executed ${rec.tool_name}`);
        await handleFeedback('accepted');
      } else {
        setExecutionMessage(`Execution note: ${res.error || 'Completed'}`);
      }
    } catch (err: any) {
      setExecutionMessage(`Execution error: ${err?.message || err}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="predict-card predict-highlight-card">
      <div className="predict-card-header">
        <div className="predict-badge-group">
          <span className="predict-tag-pill predict-pill-primary">
            <Sparkles size={12} style={{ marginRight: 4 }} />
            Next Likely Action
          </span>
          <span className="predict-tag-pill predict-pill-subtle">
            {predictionResult.model}
          </span>
        </div>
        <div className="predict-score-group">
          <span className="predict-score-label">Confidence:</span>
          <span className="predict-score-val">
            {(topPrediction.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="predict-main-action">
        <div className="predict-action-title-row">
          <h3 className="predict-action-name">{topPrediction.action}</h3>
          <span className="predict-probability-tag">
            {(topPrediction.probability * 100).toFixed(0)}% transition probability
          </span>
        </div>

        {/* Confidence progress bar */}
        <div className="predict-progress-track">
          <div
            className="predict-progress-fill"
            style={{ width: `${Math.min(100, Math.max(8, topPrediction.confidence * 100))}%` }}
          />
        </div>

        {/* Explanation */}
        <p className="predict-explanation">
          <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {predictionResult.explanation}
        </p>

        {/* Context Sequence Chain */}
        {predictionResult.context_used.length > 0 && (
          <div className="predict-context-sequence">
            <span className="predict-context-label">Context:</span>
            {predictionResult.context_used.map((ctx, idx) => (
              <React.Fragment key={idx}>
                <span className="predict-seq-pill">{ctx}</span>
                <ArrowRight size={12} className="predict-seq-arrow" />
              </React.Fragment>
            ))}
            <span className="predict-seq-pill predict-seq-target">
              {topPrediction.action}
            </span>
          </div>
        )}
      </div>

      {/* Alternative Top-3 Candidates */}
      {alternatives.length > 0 && (
        <div className="predict-alternatives-row">
          <span className="predict-alternatives-label">Alternative candidates:</span>
          {alternatives.map((alt, idx) => (
            <div key={idx} className="predict-alt-chip">
              <span className="predict-alt-name">{alt.action}</span>
              <span className="predict-alt-prob">
                {(alt.probability * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Linked Automation Recommendation */}
      {linkedRecommendation && (
        <div className="predict-recommendation-box">
          <div className="predict-rec-header">
            <div className="predict-rec-title">
              <Zap size={14} className="text-accent" style={{ marginRight: 6 }} />
              <strong>{linkedRecommendation.title}</strong>
            </div>
            <span className="predict-verified-badge">
              <ShieldCheck size={12} style={{ marginRight: 4 }} />
              Verified Tool: {linkedRecommendation.tool_name}
            </span>
          </div>
          <p className="predict-rec-desc">{linkedRecommendation.description}</p>
          <div className="predict-rec-actions">
            <button
              type="button"
              className="predict-btn predict-btn-accent"
              onClick={() => handleExecute(linkedRecommendation)}
              disabled={executing}
            >
              {executing ? (
                <>
                  <Loader2 size={13} className="spin" style={{ marginRight: 6 }} />
                  Authorizing & Executing...
                </>
              ) : (
                <>
                  <Play size={13} style={{ marginRight: 6 }} />
                  Authorize & Execute
                </>
              )}
            </button>
            <span className="predict-auth-note">Requires explicit user approval</span>
          </div>
          {executionMessage && (
            <div className="predict-feedback-alert">{executionMessage}</div>
          )}
        </div>
      )}

      {/* User Feedback Buttons */}
      <div className="predict-feedback-bar">
        <span className="predict-feedback-prompt">Evaluate this prediction:</span>
        <div className="predict-feedback-buttons">
          <button
            type="button"
            className={`predict-btn predict-btn-sm ${
              actionStatus === 'Accepted' ? 'predict-btn-active' : ''
            }`}
            onClick={() => handleFeedback('accepted')}
            title="Accept: model will reinforce this transition"
          >
            <Check size={13} style={{ marginRight: 4 }} />
            Accept
          </button>
          <button
            type="button"
            className={`predict-btn predict-btn-sm ${
              actionStatus === 'Dismissed' ? 'predict-btn-active' : ''
            }`}
            onClick={() => handleFeedback('dismissed')}
            title="Dismiss prediction"
          >
            <X size={13} style={{ marginRight: 4 }} />
            Dismiss
          </button>
          <button
            type="button"
            className="predict-btn predict-btn-sm predict-btn-secondary"
            onClick={() =>
              onOpenFeedbackModal?.('realtime_top_prediction', topPrediction.action)
            }
            title="Mark incorrect and specify correct action"
          >
            <Edit3 size={13} style={{ marginRight: 4 }} />
            Correct...
          </button>
        </div>
      </div>
    </div>
  );
};
