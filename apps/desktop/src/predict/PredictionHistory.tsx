import React from 'react';
import {
  History,
  Check,
  X,
  Edit3,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import type { StoredPrediction } from '../lib/tauri';
import { predictSubmitFeedback } from '../lib/tauri';

interface PredictionHistoryProps {
  history: StoredPrediction[];
  onFeedbackSubmitted?: () => void;
  onOpenFeedbackModal?: (predictionId: string, currentAction: string) => void;
}

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  history,
  onFeedbackSubmitted,
  onOpenFeedbackModal
}) => {
  if (history.length === 0) {
    return (
      <div className="predict-card predict-empty-card">
        <History size={24} className="text-muted" />
        <div className="predict-empty-content">
          <h4>No Prediction History Yet</h4>
          <p>
            Generated action predictions and their outcomes will appear here along with your feedback
            history to track prediction accuracy over time.
          </p>
        </div>
      </div>
    );
  }

  const handleFeedback = async (
    predId: string,
    action: 'accepted' | 'dismissed' | 'incorrect'
  ) => {
    try {
      await predictSubmitFeedback(predId, action);
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error('Failed to submit feedback for history item:', err);
    }
  };

  return (
    <div className="predict-card">
      <div className="predict-card-header">
        <div className="predict-badge-group">
          <History size={14} className="text-accent" style={{ marginRight: 6 }} />
          <h4 className="predict-section-title">Prediction Log & Feedback History</h4>
        </div>
        <span className="predict-count-badge">{history.length} logged</span>
      </div>

      <div className="predict-history-table-wrapper">
        <table className="predict-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Context Sequence</th>
              <th>Predicted Action</th>
              <th>Confidence</th>
              <th>Model</th>
              <th>Outcome / Feedback</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <tr key={item.prediction_id}>
                  <td className="predict-time-cell">
                    <Clock size={11} style={{ marginRight: 4, opacity: 0.6 }} />
                    {dateStr}
                  </td>
                  <td>
                    <div className="predict-table-context">
                      {item.context_sequence.length > 0 ? (
                        item.context_sequence.map((ctx, idx) => (
                          <span key={idx} className="predict-table-pill">
                            {ctx}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">No context</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="predict-table-action-name">{item.predicted_action}</span>
                  </td>
                  <td>
                    <span className="predict-table-conf">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="predict-table-model">{item.model_name}</td>
                  <td>
                    {item.feedback_action ? (
                      <span
                        className={`predict-status-pill predict-status-${item.feedback_action}`}
                      >
                        {item.feedback_action}
                        {item.corrected_action && ` → ${item.corrected_action}`}
                      </span>
                    ) : (
                      <div className="predict-table-actions">
                        <button
                          type="button"
                          className="predict-table-btn predict-table-btn-accept"
                          onClick={() => handleFeedback(item.prediction_id, 'accepted')}
                          title="Accept"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          type="button"
                          className="predict-table-btn predict-table-btn-dismiss"
                          onClick={() => handleFeedback(item.prediction_id, 'dismissed')}
                          title="Dismiss"
                        >
                          <X size={11} />
                        </button>
                        <button
                          type="button"
                          className="predict-table-btn predict-table-btn-correct"
                          onClick={() =>
                            onOpenFeedbackModal?.(item.prediction_id, item.predicted_action)
                          }
                          title="Correct..."
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
