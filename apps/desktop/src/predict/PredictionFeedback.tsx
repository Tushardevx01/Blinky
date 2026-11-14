import React, { useState } from 'react';
import { X, Check, Edit3, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { predictSubmitFeedback } from '../lib/tauri';

interface PredictionFeedbackProps {
  predictionId: string;
  predictedAction: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export const PredictionFeedback: React.FC<PredictionFeedbackProps> = ({
  predictionId,
  predictedAction,
  onClose,
  onSubmitted
}) => {
  const [correctedAction, setCorrectedAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPicks = [
    'open_browser',
    'open_terminal',
    'open_vscode',
    'run_dev_server',
    'git_commit',
    'search_docs',
    'create_spreadsheet',
    'lock_workstation'
  ];

  const handleSubmitCorrection = async () => {
    if (!correctedAction.trim()) {
      setError('Please enter or select the actual next action.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await predictSubmitFeedback(
        predictionId,
        'corrected',
        correctedAction.trim(),
        correctedAction.trim()
      );
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkIncorrect = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await predictSubmitFeedback(predictionId, 'incorrect');
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="predict-modal-backdrop" onClick={onClose}>
      <div className="predict-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="predict-modal-header">
          <div className="predict-modal-title-row">
            <Edit3 size={16} className="text-accent" style={{ marginRight: 6 }} />
            <h3>Correct Prediction</h3>
          </div>
          <button type="button" className="predict-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="predict-modal-body">
          <div className="predict-modal-context">
            <span className="predict-label-subtle">Predicted by Blinky:</span>
            <div className="predict-target-chip">{predictedAction}</div>
          </div>

          <label className="predict-input-label">
            What was the actual next desktop action?
          </label>
          <input
            type="text"
            className="predict-text-input"
            placeholder="e.g. open_browser, git_commit..."
            value={correctedAction}
            onChange={(e) => setCorrectedAction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmitCorrection();
              }
            }}
            autoFocus
          />

          <div className="predict-quick-picks">
            <span className="predict-quick-label">Quick select:</span>
            <div className="predict-quick-tags">
              {quickPicks.map((pick) => (
                <button
                  key={pick}
                  type="button"
                  className={`predict-quick-chip ${correctedAction === pick ? 'active' : ''}`}
                  onClick={() => setCorrectedAction(pick)}
                >
                  {pick}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="predict-modal-error">
              <AlertCircle size={13} style={{ marginRight: 6 }} />
              {error}
            </div>
          )}

          <p className="predict-modal-note">
            <Sparkles size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Submitting this correction updates Blinky's Markov transition weights so future workflow
            recommendations align with your actual habits.
          </p>
        </div>

        <div className="predict-modal-footer">
          <button
            type="button"
            className="predict-btn predict-btn-danger"
            onClick={handleMarkIncorrect}
            disabled={submitting}
          >
            Mark Incorrect
          </button>
          <div className="predict-modal-footer-right">
            <button
              type="button"
              className="predict-btn predict-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="predict-btn predict-btn-accent"
              onClick={handleSubmitCorrection}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="spin" style={{ marginRight: 4 }} />
                  Updating Model...
                </>
              ) : (
                <>
                  <Check size={13} style={{ marginRight: 4 }} />
                  Save Correction
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
